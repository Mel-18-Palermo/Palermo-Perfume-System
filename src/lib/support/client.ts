import type { ApiResult } from "../../contracts/common";
import type { SupportApi } from "../../contracts/support";

function validResult<T>(value: unknown): value is ApiResult<T> {
  return typeof value === "object" && value !== null && "ok" in value
    && ((value as { ok?: unknown }).ok === true || (value as { ok?: unknown }).ok === false);
}

async function call<T>(operation: string, input: unknown, fetcher: typeof fetch): Promise<ApiResult<T>> {
  try {
    const response = await fetcher(`/api/support/${operation}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const value: unknown = await response.json();
    return validResult<T>(value) ? value : { ok: false, error: { code: "INTEGRATION_ERROR", message: "The support response was invalid." } };
  } catch {
    return { ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "The support service is temporarily unavailable." } };
  }
}

export function createSupportHttpClient(fetcher: typeof fetch = fetch): SupportApi {
  return {
    ask: input => call("ask", input, fetcher),
    feedback: input => call("feedback", input, fetcher),
  };
}
