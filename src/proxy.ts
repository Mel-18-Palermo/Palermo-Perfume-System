import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { ADMIN_NEXT_HEADER, adminLoginHref, safeAdminNextPath } from "@/modules/administration/ui/admin-auth-routing";

/** Optimistic admin routing only; the protected layout and APIs authorize access. */
export function proxy(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const next = safeAdminNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL(adminLoginHref(next), request.url));
  }

  const headers = new Headers(request.headers);
  headers.set(ADMIN_NEXT_HEADER, next);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: "/admin/:path*",
};
