import type { Endpoint, EntityId, MoneyValue, Option, Page, PageRequest, Revision, Timestamp } from "./common";
import type { FragranceNoteSummary, NoteAssignment, PerfumeDetail, PerfumeVariantSummary, SuitabilitySummary } from "./catalogue";
import type { PromotionsAdminApi } from "./promotions";
import type { ReviewModeration, ReviewModerationRecord } from "./reviews";

/** Read-only operational view. These states deliberately mirror persisted order data. */
export type AdminOrderStatus = "PLACED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
export type AdminPaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
export type AdminShipmentState = "NOT_CREATED" | "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED";
export type AdminOrderCustomer = Readonly<{ name: string; email: string }>;
export type AdminOrderSummary = Readonly<{
  id: EntityId;
  orderNumber: string;
  customer: AdminOrderCustomer;
  placedAt: Timestamp;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  shipmentState: AdminShipmentState;
  trackingPresent: boolean;
  total: MoneyValue;
}>;
export type AdminOrderItemSnapshot = Readonly<{
  id: EntityId;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: MoneyValue;
  lineTotal: MoneyValue;
  personalisation: Readonly<{
    personalisedLabel: string | null;
    engravingName: string | null;
    giftMessage: string | null;
    giftPackagingId: string | null;
  }>;
}>;
export type AdminDeliveryAddressSnapshot = Readonly<{
  recipientName: string;
  line1: string;
  line2: string | null;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}>;
export type AdminTrackingEvent = Readonly<{
  status: Exclude<AdminShipmentState, "NOT_CREATED">;
  description: string;
  occurredAt: Timestamp;
}>;
export type AdminShipment = Readonly<{
  state: Exclude<AdminShipmentState, "NOT_CREATED">;
  trackingReference: string | null;
  deliveredAt: Timestamp | null;
  events: readonly AdminTrackingEvent[];
}>;
export type AdminOrderDetail = AdminOrderSummary & Readonly<{
  items: readonly AdminOrderItemSnapshot[];
  subtotal: MoneyValue;
  discountTotal: MoneyValue;
  deliveryCharge: MoneyValue;
  deliveryAddress: AdminDeliveryAddressSnapshot;
  paymentReference: string | null;
  shipment: AdminShipment | null;
  cancellationRequest: Readonly<{ requestedAt: Timestamp }> | null;
}>;

export type ReportingPeriod = Readonly<{ from: Timestamp; to: Timestamp }>;
export type Dashboard = Readonly<{
  period: ReportingPeriod;
  /** Sum of successfully paid order totals placed in [from, to). No refund workflow implied. */
  totalSales: MoneyValue; totalOrders: number;
  bestSelling: readonly Readonly<{ perfumeId: EntityId; name: string; unitsSold: number }>[];
  lowStockVariantCount: number;
}>;
/** An administrator may create a perfume before adding its first priced variant. */
export type AdminPerfumeDetail = Omit<PerfumeDetail, "priceFrom"> & Readonly<{ priceFrom: MoneyValue | null }>;
export type AdminPerfume = Readonly<{ perfume: AdminPerfumeDetail; status: "ACTIVE" | "ARCHIVED"; revision: Revision }>;
export type AdminCatalogueReferences = Readonly<{
  family: readonly Option[];
  note: readonly FragranceNoteSummary[];
  intensity: readonly Option[];
  suitability: SuitabilitySummary;
}>;
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
  listOrders: Endpoint<PageRequest, Page<AdminOrderSummary>>;
  getOrder: Endpoint<{ readonly id: EntityId }, AdminOrderDetail>;
  getCatalogueReferences: Endpoint<void, AdminCatalogueReferences>;
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
  listReviews: Endpoint<PageRequest, Page<ReviewModerationRecord>>;
  moderateReview: Endpoint<ReviewModeration, null>;
}> & PromotionsAdminApi;
