import { NextResponse } from "next/server";
import { AuthFault } from "@/lib/auth/errors";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { getInventoryService } from "@/modules/inventory/runtime";
import type {
  InventoryActor,
  RecordBatchInput,
} from "@/modules/inventory/service";

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
    INTEGRATION_ERROR: 502,
    INTERNAL_ERROR: 500,
  })[result.error?.code ?? ""] ?? 500;
}

async function inventoryActor(
  request: Request,
): Promise<
  | { ok: true; actor: InventoryActor }
  | { ok: false; response: Response }
> {
  try {
    const principal = await getIdentityService().requirePermission(
      readSessionCookie(request),
      "inventory:manage",
    );

    return {
      ok: true,
      actor: {
        adminId: principal.user.id,
        permissions: principal.permissions,
      },
    };
  } catch (error) {
    const fault = error instanceof AuthFault
      ? error
      : new AuthFault(
          "TEMPORARILY_UNAVAILABLE",
          "The account service is temporarily unavailable.",
        );

    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: fault.code,
            message: fault.message,
          },
        },
        {
          status: status({
            ok: false,
            error: fault,
          }),
        },
      ),
    };
  }
}

function pageRequest(request: Request): {
  page?: number;
  pageSize?: number;
} {
  const url = new URL(request.url);

  const rawPage = url.searchParams.get("page");
  const rawPageSize = url.searchParams.get("pageSize");

  return {
    ...(rawPage !== null ? { page: Number(rawPage) } : {}),
    ...(rawPageSize !== null ? { pageSize: Number(rawPageSize) } : {}),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ operation: string }> },
): Promise<Response> {
  const authorization = await inventoryActor(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  const operation = (await context.params).operation;
  const service = getInventoryService();
  const input = pageRequest(request);

  const result = operation === "inventory"
    ? await service.listInventory(authorization.actor, input)
    : operation === "batches"
      ? await service.listBatches(authorization.actor, input)
      : {
          ok: false as const,
          error: {
            code: "NOT_FOUND" as const,
            message: "Inventory operation not found.",
          },
        };

  return NextResponse.json(result, {
    status: status(result),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "A same-origin request is required.",
        },
      },
      { status: 403 },
    );
  }

  if (!request.headers.get("content-type")
    ?.toLowerCase()
    .startsWith("application/json")) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Use a JSON request body.",
        },
      },
      { status: 400 },
    );
  }

  const authorization = await inventoryActor(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  let input: Record<string, unknown>;

  try {
    input = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Use valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const operation = (await context.params).operation;
  const service = getInventoryService();

  const result = operation === "batch-create"
    ? await service.recordBatch(
        authorization.actor,
        input as unknown as RecordBatchInput,
      )
    : operation === "batch-release"
      ? await service.releaseBatch(
          authorization.actor,
          typeof input.id === "string" ? input.id : "",
          typeof input.idempotencyKey === "string"
            ? input.idempotencyKey
            : "",
        )
      : {
          ok: false as const,
          error: {
            code: "NOT_FOUND" as const,
            message: "Inventory operation not found.",
          },
        };

  return NextResponse.json(result, {
    status: status(result),
  });
}
