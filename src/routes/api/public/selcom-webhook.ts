import { createFileRoute } from "@tanstack/react-router";

/**
 * Selcom payment callback. The payload itself is never trusted: it only tells
 * us which order to re-check. The confirmed result is read back from Selcom
 * before any payment record is updated, and repeated callbacks are ignored
 * once a payment has reached a final state.
 */
export const Route = createFileRoute("/api/public/selcom-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let orderId = "";
        try {
          const text = await request.text();
          try {
            const json = JSON.parse(text) as Record<string, unknown>;
            orderId = String(json["order_id"] ?? json["orderid"] ?? json["reference"] ?? "");
          } catch {
            orderId = new URLSearchParams(text).get("order_id") ?? "";
          }
        } catch {
          orderId = "";
        }

        if (!orderId) {
          const url = new URL(request.url);
          orderId = url.searchParams.get("order_id") ?? "";
        }
        if (!orderId || orderId.length > 64) {
          return Response.json({ received: true }, { status: 200 });
        }

        try {
          const { reconcilePayment } = await import("@/lib/payments.server");
          await reconcilePayment(orderId);
        } catch (e) {
          console.error("[selcom-webhook] reconcile failed", e);
        }

        // Always acknowledge so Selcom does not retry indefinitely.
        return Response.json({ received: true }, { status: 200 });
      },
      GET: async () => Response.json({ ok: true }),
    },
  },
});
