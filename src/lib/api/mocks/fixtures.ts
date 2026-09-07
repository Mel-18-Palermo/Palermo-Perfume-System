import type { AdminPerfume, Dashboard, InventoryBalance, ProductionBatch } from "../../../contracts/admin";
import type { SessionUser } from "../../../contracts/auth";
import type { CartCustomisation, CartDto } from "../../../contracts/cart";
import type { CatalogueFilters, PerfumeDetail, PerfumeSummary } from "../../../contracts/catalogue";
import type { CheckoutResult, DeliveryMethod } from "../../../contracts/checkout";
import type { MoneyValue } from "../../../contracts/common";
import type { Invoice, OrderDetail, OrderSummary } from "../../../contracts/orders";
import type { Address, AddressInput, CustomerProfile } from "../../../contracts/profile";
import type { QuizDefinition, RecommendationResult } from "../../../contracts/recommendations";
import type { ShipmentTrackingDto } from "../../../contracts/tracking";

/** Entirely synthetic, fixed-clock fixtures. AUD is demo data, not a production currency decision. */
export const FIXTURE_TIME = "2026-09-01T00:00:00.000Z";
export const money = (amountMinor: number): MoneyValue => ({ amountMinor, currency: "AUD" });
export const customer: SessionUser = {
  id: "customer-demo", role: "CUSTOMER", email: "customer@example.test", displayName: "Demo Customer",
};
export const administrator: SessionUser = {
  id: "admin-demo", role: "ADMIN", email: "admin@example.test", displayName: "Demo Administrator",
};
export const filters: CatalogueFilters = {
  family: [{ id: "family-citrus", label: "Citrus" }, { id: "family-woody", label: "Woody" }],
  note: [
    { id: "note-bergamot", label: "Bergamot", description: "A bright citrus note." },
    { id: "note-cedar", label: "Cedar", description: "A dry woody note." },
  ],
  intensity: [{ id: "intensity-light", label: "Light" }, { id: "intensity-strong", label: "Strong" }],
  occasion: [{ id: "occasion-everyday", label: "Everyday" }],
  mood: [{ id: "mood-calm", label: "Calm" }],
  weather: [{ id: "weather-warm", label: "Warm" }], currency: "AUD",
};
export const citrus: PerfumeDetail = {
  id: "perfume-citrus", slug: "demo-citrus", name: "Demo Citrus", description: "Synthetic citrus catalogue example.",
  primaryFamily: { id: "family-citrus", label: "Citrus" }, imageUrl: null,
  priceFrom: money(12000), intensity: { id: "intensity-light", label: "Light" },
  notes: [{ id: "note-bergamot", label: "Bergamot", description: "A bright citrus note.", layer: "TOP" }],
  variants: [{
    id: "variant-citrus", sku: "DEMO-CITRUS-50", bottleSize: "50 ml", concentration: "Eau de Parfum",
    price: money(12000), availability: "AVAILABLE",
    customisations: { personalisedLabel: true, engravingName: true, giftMessage: true, giftPackaging: [] },
  }],
  suitability: { occasion: filters.occasion, mood: filters.mood, weather: filters.weather, daypart: [], season: [] },
  images: [], longevity: null, projection: null,
};
export const woody: PerfumeDetail = {
  ...citrus, id: "perfume-woody", slug: "demo-woody", name: "Demo Woody", description: "Synthetic woody catalogue example.",
  primaryFamily: { id: "family-woody", label: "Woody" }, priceFrom: money(15000),
  intensity: { id: "intensity-strong", label: "Strong" },
  notes: [{ id: "note-cedar", label: "Cedar", description: "A dry woody note.", layer: "BASE" }],
  variants: [{
    id: "variant-woody", sku: "DEMO-WOODY-50", bottleSize: "50 ml", concentration: "Eau de Parfum",
    price: money(15000), availability: "AVAILABLE",
    customisations: { personalisedLabel: false, engravingName: false, giftMessage: true, giftPackaging: [] },
  }],
  suitability: { occasion: [], mood: [], weather: [], daypart: [], season: [] },
};
export const perfumes: readonly PerfumeDetail[] = [citrus, woody];
export function summary(perfume: PerfumeDetail): PerfumeSummary {
  const { id, slug, name, primaryFamily, imageUrl, priceFrom, intensity } = perfume;
  return { id, slug, name, primaryFamily, imageUrl, priceFrom, intensity };
}
const addressSnapshot: AddressInput = {
  recipientName: "Demo Customer", line1: "1 Example Street", line2: null,
  suburb: "Example", state: "VIC", postcode: "3000", country: "AU",
};
export const address: Address = { ...addressSnapshot, id: "address-demo" };
export const profile: CustomerProfile = {
  id: customer.id, name: customer.displayName, email: customer.email, accountStatus: "ACTIVE", revision: "profile-1",
  deliveryAddress: address, billingAddress: address, billingSameAsDelivery: true,
  preferences: { favouriteNoteIds: ["note-bergamot"], preferredIntensityId: "intensity-light", sensitivityAvoidance: null },
  fragranceIdentity: { primaryFamily: citrus.primaryFamily, explanation: "Demo identity from a positive citrus preference.", status: "CURRENT", generatedAt: FIXTURE_TIME },
};
export const noCustomisation: CartCustomisation = {
  personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null,
};
export const cart: CartDto = {
  id: "cart-demo", revision: "cart-1", kind: "CUSTOMER", checkoutEligible: true, validationMessages: [],
  items: [{
    id: "cart-item-demo", perfumeId: citrus.id, variantId: "variant-citrus", title: citrus.name,
    bottleSize: "50 ml", concentration: "Eau de Parfum", quantity: 1,
    unitPrice: money(12000), itemTotal: money(12000), customisation: noCustomisation,
  }],
  pricing: { subtotal: money(12000), discountTotal: money(0), total: money(12000) }, promotionCode: null,
};
export const deliveryMethod: DeliveryMethod = {
  id: "delivery-demo", name: "Demo delivery", charge: money(1000), displayInformation: "Internal simulated delivery.",
};
export const checkout: CheckoutResult = {
  status: "READY_FOR_PAYMENT", orderId: "order-pending-demo", paymentAttemptId: "payment-attempt-demo",
  expiresAt: "2026-09-01T00:15:00.000Z",
};
export const order: OrderDetail = {
  id: "order-demo", orderNumber: "DEMO-001", placedAt: FIXTURE_TIME, status: "CONFIRMED",
  paymentStatus: "SUCCEEDED", total: money(13000), subtotal: money(12000), discountTotal: money(0),
  items: [{ id: "order-item-demo", variantId: "variant-citrus", sku: "DEMO-CITRUS-50", title: citrus.name,
    quantity: 1, unitPrice: money(12000), customisation: noCustomisation }],
  deliveryAddress: addressSnapshot, billingAddress: addressSnapshot, deliveryMethod,
  invoiceId: "invoice-demo", shipmentId: "shipment-demo", canRequestCancellation: true, cancellationRequest: null,
};
export const pendingOrder: OrderDetail = {
  ...order, id: "order-pending-demo", orderNumber: "DEMO-002", status: "PLACED", paymentStatus: "PENDING",
  invoiceId: null, shipmentId: null,
};
export function orderSummary(order: OrderDetail): OrderSummary {
  const { id, orderNumber, placedAt, status, paymentStatus, total } = order;
  return { id, orderNumber, placedAt, status, paymentStatus, total };
}
export const invoice: Invoice = {
  id: "invoice-demo", invoiceNumber: "DEMO-INV-001", issuedAt: FIXTURE_TIME,
  order, paymentReference: "payment-demo",
};
export const tracking: ShipmentTrackingDto = {
  shipmentId: "shipment-demo", orderId: order.id, status: "PENDING", trackingReference: "DEMO-TRACK-001",
  events: [{ status: "PENDING", occurredAt: FIXTURE_TIME, description: "Awaiting simulated dispatch." }],
  updatedAt: FIXTURE_TIME, confirmation: null,
};
export const quiz: QuizDefinition = {
  id: "quiz-demo", version: "1", questions: [{
    id: "question-family", prompt: "Which fragrance family would you like to explore?", required: true,
    minSelections: 1, maxSelections: 1,
    options: [{ id: "option-citrus", label: "Citrus" }, { id: "option-woody", label: "Woody" }],
  }],
};
export const recommendation: RecommendationResult = {
  runId: "recommendation-demo", generatedAt: FIXTURE_TIME, fallback: true,
  items: [{ perfumeId: citrus.id, perfume: summary(citrus), reason: "Deterministic demo result; no AI provider was called." }],
};
export const adminPerfume: AdminPerfume = { perfume: citrus, status: "ACTIVE", revision: "catalogue-1" };
export const inventory: InventoryBalance = {
  variantId: "variant-citrus", sku: "DEMO-CITRUS-50", onHand: 12, reserved: 2, available: 10,
  lowStockThreshold: 3, lowStock: false, updatedAt: FIXTURE_TIME,
};
export const batch: ProductionBatch = {
  id: "batch-demo", variantId: "variant-citrus", batchCode: "DEMO-BATCH-001", producedQuantity: 5,
  status: "RECORDED", productionDate: FIXTURE_TIME, releasedAt: null,
};
export const dashboard: Dashboard = {
  period: { from: FIXTURE_TIME, to: "2026-09-02T00:00:00.000Z" }, totalSales: money(13000), totalOrders: 1,
  bestSelling: [{ perfumeId: citrus.id, name: citrus.name, unitsSold: 1 }], lowStockVariantCount: 0,
};
