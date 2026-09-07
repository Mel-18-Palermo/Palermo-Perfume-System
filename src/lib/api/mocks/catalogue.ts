import type { CatalogueQuery, PerfumeDetail, PerfumeSummary } from "../../../contracts/catalogue";
import type { ApiResult, Page, PageRequest } from "../../../contracts/common";
import { failure, success } from "../result";
import { summary } from "./fixtures";

export function paginate<T>(items: readonly T[], request: PageRequest): ApiResult<Page<T>> {
  const { page = 1, pageSize = 20 } = request;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100
    || !Number.isSafeInteger((page - 1) * pageSize)) return failure("VALIDATION_ERROR");
  const start = (page - 1) * pageSize;
  return success({ items: items.slice(start, start + pageSize), page, pageSize, hasMore: start + pageSize < items.length });
}

export function listCatalogue(perfumes: readonly PerfumeDetail[], query: CatalogueQuery): ApiResult<Page<PerfumeSummary>> {
  for (const price of [query.minPrice, query.maxPrice]) {
    if (price !== undefined && (!Number.isSafeInteger(price) || price < 0)) return failure("VALIDATION_ERROR");
  }
  if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) return failure("VALIDATION_ERROR");
  const matches = (requested: readonly string[] | undefined, available: readonly string[]) =>
    !requested?.length || requested.some(id => available.includes(id));
  const items = perfumes.filter(perfume => {
    const text = `${perfume.name} ${perfume.description}`.toLowerCase();
    return (!query.q || text.includes(query.q.trim().toLowerCase()))
      && matches(query.family, [perfume.primaryFamily.id])
      && matches(query.note, perfume.notes.map(note => note.id))
      && matches(query.intensity, perfume.intensity ? [perfume.intensity.id] : [])
      && matches(query.occasion, perfume.suitability.occasion.map(option => option.id))
      && matches(query.mood, perfume.suitability.mood.map(option => option.id))
      && matches(query.weather, perfume.suitability.weather.map(option => option.id))
      && perfume.variants.some(variant => variant.availability === "AVAILABLE"
        && (query.minPrice === undefined || variant.price.amountMinor >= query.minPrice)
        && (query.maxPrice === undefined || variant.price.amountMinor <= query.maxPrice));
  });
  return paginate(items.map(summary), query);
}
