import type { Prisma, PrismaClient } from "../src/lib/db/generated/client";

// Fixed synthetic UUIDs, timestamps and .test identities. No provider accounts/passwords.
export const seedId = (number: number): string => `24200000-0000-4000-8000-${String(number).padStart(12, "0")}`;
export const seedTime = new Date("2026-09-01T00:00:00.000Z");
export const ids = {
  customer: seedId(1), otherCustomer: seedId(2), address: seedId(3), profile: seedId(4),
  family: seedId(10), note: seedId(11), intensity: seedId(12), perfume: seedId(13), variant: seedId(14),
  perfumeImage: seedId(15),
  woodyFamily: seedId(20), woodyNote: seedId(21), woodyPerfume: seedId(22), woodyVariant: seedId(23),
  woodyPerfumeImage: seedId(24),
  cart: seedId(30), cartItem: seedId(31), visitorCart: seedId(32), delivery: seedId(40),
  paidOrder: seedId(41), pendingOrder: seedId(42), payment: seedId(43), pendingPayment: seedId(44),
  invoice: seedId(45), shipment: seedId(46), reservation: seedId(47), batch: seedId(48),
  role: seedId(50), admin: seedId(51), permission: seedId(52), inventoryPermission: seedId(53), reportingPermission: seedId(54), reviewsPermission: seedId(55), promotionsPermission: seedId(56),
  quiz: seedId(60), question: seedId(61), option: seedId(62), attempt: seedId(63), recommendation: seedId(64),
  citrusOpeningMovement: seedId(70), woodyOpeningMovement: seedId(71), paidOrderMovement: seedId(72),
  trackingEvent: seedId(73), paidOrderItem: seedId(80), pendingOrderItem: seedId(81),
  approvedReview: seedId(90), pendingReview: seedId(91), loyaltyAccount: seedId(92), loyaltyEntry: seedId(93),
  subscription: seedId(94), referralCode: seedId(95), referral: seedId(96), promotionalContent: seedId(97),
  supportConversation: seedId(98), supportMessage: seedId(99), supportFeedback: seedId(100),
} as const;

const addressSnapshot = {
  recipientName: "Demo Customer", line1: "1 Example Street", line2: null,
  suburb: "Example", state: "VIC", postcode: "3000", country: "AU",
};

export async function seedCanonicalRecords(tx: Prisma.TransactionClient): Promise<void> {
  for (const customer of [
    { id: ids.customer, email: "customer@example.test", name: "Demo Customer" },
    { id: ids.otherCustomer, email: "other@example.test", name: "Other Demo Customer" },
  ]) {
    await tx.customer.upsert({ where: { id: customer.id }, update: {}, create: {
      ...customer, status: "ACTIVE", emailVerifiedAt: seedTime, createdAt: seedTime,
    } });
  }
  await tx.address.upsert({ where: { id: ids.address }, update: {}, create: {
    id: ids.address, customerId: ids.customer, type: "DELIVERY", ...addressSnapshot, updatedAt: seedTime,
  } });
  await tx.adminRole.upsert({ where: { id: ids.role }, update: {}, create: { id: ids.role, name: "Demo technical owner" } });
  await tx.permission.upsert({ where: { id: ids.permission }, update: {}, create: {
    id: ids.permission, code: "catalogue:manage", description: "Manage catalogue records",
  } });
  await tx.permission.upsert({ where: { id: ids.inventoryPermission }, update: {}, create: {
    id: ids.inventoryPermission, code: "inventory:manage", description: "Manage inventory and production batches",
  } });
  await tx.permission.upsert({ where: { id: ids.reportingPermission }, update: {}, create: {
    id: ids.reportingPermission, code: "reporting:read", description: "Read administrator reporting aggregates",
  } });
  await tx.permission.upsert({ where: { id: ids.reviewsPermission }, update: {}, create: { id: ids.reviewsPermission, code: "reviews:moderate", description: "Moderate verified customer reviews" } });
  await tx.permission.upsert({ where: { id: ids.promotionsPermission }, update: {}, create: { id: ids.promotionsPermission, code: "promotions:manage", description: "Manage promotions and promotional content" } });
  await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: ids.role, permissionId: ids.permission } }, update: {},
    create: { roleId: ids.role, permissionId: ids.permission } });
  await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: ids.role, permissionId: ids.inventoryPermission } }, update: {},
    create: { roleId: ids.role, permissionId: ids.inventoryPermission } });
  await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: ids.role, permissionId: ids.reportingPermission } }, update: {},
    create: { roleId: ids.role, permissionId: ids.reportingPermission } });
  await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: ids.role, permissionId: ids.reviewsPermission } }, update: {}, create: { roleId: ids.role, permissionId: ids.reviewsPermission } });
  await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: ids.role, permissionId: ids.promotionsPermission } }, update: {}, create: { roleId: ids.role, permissionId: ids.promotionsPermission } });
  await tx.adminAccount.upsert({ where: { id: ids.admin }, update: {}, create: {
    id: ids.admin, email: "admin@example.test", name: "Demo Administrator", roleId: ids.role, createdAt: seedTime,
  } });
  await tx.intensity.upsert({ where: { id: ids.intensity }, update: {}, create: { id: ids.intensity, name: "Light" } });
  for (const record of [
    { familyId: ids.family, family: "Citrus", noteId: ids.note, note: "Bergamot", perfumeId: ids.perfume, name: "Demo Citrus", slug: "demo-citrus", imageId: ids.perfumeImage, imageUrl: "/catalogue/products/demo-citrus/primary.png", imageAlt: "Palermo Demo Citrus Eau de Parfum bottle", variantId: ids.variant, sku: "DEMO-CITRUS-50", price: 12000, stock: 12, reserved: 2 },
    { familyId: ids.woodyFamily, family: "Woody", noteId: ids.woodyNote, note: "Cedar", perfumeId: ids.woodyPerfume, name: "Demo Woody", slug: "demo-woody", imageId: ids.woodyPerfumeImage, imageUrl: "/catalogue/products/demo-woody/primary.png", imageAlt: "Palermo Demo Woody Eau de Parfum bottle", variantId: ids.woodyVariant, sku: "DEMO-WOODY-50", price: 15000, stock: 8, reserved: 0 },
  ]) {
    await tx.fragranceFamily.upsert({ where: { id: record.familyId }, update: {}, create: { id: record.familyId, name: record.family } });
    await tx.fragranceNote.upsert({ where: { id: record.noteId }, update: {}, create: { id: record.noteId, name: record.note } });
    await tx.perfume.upsert({ where: { id: record.perfumeId }, update: {}, create: {
      id: record.perfumeId, slug: record.slug, name: record.name, description: "Synthetic demonstration perfume.",
      primaryFamilyId: record.familyId, intensityId: ids.intensity, createdAt: seedTime,
    } });
    await tx.perfumeImage.upsert({ where: { id: record.imageId }, update: {}, create: {
      id: record.imageId, perfumeId: record.perfumeId, url: record.imageUrl, alt: record.imageAlt, sortOrder: 0,
    } });
    const noteKey = { perfumeId: record.perfumeId, noteId: record.noteId, layer: "TOP" as const };
    await tx.perfumeNote.upsert({ where: { perfumeId_noteId_layer: noteKey }, update: {}, create: noteKey });
    await tx.perfumeVariant.upsert({ where: { id: record.variantId }, update: {}, create: {
      id: record.variantId, perfumeId: record.perfumeId, sku: record.sku, bottleSize: "50 ml", concentration: "Eau de Parfum",
      priceMinor: record.price, currency: "AUD", giftMessage: true,
    } });
    await tx.inventoryBalance.upsert({ where: { variantId: record.variantId }, update: {}, create: {
      variantId: record.variantId, onHand: record.stock, reserved: record.reserved, lowStockThreshold: 3, updatedAt: seedTime,
    } });
    await tx.inventoryMovement.upsert({ where: { reference: `seed-opening-${record.sku}` }, update: {}, create: {
      id: record.variantId === ids.variant ? ids.citrusOpeningMovement : ids.woodyOpeningMovement,
      variantId: record.variantId,
      quantityDelta: record.stock + (record.variantId === ids.variant ? 2 : 0), reason: "DEMO_OPENING_STOCK",
      reference: `seed-opening-${record.sku}`, createdAt: seedTime,
    } });
  }
  await tx.fragranceProfile.upsert({ where: { id: ids.profile }, update: {}, create: {
    id: ids.profile, customerId: ids.customer, preferredIntensityId: ids.intensity, updatedAt: seedTime,
  } });
  await tx.profileFavouriteNote.upsert({ where: { profileId_noteId: { profileId: ids.profile, noteId: ids.note } }, update: {},
    create: { profileId: ids.profile, noteId: ids.note } });
  await tx.fragranceIdentity.upsert({ where: { profileId: ids.profile }, update: {}, create: {
    id: seedId(5), profileId: ids.profile, primaryFamilyId: ids.family,
    explanation: "Synthetic identity based on the demonstration citrus preference.", generatedAt: seedTime,
  } });
  await tx.cart.upsert({ where: { id: ids.cart }, update: {}, create: { id: ids.cart, customerId: ids.customer, updatedAt: seedTime } });
  await tx.cart.upsert({ where: { id: ids.visitorCart }, update: {}, create: {
    id: ids.visitorCart, visitorSessionKey: "synthetic-visitor-cart-hash", updatedAt: seedTime,
  } });
  await tx.cartItem.upsert({ where: { id: ids.cartItem }, update: {}, create: { id: ids.cartItem, cartId: ids.cart, variantId: ids.variant, quantity: 1 } });
  await tx.deliveryMethod.upsert({ where: { id: ids.delivery }, update: {}, create: {
    id: ids.delivery, name: "Demo delivery", chargeMinor: 1000, currency: "AUD", displayInformation: "Internal simulated delivery.",
  } });
  for (const record of [{ id: ids.paidOrder, number: "DEMO-001", paid: true }, { id: ids.pendingOrder, number: "DEMO-002", paid: false }]) {
    await tx.order.upsert({ where: { id: record.id }, update: {}, create: {
      id: record.id, customerId: ids.customer, orderNumber: record.number,
      idempotencyKey: `seed-${record.number}`, requestFingerprint: `synthetic-${record.number}`,
      deliveryMethodId: ids.delivery, status: record.paid ? "CONFIRMED" : "PLACED",
      subtotalMinor: 24000, discountTotalMinor: 0, deliveryChargeMinor: 1000, totalMinor: 25000, currency: "AUD",
      deliveryAddressSnapshot: addressSnapshot, billingAddressSnapshot: addressSnapshot,
      deliveryMethodSnapshot: { id: ids.delivery, name: "Demo delivery", chargeMinor: 1000, currency: "AUD" }, placedAt: seedTime,
    } });
    const itemId = record.paid ? ids.paidOrderItem : ids.pendingOrderItem;
    await tx.orderItem.upsert({ where: { id: itemId }, update: {}, create: {
      id: itemId, orderId: record.id, variantId: ids.variant, skuSnapshot: "DEMO-CITRUS-50", nameSnapshot: "Demo Citrus", unitPriceMinor: 12000, quantity: 2,
    } });
    await tx.payment.upsert({ where: { orderId: record.id }, update: {}, create: {
      id: record.paid ? ids.payment : ids.pendingPayment, orderId: record.id,
      status: record.paid ? "SUCCEEDED" : "PENDING", providerReference: record.paid ? "demo-verified-payment" : null, updatedAt: seedTime,
    } });
  }
  await tx.invoice.upsert({ where: { orderId: ids.paidOrder }, update: {}, create: {
    id: ids.invoice, orderId: ids.paidOrder, invoiceNumber: "DEMO-INV-001", totalMinor: 25000,
    currency: "AUD", paymentReferenceSnapshot: "demo-verified-payment", issuedAt: seedTime,
  } });
  await tx.inventoryMovement.upsert({ where: { reference: "seed-paid-order" }, update: {}, create: {
    id: ids.paidOrderMovement, variantId: ids.variant, quantityDelta: -2, reason: "DEMO_ORDER_COMMIT", reference: "seed-paid-order", createdAt: seedTime,
  } });
  await tx.inventoryReservation.upsert({ where: { id: ids.reservation }, update: {}, create: {
    id: ids.reservation, orderId: ids.pendingOrder, variantId: ids.variant, quantity: 2,
    expiresAt: new Date("2026-09-01T00:15:00.000Z"),
  } });
  await tx.shipment.upsert({ where: { orderId: ids.paidOrder }, update: {}, create: {
    id: ids.shipment, orderId: ids.paidOrder, trackingReference: "DEMO-TRACK-001", updatedAt: seedTime,
  } });
  await tx.trackingEvent.upsert({ where: { id: ids.trackingEvent }, update: {}, create: {
    id: ids.trackingEvent, shipmentId: ids.shipment, status: "PENDING", description: "Awaiting simulated dispatch.", occurredAt: seedTime,
  } });
  await tx.productionBatch.upsert({ where: { id: ids.batch }, update: {}, create: {
    id: ids.batch, variantId: ids.variant, batchCode: "DEMO-BATCH-001", producedQuantity: 5, productionDate: seedTime,
  } });
  await tx.quiz.upsert({ where: { id: ids.quiz }, update: {}, create: { id: ids.quiz, version: "1" } });
  await tx.quizQuestion.upsert({ where: { id: ids.question }, update: {}, create: {
    id: ids.question, quizId: ids.quiz, prompt: "Which fragrance family would you like to explore?", sortOrder: 1,
  } });
  await tx.quizOption.upsert({ where: { id: ids.option }, update: {}, create: {
    id: ids.option, questionId: ids.question, label: "Citrus", value: ids.family, sortOrder: 1,
  } });
  await tx.quizAttempt.upsert({ where: { id: ids.attempt }, update: {}, create: {
    id: ids.attempt, quizId: ids.quiz, quizVersion: "1", customerId: ids.customer,
    status: "COMPLETED", startedAt: seedTime, completedAt: seedTime,
  } });
  const response = { attemptId: ids.attempt, questionId: ids.question, optionId: ids.option };
  await tx.quizResponse.upsert({ where: { attemptId_questionId_optionId: response }, update: {}, create: { ...response, quizId: ids.quiz } });
  await tx.recommendationRun.upsert({ where: { id: ids.recommendation }, update: {}, create: {
    id: ids.recommendation, customerId: ids.customer, quizAttemptId: ids.attempt, profileId: ids.profile, status: "FALLBACK", createdAt: seedTime,
  } });
  await tx.recommendationItem.upsert({ where: { runId_perfumeId: { runId: ids.recommendation, perfumeId: ids.perfume } }, update: {}, create: {
    runId: ids.recommendation, perfumeId: ids.perfume, rank: 1, explanation: "Synthetic deterministic example; no provider was called.",
  } });
  await tx.review.upsert({ where: { customerId_perfumeId: { customerId: ids.customer, perfumeId: ids.perfume } }, update: {}, create: {
    id: ids.approvedReview, customerId: ids.customer, perfumeId: ids.perfume, rating: 5, text: "Synthetic approved purchase review.", status: "APPROVED", moderatedById: ids.admin, moderatedAt: seedTime, createdAt: seedTime, updatedAt: seedTime,
  } });
  await tx.review.upsert({ where: { customerId_perfumeId: { customerId: ids.otherCustomer, perfumeId: ids.woodyPerfume } }, update: {}, create: {
    id: ids.pendingReview, customerId: ids.otherCustomer, perfumeId: ids.woodyPerfume, rating: 4, text: "Synthetic pending moderation review.", status: "PENDING", createdAt: seedTime, updatedAt: seedTime,
  } });
  await tx.loyaltyAccount.upsert({ where: { customerId: ids.customer }, update: {}, create: { id: ids.loyaltyAccount, customerId: ids.customer, points: 100, createdAt: seedTime, updatedAt: seedTime } });
  await tx.loyaltyLedgerEntry.upsert({ where: { identity: "seed:order-reward" }, update: {}, create: { id: ids.loyaltyEntry, accountId: ids.loyaltyAccount, type: "ORDER_REWARD", points: 100, identity: "seed:order-reward", orderId: ids.paidOrder, createdAt: seedTime } });
  await tx.subscription.upsert({ where: { customerId: ids.customer }, update: {}, create: { id: ids.subscription, customerId: ids.customer, optedIn: true, optedInAt: seedTime, updatedAt: seedTime } });
  await tx.referralCode.upsert({ where: { customerId: ids.customer }, update: {}, create: { id: ids.referralCode, customerId: ids.customer, code: "DEMOREF01", createdAt: seedTime } });
  await tx.referral.upsert({ where: { referredCustomerId: ids.otherCustomer }, update: {}, create: { id: ids.referral, referrerCustomerId: ids.customer, referredCustomerId: ids.otherCustomer, createdAt: seedTime } });
  await tx.promotionalContent.upsert({ where: { id: ids.promotionalContent }, update: {}, create: { id: ids.promotionalContent, title: "Synthetic launch preview", brief: "Approved synthetic assets only.", status: "APPROVED", provider: "AI_VIDEO", providerJobId: "seed-job", previewUrl: "https://example.test/synthetic-preview", reviewedById: ids.admin, reviewedAt: seedTime, createdAt: seedTime, updatedAt: seedTime } });
  await tx.supportConversation.upsert({ where: { id: ids.supportConversation }, update: {}, create: { id: ids.supportConversation, customerId: ids.customer, expiresAt: new Date("2026-10-01T00:00:00.000Z"), createdAt: seedTime } });
  await tx.supportMessage.upsert({ where: { id: ids.supportMessage }, update: {}, create: { id: ids.supportMessage, conversationId: ids.supportConversation, actor: "CUSTOMER", intent: "PRODUCT", content: "Synthetic fragrance question.", createdAt: seedTime } });
  await tx.supportFeedback.upsert({ where: { id: ids.supportFeedback }, update: {}, create: { id: ids.supportFeedback, conversationId: ids.supportConversation, customerId: ids.customer, rating: 5, comment: "Synthetic feedback.", submittedAt: seedTime } });
}

/** Insert missing demo rows only. Existing business/history rows are never reset by re-seeding. */
export async function seedCore(db: PrismaClient): Promise<void> {
  await db.$transaction(seedCanonicalRecords, { timeout: 60_000 });
}
