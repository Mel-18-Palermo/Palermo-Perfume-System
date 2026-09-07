import type { Endpoint, EntityId } from "./common";
import type { PerfumeSummary } from "./catalogue";

/** Account-specific. Repeated add/remove requests have the same effect. */
export type WishlistItem = Readonly<{
  perfumeId: EntityId; perfume: PerfumeSummary | null; available: boolean;
}>;
export type WishlistDto = Readonly<{ items: readonly WishlistItem[] }>;
export type WishlistApi = Readonly<{
  get: Endpoint<void, WishlistDto>;
  add: Endpoint<{ readonly perfumeId: EntityId }, WishlistDto>;
  remove: Endpoint<{ readonly perfumeId: EntityId }, WishlistDto>;
}>;
