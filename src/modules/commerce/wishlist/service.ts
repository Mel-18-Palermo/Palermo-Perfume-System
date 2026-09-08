import type { Prisma, PrismaClient } from "../../../lib/db/generated/client";
import type { PerfumeSummary } from "../../../contracts/catalogue";
import type { WishlistApi, WishlistDto } from "../../../contracts/wishlist";
import type { ApiResult } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";
import { isVariantSellable } from "../availability";

const include = {
  perfume: {
    include: {
      primaryFamily: true,
      intensity: true,
      images: { orderBy: { sortOrder: "asc" as const } },
      variants: {
        select: {
          availability: true,
          priceMinor: true,
          currency: true,
          inventory: { select: { onHand: true, reserved: true } },
        },
      },
    },
  },
} as const;
type Loaded = Prisma.WishlistItemGetPayload<{ include: typeof include }>;
export type WishlistActor = Readonly<{ customerId: string }>;
function validId(value: string): boolean { return /^[0-9a-f-]{10,64}$/i.test(value); }
function summary(item: Loaded): PerfumeSummary { const perfume = item.perfume; const prices = perfume.variants.filter(variant => variant.availability !== "UNAVAILABLE"); const price = prices.reduce((lowest, variant) => Math.min(lowest, variant.priceMinor), Number.MAX_SAFE_INTEGER); return { id: perfume.id, slug: perfume.slug, name: perfume.name, primaryFamily: { id: perfume.primaryFamily.id, label: perfume.primaryFamily.name }, imageUrl: perfume.images[0]?.url ?? null, priceFrom: { amountMinor: price === Number.MAX_SAFE_INTEGER ? 0 : price, currency: prices[0]?.currency ?? "AUD" }, intensity: perfume.intensity ? { id: perfume.intensity.id, label: perfume.intensity.name } : null }; }

export class WishlistService {
  constructor(private readonly db: PrismaClient) {}
  private async load(customerId: string): Promise<Loaded[]> { return this.db.wishlistItem.findMany({ where: { customerId }, include, orderBy: { createdAt: "asc" } }); }
  private dto(items: readonly Loaded[]): WishlistDto { return { items: items.map(item => ({ perfumeId: item.perfumeId, perfume: item.perfume.status === "ACTIVE" ? summary(item) : null, available: item.perfume.status === "ACTIVE" && item.perfume.variants.some(variant => isVariantSellable(variant.availability, variant.inventory)) })) }; }
  async get(actor: WishlistActor): Promise<ApiResult<WishlistDto>> { if (!validId(actor.customerId)) return failure("VALIDATION_ERROR"); return success(this.dto(await this.load(actor.customerId))); }
  async add(actor: WishlistActor, input: { perfumeId: string }): Promise<ApiResult<WishlistDto>> { if (!validId(actor.customerId) || !validId(input.perfumeId)) return failure("VALIDATION_ERROR"); const perfume = await this.db.perfume.findFirst({ where: { id: input.perfumeId, status: "ACTIVE" } }); if (!perfume) return failure("NOT_FOUND"); await this.db.wishlistItem.createMany({ data: { customerId: actor.customerId, perfumeId: perfume.id }, skipDuplicates: true }); return success(this.dto(await this.load(actor.customerId))); }
  async remove(actor: WishlistActor, input: { perfumeId: string }): Promise<ApiResult<WishlistDto>> { if (!validId(actor.customerId) || !validId(input.perfumeId)) return failure("VALIDATION_ERROR"); await this.db.wishlistItem.deleteMany({ where: { customerId: actor.customerId, perfumeId: input.perfumeId } }); return success(this.dto(await this.load(actor.customerId))); }
}
export function wishlistApi(service: WishlistService, actor: WishlistActor): WishlistApi { return { get: () => service.get(actor), add: input => service.add(actor, input), remove: input => service.remove(actor, input) }; }
