import type { PrismaClient } from "../../lib/db/generated/client";
import type { Dashboard, ReportingPeriod } from "../../contracts/admin";
import type { ApiResult } from "../../contracts/common";
import { failure, success } from "../../lib/api/result";

function periodDates(period: ReportingPeriod): { from: Date; to: Date } | null {
  const from = new Date(period.from);
  const to = new Date(period.to);
  if (!Number.isFinite(from.valueOf()) || !Number.isFinite(to.valueOf()) || from >= to) return null;
  return { from, to };
}

export class AdminReportingService {
  constructor(private readonly db: PrismaClient) {}

  async dashboard(period: ReportingPeriod): Promise<ApiResult<Dashboard>> {
    const dates = periodDates(period);
    if (!dates) return failure("VALIDATION_ERROR");

    const orders = await this.db.order.findMany({
      where: {
        placedAt: { gte: dates.from, lt: dates.to },
        payment: { is: { status: "SUCCEEDED" } },
      },
      select: {
        totalMinor: true,
        currency: true,
        items: {
          select: {
            quantity: true,
            variant: { select: { perfume: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    const currency = orders[0]?.currency ?? "AUD";
    const bestSelling = new Map<string, { name: string; unitsSold: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const current = bestSelling.get(item.variant.perfume.id);
        bestSelling.set(item.variant.perfume.id, {
          name: item.variant.perfume.name,
          unitsSold: (current?.unitsSold ?? 0) + item.quantity,
        });
      }
    }

    const lowStockVariants = await this.db.perfumeVariant.findMany({
      where: { availability: "AVAILABLE", perfume: { is: { status: "ACTIVE" } } },
      select: { inventory: { select: { onHand: true, reserved: true, lowStockThreshold: true } } },
    });
    const lowStockVariantCount = lowStockVariants.filter(({ inventory }) => {
      if (!inventory) return true;
      return inventory.onHand - inventory.reserved <= inventory.lowStockThreshold;
    }).length;

    return success({
      period,
      totalSales: { amountMinor: orders.reduce((total, order) => total + order.totalMinor, 0), currency },
      totalOrders: orders.length,
      bestSelling: [...bestSelling.entries()]
        .map(([perfumeId, value]) => ({ perfumeId, ...value }))
        .sort((a, b) => b.unitsSold - a.unitsSold || a.name.localeCompare(b.name) || a.perfumeId.localeCompare(b.perfumeId)),
      lowStockVariantCount,
    });
  }
}
