import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ListingSource = "owner" | "dalali" | "agency" | "developer";

const cache = new Map<string, ListingSource>();
const listeners = new Map<string, Set<(s: ListingSource) => void>>();
let queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  const ids = [...queue];
  queue = new Set();
  timer = null;
  if (!ids.length) return;
  const { data } = await supabase.rpc("listing_sources", { _ids: ids });
  for (const row of (data ?? []) as { property_id: string; source: ListingSource }[]) {
    cache.set(row.property_id, row.source);
    listeners.get(row.property_id)?.forEach((fn) => fn(row.source));
    listeners.delete(row.property_id);
  }
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Who listed a property (Owner / Dalali / Agency), batched across cards. */
export function useListingSource(id: string): ListingSource | null {
  const [src, setSrc] = useState<ListingSource | null>(() => cache.get(id) ?? null);
  useEffect(() => {
    if (!UUID.test(id)) return;
    if (cache.has(id)) { setSrc(cache.get(id)!); return; }
    const set = listeners.get(id) ?? new Set();
    set.add(setSrc);
    listeners.set(id, set);
    queue.add(id);
    if (!timer) timer = setTimeout(flush, 30);
    return () => { listeners.get(id)?.delete(setSrc); };
  }, [id]);
  return src;
}
