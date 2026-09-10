import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { getCartService } from "@/modules/commerce/cart/runtime";
import { cartApi, type CartActor } from "@/modules/commerce/cart/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VISITOR_COOKIE = "palermo_visitor";
function cookies(request: Request): Record<string, string> { return Object.fromEntries((request.headers.get("cookie") ?? "").split(";").map(value => value.trim().split("=")).filter(pair => pair.length === 2) as [string, string][]); }
async function actor(request: Request): Promise<CartActor> {
  const session = await getIdentityService().principal(readSessionCookie(request));
  if (session?.user.role === "CUSTOMER") return { kind: "CUSTOMER", customerId: session.user.id };
  const visitor = cookies(request)[VISITOR_COOKIE];
  return { kind: "VISITOR", visitorSessionKey: visitor && /^[A-Za-z0-9_-]{16,128}$/.test(visitor) ? visitor : randomBytes(32).toString("base64url") };
}
async function body(request: Request): Promise<unknown> { try { return await request.json(); } catch { return null; } }
export async function GET(request: Request): Promise<Response> {
  const current = await actor(request);
  const result = await cartApi(getCartService(), current).get();
  const response = NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  if (!cookies(request)[VISITOR_COOKIE] && current.kind === "VISITOR") response.cookies.set(VISITOR_COOKIE, current.visitorSessionKey, { httpOnly: true, secure: process.env["NODE_ENV"] === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
export async function POST(request: Request, context: { params: Promise<{ operation: string }> }): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Cross-origin cart mutations are not allowed." } }, { status: 403 });
  const operation = (await context.params).operation; const api = cartApi(getCartService(), await actor(request)); const input = await body(request); let result;
  if (operation === "add") result = await api.addItem(input as Parameters<typeof api.addItem>[0]);
  else if (operation === "update") result = await api.updateQuantity(input as Parameters<typeof api.updateQuantity>[0]);
  else if (operation === "remove") result = await api.removeItem(input as Parameters<typeof api.removeItem>[0]);
  else if (operation === "promotion") result = await api.applyPromotion(input as Parameters<typeof api.applyPromotion>[0]);
  else result = { ok: false as const, error: { code: "NOT_FOUND" as const, message: "Cart operation not found." } };
  return NextResponse.json(result, { status: result.ok ? 200 : result.error.code === "CONFLICT" ? 409 : result.error.code === "NOT_FOUND" ? 404 : 400, headers: { "cache-control": "no-store" } });
}
