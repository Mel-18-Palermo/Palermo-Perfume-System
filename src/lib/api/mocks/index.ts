import type { PalermoApi } from "../../../contracts/api";
import type { SessionUser } from "../../../contracts/auth";
import type { CartDto, CartItemDto, CartMutation } from "../../../contracts/cart";
import type { ApiResult, AppErrorCode, Endpoint, Revision } from "../../../contracts/common";
import type { CheckoutResult } from "../../../contracts/checkout";
import type { CustomerProfile } from "../../../contracts/profile";
import type { WishlistItem } from "../../../contracts/wishlist";
import { failure, success } from "../result";
import { listCatalogue, paginate } from "./catalogue";
import * as fixtures from "./fixtures";

export type OperationName = {
  [Area in keyof PalermoApi]: `${Area}.${Extract<keyof PalermoApi[Area], string>}`;
}[keyof PalermoApi];
export type MockOptions = Readonly<{
  actor?: "VISITOR" | "CUSTOMER" | "ADMIN";
  /** Empty collection fixtures; does not erase reference data such as quiz questions. */
  empty?: boolean;
  errors?: Readonly<Partial<Record<OperationName, AppErrorCode>>>;
  checkoutStatus?: CheckoutResult["status"];
}>;

/** Per-instance, synthetic UI state. Never import this as a production auth/business service. */
export function createMockApi(options: MockOptions = {}): PalermoApi {
  const settings = structuredClone(options);
  let session: SessionUser | null = settings.actor === "ADMIN" ? fixtures.administrator
    : settings.actor === "CUSTOMER" ? fixtures.customer : null;
  let profile: CustomerProfile = structuredClone(fixtures.profile);
  let customerCart = structuredClone(fixtures.cart);
  let visitorCart: CartDto = { ...structuredClone(fixtures.cart), id: "cart-visitor-demo", kind: "VISITOR" };
  let wishlist: readonly WishlistItem[] = settings.empty ? []
    : [{ perfumeId: fixtures.citrus.id, perfume: fixtures.summary(fixtures.citrus), available: true }];
  let revision = 1;
  let itemSequence = 1;
  let cancellationRequested = false;
  let batchReleased = false;
  let checkoutStarted = false;
  const nextRevision = (): Revision => `mock-${++revision}`;
  const activeCart = () => session?.role === "CUSTOMER" ? customerCart : visitorCart;
  const saveCart = (cart: CartDto) => {
    if (session?.role === "CUSTOMER") customerCart = cart;
    else visitorCart = cart;
  };
  if (settings.empty) {
    customerCart = { ...customerCart, items: [] };
    visitorCart = { ...visitorCart, items: [] };
  }

  function run<I, O>(operation: OperationName, access: "PUBLIC" | "CUSTOMER" | "ADMIN", handler: (input: I) => ApiResult<O>): Endpoint<I, O> {
    return async input => {
      // Copy at both boundaries: consumers cannot mutate stored fixtures via object references.
      if (access !== "PUBLIC" && !session) return failure("UNAUTHENTICATED");
      if (access !== "PUBLIC" && session?.role !== access) return failure("FORBIDDEN");
      const injected = settings.errors?.[operation];
      if (injected) return failure(injected);
      try {
        return structuredClone(handler(structuredClone(input)));
      } catch {
        return failure("INTERNAL_ERROR");
      }
    };
  }

  function cartView(): CartDto {
    const cart = activeCart();
    const subtotal = cart.items.reduce((total, item) => total + item.itemTotal.amountMinor, 0);
    return {
      ...cart, kind: session?.role === "CUSTOMER" ? "CUSTOMER" : "VISITOR",
      checkoutEligible: session?.role === "CUSTOMER" && cart.items.length > 0,
      pricing: { subtotal: fixtures.money(subtotal), discountTotal: fixtures.money(0), total: fixtures.money(subtotal) },
      validationMessages: session?.role === "CUSTOMER" ? []
        : [{ code: "AUTHENTICATION_REQUIRED", itemId: null, message: "Sign in before checkout." }],
    };
  }
  function checkCart(input: CartMutation): ApiResult<null> {
    if (input.cartId !== activeCart().id) return failure("NOT_FOUND");
    if (input.expectedRevision !== activeCart().revision) return failure("CONFLICT");
    return success(null);
  }
  function replaceItems(items: readonly CartItemDto[]): ApiResult<CartDto> {
    const total = items.reduce((sum, item) => sum + item.itemTotal.amountMinor, 0);
    if (!Number.isSafeInteger(total)) return failure("VALIDATION_ERROR");
    saveCart({ ...activeCart(), revision: nextRevision(), items });
    return success(cartView());
  }
  const checkProfile = (expected: Revision) => expected === profile.revision;
  function updateProfile(next: CustomerProfile): ApiResult<CustomerProfile> {
    profile = { ...next, revision: nextRevision() };
    return success(profile);
  }

  const api: PalermoApi = {
    auth: {
      getSession: run("auth.getSession", "PUBLIC", () => success({ user: session })),
      register: run("auth.register", "PUBLIC", input => input.name.trim() && input.email.trim() && input.password
        ? success({ status: "PENDING_VERIFICATION" }) : failure("VALIDATION_ERROR")),
      verify: run("auth.verify", "PUBLIC", input => input.token.trim() ? success({ status: "ACTIVE" }) : failure("VALIDATION_ERROR")),
      login: run("auth.login", "PUBLIC", input => {
        if (!input.email.trim() || !input.password) return failure("VALIDATION_ERROR");
        if (settings.actor !== "ADMIN" && profile.accountStatus !== "ACTIVE") return failure("FORBIDDEN");
        // Actor is selected by the test harness, never inferred from an email or URL.
        session = settings.actor === "ADMIN" ? fixtures.administrator : fixtures.customer;
        return success({ user: session });
      }),
      logout: run("auth.logout", "PUBLIC", () => { session = null; return success({ acknowledged: true }); }),
      requestPasswordReset: run("auth.requestPasswordReset", "PUBLIC", input => input.email.trim()
        ? success({ acknowledged: true }) : failure("VALIDATION_ERROR")),
      completePasswordReset: run("auth.completePasswordReset", "PUBLIC", input => {
        if (!input.token.trim() || !input.password) return failure("VALIDATION_ERROR");
        session = null;
        return success({ acknowledged: true });
      }),
    },
    catalogue: {
      list: run("catalogue.list", "PUBLIC", query => listCatalogue(settings.empty ? [] : fixtures.perfumes, query)),
      get: run("catalogue.get", "PUBLIC", ({ id }) => {
        const perfume = fixtures.perfumes.find(item => item.id === id);
        return perfume ? success(perfume) : failure("NOT_FOUND");
      }),
      getFilters: run("catalogue.getFilters", "PUBLIC", () => success(fixtures.filters)),
    },
    profile: {
      get: run("profile.get", "CUSTOMER", () => success(profile)),
      update: run("profile.update", "CUSTOMER", input => {
        if (!checkProfile(input.expectedRevision)) return failure("CONFLICT");
        if (!input.name.trim()) return failure("VALIDATION_ERROR", { name: ["Enter a name."] });
        const validNotes = input.preferences.favouriteNoteIds.every(id => fixtures.filters.note.some(note => note.id === id));
        const validIntensity = input.preferences.preferredIntensityId === null
          || fixtures.filters.intensity.some(option => option.id === input.preferences.preferredIntensityId);
        if (!validNotes || !validIntensity) return failure("VALIDATION_ERROR");
        return updateProfile({ ...profile, name: input.name, preferences: input.preferences,
          fragranceIdentity: profile.fragranceIdentity ? { ...profile.fragranceIdentity, status: "STALE" } : null });
      }),
      setDeliveryAddress: run("profile.setDeliveryAddress", "CUSTOMER", input => {
        if (!checkProfile(input.expectedRevision)) return failure("CONFLICT");
        const address = { ...input.address, id: "address-demo" };
        return updateProfile({ ...profile, deliveryAddress: address,
          billingAddress: profile.billingSameAsDelivery ? address : profile.billingAddress });
      }),
      setBillingAddress: run("profile.setBillingAddress", "CUSTOMER", input => {
        if (!checkProfile(input.expectedRevision)) return failure("CONFLICT");
        if (input.billing.kind === "USE_DELIVERY" && !profile.deliveryAddress) return failure("VALIDATION_ERROR");
        return updateProfile({ ...profile, billingSameAsDelivery: input.billing.kind === "USE_DELIVERY",
          billingAddress: input.billing.kind === "USE_DELIVERY" ? profile.deliveryAddress
            : { ...input.billing.address, id: "billing-address-demo" } });
      }),
      generateIdentity: run("profile.generateIdentity", "CUSTOMER", input => {
        if (!checkProfile(input.expectedRevision)) return failure("CONFLICT");
        if (!profile.preferences.favouriteNoteIds.length && !profile.preferences.preferredIntensityId) return failure("VALIDATION_ERROR");
        // Fixed response demonstrates the UI state; scoring belongs to #252.
        return updateProfile({ ...profile, fragranceIdentity: fixtures.profile.fragranceIdentity });
      }),
      deactivate: run("profile.deactivate", "CUSTOMER", input => {
        if (!checkProfile(input.expectedRevision)) return failure("CONFLICT");
        profile = { ...profile, accountStatus: "DEACTIVATED", revision: nextRevision() };
        session = null;
        return success({ acknowledged: true });
      }),
    },
    recommendations: {
      getQuiz: run("recommendations.getQuiz", "PUBLIC", () => success(fixtures.quiz)),
      generate: run("recommendations.generate", "PUBLIC", input => {
        if (input.quizId !== fixtures.quiz.id || input.quizVersion !== fixtures.quiz.version) return failure("CONFLICT");
        const question = fixtures.quiz.questions[0];
        const answer = input.answers[0];
        if (!question || !answer || input.answers.length !== 1 || answer.questionId !== question.id
          || answer.optionIds.length !== 1 || !question.options.some(option => option.id === answer.optionIds[0])) return failure("VALIDATION_ERROR");
        return success({ ...fixtures.recommendation, items: settings.empty ? [] : fixtures.recommendation.items });
      }),
    },
    cart: {
      get: run("cart.get", "PUBLIC", () => success(cartView())),
      addItem: run("cart.addItem", "PUBLIC", input => {
        const checked = checkCart(input);
        if (!checked.ok) return checked;
        const perfume = fixtures.perfumes.find(item => item.variants.some(variant => variant.id === input.variantId));
        const variant = perfume?.variants.find(item => item.id === input.variantId);
        if (!perfume || !variant) return failure("NOT_FOUND");
        if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) return failure("VALIDATION_ERROR");
        const capabilities = variant.customisations;
        const custom = input.customisation;
        if ((custom.personalisedLabel !== null && !capabilities.personalisedLabel)
          || (custom.engravingName !== null && !capabilities.engravingName)
          || (custom.giftMessage !== null && !capabilities.giftMessage)
          || (custom.giftPackagingId !== null && !capabilities.giftPackaging.some(option => option.id === custom.giftPackagingId))) return failure("VALIDATION_ERROR");
        return replaceItems([...activeCart().items, {
          id: `mock-item-${++itemSequence}`, perfumeId: perfume.id, variantId: variant.id, title: perfume.name,
          bottleSize: variant.bottleSize, concentration: variant.concentration, quantity: input.quantity,
          unitPrice: variant.price, itemTotal: fixtures.money(variant.price.amountMinor * input.quantity), customisation: custom,
        }]);
      }),
      updateQuantity: run("cart.updateQuantity", "PUBLIC", input => {
        const checked = checkCart(input);
        if (!checked.ok) return checked;
        if (!activeCart().items.some(item => item.id === input.itemId)) return failure("NOT_FOUND");
        if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) return failure("VALIDATION_ERROR");
        return replaceItems(activeCart().items.map(item => item.id === input.itemId
          ? { ...item, quantity: input.quantity, itemTotal: fixtures.money(item.unitPrice.amountMinor * input.quantity) } : item));
      }),
      removeItem: run("cart.removeItem", "PUBLIC", input => {
        const checked = checkCart(input);
        if (!checked.ok) return checked;
        if (!activeCart().items.some(item => item.id === input.itemId)) return failure("NOT_FOUND");
        return replaceItems(activeCart().items.filter(item => item.id !== input.itemId));
      }),
      applyPromotion: run("cart.applyPromotion", "PUBLIC", input => {
        const checked = checkCart(input);
        if (!checked.ok) return checked;
        // Promotion rules belong to #261/#277; this fixture only supports clearing a code.
        if (input.code !== null) return failure("VALIDATION_ERROR", { code: ["No promotion is configured in this fixture."] });
        saveCart({ ...activeCart(), promotionCode: null, revision: nextRevision() });
        return success(cartView());
      }),
    },
    wishlist: {
      get: run("wishlist.get", "CUSTOMER", () => success({ items: wishlist })),
      add: run("wishlist.add", "CUSTOMER", input => {
        const perfume = fixtures.perfumes.find(item => item.id === input.perfumeId);
        if (!perfume) return failure("NOT_FOUND");
        if (!wishlist.some(item => item.perfumeId === input.perfumeId)) wishlist = [...wishlist,
          { perfumeId: perfume.id, perfume: fixtures.summary(perfume), available: true }];
        return success({ items: wishlist });
      }),
      remove: run("wishlist.remove", "CUSTOMER", input => {
        wishlist = wishlist.filter(item => item.perfumeId !== input.perfumeId);
        return success({ items: wishlist });
      }),
    },
    checkout: {
      getDeliveryMethods: run("checkout.getDeliveryMethods", "CUSTOMER", () => success([fixtures.deliveryMethod])),
      submit: run("checkout.submit", "CUSTOMER", input => {
        if (!input.idempotencyKey.trim()) return failure("VALIDATION_ERROR");
        if (input.cartId !== activeCart().id || input.deliveryAddressId !== profile.deliveryAddress?.id
          || input.billingAddressId !== profile.billingAddress?.id || input.deliveryMethodId !== fixtures.deliveryMethod.id) return failure("NOT_FOUND");
        if (input.expectedCartRevision !== activeCart().revision) return failure("CONFLICT");
        if (!activeCart().items.length) return failure("VALIDATION_ERROR");
        if (input.promotionCode) return success({ status: "INVALID_PROMOTION", message: "No promotion is configured in this fixture." });
        switch (settings.checkoutStatus ?? "READY_FOR_PAYMENT") {
          case "REQUIRES_CART_REVIEW": return success({ status: "REQUIRES_CART_REVIEW", cart: cartView() });
          case "OUT_OF_STOCK": return success({ status: "OUT_OF_STOCK", variantIds: ["variant-citrus"] });
          case "INVALID_PROMOTION": return success({ status: "INVALID_PROMOTION", message: "This promotion cannot be applied." });
          case "CHECKOUT_CONFLICT": return success({ status: "CHECKOUT_CONFLICT", message: "Reload checkout before retrying." });
          case "READY_FOR_PAYMENT": checkoutStarted = true; return success(fixtures.checkout);
        }
      }),
    },
    orders: {
      list: run("orders.list", "CUSTOMER", input => paginate([
        ...(settings.empty ? [] : [fixtures.order]), ...(checkoutStarted ? [fixtures.pendingOrder] : []),
      ].map(fixtures.orderSummary), input)),
      get: run("orders.get", "CUSTOMER", ({ id }) => {
        if (checkoutStarted && id === fixtures.pendingOrder.id) return success(fixtures.pendingOrder);
        if (id !== fixtures.order.id || settings.empty) return failure("NOT_FOUND");
        return success({ ...fixtures.order, cancellationRequest: cancellationRequested ? { requestedAt: fixtures.FIXTURE_TIME } : null });
      }),
      getInvoice: run("orders.getInvoice", "CUSTOMER", ({ orderId }) => {
        if (checkoutStarted && orderId === fixtures.pendingOrder.id) return failure("CONFLICT");
        return orderId === fixtures.order.id && !settings.empty ? success(fixtures.invoice) : failure("NOT_FOUND");
      }),
      requestCancellation: run("orders.requestCancellation", "CUSTOMER", input => {
        if (!input.idempotencyKey.trim()) return failure("VALIDATION_ERROR");
        if (input.orderId !== fixtures.order.id || settings.empty) return failure("NOT_FOUND");
        cancellationRequested = true;
        return success({ requestedAt: fixtures.FIXTURE_TIME });
      }),
    },
    tracking: {
      get: run("tracking.get", "CUSTOMER", ({ orderId }) => orderId === fixtures.order.id && !settings.empty
        ? success(fixtures.tracking) : failure("NOT_FOUND")),
    },
    admin: {
      getDashboard: run("admin.getDashboard", "ADMIN", period => {
        const from = Date.parse(period.from);
        const to = Date.parse(period.to);
        if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return failure("VALIDATION_ERROR");
        const hasOrder = !settings.empty && from <= Date.parse(fixtures.FIXTURE_TIME) && to > Date.parse(fixtures.FIXTURE_TIME);
        return success({ ...fixtures.dashboard, period, totalOrders: hasOrder ? 1 : 0,
          totalSales: fixtures.money(hasOrder ? 13000 : 0), bestSelling: hasOrder ? fixtures.dashboard.bestSelling : [] });
      }),
      listCatalogue: run("admin.listCatalogue", "ADMIN", input => paginate(settings.empty ? [] : [fixtures.adminPerfume], input)),
      getPerfume: run("admin.getPerfume", "ADMIN", ({ id }) => id === fixtures.citrus.id ? success(fixtures.adminPerfume) : failure("NOT_FOUND")),
      // Admin write responses are canned UI fixtures; catalogue/inventory authority is implemented later.
      createPerfume: run("admin.createPerfume", "ADMIN", () => success(fixtures.adminPerfume)),
      updatePerfume: run("admin.updatePerfume", "ADMIN", input => {
        if (input.id !== fixtures.citrus.id) return failure("NOT_FOUND");
        return input.expectedRevision === fixtures.adminPerfume.revision ? success(fixtures.adminPerfume) : failure("CONFLICT");
      }),
      archivePerfume: run("admin.archivePerfume", "ADMIN", input => {
        if (input.id !== fixtures.citrus.id) return failure("NOT_FOUND");
        return input.expectedRevision === fixtures.adminPerfume.revision
          ? success({ ...fixtures.adminPerfume, status: "ARCHIVED" }) : failure("CONFLICT");
      }),
      createVariant: run("admin.createVariant", "ADMIN", () => {
        const variant = fixtures.citrus.variants[0];
        return variant ? success(variant) : failure("NOT_FOUND");
      }),
      updateVariant: run("admin.updateVariant", "ADMIN", input => {
        if (input.perfumeId !== fixtures.citrus.id) return failure("NOT_FOUND");
        if (input.expectedRevision !== fixtures.adminPerfume.revision) return failure("CONFLICT");
        const variant = fixtures.citrus.variants.find(item => item.id === input.variantId);
        return variant ? success(variant) : failure("NOT_FOUND");
      }),
      listInventory: run("admin.listInventory", "ADMIN", input => paginate(settings.empty ? [] : [{
        ...fixtures.inventory, onHand: fixtures.inventory.onHand + (batchReleased ? fixtures.batch.producedQuantity : 0),
        available: fixtures.inventory.available + (batchReleased ? fixtures.batch.producedQuantity : 0),
      }], input)),
      listBatches: run("admin.listBatches", "ADMIN", input => paginate(settings.empty ? [] : [
        batchReleased ? { ...fixtures.batch, status: "RELEASED", releasedAt: fixtures.FIXTURE_TIME } : fixtures.batch,
      ], input)),
      createBatch: run("admin.createBatch", "ADMIN", () => success(fixtures.batch)),
      releaseBatch: run("admin.releaseBatch", "ADMIN", input => {
        if (input.id !== fixtures.batch.id) return failure("NOT_FOUND");
        if (!input.idempotencyKey.trim()) return failure("VALIDATION_ERROR");
        batchReleased = true;
        return success({ ...fixtures.batch, status: "RELEASED", releasedAt: fixtures.FIXTURE_TIME });
      }),
    },
  };
  return api;
}
