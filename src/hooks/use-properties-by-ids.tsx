import { useEffect, useState } from "react";
import { fetchPropertiesByIds } from "@/lib/properties-db";
import type { Property } from "@/lib/mock-data";

/**
 * Loads real property records from the database for a list of IDs.
 * The database is the single source of truth — nothing here is hardcoded.
 */
export function usePropertiesByIds(ids: string[]) {
  const key = ids.join(",");
  const [map, setMap] = useState<Map<string, Property>>(new Map());
  const [loading, setLoading] = useState(ids.length > 0);

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(",").filter(Boolean) : [];
    if (!list.length) {
      setMap(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPropertiesByIds(list)
      .then((rows) => {
        if (cancelled) return;
        setMap(new Map(rows.map((p) => [p.id, p])));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { map, loading };
}
