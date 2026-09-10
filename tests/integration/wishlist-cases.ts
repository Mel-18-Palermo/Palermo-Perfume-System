import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { WishlistService } from "../../src/modules/commerce/wishlist/service";
import type { ApiResult } from "../../src/contracts/common";
function code<T>(result: ApiResult<T>): string { expect(result.ok).toBe(false); return result.ok ? "" : result.error.code; }
export function wishlistCases(db: PrismaClient): void {
  describe("authoritative customer wishlist", () => {
    const service = new WishlistService(db); const actor = { customerId: ids.otherCustomer };
    it("lists an isolated customer wishlist and rejects malformed ownership", async () => { await db.wishlistItem.deleteMany({ where: { customerId: ids.otherCustomer } }); const result = await service.get(actor); expect(result.ok && result.data.items).toHaveLength(0); expect(code(await service.get({ customerId: "bad" }))).toBe("VALIDATION_ERROR"); });
    it("adds idempotently, returns canonical availability and removes by owner", async () => { await db.wishlistItem.deleteMany({ where: { customerId: ids.otherCustomer } }); const first = await service.add(actor, { perfumeId: ids.perfume }); expect(first.ok && first.data.items).toHaveLength(1); const second = await service.add(actor, { perfumeId: ids.perfume }); expect(second.ok && second.data.items).toHaveLength(1); if (second.ok) expect(second.data.items[0]).toMatchObject({ perfumeId: ids.perfume, available: true }); const removed = await service.remove(actor, { perfumeId: ids.perfume }); expect(removed.ok && removed.data.items).toHaveLength(0); });
    it("does not add archived or unknown perfumes and remove is idempotent", async () => { expect(code(await service.add(actor, { perfumeId: "24200000-0000-4000-8000-000000000999" }))).toBe("NOT_FOUND"); expect((await service.remove(actor, { perfumeId: ids.perfume })).ok).toBe(true); });
  });
}
