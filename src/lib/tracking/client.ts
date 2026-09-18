import type { ApiResult } from "../../contracts/common";
import type { ShipmentTrackingDto, TrackingApi } from "../../contracts/tracking";

function result<T>(value: unknown): value is ApiResult<T> {
  return typeof value === "object" && value !== null && "ok" in value
    && ((value as { ok?: unknown }).ok === true || (value as { ok?: unknown }).ok === false);
}

export function createTrackingHttpClient(fetcher: typeof fetch = fetch): TrackingApi {
  return {
    get: async ({ orderId }) => {
      try {
        const response = await fetcher(`/api/tracking?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store", credentials: "same-origin" });
        const value: unknown = await response.json();
        return result<ShipmentTrackingDto>(value)
          ? value
          : { ok: false, error: { code: "INTEGRATION_ERROR", message: "The tracking response was invalid." } };
      } catch {
        return { ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "Tracking is temporarily unavailable." } };
      }
    },
  };
}
