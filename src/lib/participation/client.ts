import type { ApiResult } from "../../contracts/common";
import type { ParticipationApi } from "../../contracts/participation";

function validResult<T>(value: unknown): value is ApiResult<T> {
  return typeof value === "object" && value !== null && "ok" in value
    && ((value as { ok?: unknown }).ok === true || (value as { ok?: unknown }).ok === false);
}

async function call<T>(operation: string, input: unknown, fetcher: typeof fetch): Promise<ApiResult<T>> {
  try {
    const response = await fetcher(`/api/participation/${operation}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const value: unknown = await response.json();
    return validResult<T>(value) ? value : { ok: false, error: { code: "INTEGRATION_ERROR", message: "The participation response was invalid." } };
  } catch {
    return { ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "The participation service is temporarily unavailable." } };
  }
}

export function createParticipationHttpClient(fetcher: typeof fetch = fetch): ParticipationApi {
  return {
    setSubscription: input => call("subscription", input, fetcher),
    referralCode: () => call("referral-code", {}, fetcher),
    applyReferral: input => call("apply-referral", input, fetcher),
  };
}
