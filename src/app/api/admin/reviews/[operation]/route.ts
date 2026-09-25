import { NextResponse } from "next/server";
import type { ReviewStatus } from "@/contracts/reviews";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { failure } from "@/lib/api/result";
import { getReviewService } from "@/modules/participation/reviews/runtime";
import type { ReviewModerator } from "@/modules/participation/reviews/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses: Readonly<Record<string, number>> = { VALIDATION_ERROR: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, TEMPORARILY_UNAVAILABLE: 503 };
const response = (result: { readonly ok: boolean; readonly error?: { readonly code: string } }): Response => NextResponse.json(result, { status: result.ok ? 200 : (statuses[result.error?.code ?? ""] ?? 500), headers: { "cache-control": "no-store" } });

async function moderator(request: Request): Promise<{ readonly ok: true; readonly actor: ReviewModerator } | { readonly ok: false; readonly response: Response }> {
  try {
    const principal = await getIdentityService().requirePermission(readSessionCookie(request), "reviews:moderate");
    return { ok: true, actor: { adminId: principal.user.id, permissions: principal.permissions } };
  } catch (error) {
    const fault = error instanceof AuthFault ? error : new AuthFault("TEMPORARILY_UNAVAILABLE", "The account service is temporarily unavailable.");
    return { ok: false, response: response(failure(fault.code)) };
  }
}

export async function GET(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  const authorization = await moderator(request);
  if (!authorization.ok) return authorization.response;
  if ((await context.params).operation !== "list") return response(failure("NOT_FOUND"));
  const query = new URL(request.url).searchParams;
  return response(await getReviewService().listForModeration(authorization.actor, {
    ...(query.has("page") ? { page: Number(query.get("page")) } : {}),
    ...(query.has("pageSize") ? { pageSize: Number(query.get("pageSize")) } : {}),
  }));
}

export async function POST(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return response(failure("FORBIDDEN"));
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response(failure("VALIDATION_ERROR"));
  const authorization = await moderator(request);
  if (!authorization.ok) return authorization.response;
  if ((await context.params).operation !== "moderate") return response(failure("NOT_FOUND"));
  let input: unknown;
  try { input = await request.json(); } catch { return response(failure("VALIDATION_ERROR")); }
  const value = typeof input === "object" && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return response(await getReviewService().moderate(
    authorization.actor,
    typeof value["reviewId"] === "string" ? value["reviewId"] : "",
    value["status"] as ReviewStatus,
  ));
}
