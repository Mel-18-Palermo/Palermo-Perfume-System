import type { Session } from "@/contracts/auth";

export function canLoadWishlist(session: Session | null, resolved: boolean): boolean {
  return resolved && session?.user?.role === "CUSTOMER";
}
