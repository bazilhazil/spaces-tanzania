import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "buyer" | "customer" | "owner" | "agent" | "admin" | "super_admin";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  national_id: string | null;
  business_name: string | null;
  agency_name: string | null;
  location: string | null;
  bio: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole;
  loading: boolean;
  initialized: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  redirectPathForRole: (role?: AppRole) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Highest privilege first — the first match becomes primaryRole.
const rolePriority: AppRole[] = ["super_admin", "admin", "agent", "owner", "customer", "buyer"];

export function redirectPathForRole(role?: AppRole): string {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin";
    case "owner":
    case "agent":
      return "/dashboard";
    case "customer":
    case "buyer":
    default:
      return "/";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const loadingUserId = useRef<string | null>(null);

  async function ensureProfile(user: User): Promise<Profile | null> {
    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (existing) return existing as Profile;

    // Auto-create profile with safe defaults so first-time users never get stuck.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const insertPayload = {
      id: user.id,
      email: user.email ?? null,
      full_name: (meta.full_name as string) ?? (meta.name as string) ?? null,
      phone: (meta.phone as string) ?? null,
      avatar_url: (meta.avatar_url as string) ?? null,
    };
    const { data: inserted, error } = await supabase
      .from("profiles")
      .insert(insertPayload)
      .select("*")
      .maybeSingle();
    if (error) {
      console.warn("[auth] profile auto-create failed", error.message);
      return null;
    }
    return (inserted as Profile) ?? null;
  }

  async function ensureRoles(userId: string): Promise<AppRole[]> {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    let current = ((data ?? []) as { role: AppRole }[]).map((x) => x.role);
    if (current.length === 0) {
      // Default new users to buyer/customer.
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "buyer" });
      if (!error) current = ["buyer"];
      else console.warn("[auth] role auto-assign failed", error.message);
    }
    return current;
  }

  async function loadUserData(user: User) {
    if (loadingUserId.current === user.id) return;
    loadingUserId.current = user.id;
    try {
      const [prof, r] = await Promise.all([ensureProfile(user), ensureRoles(user.id)]);
      setProfile(prof);
      setRoles(r);
    } finally {
      loadingUserId.current = null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    // 1) Subscribe FIRST so we never miss auth events fired during bootstrap.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) return;
      setSession(s);
      if (s?.user) {
        // Defer to avoid Supabase deadlock inside the callback.
        setTimeout(() => {
          if (!cancelled) void loadUserData(s.user);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRoles([]);
      }
    });

    // 2) Hydrate existing session.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadUserData(data.session.user);
      }
      setLoading(false);
      setInitialized(true);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const primaryRole = (rolePriority.find((r) => roles.includes(r)) ?? "buyer") as AppRole;

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoles([]);
  }
  async function refresh() {
    if (session?.user) await loadUserData(session.user);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        roles,
        primaryRole,
        loading,
        initialized,
        signOut,
        refresh,
        redirectPathForRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
