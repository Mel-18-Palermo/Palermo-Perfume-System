import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { getOrdersService } from "@/modules/commerce/orders/runtime";
import { ordersApi } from "@/modules/commerce/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function status(result: { ok: boolean; error?: { code: string } }): number {
  if (result.ok) return 200;
  return ({
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION_ERROR: 400,
    TEMPORARILY_UNAVAILABLE: 503,
  })[result.error?.code ?? ""] ?? 500;
}

async function customer(request: Request): Promise<string | null> {
  const principal = await getIdentityService().principal(readSessionCookie(request));
  return principal?.user.role === "CUSTOMER" ? principal.user.id : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ operation: string }> },
): Promise<Response> {
  const customerId = await customer(request);
  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } },
      { status: 401 },
    );
  }
  const operation = (await context.params).operation;
  const api = ordersApi(getOrdersService(), customerId);
  const url = new URL(request.url);
  const result = operation === "list"
    ? await api.list({
        page: Number(url.searchParams.get("page") ?? 1),
        pageSize: Number(url.searchParams.get("pageSize") ?? 20),
      })
    : operation === "detail"
      ? await api.get({ id: url.searchParams.get("id") ?? "" })
      : operation === "invoice"
        ? await api.getInvoice({ orderId: url.searchParams.get("id") ?? "" })
        : { ok: false as const, error: { code: "NOT_FOUND" as const, message: "Order operation not found." } };
  return NextResponse.json(result, { status: status(result), headers: { "cache-control": "no-store" } });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "A same-origin request is required." } },
      { status: 403 },
    );
  }
  const customerId = await customer(request);
  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } },
      { status: 401 },
    );
  }
  if ((await context.params).operation !== "cancel") {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Order operation not found." } },
      { status: 404 },
    );
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Use a JSON request body." } },
      { status: 400 },
    );
  }
  let input: { orderId?: string; idempotencyKey?: string };
  try {
    input = await request.json() as { orderId?: string; idempotencyKey?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Use valid JSON." } },
      { status: 400 },
    );
  }
  const result = await ordersApi(getOrdersService(), customerId).requestCancellation({
    orderId: input.orderId ?? "",
    idempotencyKey: input.idempotencyKey ?? "",
  });
  return NextResponse.json(result, { status: status(result), headers: { "cache-control": "no-store" } });
}
