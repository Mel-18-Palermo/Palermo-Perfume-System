import type { Session } from "../../../contracts/auth";

/** Order history is customer-scoped, so it must not begin until session hydration has completed. */
export function canLoadOrderHistory(session: Session | null, isSessionResolved: boolean): boolean {
  return isSessionResolved && session?.user !== null && session?.user !== undefined;
}
