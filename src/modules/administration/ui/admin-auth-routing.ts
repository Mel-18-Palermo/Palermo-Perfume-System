import type { Session } from "@/contracts/auth";

/** A customer session is never authority to enter the administrator interface. */
export function adminSessionDestination(session: Session, nextPath: string): string | null {
  return session.user?.role === "ADMIN" ? nextPath : null;
}

export function adminLoginHref(pathname: string): string {
  return `/admin/login?next=${encodeURIComponent(pathname)}`;
}
