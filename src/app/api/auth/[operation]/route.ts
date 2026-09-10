import { handleAuthRequest } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ operation: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  return handleAuthRequest(request, (await context.params).operation, getIdentityService);
}
export async function POST(request: Request, context: Context): Promise<Response> {
  return handleAuthRequest(request, (await context.params).operation, getIdentityService);
}
