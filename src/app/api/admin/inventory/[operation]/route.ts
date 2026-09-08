import { NextResponse } from "next/server";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { getInventoryService } from "@/modules/inventory/runtime";
import type { RecordBatchInput } from "@/modules/inventory/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function status(result: { ok: boolean; error?: { code: string } }): number {
  if (result.ok) return 200;
  return ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, VALIDATION_ERROR: 400 })
    [result.error?.code ?? ""] ?? 500;
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
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Use a JSON request body." } },
      { status: 400 },
    );
  }
  let principal;
  try {
    principal = await getIdentityService().requirePermission(readSessionCookie(request), "inventory:manage");
  } catch (error) {
    const fault = error instanceof AuthFault
      ? error
      : new AuthFault("TEMPORARILY_UNAVAILABLE", "The account service is temporarily unavailable.");
    return NextResponse.json(
      { ok: false, error: { code: fault.code, message: fault.message } },
      { status: status({ ok: false, error: fault }) },
    );
  }
  let input: Record<string, unknown>;
  try {
    input = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "Use valid JSON." } },
      { status: 400 },
    );
  }
  const actor = { adminId: principal.user.id, permissions: principal.permissions };
  const operation = (await context.params).operation;
  const service = getInventoryService();
  const result = operation === "batch-create"
    ? await service.recordBatch(actor, input as unknown as RecordBatchInput)
    : operation === "batch-release"
      ? await service.releaseBatch(
          actor,
          typeof input.id === "string" ? input.id : "",
          typeof input.idempotencyKey === "string" ? input.idempotencyKey : "",
        )
      : { ok: false as const, error: { code: "NOT_FOUND" as const, message: "Inventory operation not found." } };
  return NextResponse.json(result, { status: status(result) });
}
