import type { CatalogueApi, CatalogueFilters, CatalogueQuery, PerfumeDetail, PerfumeSummary } from "../../contracts/catalogue";
import type { ApiResult, Page } from "../../contracts/common";

function result<T>(value: unknown): value is ApiResult<T> { return typeof value === "object" && value !== null && "ok" in value && (value.ok === true || value.ok === false); }
function params(query: CatalogueQuery): string {
  const entries: [string, string | number | undefined][] = [["q", query.q], ["page", query.page], ["pageSize", query.pageSize], ["minPrice", query.minPrice], ["maxPrice", query.maxPrice], ["note", query.note?.join(",")], ["family", query.family?.join(",")], ["collection", query.collection?.join(",")], ["intensity", query.intensity?.join(",")], ["occasion", query.occasion?.join(",")], ["mood", query.mood?.join(",")], ["weather", query.weather?.join(",")]];
  const search = new URLSearchParams();
  for (const [key, value] of entries) if (value !== undefined) search.set(key, String(value));
  return search.toString();
}
async function call<T>(url: string, fetcher: typeof fetch): Promise<ApiResult<T>> {
  try { const response = await fetcher(url, { cache: "no-store" }); const value: unknown = await response.json(); return result<T>(value) ? value : { ok: false, error: { code: "INTEGRATION_ERROR", message: "The catalogue response was invalid." } }; }
  catch { return { ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "The catalogue is temporarily unavailable." } }; }
}
export function createCatalogueHttpClient(fetcher: typeof fetch = fetch): CatalogueApi {
  return { list: query => call<Page<PerfumeSummary>>(`/api/catalogue?${params(query)}`, fetcher), get: ({ id }) => call<PerfumeDetail>(`/api/catalogue/${encodeURIComponent(id)}`, fetcher), getFilters: () => call<CatalogueFilters>("/api/catalogue?filters=true", fetcher) };
}
