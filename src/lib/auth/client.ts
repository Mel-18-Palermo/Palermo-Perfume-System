import type { AuthApi, Session } from "../../contracts/auth";
import type { Acknowledgement, ApiResult, AppErrorCode } from "../../contracts/common";

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function session(value: unknown): value is Session {
  if (!record(value)) return false;
  const user = value["user"];
  return user === null || (record(user) && typeof user["id"] === "string" && typeof user["email"] === "string" && typeof user["displayName"] === "string" && (user["role"] === "CUSTOMER" || user["role"] === "ADMIN"));
}
const codes = new Set<string>(["VALIDATION_ERROR", "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "TEMPORARILY_UNAVAILABLE", "INTEGRATION_ERROR", "INTERNAL_ERROR"] satisfies AppErrorCode[]);
function errorCode(value: unknown): value is AppErrorCode { return typeof value === "string" && codes.has(value); }
const acknowledged = (value: unknown): value is Acknowledgement => record(value) && value["acknowledged"] === true;
const pending = (value: unknown): value is { status: "PENDING_VERIFICATION" } => record(value) && value["status"] === "PENDING_VERIFICATION";
const active = (value: unknown): value is { status: "ACTIVE" } => record(value) && value["status"] === "ACTIVE";

/** Cookies remain HttpOnly; this adapter never reads or exposes an authentication token. */
export function createAuthHttpClient(fetcher: typeof fetch = fetch): AuthApi {
  async function call<T>(operation: string, input: unknown, valid: (value: unknown) => value is T, method = "POST"): Promise<ApiResult<T>> {
    try {
      const response = await fetcher(`/api/auth/${operation}`, { method, credentials: "same-origin", cache: "no-store", ...(method === "POST" ? { headers: { "content-type": "application/json" }, body: JSON.stringify(input ?? {}) } : {}) });
      const value: unknown = await response.json();
      if (record(value)) {
        if (response.ok && value["ok"] === true && valid(value["data"])) return { ok: true, data: value["data"] };
        const error = value["error"];
        if (value["ok"] === false && record(error) && errorCode(error["code"]) && typeof error["message"] === "string") return { ok: false, error: { code: error["code"], message: error["message"] } };
      }
      return { ok: false, error: { code: "INTEGRATION_ERROR", message: "The authentication response was invalid." } };
    } catch { return { ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "Authentication is temporarily unavailable." } }; }
  }
  return {
    register: (input) => call("register", input, pending),
    verify: (input) => call("verify", input, active),
    login: (input) => call("login", input, session),
    adminLogin: (input) => call("admin-login", input, session),
    adminPasskeyLoginOptions: (input) => passkey("login/options", input, (value): value is { options: unknown } => record(value) && "options" in value),
    adminPasskeyLoginVerify: (input) => passkey("login/verify", input, session),
    adminPasskeyRegisterOptions: () => passkey("register/options", {}, (value): value is { options: unknown } => record(value) && "options" in value),
    adminPasskeyRegisterVerify: (input) => passkey("register/verify", input, (value): value is { registered: true } => record(value) && value["registered"] === true),
    logout: () => call("logout", undefined, acknowledged),
    getSession: () => call("session", undefined, session, "GET"),
    requestPasswordReset: (input) => call("request-password-reset", input, acknowledged),
    completePasswordReset: (input) => call("complete-password-reset", input, acknowledged),
  };

  async function passkey<T>(operation: string, input: unknown, valid: (value: unknown) => value is T): Promise<ApiResult<T>> {
    try {
      const response = await fetcher(`/api/auth/admin-passkey/${operation}`, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const value: unknown = await response.json();
      if (record(value) && value["ok"] === true && valid(value["data"])) return { ok: true, data: value["data"] };
      const error = record(value) ? value["error"] : null;
      if (record(error) && errorCode(error["code"]) && typeof error["message"] === "string") return { ok: false, error: { code: error["code"], message: error["message"] } };
    } catch { /* normalized below */ }
    return { ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "Authentication is temporarily unavailable." } };
  }
}
