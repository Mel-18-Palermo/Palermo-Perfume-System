import { NextResponse } from "next/server";
import { failure } from "@/lib/api/result";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { getAdminOrdersService } from "@/modules/administration/orders-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses: Readonly<Record<string, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TEMPORARILY_UNAVAILABLE: 503,
};

function response(result: { readonly ok: boolean; readonly error?: { readonly code: string } }): Response {
  return NextResponse.json(result, {
    status: result.ok ? 200 : (statuses[result.error?.code ?? ""] ?? 500),
    headers: { "cache-control": "no-store" },
  });
}

async function authorize(request: Request): Promise<Response | null> {
  try {
    await getIdentityService().requirePermission(readSessionCookie(request), "orders:read");
    return null;
  } catch (error) {
    const fault = error instanceof AuthFault
      ? error
      : new AuthFault("TEMPORARILY_UNAVAILABLE", "The account service is temporarily unavailable.");
    return response(failure(fault.code));
  }
}

export async function GET(request: Request): Promise<Response> {
  const denied = await authorize(request);
  if (denied) return denied;

  const query = new URL(request.url).searchParams;
  return response(await getAdminOrdersService().list({
    ...(query.has("page") ? { page: Number(query.get("page")) } : {}),
    ...(query.has("pageSize") ? { pageSize: Number(query.get("pageSize")) } : {}),
  }));
}
