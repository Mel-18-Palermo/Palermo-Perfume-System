import type {
  AdminApi,
  AdminCatalogueReferences,
  AdminPerfume,
  Dashboard,
  InventoryBalance,
  ProductionBatch,
  ReportingPeriod,
} from "../../contracts/admin";
import type {
  ApiResult,
  Page,
  PageRequest,
} from "../../contracts/common";
import type { PerfumeVariantSummary } from "../../contracts/catalogue";

function result<T>(value: unknown): value is ApiResult<T> {
  return typeof value === "object"
    && value !== null
    && "ok" in value
    && (
      (value as { ok?: unknown }).ok === true
      || (value as { ok?: unknown }).ok === false
    );
}

async function call<T>(
  path: string,
  input: unknown | undefined,
  fetcher: typeof fetch,
): Promise<ApiResult<T>> {
  try {
    const init: RequestInit = {
      method: input === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
    };

    if (input !== undefined) {
      init.headers = {
        "content-type": "application/json",
      };
      init.body = JSON.stringify(input);
    }

    const response = await fetcher(path, init);
    const value: unknown = await response.json();

    return result<T>(value)
      ? value
      : {
          ok: false,
          error: {
            code: "INTEGRATION_ERROR",
            message: "The administrator response was invalid.",
          },
        };
  } catch {
    return {
      ok: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "The administrator service is temporarily unavailable.",
      },
    };
  }
}

function pageQuery(input: PageRequest): string {
  const query = new URLSearchParams();

  if (input.page !== undefined) {
    query.set("page", String(input.page));
  }

  if (input.pageSize !== undefined) {
    query.set("pageSize", String(input.pageSize));
  }

  const value = query.toString();

  return value ? `?${value}` : "";
}

export function createAdminHttpClient(
  fetcher: typeof fetch = fetch,
): AdminApi {
  const catalogue = <T>(operation: string, input?: unknown) =>
    call<T>(
      `/api/admin/catalogue/${operation}`,
      input,
      fetcher,
    );

  const inventory = <T>(operation: string, input?: unknown) =>
    call<T>(
      `/api/admin/inventory/${operation}`,
      input,
      fetcher,
    );

  return {
    getDashboard: (period: ReportingPeriod) =>
      catalogue<Dashboard>(
        `dashboard?from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`,
      ),

    getCatalogueReferences: () =>
      catalogue<AdminCatalogueReferences>("references"),

    listCatalogue: input =>
      catalogue<Page<AdminPerfume>>("list", input),

    getPerfume: input =>
      catalogue<AdminPerfume>(
        `perfume?id=${encodeURIComponent(input.id)}`,
      ),

    createPerfume: input =>
      catalogue<AdminPerfume>("create", input),

    updatePerfume: input =>
      catalogue<AdminPerfume>("update", input),

    archivePerfume: input =>
      catalogue<AdminPerfume>("archive", input),

    createVariant: input =>
      catalogue<PerfumeVariantSummary>(
        "variant-create",
        input,
      ),

    updateVariant: input =>
      catalogue<PerfumeVariantSummary>(
        "variant-update",
        input,
      ),

    listInventory: input =>
      inventory<Page<InventoryBalance>>(
        `inventory${pageQuery(input)}`,
      ),

    listBatches: input =>
      inventory<Page<ProductionBatch>>(
        `batches${pageQuery(input)}`,
      ),

    createBatch: input =>
      inventory<ProductionBatch>(
        "batch-create",
        input,
      ),

    releaseBatch: input =>
      inventory<ProductionBatch>(
        "batch-release",
        input,
      ),
  };
}
