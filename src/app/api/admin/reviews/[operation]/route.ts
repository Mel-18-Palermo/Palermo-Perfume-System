import { NextResponse } from "next/server";
import type { ReviewStatus } from "@/contracts/reviews";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { failure } from "@/lib/api/result";
import { getReviewService } from "@/modules/participation/reviews/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses: Readonly<Record<string, number>> = { VALIDATION_ERROR: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, TEMPORARILY_UNAVAILABLE: 503 };
const response = (result: { readonly ok: boolean; readonly error?: { readonly code: string } }): Response => NextResponse.json(result, { status: result.ok ? 200 : (statuses[result.error?.code ?? ""] ?? 500), headers: { "cache-control": "no-store" } });

export async function POST(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return response(failure("FORBIDDEN"));
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response(failure("VALIDATION_ERROR"));
  let principal;
  try { principal = await getIdentityService().requirePermission(readSessionCookie(request), "reviews:moderate"); }
  catch (error) { const fault = error instanceof AuthFault ? error : new AuthFault("TEMPORARILY_UNAVAILABLE", "The account service is temporarily unavailable."); return response(failure(fault.code)); }
  if ((await context.params).operation !== "moderate") return response(failure("NOT_FOUND"));
  let input: unknown;
  try { input = await request.json(); } catch { return response(failure("VALIDATION_ERROR")); }
  const value = typeof input === "object" && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return response(await getReviewService().moderate(
    { adminId: principal.user.id, permissions: principal.permissions },
    typeof value["reviewId"] === "string" ? value["reviewId"] : "",
    value["status"] as ReviewStatus,
  ));
}
