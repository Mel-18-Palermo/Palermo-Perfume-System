import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { getPaymentService } from "@/modules/commerce/payment/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseStatus(result: { ok: boolean; error?: { code: string } }): number {
  if (result.ok) return 200;
  return ({
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION_ERROR: 400,
    TEMPORARILY_UNAVAILABLE: 503,
    INTEGRATION_ERROR: 502,
  })[result.error?.code ?? ""] ?? 500;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
): Promise<Response> {
  const operation = (await context.params).operation;
  const service = getPaymentService();
  if (operation === "webhook") {
    const payload = await request.text();
    const result = await service.webhook(payload, request.headers.get("stripe-signature") ?? "");
    return NextResponse.json(result, { status: responseStatus(result) });
  }
  if (operation !== "initiate") {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Payment operation not found." } },
      { status: 404 },
    );
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "A same-origin request is required." } },
      { status: 403 },
    );
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Use a JSON request body." } },
      { status: 400 },
    );
  }
  const principal = await getIdentityService().principal(readSessionCookie(request));
  if (principal?.user.role !== "CUSTOMER") {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } },
      { status: 401 },
    );
  }
  let input: { orderId?: string };
  try {
    input = await request.json() as { orderId?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Use valid JSON." } },
      { status: 400 },
    );
  }
  const result = await service.initiate(principal.user.id, input.orderId ?? "");
  return NextResponse.json(result, { status: responseStatus(result) });
}
