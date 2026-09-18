import { describe, expect, it, vi } from "vitest";
import { createTrackingHttpClient } from "../../src/lib/tracking/client";

describe("tracking HTTP client", () => {
  it("uses the canonical endpoint and returns its typed result", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      data: { shipmentId: "shipment-1", orderId: "order-1", status: "PENDING", trackingReference: "PALERMO-1", events: [], updatedAt: "2026-09-08T00:00:00.000Z", confirmation: null },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await createTrackingHttpClient(fetcher).get({ orderId: "order-1" });
    expect(result).toMatchObject({ ok: true, data: { orderId: "order-1" } });
    expect(fetcher).toHaveBeenCalledWith("/api/tracking?orderId=order-1", { cache: "no-store", credentials: "same-origin" });
  });

  it("maps transport failure to a typed temporary-unavailable result", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    await expect(createTrackingHttpClient(fetcher).get({ orderId: "order-1" })).resolves.toMatchObject({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE" } });
  });
});
