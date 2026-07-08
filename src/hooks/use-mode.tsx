import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export type SpacesMode = "buyer" | "owner" | "agent";

interface ModeContextValue {
  mode: SpacesMode | null;
  setMode: (m: SpacesMode) => void;
  ready: boolean;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

function storageKey(userId?: string | null) {
  return userId ? `spaces:mode:${userId}` : "spaces:mode:anon";
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<SpacesMode | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(storageKey(user?.id));
    setModeState(v === "buyer" || v === "owner" || v === "agent" ? v : null);
    setReady(true);
  }, [user?.id]);

  const setMode = useCallback(
    (m: SpacesMode) => {
      setModeState(m);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(user?.id), m);
      }
    },
    [user?.id],
  );

  return <ModeContext.Provider value={{ mode, setMode, ready }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
