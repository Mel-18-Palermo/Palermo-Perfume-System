import type { Endpoint, EntityId, MoneyValue, Option, Page, PageRequest, Revision, Timestamp } from "./common";
import type { NoteAssignment, PerfumeDetail, PerfumeVariantSummary, SuitabilitySummary } from "./catalogue";

export type ReportingPeriod = Readonly<{ from: Timestamp; to: Timestamp }>;
export type Dashboard = Readonly<{
  period: ReportingPeriod;
  /** Sum of successfully paid order totals placed in [from, to). No refund workflow implied. */
  totalSales: MoneyValue; totalOrders: number;
  bestSelling: readonly Readonly<{ perfumeId: EntityId; name: string; unitsSold: number }>[];
  lowStockVariantCount: number;
}>;
export type AdminPerfume = Readonly<{ perfume: PerfumeDetail; status: "ACTIVE" | "ARCHIVED"; revision: Revision }>;
export type PerfumeInput = Readonly<{
  name: string; slug: string; description: string; primaryFamilyId: EntityId;
  intensity: Option | null; notes: readonly NoteAssignment[]; suitability: SuitabilitySummary;
  images: PerfumeDetail["images"]; longevity: Option | null; projection: Option | null;
}>;
export type VariantInput = Omit<PerfumeVariantSummary, "id">;
export type InventoryBalance = Readonly<{
  variantId: EntityId; sku: string; onHand: number; reserved: number; available: number;
  lowStockThreshold: number; lowStock: boolean; updatedAt: Timestamp;
}>;
export type ProductionBatch = Readonly<{
  id: EntityId; variantId: EntityId; batchCode: string; producedQuantity: number;
  status: "RECORDED" | "RELEASED"; productionDate: Timestamp; releasedAt: Timestamp | null;
}>;
export type AdminApi = Readonly<{
  getDashboard: Endpoint<ReportingPeriod, Dashboard>;
  listCatalogue: Endpoint<PageRequest, Page<AdminPerfume>>;
  getPerfume: Endpoint<{ readonly id: EntityId }, AdminPerfume>;
  createPerfume: Endpoint<PerfumeInput & { readonly idempotencyKey: string }, AdminPerfume>;
  updatePerfume: Endpoint<PerfumeInput & { readonly id: EntityId; readonly expectedRevision: Revision }, AdminPerfume>;
  archivePerfume: Endpoint<{ readonly id: EntityId; readonly expectedRevision: Revision }, AdminPerfume>;
  createVariant: Endpoint<VariantInput & { readonly perfumeId: EntityId; readonly idempotencyKey: string }, PerfumeVariantSummary>;
  updateVariant: Endpoint<VariantInput & { readonly perfumeId: EntityId; readonly variantId: EntityId; readonly expectedRevision: Revision }, PerfumeVariantSummary>;
  listInventory: Endpoint<PageRequest, Page<InventoryBalance>>;
  listBatches: Endpoint<PageRequest, Page<ProductionBatch>>;
  createBatch: Endpoint<{
    readonly variantId: EntityId; readonly batchCode: string; readonly producedQuantity: number;
    readonly productionDate: Timestamp; readonly idempotencyKey: string;
  }, ProductionBatch>;
  releaseBatch: Endpoint<{ readonly id: EntityId; readonly idempotencyKey: string }, ProductionBatch>;
}>;
