import type { ApiResult, AppError, AppErrorCode } from "../../contracts/common";

const messages = {
  VALIDATION_ERROR: "Check the supplied values.",
  UNAUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "You do not have access to this action.",
  NOT_FOUND: "The requested item was not found.",
  CONFLICT: "This information changed. Reload it before trying again.",
  TEMPORARILY_UNAVAILABLE: "This service is temporarily unavailable. Try again later.",
  INTEGRATION_ERROR: "The connected service could not complete this request.",
  INTERNAL_ERROR: "The request could not be completed.",
} satisfies Record<AppErrorCode, string>;

export function success<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function failure(code: AppErrorCode, fieldErrors?: AppError["fieldErrors"]): ApiResult<never> {
  const error: AppError = fieldErrors === undefined
    ? { code, message: messages[code] }
    : { code, message: messages[code], fieldErrors };
  return { ok: false, error };
}
