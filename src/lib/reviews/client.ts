import type { ApiResult } from "../../contracts/common";
import type { PublicReview, ReviewsApi } from "../../contracts/reviews";

function validResult<T>(value: unknown): value is ApiResult<T> {
  return typeof value === "object" && value !== null && "ok" in value
    && ((value as { ok?: unknown }).ok === true || (value as { ok?: unknown }).ok === false);
}

async function call<T>(path: string, input: unknown | undefined, fetcher: typeof fetch): Promise<ApiResult<T>> {
  try {
    const response = await fetcher(`/api/reviews/${path}`, {
      method: input === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      ...(input === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
    });
    const value: unknown = await response.json();
    return validResult<T>(value) ? value : { ok: false, error: { code: "INTEGRATION_ERROR", message: "The reviews response was invalid." } };
  } catch {
    return { ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "The reviews service is temporarily unavailable." } };
  }
}

export function createReviewsHttpClient(fetcher: typeof fetch = fetch): ReviewsApi {
  return {
    publicForPerfume: input => call<readonly PublicReview[]>(`public?perfumeId=${encodeURIComponent(input.perfumeId)}`, undefined, fetcher),
    create: input => call("create", input, fetcher),
    update: input => call("update", input, fetcher),
  };
}
