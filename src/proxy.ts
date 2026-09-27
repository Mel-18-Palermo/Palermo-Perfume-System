import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";
import { adminLoginHref } from "@/modules/administration/ui/admin-auth-routing";

/** Redirect before route rendering; API routes retain their own RBAC checks. */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const principal = await getIdentityService().principal(request.cookies.get(SESSION_COOKIE)?.value);
  if (principal?.user.role === "ADMIN") return NextResponse.next();

  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return NextResponse.redirect(new URL(adminLoginHref(next), request.url));
}

export const config = {
  matcher: "/admin/:path*",
};
