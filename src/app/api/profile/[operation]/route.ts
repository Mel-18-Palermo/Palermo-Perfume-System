import { NextResponse } from "next/server";
import type { ApiResult } from "@/contracts/common";
import type { CustomerProfile } from "@/contracts/profile";
import { readSessionCookie } from "@/lib/auth/http";
import { AuthFault } from "@/lib/auth/errors";
import { getIdentityService } from "@/lib/auth/runtime";
import { getProfileService } from "@/modules/identity/profile-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ operation: string }> };
async function body(request: Request): Promise<unknown> { try { return await request.json(); } catch { return null; } }
function response(result: ApiResult<unknown>, status = result.ok ? 200 : result.error.code === "UNAUTHENTICATED" ? 401 : result.error.code === "FORBIDDEN" ? 403 : result.error.code === "NOT_FOUND" ? 404 : result.error.code === "CONFLICT" ? 409 : 400): NextResponse { return NextResponse.json(result, { status, headers: { "cache-control": "no-store" } }); }
export async function GET(request: Request, context: Context): Promise<Response> {
  if ((await context.params).operation !== "get") return response({ ok: false, error: { code: "NOT_FOUND", message: "Profile operation not found." } }, 404);
  const principal = await getIdentityService().principal(readSessionCookie(request));
  return response(await getProfileService().get({ customerId: principal?.user.role === "CUSTOMER" ? principal.user.id : "" }));
}
export async function POST(request: Request, context: Context): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return response({ ok: false, error: { code: "FORBIDDEN", message: "A same-origin request is required." } }, 403);
  const principal = await getIdentityService().principal(readSessionCookie(request));
  const operation = (await context.params).operation;
  if (principal?.user.role !== "CUSTOMER") return response({ ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, 401);
  const input = await body(request); if (typeof input !== "object" || input === null || Array.isArray(input)) return response({ ok: false, error: { code: "VALIDATION_ERROR", message: "Use a JSON object request body." } }, 400);
  const service = getProfileService(); let result: ApiResult<CustomerProfile> | ApiResult<{ acknowledged: true }>;
  const actor = { customerId: principal.user.id };
  if (operation === "update") result = await service.update(actor, input as never);
  else if (operation === "delivery-address") result = await service.setDeliveryAddress(actor, input as never);
  else if (operation === "billing-address") result = await service.setBillingAddress(actor, input as never);
  else if (operation === "generate-identity") result = await service.generateIdentity(actor, input as never);
  else if (operation === "deactivate") { try { await getIdentityService().deactivate(readSessionCookie(request)); result = { ok: true, data: { acknowledged: true } }; } catch (error) { const fault = error instanceof AuthFault ? error : new AuthFault("TEMPORARILY_UNAVAILABLE", "The account service is temporarily unavailable."); result = { ok: false, error: { code: fault.code, message: fault.message } }; } }
  else return response({ ok: false, error: { code: "NOT_FOUND", message: "Profile operation not found." } }, 404);
  return response(result);
}
