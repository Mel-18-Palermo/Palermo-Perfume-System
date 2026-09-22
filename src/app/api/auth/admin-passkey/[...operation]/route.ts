import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie, setSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { sameApprovedOrigin, webAuthnConfig } from "@/lib/auth/webauthn-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ operation: string[] }> };
const generic = "Passkey authentication could not be completed.";

function result(value: unknown, status = 200): NextResponse {
  return NextResponse.json(value, { status, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
async function json(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AuthFault("VALIDATION_ERROR", "Use a JSON request body.");
  const value: unknown = await request.json();
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AuthFault("VALIDATION_ERROR", "Use a JSON object request body.");
  return value as Record<string, unknown>;
}
function email(value: unknown): string {
  if (typeof value !== "string" || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new AuthFault("VALIDATION_ERROR", generic);
  return value.trim().toLowerCase();
}
function label(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > 120) throw new AuthFault("VALIDATION_ERROR", generic);
  return value.trim();
}
function response(value: unknown): AuthenticationResponseJSON | RegistrationResponseJSON {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AuthFault("VALIDATION_ERROR", generic);
  return value as AuthenticationResponseJSON | RegistrationResponseJSON;
}

export async function POST(request: Request, context: Context): Promise<Response> {
  const requestId = randomUUID();
  try {
    if (!sameApprovedOrigin(request)) throw new AuthFault("FORBIDDEN", "A same-origin request is required.");
    const input = await json(request); const operation = (await context.params).operation.join("/");
    const service = getIdentityService(); const config = webAuthnConfig(request);
    if (operation === "register/options") {
      const principal = await service.principal(readSessionCookie(request));
      if (principal?.user.role !== "ADMIN") throw new AuthFault("UNAUTHENTICATED", "An administrator session is required.");
      return result({ ok: true, data: { options: await service.passkeyRegistrationOptions(principal.user.id, config) } });
    }
    if (operation === "register/verify") {
      const principal = await service.principal(readSessionCookie(request));
      if (principal?.user.role !== "ADMIN") throw new AuthFault("UNAUTHENTICATED", "An administrator session is required.");
      await service.verifyPasskeyRegistration(principal.user.id, response(input["response"]) as RegistrationResponseJSON, label(input["label"]), config);
      return result({ ok: true, data: { registered: true } });
    }
    if (operation === "login/options") return result({ ok: true, data: { options: await service.passkeyAuthenticationOptions(email(input["email"]), config) } });
    if (operation === "login/verify") {
      const login = await service.verifyPasskeyAuthentication(email(input["email"]), response(input["response"]) as AuthenticationResponseJSON, config);
      await service.logout(readSessionCookie(request));
      const reply = result({ ok: true, data: login.session }); setSessionCookie(reply, login); return reply;
    }
    return result({ ok: false, error: { code: "NOT_FOUND", message: "Passkey operation not found." } }, 404);
  } catch (error) {
    const fault = error instanceof AuthFault ? error : new AuthFault("UNAUTHENTICATED", generic);
    if (!(error instanceof AuthFault)) console.error(JSON.stringify({ event: "passkey.failure", requestId }));
    const status = fault.code === "FORBIDDEN" ? 403 : fault.code === "VALIDATION_ERROR" ? 400 : fault.code === "NOT_FOUND" ? 404 : 401;
    return result({ ok: false, error: { code: fault.code, message: fault.code === "FORBIDDEN" ? fault.message : generic } }, status);
  }
}
