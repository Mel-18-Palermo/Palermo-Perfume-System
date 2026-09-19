import type { ApiResult } from "@/contracts/common";

/**
 * The canonical client contract only promises a resolved ApiResult, but a transport can still
 * reject outright (a network failure, or a non-JSON error response). Treat that the same as a
 * TEMPORARILY_UNAVAILABLE result instead of letting it surface as an unhandled rejection.
 */
export async function safeResult<T>(call: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  try {
    return await call();
  } catch {
    return {
      ok: false,
      error: { code: "TEMPORARILY_UNAVAILABLE", message: "This service is temporarily unavailable. Try again later." },
    };
  }
}
