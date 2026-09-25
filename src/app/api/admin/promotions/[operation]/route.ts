import { NextResponse } from "next/server";
import type { PromotionInput as PromotionContract } from "@/contracts/promotions";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { failure } from "@/lib/api/result";
import { getPromotionalContentService } from "@/modules/promotions/content/runtime";
import type { PromotionInput } from "@/modules/promotions/content/service";
import type { PromotionActor } from "@/modules/promotions/content/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses: Readonly<Record<string, number>> = { VALIDATION_ERROR: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, TEMPORARILY_UNAVAILABLE: 503, INTEGRATION_ERROR: 502 };
const response = (result: { readonly ok: boolean; readonly error?: { readonly code: string } }): Response => NextResponse.json(result, { status: result.ok ? 200 : (statuses[result.error?.code ?? ""] ?? 500), headers: { "cache-control": "no-store" } });

async function manager(request: Request): Promise<{ readonly ok: true; readonly actor: PromotionActor } | { readonly ok: false; readonly response: Response }> {
  try {
    const principal = await getIdentityService().requirePermission(readSessionCookie(request), "promotions:manage");
    return { ok: true, actor: { adminId: principal.user.id, permissions: principal.permissions } };
  } catch (error) {
    const fault = error instanceof AuthFault ? error : new AuthFault("TEMPORARILY_UNAVAILABLE", "The account service is temporarily unavailable.");
    return { ok: false, response: response(failure(fault.code)) };
  }
}

function promotion(value: Record<string, unknown>): PromotionInput | null {
  if (typeof value["code"] !== "string" || (value["discountType"] !== "FIXED" && value["discountType"] !== "PERCENTAGE") || typeof value["discountValue"] !== "number" || typeof value["active"] !== "boolean") return null;
  const parseDate = (input: unknown): Date | null | undefined => {
    if (input === null) return null;
    if (input === undefined) return undefined;
    if (typeof input !== "string") return new Date(Number.NaN);
    return new Date(input);
  };
  const activeFrom = parseDate(value["activeFrom"]);
  const activeUntil = parseDate(value["activeUntil"]);
  if ((activeFrom instanceof Date && Number.isNaN(activeFrom.getTime())) || (activeUntil instanceof Date && Number.isNaN(activeUntil.getTime()))) return null;
  const contract = value as PromotionContract;
  return {
    code: contract.code,
    discountType: contract.discountType,
    discountValue: contract.discountValue,
    active: contract.active,
    ...(typeof contract.currency === "string" || contract.currency === null ? { currency: contract.currency } : {}),
    ...(contract.eligibility !== undefined ? { eligibility: contract.eligibility as Exclude<PromotionInput["eligibility"], undefined> } : {}),
    ...(activeFrom !== undefined ? { activeFrom } : {}),
    ...(activeUntil !== undefined ? { activeUntil } : {}),
  };
}

export async function GET(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  const authorization = await manager(request);
  if (!authorization.ok) return authorization.response;
  const operation = (await context.params).operation;
  const query = new URL(request.url).searchParams;
  const page = {
    ...(query.has("page") ? { page: Number(query.get("page")) } : {}),
    ...(query.has("pageSize") ? { pageSize: Number(query.get("pageSize")) } : {}),
  };
  const service = getPromotionalContentService();
  if (operation === "list-promotions") return response(await service.listPromotions(authorization.actor, page));
  if (operation === "list-content") return response(await service.listContent(authorization.actor, page));
  return response(failure("NOT_FOUND"));
}

export async function POST(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return response(failure("FORBIDDEN"));
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response(failure("VALIDATION_ERROR"));
  const authorization = await manager(request);
  if (!authorization.ok) return authorization.response;
  let input: unknown;
  try { input = await request.json(); } catch { return response(failure("VALIDATION_ERROR")); }
  const value = typeof input === "object" && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const actor = authorization.actor;
  const operation = (await context.params).operation;
  const service = getPromotionalContentService();
  if (operation === "create-promotion" || operation === "update-promotion") {
    const parsed = promotion(value);
    if (!parsed) return response(failure("VALIDATION_ERROR"));
    return response(operation === "create-promotion"
      ? await service.createPromotion(actor, parsed)
      : await service.updatePromotion(actor, typeof value["promotionId"] === "string" ? value["promotionId"] : "", parsed));
  }
  if (operation === "create-content") return response(await service.create(actor, { title: typeof value["title"] === "string" ? value["title"] : "", brief: typeof value["brief"] === "string" ? value["brief"] : "", ...(typeof value["promotionId"] === "string" ? { promotionId: value["promotionId"] } : {}) }));
  if (operation === "generate-content") return response(await service.generate(actor, typeof value["contentId"] === "string" ? value["contentId"] : ""));
  if (operation === "review-content") {
    if (value["status"] !== "APPROVED" && value["status"] !== "REJECTED") return response(failure("VALIDATION_ERROR"));
    return response(await service.review(actor, typeof value["contentId"] === "string" ? value["contentId"] : "", value["status"]));
  }
  return response(failure("NOT_FOUND"));
}
