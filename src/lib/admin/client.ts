import type { AdminApi } from "../../contracts/admin";
import type { ApiResult, Page } from "../../contracts/common";
import type { AdminPerfume, InventoryBalance, ProductionBatch } from "../../contracts/admin";
import type { PerfumeVariantSummary } from "../../contracts/catalogue";
function result<T>(value: unknown): value is ApiResult<T> { return typeof value === "object" && value !== null && "ok" in value && ((value as { ok?: unknown }).ok === true || (value as { ok?: unknown }).ok === false); }
async function call<T>(operation: string, input?: unknown, fetcher: typeof fetch = fetch): Promise<ApiResult<T>> { try { const init: RequestInit = { method: input === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store" }; if (input !== undefined) { init.headers = { "content-type": "application/json" }; init.body = JSON.stringify(input); } const response = await fetcher(`/api/admin/catalogue/${operation}`, init); const value: unknown = await response.json(); return result<T>(value) ? value : { ok: false, error: { code: "INTEGRATION_ERROR", message: "The administrator catalogue response was invalid." } }; } catch { return { ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "The administrator catalogue is temporarily unavailable." } }; } }
export function createAdminHttpClient(fetcher: typeof fetch = fetch): AdminApi { const request = <T>(operation: string, input?: unknown) => call<T>(operation, input, fetcher); return {
  getDashboard: () => request("dashboard"), listCatalogue: input => request<Page<AdminPerfume>>("list", input), getPerfume: input => request<AdminPerfume>(`perfume?id=${encodeURIComponent(input.id)}`),
  createPerfume: input => request<AdminPerfume>("create", input), updatePerfume: input => request<AdminPerfume>("update", input), archivePerfume: input => request<AdminPerfume>("archive", input),
  createVariant: input => request<PerfumeVariantSummary>("variant-create", input), updateVariant: input => request<PerfumeVariantSummary>("variant-update", input),
  listInventory: input => request<Page<InventoryBalance>>("inventory", input), listBatches: input => request<Page<ProductionBatch>>("batches", input), createBatch: input => request<ProductionBatch>("batch-create", input), releaseBatch: input => request<ProductionBatch>("batch-release", input),
}; }
