import { NextResponse } from "next/server";
import { getCatalogueService } from "@/modules/catalogue/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const result = await getCatalogueService().get((await context.params).id);
  return NextResponse.json(result, { status: result.ok ? 200 : result.error.code === "NOT_FOUND" ? 404 : 400, headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
