import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { getDeliveryService } from "@/modules/delivery/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function status(result: { ok: boolean; error?: { code: string } }): number {
  return result.ok ? 200 : ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, INTEGRATION_ERROR: 502 }[result.error?.code ?? ""] ?? 503);
}

export async function GET(request: Request): Promise<Response> {
  const principal = await getIdentityService().principal(readSessionCookie(request));
  if (!principal || principal.user.role !== "CUSTOMER") {
    const result = { ok: false as const, error: { code: "UNAUTHENTICATED" as const, message: "Sign in to view shipment tracking." } };
    return NextResponse.json(result, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const orderId = new URL(request.url).searchParams.get("orderId") ?? "";
  const result = await getDeliveryService().get({ kind: "CUSTOMER", customerId: principal.user.id }, orderId);
  return NextResponse.json(result, { status: status(result), headers: { "cache-control": "no-store" } });
}
