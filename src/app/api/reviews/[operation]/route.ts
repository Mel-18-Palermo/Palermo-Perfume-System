import { NextResponse } from "next/server";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { failure } from "@/lib/api/result";
import { getReviewService } from "@/modules/participation/reviews/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const status = (result: { readonly ok: boolean; readonly error?: { readonly code: string } }): number => result.ok
  ? 200
  : ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, VALIDATION_ERROR: 400 }[result.error?.code ?? ""] ?? 500);
const response = (result: { readonly ok: boolean; readonly error?: { readonly code: string } }): Response => NextResponse.json(result, { status: status(result), headers: { "cache-control": "no-store" } });

async function customer(request: Request): Promise<{ readonly customerId: string } | Response> {
  try {
    const principal = await getIdentityService().requireCustomer(readSessionCookie(request));
    return { customerId: principal.user.id };
  } catch (error) {
    const fault = error instanceof AuthFault ? error : new AuthFault("TEMPORARILY_UNAVAILABLE", "The account service is temporarily unavailable.");
    return response(failure(fault.code));
  }
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export async function GET(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  if ((await context.params).operation !== "public") return response(failure("NOT_FOUND"));
  return response(await getReviewService().publicForPerfume(new URL(request.url).searchParams.get("perfumeId") ?? ""));
}

export async function POST(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return response(failure("FORBIDDEN"));
  const actor = await customer(request);
  if (actor instanceof Response) return actor;
  const input = await body(request);
  if (!input) return response(failure("VALIDATION_ERROR"));
  const operation = (await context.params).operation;
  const service = getReviewService();
  const rating = typeof input["rating"] === "number" ? input["rating"] : Number.NaN;
  const text = typeof input["text"] === "string" ? input["text"] : "";
  if (operation === "create") return response(await service.create(actor, { perfumeId: typeof input["perfumeId"] === "string" ? input["perfumeId"] : "", rating, text }));
  if (operation === "update") return response(await service.update(actor, typeof input["reviewId"] === "string" ? input["reviewId"] : "", { rating, text }));
  return response(failure("NOT_FOUND"));
}
