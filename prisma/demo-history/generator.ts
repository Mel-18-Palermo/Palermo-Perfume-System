import { at, DeterministicRandom, stableId } from "./deterministic";
import { historyProfile, type HistoryDataset, type HistoryInput, type HistoryCustomer, type HistoryAddress, type HistoryOrder, type HistoryOrderItem, type HistoryPayment, type HistoryInvoice, type HistoryShipment, type HistoryTrackingEvent, type HistoryReview, type HistoryWishlist, type HistoryCart, type HistoryCartItem } from "./types";

const firstNames = ["Amelia", "Olivia", "Charlotte", "Isla", "Mia", "Harper", "Sophie", "Grace", "Ella", "Ruby", "Jack", "Noah", "Oliver", "Henry", "Leo", "William", "Thomas", "Lucas", "James", "Ethan"];
const lastNames = ["Hughes", "Nguyen", "Williams", "Patel", "Wilson", "Brown", "Taylor", "Kaur", "Martin", "Anderson", "Chen", "Walker", "Roberts", "Singh", "Campbell"];
const suburbs = [["Fitzroy", "3065"], ["Richmond", "3121"], ["Carlton", "3053"], ["Brunswick", "3056"], ["St Kilda", "3182"], ["Footscray", "3011"], ["Hawthorn", "3122"], ["South Yarra", "3141"], ["Preston", "3072"], ["Williamstown", "3016"]] as const;
const streets = ["Smith Street", "Victoria Parade", "Rathdowne Street", "Church Street", "High Street", "Lygon Street", "Johnston Street"];
const reviewStarts = ["A considered addition to my collection", "Beautifully balanced and easy to wear", "The composition feels polished", "A lovely everyday fragrance", "It arrived as expected and wears well"];
const reviewEnds = ["I would happily wear it again.", "The dry-down was my favourite part.", "It has become a regular choice for me.", "It feels true to its description.", "A thoughtful purchase overall."];

function snapshot(name: string, line: string, suburb: string, postcode: string) { return { recipientName: name, line1: line, line2: null, suburb, state: "VIC", postcode, country: "AU" }; }
function popularityIndex(index: number, size: number, random: DeterministicRandom): number { return Math.min(size - 1, Math.floor(Math.pow(random.next(), 1.8) * size + (index % 7 === 0 ? 1 : 0))); }
function present<T>(value: T | undefined): T { if (value === undefined) throw new Error("Deterministic generation selected no value."); return value; }

/** Generates imported pre-cutover commerce plus explicitly current cart engagement. */
export function generateHistory(input: HistoryInput): HistoryDataset {
  if (input.profile !== historyProfile || input.cutover >= input.asOf) throw new Error("Profile and cutover must be valid.");
  if (input.variants.length < 3 || input.variants.some(variant => variant.currency !== "AUD")) throw new Error("Approved AUD variants are required.");
  const random = new DeterministicRandom(input.seed);
  const historicalVariants = input.variants;
  const availableVariants = input.variants.filter(variant => variant.availability === "AVAILABLE");
  if (!availableVariants.length) throw new Error("At least one available approved variant is required for carts.");
  const customers: HistoryCustomer[] = []; const addresses: HistoryAddress[] = []; const orders: HistoryOrder[] = []; const orderItems: HistoryOrderItem[] = []; const payments: HistoryPayment[] = []; const invoices: HistoryInvoice[] = []; const shipments: HistoryShipment[] = []; const trackingEvents: HistoryTrackingEvent[] = []; const reviews: HistoryReview[] = []; const wishlists: HistoryWishlist[] = []; const carts: HistoryCart[] = []; const cartItems: HistoryCartItem[] = [];
  const start = at(input.cutover, -180 * 24 * 60 * 60 * 1_000);
  const purchased = new Map<string, Date>();

  for (let i = 1; i <= 180; i += 1) {
    const ordinal = String(i).padStart(4, "0"); const name = `${random.pick(firstNames)} ${random.pick(lastNames)}`;
    const firstActivity = at(start, (i % 35) * 24 * 60 * 60 * 1_000); const billingSame = i % 3 !== 0;
    const suburb = random.pick(suburbs); const line = `${10 + random.integer(190)} ${random.pick(streets)}`;
    const id = stableId("customer", ordinal);
    customers.push({ id, name, email: `demo-history-v1-${ordinal}@palermo-demo.test`, status: "ACTIVE", authUserId: null, createdAt: at(firstActivity, -((2 + random.integer(16)) * 24 * 60 * 60 * 1_000)), emailVerifiedAt: at(firstActivity, -(1 + random.integer(24)) * 60 * 60 * 1_000), billingSameAsDelivery: billingSame });
    addresses.push({ id: stableId("address", `${ordinal}:delivery`), customerId: id, type: "DELIVERY", ...snapshot(name, line, suburb[0], suburb[1]), updatedAt: firstActivity });
    if (!billingSame) addresses.push({ id: stableId("address", `${ordinal}:billing`), customerId: id, type: "BILLING", ...snapshot(name, `${1 + random.integer(90)} ${random.pick(streets)}`, suburb[0], suburb[1]), updatedAt: firstActivity });
  }

  for (let i = 1; i <= 450; i += 1) {
    const ordinal = String(i).padStart(6, "0"); const customer = present(customers[(i * 17 + random.integer(180)) % customers.length]);
    const day = Math.min(179, Math.floor(Math.pow(i / 451, 0.83) * 180));
    const placedAt = at(start, day * 86_400_000 + (9 + random.integer(10)) * 3_600_000 + random.integer(3_600_000));
    const status = i <= 350 ? "DELIVERED" : i <= 395 ? "SHIPPED" : i <= 425 ? "PROCESSING" : i <= 440 ? "CONFIRMED" : "PLACED";
    const paymentStatus = status === "PLACED" ? present((["PENDING", "FAILED", "EXPIRED"] as const)[i % 3]) : "SUCCEEDED";
    const selected = [present(historicalVariants[popularityIndex(i, historicalVariants.length, random)])];
    if (i <= 375) { const extra = present(historicalVariants[popularityIndex(i + 91, historicalVariants.length, random)]); if (extra.id !== present(selected[0]).id) selected.push(extra); }
    const quantities = selected.map(() => 1 + (random.next() < 0.13 ? 1 : 0));
    const subtotalMinor = selected.reduce((sum, variant, index) => sum + variant.priceMinor * present(quantities[index]), 0);
    const deliveryChargeMinor = subtotalMinor >= 7_000 ? 0 : input.delivery.chargeMinor;
    const delivery = present(addresses.find(address => address.customerId === customer.id && address.type === "DELIVERY"));
    const billing = customer.billingSameAsDelivery ? delivery : present(addresses.find(address => address.customerId === customer.id && address.type === "BILLING"));
    const orderId = stableId("order", ordinal); const providerReference = paymentStatus === "SUCCEEDED" ? `demo_history_pi_${ordinal}` : null;
    orders.push({ id: orderId, customerId: customer.id, orderNumber: `PAL-DH-${ordinal}`, idempotencyKey: `demo-history:v1:order:${ordinal}`, requestFingerprint: `demo-history:v1:fingerprint:${ordinal}`, deliveryMethodId: input.delivery.id, status, subtotalMinor, discountTotalMinor: 0, deliveryChargeMinor, totalMinor: subtotalMinor + deliveryChargeMinor, currency: "AUD", deliveryAddressSnapshot: snapshot(delivery.recipientName, delivery.line1, delivery.suburb, delivery.postcode), billingAddressSnapshot: snapshot(billing.recipientName, billing.line1, billing.suburb, billing.postcode), deliveryMethodSnapshot: { id: input.delivery.id, name: input.delivery.name, chargeMinor: input.delivery.chargeMinor, currency: input.delivery.currency }, placedAt, cancellationRequestedAt: status === "PROCESSING" && i % 11 === 0 ? at(placedAt, 2 * 3_600_000) : null, cancellationIdempotencyKey: status === "PROCESSING" && i % 11 === 0 ? `demo-history:v1:cancel:${ordinal}` : null });
    selected.forEach((variant, itemIndex) => { orderItems.push({ id: stableId("order-item", `${ordinal}:${itemIndex + 1}`), orderId, variantId: variant.id, skuSnapshot: variant.sku, nameSnapshot: variant.perfumeName, unitPriceMinor: variant.priceMinor, quantity: present(quantities[itemIndex]), personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null }); if (status === "DELIVERED") purchased.set(`${customer.id}:${variant.perfumeId}`, at(placedAt, 8 * 86_400_000)); });
    payments.push({ id: stableId("payment", ordinal), orderId, status: paymentStatus, provider: "DEMO_HISTORY_IMPORT", providerReference, attemptSequence: 1, lastProviderEventId: providerReference ? `demo_history_evt_${ordinal}` : null, updatedAt: at(placedAt, paymentStatus === "SUCCEEDED" ? 15 * 60_000 : 30 * 60_000) });
    if (providerReference) invoices.push({ id: stableId("invoice", ordinal), orderId, invoiceNumber: `DH-INV-${ordinal}`, totalMinor: subtotalMinor + deliveryChargeMinor, currency: "AUD", paymentReferenceSnapshot: providerReference, issuedAt: at(placedAt, 20 * 60_000) });
    if (status === "DELIVERED" || status === "SHIPPED") {
      const shipmentId = stableId("shipment", ordinal); const delivered = status === "DELIVERED"; const dispatchedAt = at(placedAt, 24 * 3_600_000);
      const deliveryHours = 72 + random.integer(90); const deliveredAt = delivered ? at(placedAt, deliveryHours * 3_600_000) : null;
      shipments.push({ id: shipmentId, orderId, trackingReference: `DH-TRACK-${ordinal}`, status: delivered ? "DELIVERED" : "IN_TRANSIT", confirmationSource: delivered ? "INTERNAL_SIMULATOR" : null, deliveredAt, updatedAt: deliveredAt ?? at(dispatchedAt, 18 * 3_600_000) });
      const events: readonly ["PENDING" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED", string, number][] = delivered ? [["PENDING", "Import recorded by Palermo history simulator.", 1], ["DISPATCHED", "Simulator dispatch recorded.", 24], ["IN_TRANSIT", "Simulator transit update recorded.", 42], ["DELIVERED", "Simulator delivery confirmation recorded.", deliveryHours]] : [["PENDING", "Import recorded by Palermo history simulator.", 1], ["DISPATCHED", "Simulator dispatch recorded.", 24], ["IN_TRANSIT", "Simulator transit update recorded.", 42]];
      events.forEach(([eventStatus, description, hours], eventIndex) => trackingEvents.push({ id: stableId("tracking-event", `${ordinal}:${eventIndex + 1}`), shipmentId, status: eventStatus, description, occurredAt: at(placedAt, hours * 3_600_000) }));
    }
  }
  const eligible = [...purchased.entries()].sort(([left], [right]) => left.localeCompare(right)); if (eligible.length < 183) throw new Error("Insufficient delivered purchase pairs for reviews.");
  for (let i = 0; i < 183; i += 1) { const [key, deliveredAt] = present(eligible[i]); const [customerId, perfumeId] = key.split(":"); const status = i < 150 ? "APPROVED" : i < 175 ? "PENDING" : "HIDDEN"; const createdAt = at(deliveredAt, (1 + i % 14) * 86_400_000); reviews.push({ id: stableId("review", String(i + 1).padStart(4, "0")), customerId: present(customerId), perfumeId: present(perfumeId), rating: present([5, 4, 5, 4, 3][i % 5]), text: `${present(reviewStarts[i % reviewStarts.length])}. ${present(reviewEnds[(i + 2) % reviewEnds.length])}`, status, moderatedById: status === "PENDING" ? null : input.moderatorId, moderatedAt: status === "PENDING" ? null : at(createdAt, 2 * 86_400_000), createdAt, updatedAt: status === "PENDING" ? createdAt : at(createdAt, 2 * 86_400_000) }); }
  const wishlistKeys = new Set<string>(); for (let i = 0; wishlists.length < 260; i += 1) { const customer = present(customers[(i * 19) % customers.length]); const variant = present(historicalVariants[(i * 7 + Math.floor(i / 11)) % historicalVariants.length]); const key = `${customer.id}:${variant.perfumeId}`; if (!wishlistKeys.has(key)) { wishlistKeys.add(key); wishlists.push({ customerId: customer.id, perfumeId: variant.perfumeId, createdAt: at(input.asOf, -(1 + i % 28) * 86_400_000) }); } }
  for (let i = 1; i <= 24; i += 1) { const cartId = stableId("cart", String(i).padStart(4, "0")); const variant = present(availableVariants[(i * 3) % availableVariants.length]); carts.push({ id: cartId, customerId: present(customers[(i * 13) % customers.length]).id, status: "ACTIVE", revision: 1, updatedAt: at(input.asOf, -(i % 5) * 3_600_000) }); cartItems.push({ id: stableId("cart-item", String(i).padStart(4, "0")), cartId, variantId: variant.id, quantity: i % 7 === 0 ? 2 : 1, personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null }); }
  return { customers, addresses, orders, orderItems, payments, invoices, shipments, trackingEvents, reviews, wishlists, carts, cartItems } as HistoryDataset;
}
