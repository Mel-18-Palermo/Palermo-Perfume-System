import { describe, expect, expectTypeOf, it } from "vitest";
import type { PalermoApi } from "../../src/contracts/api";
import type { ApiResult, AppErrorCode } from "../../src/contracts/common";
import { isMoneyValue } from "../../src/contracts/common";
import type { CheckoutRequest, CheckoutResult } from "../../src/contracts/checkout";
import { api, createApiClient } from "../../src/lib/api";
import { createMockApi } from "../../src/lib/api/mocks";
import * as fixtures from "../../src/lib/api/mocks/fixtures";
import { createUnavailableApi } from "../../src/lib/api/unavailable";
import { failure } from "../../src/lib/api/result";

function data<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`Unexpected fixture error: ${result.error.code}`);
  return result.data;
}
const checkoutRequest: CheckoutRequest = {
  cartId: fixtures.cart.id, expectedCartRevision: fixtures.cart.revision,
  deliveryAddressId: fixtures.address.id, billingAddressId: fixtures.address.id,
  deliveryMethodId: fixtures.deliveryMethod.id, idempotencyKey: "checkout-demo-key",
};

describe("canonical client contract", () => {
  it("uses one interface for injected mocks and real placeholders; defaults to unavailable", async () => {
    expectTypeOf(createMockApi()).toEqualTypeOf<PalermoApi>();
    expectTypeOf(createUnavailableApi()).toEqualTypeOf<PalermoApi>();
    const mock = createMockApi();
    expect(createApiClient(mock)).toBe(mock);
    expect(await api.auth.getSession()).toEqual(failure("TEMPORARILY_UNAVAILABLE"));
    expect(await api.checkout.submit(checkoutRequest)).toEqual(failure("TEMPORARILY_UNAVAILABLE"));
  });

  it.each([null, 1, {}, { amountMinor: -1, currency: "AUD" }, { amountMinor: 1.5, currency: "AUD" },
    { amountMinor: Number.MAX_SAFE_INTEGER + 1, currency: "AUD" }, { amountMinor: NaN, currency: "AUD" },
    { amountMinor: 100, currency: "aud" }])("rejects invalid money at the boundary: %j", value => {
    expect(isMoneyValue(value)).toBe(false);
  });
  it("accepts safe integer minor units with an explicit currency", () => {
    expect(isMoneyValue({ amountMinor: 12345, currency: "AUD" })).toBe(true);
  });

  const errorCodes: readonly AppErrorCode[] = ["VALIDATION_ERROR", "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND",
    "CONFLICT", "TEMPORARILY_UNAVAILABLE", "INTEGRATION_ERROR", "INTERNAL_ERROR"];
  it.each(errorCodes)("provides a deterministic safe %s fixture", async code => {
    const client = createMockApi({ errors: { "catalogue.list": code } });
    expect(await client.catalogue.list({})).toEqual(failure(code));
    expect(data(await client.catalogue.getFilters()).family).not.toHaveLength(0);
  });
});

describe("catalogue fixture contract", () => {
  it("combines approved filters and prices without accepting an unrelated family", async () => {
    const client = createMockApi();
    const result = data(await client.catalogue.list({
      q: "citrus", family: ["family-woody", "family-citrus"], note: ["note-bergamot"],
      intensity: ["intensity-light"], occasion: ["occasion-everyday"], mood: ["mood-calm"],
      weather: ["weather-warm"], minPrice: 12000, maxPrice: 12000,
    }));
    expect(result.items.map(item => item.id)).toEqual([fixtures.citrus.id]);
    expect(data(await client.catalogue.list({ family: ["family-woody"], note: ["note-bergamot"] })).items).toEqual([]);
  });
  it("paginates deterministically and reports empty/out-of-range pages", async () => {
    const client = createMockApi();
    expect(data(await client.catalogue.list({ page: 1, pageSize: 1 })).hasMore).toBe(true);
    expect(data(await client.catalogue.list({ page: 2, pageSize: 1 })).items[0]?.id).toBe(fixtures.woody.id);
    expect(data(await client.catalogue.list({ page: 3, pageSize: 1 })).items).toEqual([]);
    expect(data(await createMockApi({ empty: true }).catalogue.list({})).items).toEqual([]);
    expect(await client.catalogue.get({ id: "not-a-perfume" })).toEqual(failure("NOT_FOUND"));
  });
  it.each([{ page: 0 }, { page: 1.5 }, { pageSize: 101 }, { minPrice: -1 }, { minPrice: 2, maxPrice: 1 }])(
    "rejects malformed pagination/price inputs: %j", async query => {
      expect(await createMockApi().catalogue.list(query)).toEqual(failure("VALIDATION_ERROR"));
    });
});

describe("session and account isolation", () => {
  it("does not allow visitor checkout or customer admin access", async () => {
    const visitor = createMockApi();
    expect(data(await visitor.auth.getSession()).user).toBeNull();
    expect(data(await visitor.cart.get()).checkoutEligible).toBe(false);
    expect(await visitor.checkout.submit(checkoutRequest)).toEqual(failure("UNAUTHENTICATED"));
    expect(await visitor.wishlist.get()).toEqual(failure("UNAUTHENTICATED"));
    expect(await createMockApi({ actor: "CUSTOMER" }).admin.listInventory({})).toEqual(failure("FORBIDDEN"));
  });
  it("keeps registration pending; login/logout affects only this mock instance", async () => {
    const first = createMockApi();
    const second = createMockApi();
    expect(data(await first.auth.register({ name: "Example", email: "example@example.test", password: "synthetic-only" })).status)
      .toBe("PENDING_VERIFICATION");
    expect(data(await first.auth.getSession()).user).toBeNull();
    expect(data(await first.auth.verify({ token: "synthetic-only" })).status).toBe("ACTIVE");
    await first.auth.login({ email: "admin@example.test", password: "synthetic-only" });
    expect(data(await first.auth.getSession()).user?.role).toBe("CUSTOMER");
    expect(data(await second.auth.getSession()).user).toBeNull();
    await first.auth.logout();
    expect(await first.profile.get()).toEqual(failure("UNAUTHENTICATED"));
  });
  it("rejects stale profile changes and disallows identity from avoidance alone", async () => {
    const client = createMockApi({ actor: "CUSTOMER" });
    const profile = data(await client.profile.get());
    const updated = data(await client.profile.update({ expectedRevision: profile.revision, name: "Updated",
      preferences: { favouriteNoteIds: [], preferredIntensityId: null, sensitivityAvoidance: "Avoid woody scents" } }));
    expect(updated.fragranceIdentity?.status).toBe("STALE");
    expect(await client.profile.generateIdentity({ expectedRevision: updated.revision })).toEqual(failure("VALIDATION_ERROR"));
    expect(await client.profile.deactivate({ expectedRevision: profile.revision })).toEqual(failure("CONFLICT"));
    expect(data(await client.profile.deactivate({ expectedRevision: updated.revision })).acknowledged).toBe(true);
    expect(data(await client.auth.getSession()).user).toBeNull();
    expect(await client.auth.login({ email: "customer@example.test", password: "synthetic-only" })).toEqual(failure("FORBIDDEN"));
  });
  it("copies request/response objects so one consumer cannot contaminate stored state", async () => {
    const client = createMockApi({ actor: "CUSTOMER" });
    const profile = data(await client.profile.get());
    Object.assign(profile, { name: "mutated outside adapter" });
    expect(data(await client.profile.get()).name).toBe(fixtures.profile.name);
    const address = { ...fixtures.address, line1: "2 Example Street" };
    const updated = data(await client.profile.setDeliveryAddress({ expectedRevision: profile.revision, address }));
    address.line1 = "modified after request";
    expect(data(await client.profile.get()).deliveryAddress?.line1).toBe("2 Example Street");
    expect(updated.billingAddress?.line1).toBe("2 Example Street");
  });
});

describe("cart, wishlist and checkout outcomes", () => {
  it("handles quantity updates, stale retries and empty carts without float totals", async () => {
    const client = createMockApi({ actor: "CUSTOMER" });
    const cart = data(await client.cart.get());
    const item = cart.items[0];
    if (!item) throw new Error("Missing fixture item");
    const input = { cartId: cart.id, expectedRevision: cart.revision, itemId: item.id, quantity: 3 };
    const updated = data(await client.cart.updateQuantity(input));
    expect(updated.pricing.total).toEqual(fixtures.money(36000));
    expect(await client.cart.updateQuantity(input)).toEqual(failure("CONFLICT"));
    expect(await client.cart.updateQuantity({ ...input, expectedRevision: updated.revision, quantity: 0 })).toEqual(failure("VALIDATION_ERROR"));
    const empty = data(await client.cart.removeItem({ ...input, expectedRevision: updated.revision }));
    expect(empty.checkoutEligible).toBe(false);
    expect(empty.pricing.total.amountMinor).toBe(0);
    expect(data(await createMockApi({ actor: "CUSTOMER" }).cart.get()).items).toHaveLength(1);
  });
  it("rejects unsupported customisations and unsafe integer totals", async () => {
    const client = createMockApi();
    const cart = data(await client.cart.get());
    const input = { cartId: cart.id, expectedRevision: cart.revision, variantId: "variant-woody", quantity: 1,
      customisation: { ...fixtures.noCustomisation, engravingName: "Example" } };
    expect(await client.cart.addItem(input)).toEqual(failure("VALIDATION_ERROR"));
    expect(await client.cart.addItem({ ...input, quantity: Number.MAX_SAFE_INTEGER, customisation: fixtures.noCustomisation }))
      .toEqual(failure("VALIDATION_ERROR"));
    expect(data(await client.cart.get()).revision).toBe(cart.revision);
  });
  it("keeps wishlist add/remove idempotent within an instance", async () => {
    const client = createMockApi({ actor: "CUSTOMER", empty: true });
    const input = { perfumeId: fixtures.citrus.id };
    await client.wishlist.add(input);
    expect(data(await client.wishlist.add(input)).items).toHaveLength(1);
    await client.wishlist.remove(input);
    expect(data(await client.wishlist.remove(input)).items).toEqual([]);
  });
  const statuses: readonly CheckoutResult["status"][] = ["READY_FOR_PAYMENT", "REQUIRES_CART_REVIEW", "OUT_OF_STOCK", "INVALID_PROMOTION", "CHECKOUT_CONFLICT"];
  it.each(statuses)("exposes checkout outcome %s without inventing a paid order", async status => {
    const client = createMockApi({ actor: "CUSTOMER", checkoutStatus: status });
    expect(data(await client.checkout.submit(checkoutRequest)).status).toBe(status);
    if (status === "READY_FOR_PAYMENT") {
      const order = data(await client.orders.get({ id: fixtures.pendingOrder.id }));
      expect(order.paymentStatus).toBe("PENDING");
      expect(order.invoiceId).toBeNull();
      expect(await client.orders.getInvoice({ orderId: order.id })).toEqual(failure("CONFLICT"));
    }
  });
  it("keeps cancellation a request and returns only fixture-owned orders", async () => {
    const client = createMockApi({ actor: "CUSTOMER" });
    const summary = data(await client.orders.list({})).items[0];
    expect(summary).not.toHaveProperty("deliveryAddress");
    expect(summary).not.toHaveProperty("items");
    expect(await client.orders.get({ id: "another-customer-order" })).toEqual(failure("NOT_FOUND"));
    await client.orders.requestCancellation({ orderId: fixtures.order.id, idempotencyKey: "cancel-demo" });
    const order = data(await client.orders.get({ id: fixtures.order.id }));
    expect(order.status).toBe("CONFIRMED");
    expect(order.paymentStatus).toBe("SUCCEEDED");
    expect(order.cancellationRequest).not.toBeNull();
    expect(data(await client.tracking.get({ orderId: order.id })).confirmation).toBeNull();
  });
});

describe("recommendation and admin fixtures", () => {
  it("requires structured quiz answers and identifies fallback output", async () => {
    const client = createMockApi();
    const quiz = data(await client.recommendations.getQuiz());
    expect(await client.recommendations.generate({ quizId: quiz.id, quizVersion: quiz.version, answers: [] })).toEqual(failure("VALIDATION_ERROR"));
    const result = data(await client.recommendations.generate({ quizId: quiz.id, quizVersion: quiz.version,
      answers: [{ questionId: "question-family", optionIds: ["option-citrus"] }] }));
    expect(result.fallback).toBe(true);
    expect(result.generatedAt).toBe(fixtures.FIXTURE_TIME);
  });
  it("supports admin empty and conflict scenarios and once-only fixture batch release", async () => {
    const client = createMockApi({ actor: "ADMIN" });
    const release = { id: fixtures.batch.id, idempotencyKey: "release-demo" };
    await client.admin.releaseBatch(release);
    await client.admin.releaseBatch(release);
    const inventory = data(await client.admin.listInventory({})).items[0];
    expect(inventory?.available).toBe(15);
    expect(data(await client.admin.listBatches({})).items[0]?.status).toBe("RELEASED");
    expect(await client.admin.archivePerfume({ id: fixtures.citrus.id, expectedRevision: "stale" })).toEqual(failure("CONFLICT"));
    expect(data(await createMockApi({ actor: "ADMIN", empty: true }).admin.listInventory({})).items).toEqual([]);
    expect(data(await client.admin.getDashboard({ from: "2020-01-01T00:00:00.000Z", to: "2020-02-01T00:00:00.000Z" })).totalOrders).toBe(0);
  });
});
