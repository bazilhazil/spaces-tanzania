import { sendEventNotification } from "./emails.functions";

export type AppEmailEvent =
  | "lead_created"
  | "viewing_requested"
  | "viewing_updated"
  | "deal_updated"
  | "property_approved"
  | "property_changes";

/**
 * Fire-and-forget email for an app event. Email is a courtesy on top of the
 * in-app notification — a delivery problem must never break the workflow the
 * user just completed, so failures are only logged.
 */
export function notifyByEmail(event: AppEmailEvent, recordId?: string | null) {
  if (!recordId) return;
  void sendEventNotification({ data: { event, recordId } })
    .then((result) => {
      if (!result?.ok && import.meta.env.DEV) {
        console.warn("[email] not sent", event, result?.reason);
      }
    })
    .catch(() => {
      /* delivery problems never surface to the user */
    });
}
