import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ApiResult, AppErrorCode } from "../../contracts/common";
import type { IdentityService, LoginResult } from "../../modules/identity/service";
import { AuthFault } from "./errors";

export const SESSION_COOKIE = process.env["NODE_ENV"] === "production" ? "__Host-palermo_session" : "palermo_session";
const statuses: Record<AppErrorCode, number> = { VALIDATION_ERROR: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, TEMPORARILY_UNAVAILABLE: 503, INTEGRATION_ERROR: 502, INTERNAL_ERROR: 500 };
const acknowledged = { acknowledged: true } as const;

export function readSessionCookie(request: Request): string | undefined {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

function setSession(response: NextResponse, login?: LoginResult): void {
  response.cookies.set(SESSION_COOKIE, login?.token ?? "", { httpOnly: true, secure: process.env["NODE_ENV"] === "production", sameSite: "lax", path: "/", expires: login?.expiresAt ?? new Date(0) });
}

async function body(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AuthFault("VALIDATION_ERROR", "Use a JSON request body.");
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new AuthFault("VALIDATION_ERROR", "Request body is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new AuthFault("VALIDATION_ERROR", "Use a valid JSON request body."); }
}

/** Injectable route boundary: authorization stays in the service, independent of UI. */
export async function handleAuthRequest(request: Request, operation: string, service: () => IdentityService): Promise<NextResponse> {
  const requestId = randomUUID();
  function response<T>(result: ApiResult<T>, status = 200): NextResponse {
    return NextResponse.json(result, { status, headers: { "cache-control": "no-store", "x-request-id": requestId, "referrer-policy": "no-referrer" } });
  }
  try {
    if (request.method === "GET" && operation === "session") return response({ ok: true, data: await service().session(readSessionCookie(request)) });
    if (request.method !== "POST") return response({ ok: false, error: { code: "NOT_FOUND", message: "Authentication operation not found." } }, 404);
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new AuthFault("FORBIDDEN", "A same-origin request is required.");
    const input = await body(request);
    const auth = service();
    const token = readSessionCookie(request);
    switch (operation) {
      case "register":
        if ((await auth.session(token)).user) throw new AuthFault("CONFLICT", "Log out before registering another account.");
        return response({ ok: true, data: await auth.register(input) }, 201);
      case "verify": return response({ ok: true, data: await auth.verify(input) });
      case "login":
      case "admin-login": {
        const login = await auth.login(input, operation === "admin-login" ? "ADMIN" : "CUSTOMER");
        await auth.logout(token);
        const result = response({ ok: true, data: login.session });
        setSession(result, login);
        return result;
      }
      case "logout": {
        await auth.logout(token);
        const result = response({ ok: true, data: acknowledged });
        setSession(result);
        return result;
      }
      case "deactivate": {
        await auth.deactivate(token);
        const result = response({ ok: true, data: acknowledged });
        setSession(result);
        return result;
      }
      case "request-password-reset": await auth.requestPasswordReset(input); return response({ ok: true, data: acknowledged });
      case "complete-password-reset": {
        await auth.completePasswordReset(input);
        const result = response({ ok: true, data: acknowledged });
        setSession(result);
        return result;
      }
      default: return response({ ok: false, error: { code: "NOT_FOUND", message: "Authentication operation not found." } }, 404);
    }
  } catch (error) {
    const fault = error instanceof AuthFault ? error : new AuthFault("TEMPORARILY_UNAVAILABLE", "Authentication is temporarily unavailable. Try again later.");
    if (statuses[fault.code] >= 500) console.error(JSON.stringify({ event: "auth.failure", requestId, code: fault.code }));
    return response({ ok: false, error: { code: fault.code, message: fault.message } }, statuses[fault.code]);
  }
}
