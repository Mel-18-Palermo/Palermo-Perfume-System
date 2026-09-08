import { NextResponse } from "next/server";
import type { CatalogueQuery } from "@/contracts/catalogue";
import { getCatalogueService } from "@/modules/catalogue/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ids(value: string | null): readonly string[] | undefined { return value ? value.split(",").map(item => item.trim()).filter(Boolean) : undefined; }
function integer(value: string | null): number | undefined { return value === null || value === "" ? undefined : Number(value); }
function query(request: Request): CatalogueQuery {
  const params = new URL(request.url).searchParams;
  const entries: [string, unknown][] = [];
  const q = params.get("q"); if (q !== null) entries.push(["q", q]);
  const numeric: readonly [string, number | undefined][] = [["page", integer(params.get("page"))], ["pageSize", integer(params.get("pageSize"))], ["minPrice", integer(params.get("minPrice"))], ["maxPrice", integer(params.get("maxPrice"))]];
  for (const [key, parsed] of numeric) if (parsed !== undefined) entries.push([key, parsed]);
  for (const key of ["note", "family", "collection", "intensity", "occasion", "mood", "weather"] as const) { const parsed = ids(params.get(key)); if (parsed) entries.push([key, parsed]); }
  return Object.fromEntries(entries) as CatalogueQuery;
}
export async function GET(request: Request): Promise<Response> {
  const result = new URL(request.url).searchParams.get("filters") === "true" ? await getCatalogueService().getFilters() : await getCatalogueService().list(query(request));
  return NextResponse.json(result, { status: result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 400, headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
