import { NextResponse } from "next/server";
import type { SupportIntent } from "@/contracts/support";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { failure } from "@/lib/api/result";
import { getSupportService } from "@/modules/support/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses: Readonly<Record<string, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TEMPORARILY_UNAVAILABLE: 503,
  INTEGRATION_ERROR: 502,
  INTERNAL_ERROR: 500,
};

function response(result: { readonly ok: boolean; readonly error?: { readonly code: string } }): Response {
  return NextResponse.json(result, {
    status: result.ok ? 200 : (statuses[result.error?.code ?? ""] ?? 500),
    headers: { "cache-control": "no-store" },
  });
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return response(failure("FORBIDDEN"));
  }

  const input = await body(request);
  if (!input) return response(failure("VALIDATION_ERROR"));

  const principal = await getIdentityService().principal(readSessionCookie(request));
  const customerId = principal?.user.role === "CUSTOMER" ? principal.user.id : undefined;
  const operation = (await context.params).operation;
  const service = getSupportService();

  if (operation === "ask") {
    return response(await service.ask({
      ...(customerId ? { customerId } : {}),
      intent: input["intent"] as SupportIntent,
      message: typeof input["message"] === "string" ? input["message"] : "",
      ...(typeof input["orderId"] === "string" ? { orderId: input["orderId"] } : {}),
    }));
  }

  if (operation === "feedback") {
    return response(await service.feedback(
      customerId,
      typeof input["conversationId"] === "string" ? input["conversationId"] : "",
      typeof input["rating"] === "number" ? input["rating"] : Number.NaN,
      typeof input["comment"] === "string" ? input["comment"] : undefined,
    ));
  }

  return response(failure("NOT_FOUND"));
}
