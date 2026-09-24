import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export type SpacesMode = "buyer" | "owner" | "agent" | "manager";

interface ModeContextValue {
  mode: SpacesMode | null;
  /** Returns false when the account lacks the capability for that workspace. */
  setMode: (m: SpacesMode) => boolean;
  ready: boolean;
  /** True only when the account genuinely holds the Agent/Dalali role. */
  hasAgent: boolean;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

function storageKey(userId?: string | null) {
  return userId ? `spaces:mode:${userId}` : "spaces:mode:anon";
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const [stored, setStored] = useState<SpacesMode | null>(null);
  const [ready, setReady] = useState(false);
  const hasAgent = roles.includes("agent");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(storageKey(user?.id));
    setStored(v === "buyer" || v === "owner" || v === "agent" || v === "manager" ? v : null);
    setReady(true);
  }, [user?.id]);

  const setMode = useCallback(
    (m: SpacesMode) => {
      // A chosen mode never grants a capability: Agent needs the real role.
      if (m === "agent" && !hasAgent) return false;
      setStored(m);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(user?.id), m);
      }
      return true;
    },
    [user?.id, hasAgent],
  );

  // A stored "agent" preference without the Agent role falls back safely.
  const mode: SpacesMode | null =
    stored === "agent" && !hasAgent ? (roles.includes("owner") ? "owner" : "buyer") : stored;

  return <ModeContext.Provider value={{ mode, setMode, ready, hasAgent }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
