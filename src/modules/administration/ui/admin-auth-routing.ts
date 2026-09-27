import type { Session } from "@/contracts/auth";
import { safeNextPath } from "@/modules/identity/ui/safe-next-path";

export const ADMIN_NEXT_HEADER = "x-palermo-admin-next";

/** A customer session is never authority to enter the administrator interface. */
export function adminSessionDestination(session: Session, nextPath: string): string | null {
  return session.user?.role === "ADMIN" ? nextPath : null;
}

/** Keep administrator post-auth navigation within the protected admin tree. */
export function safeAdminNextPath(
  value: string | string[] | undefined,
  fallback = "/admin",
): string {
  const nextPath = safeNextPath(value, fallback);
  const isAdminLogin = nextPath === "/admin/login"
    || nextPath.startsWith("/admin/login?")
    || nextPath.startsWith("/admin/login#");
  return nextPath === "/admin" || nextPath.startsWith("/admin/")
    ? isAdminLogin ? fallback : nextPath
    : fallback;
}

export function adminLoginHref(path: string): string {
  return `/admin/login?next=${encodeURIComponent(safeAdminNextPath(path))}`;
}
