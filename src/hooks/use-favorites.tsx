import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type FavoriteEntry = {
  propertyId: string;
  folderId: string;
  note?: string;
  savedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
};

export type SavedSearch = {
  id: string;
  name: string;
  filters: SearchFilters;
  notifyNewMatches: boolean;
  notifyPriceChanges: boolean;
  notifyVerified: boolean;
  createdAt: string;
  lastRunAt?: string;
  newMatchCount?: number;
};

export type SearchFilters = {
  query?: string;
  listingType?: "sale" | "rent" | "commercial" | "any";
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  verifiedOnly?: boolean;
};

export type RecentEntry = {
  propertyId: string;
  viewedAt: string;
};

type FavState = {
  favorites: FavoriteEntry[];
  folders: Folder[];
  compare: string[];
  recentlyViewed: RecentEntry[];
  savedSearches: SavedSearch[];
};

const DEFAULT_FOLDER: Folder = { id: "all", name: "All Saved", createdAt: new Date(0).toISOString() };

const STORAGE_KEY = "spaces:favorites:v1";
const MAX_COMPARE = 4;
const MAX_RECENT = 24;

function loadState(): FavState {
  if (typeof window === "undefined") {
    return { favorites: [], folders: [DEFAULT_FOLDER], compare: [], recentlyViewed: [], savedSearches: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { favorites: [], folders: [DEFAULT_FOLDER], compare: [], recentlyViewed: [], savedSearches: [] };
    const parsed = JSON.parse(raw) as Partial<FavState>;
    return {
      favorites: parsed.favorites ?? [],
      folders: parsed.folders?.length ? parsed.folders : [DEFAULT_FOLDER],
      compare: parsed.compare ?? [],
      recentlyViewed: parsed.recentlyViewed ?? [],
      savedSearches: parsed.savedSearches ?? [],
    };
  } catch {
    return { favorites: [], folders: [DEFAULT_FOLDER], compare: [], recentlyViewed: [], savedSearches: [] };
  }
}

type Ctx = FavState & {
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string, folderId?: string) => boolean;
  removeFavorite: (id: string) => void;
  moveFavorite: (id: string, folderId: string) => void;
  setNote: (id: string, note: string) => void;
  createFolder: (name: string) => Folder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  isComparing: (id: string) => boolean;
  toggleCompare: (id: string) => { ok: boolean; reason?: string };
  clearCompare: () => void;
  removeFromCompare: (id: string) => void;
  trackView: (id: string) => void;
  clearRecent: () => void;
  saveSearch: (input: Omit<SavedSearch, "id" | "createdAt">) => SavedSearch;
  updateSavedSearch: (id: string, patch: Partial<SavedSearch>) => void;
  deleteSavedSearch: (id: string) => void;
};

const FavContext = createContext<Ctx | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<FavState>(() => ({
    favorites: [],
    folders: [DEFAULT_FOLDER],
    compare: [],
    recentlyViewed: [],
    savedSearches: [],
  }));
  const [hydrated, setHydrated] = useState(false);
  const dbSynced = useRef<string | null>(null);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Load favorites from DB when the user signs in; merge any local-only favs upward.
  useEffect(() => {
    if (!hydrated || !user) {
      dbSynced.current = null;
      return;
    }
    if (dbSynced.current === user.id) return;
    dbSynced.current = user.id;
    (async () => {
      const { data } = await supabase
        .from("favorites")
        .select("property_id,created_at")
        .eq("user_id", user.id);
      const remote: FavoriteEntry[] = (data ?? []).map((r: any) => ({
        propertyId: r.property_id,
        folderId: "all",
        savedAt: r.created_at,
      }));
      // Push local-only favorites the DB doesn't have yet.
      setState((s) => {
        const remoteIds = new Set(remote.map((r) => r.propertyId));
        const localOnly = s.favorites.filter((f) => !remoteIds.has(f.propertyId));
        if (localOnly.length) {
          void supabase
            .from("favorites")
            .insert(localOnly.map((f) => ({ user_id: user.id, property_id: f.propertyId })));
        }
        const merged = [
          ...remote,
          ...localOnly.filter((f) => !remoteIds.has(f.propertyId)),
        ];
        return { ...s, favorites: merged };
      });
    })();
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state, hydrated]);

  const value = useMemo<Ctx>(() => {
    const isFavorite = (id: string) => state.favorites.some((f) => f.propertyId === id);

    return {
      ...state,
      isFavorite,
      toggleFavorite: (id, folderId = "all") => {
        let nowFav = false;
        setState((s) => {
          const exists = s.favorites.some((f) => f.propertyId === id);
          if (exists) {
            nowFav = false;
            return { ...s, favorites: s.favorites.filter((f) => f.propertyId !== id) };
          }
          nowFav = true;
          return {
            ...s,
            favorites: [
              { propertyId: id, folderId, savedAt: new Date().toISOString() },
              ...s.favorites,
            ],
          };
        });
        return nowFav;
      },
      removeFavorite: (id) =>
        setState((s) => ({ ...s, favorites: s.favorites.filter((f) => f.propertyId !== id) })),
      moveFavorite: (id, folderId) =>
        setState((s) => ({
          ...s,
          favorites: s.favorites.map((f) => (f.propertyId === id ? { ...f, folderId } : f)),
        })),
      setNote: (id, note) =>
        setState((s) => ({
          ...s,
          favorites: s.favorites.map((f) => (f.propertyId === id ? { ...f, note } : f)),
        })),
      createFolder: (name) => {
        const folder: Folder = {
          id: `f_${Date.now().toString(36)}`,
          name: name.trim() || "New Folder",
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, folders: [...s.folders, folder] }));
        return folder;
      },
      renameFolder: (id, name) =>
        setState((s) => ({
          ...s,
          folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
        })),
      deleteFolder: (id) =>
        setState((s) => {
          if (id === "all") return s;
          return {
            ...s,
            folders: s.folders.filter((f) => f.id !== id),
            favorites: s.favorites.map((f) => (f.folderId === id ? { ...f, folderId: "all" } : f)),
          };
        }),
      isComparing: (id) => state.compare.includes(id),
      toggleCompare: (id) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setState((s) => {
          if (s.compare.includes(id)) {
            return { ...s, compare: s.compare.filter((c) => c !== id) };
          }
          if (s.compare.length >= MAX_COMPARE) {
            result = { ok: false, reason: `You can compare up to ${MAX_COMPARE} properties.` };
            return s;
          }
          return { ...s, compare: [...s.compare, id] };
        });
        return result;
      },
      clearCompare: () => setState((s) => ({ ...s, compare: [] })),
      removeFromCompare: (id) =>
        setState((s) => ({ ...s, compare: s.compare.filter((c) => c !== id) })),
      trackView: (id) =>
        setState((s) => {
          const filtered = s.recentlyViewed.filter((r) => r.propertyId !== id);
          return {
            ...s,
            recentlyViewed: [{ propertyId: id, viewedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_RECENT),
          };
        }),
      clearRecent: () => setState((s) => ({ ...s, recentlyViewed: [] })),
      saveSearch: (input) => {
        const s: SavedSearch = {
          ...input,
          id: `s_${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({ ...prev, savedSearches: [s, ...prev.savedSearches] }));
        return s;
      },
      updateSavedSearch: (id, patch) =>
        setState((s) => ({
          ...s,
          savedSearches: s.savedSearches.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteSavedSearch: (id) =>
        setState((s) => ({ ...s, savedSearches: s.savedSearches.filter((x) => x.id !== id) })),
    };
  }, [state]);

  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

export const MAX_COMPARE_ITEMS = MAX_COMPARE;
