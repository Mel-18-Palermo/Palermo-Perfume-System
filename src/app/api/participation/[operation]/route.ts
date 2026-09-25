import { NextResponse } from "next/server";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { failure } from "@/lib/api/result";
import { getParticipationService } from "@/modules/participation/loyalty/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const status = (result: { readonly ok: boolean; readonly error?: { readonly code: string } }): number => result.ok ? 200 : ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, VALIDATION_ERROR: 400 }[result.error?.code ?? ""] ?? 500);
const response = (result: { readonly ok: boolean; readonly error?: { readonly code: string } }): Response => NextResponse.json(result, { status: status(result), headers: { "cache-control": "no-store" } });

async function body(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  try { const value: unknown = await request.json(); return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null; }
  catch { return null; }
}

export async function POST(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return response(failure("FORBIDDEN"));
  let customerId: string;
  try { customerId = (await getIdentityService().requireCustomer(readSessionCookie(request))).user.id; }
  catch (error) { const fault = error instanceof AuthFault ? error : new AuthFault("TEMPORARILY_UNAVAILABLE", "The account service is temporarily unavailable."); return response(failure(fault.code)); }
  const operation = (await context.params).operation;
  const service = getParticipationService();
  if (operation === "referral-code") return response(await service.referralCode(customerId));
  const input = await body(request);
  if (!input) return response(failure("VALIDATION_ERROR"));
  if (operation === "subscription") {
    if (typeof input["optedIn"] !== "boolean") return response(failure("VALIDATION_ERROR"));
    return response(await service.setSubscription(customerId, input["optedIn"]));
  }
  if (operation === "apply-referral") return response(await service.applyReferral(customerId, typeof input["code"] === "string" ? input["code"] : ""));
  return response(failure("NOT_FOUND"));
}
