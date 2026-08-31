/**
 * Lightweight analytics hook-up. Events are pushed to `window.dataLayer`
 * (GA4 / GTM ready) — no personal information is collected, only listing ids
 * and coarse filter values.
 */
export type AnalyticsEvent =
  | "property_viewed"
  | "search_performed"
  | "filter_used"
  | "favorite_added"
  | "contact_clicked"
  | "whatsapp_clicked"
  | "viewing_requested"
  | "property_shared"
  | "find_space_clicked"
  | "list_space_clicked"
  | "save_search_clicked"
  | "signup_completed"
  | "listing_published";

type Payload = Record<string, string | number | boolean | undefined>;

export function track(event: AnalyticsEvent, payload: Payload = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event, ...payload });
}
