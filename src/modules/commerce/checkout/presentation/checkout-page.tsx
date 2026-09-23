"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Stripe, StripeElements, StripePaymentElement } from "@stripe/stripe-js";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { CheckoutRequest, CheckoutResult, DeliveryMethod } from "@/contracts/checkout";
import type { OrderDetail } from "@/contracts/orders";
import type { CustomerProfile } from "@/contracts/profile";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getStripeClient } from "@/lib/payment/stripe-elements";

type Stage =
  | "INITIALISING" | "AUTH_REQUIRED" | "CHECKOUT_READY" | "CHECKOUT_SUBMITTING"
  | "READY_FOR_PAYMENT" | "PAYMENT_INITIALISING" | "PAYMENT_READY"
  | "PAYMENT_PROCESSING" | "VERIFYING_ORDER" | "SUCCESS" | "PAYMENT_FAILED"
  | "PAYMENT_EXPIRED" | "PAYMENT_PENDING" | "REQUIRES_CART_REVIEW"
  | "OUT_OF_STOCK" | "INVALID_PROMOTION" | "CHECKOUT_CONFLICT" | "ERROR";

const money = (value: { amountMinor: number; currency: string }) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: value.currency }).format(value.amountMinor / 100);
const pause = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const confirmedOrderStatuses: ReadonlySet<OrderDetail["status"]> = new Set([
  "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED",
]);

export function CheckoutPage() {
  const [stage, setStage] = React.useState<Stage>("INITIALISING");
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [methods, setMethods] = React.useState<readonly DeliveryMethod[]>([]);
  const [deliveryMethodId, setDeliveryMethodId] = React.useState("");
  const [promotionInput, setPromotionInput] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [orderId, setOrderId] = React.useState<string | null>(null);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = React.useState<OrderDetail | null>(null);
  const [idempotency, setIdempotency] = React.useState<{ fingerprint: string; key: string } | null>(null);
  const [promotionBusy, setPromotionBusy] = React.useState(false);
  const [promotionError, setPromotionError] = React.useState<string | null>(null);
  const stripeContainerRef = React.useRef<HTMLDivElement>(null);
  const stripeRef = React.useRef<Stripe | null>(null);
  const elementsRef = React.useRef<StripeElements | null>(null);
  const paymentElementRef = React.useRef<StripePaymentElement | null>(null);
  const checkoutInFlightRef = React.useRef(false);
  const promotionInFlightRef = React.useRef(false);
  const paymentInFlightRef = React.useRef(false);
  const verificationRunRef = React.useRef(0);

  const deliveryAddressId = profile?.deliveryAddress?.id ?? null;
  const billingAddressId = profile?.billingSameAsDelivery
    ? deliveryAddressId
    : profile?.billingAddress?.id ?? null;
  const addressReady = deliveryAddressId !== null && billingAddressId !== null;
  const checkoutReady = addressReady && methods.length > 0 && deliveryMethodId !== "";
  const controlsFrozen = orderId !== null || stage === "CHECKOUT_SUBMITTING";
  const selectedDeliveryMethod = methods.find((method) => method.id === deliveryMethodId) ?? null;
  const requestFingerprint = React.useMemo(
    () => cart && deliveryAddressId && billingAddressId && deliveryMethodId
      ? [cart.id, cart.revision, deliveryAddressId, billingAddressId, deliveryMethodId, cart.promotionCode ?? ""].join("|")
      : null,
    [cart, deliveryAddressId, billingAddressId, deliveryMethodId],
  );
  const paymentUiActive = stage === "PAYMENT_INITIALISING" || stage === "PAYMENT_READY" || stage === "PAYMENT_PROCESSING";

  const refreshCheckout = React.useCallback(async () => {
    const [profileResult, cartResult, methodResult] = await Promise.all([
      api.profile.get(), api.cart.get(), api.checkout.getDeliveryMethods(),
    ]);
    if (!profileResult.ok || !cartResult.ok || !methodResult.ok) {
      const error = !profileResult.ok ? profileResult.error
        : !cartResult.ok ? cartResult.error
          : !methodResult.ok ? methodResult.error : null;
      setMessage(error?.message ?? "Checkout is temporarily unavailable.");
      setStage("ERROR");
      return false;
    }
    setProfile(profileResult.data);
    setCart(cartResult.data);
    setMethods(methodResult.data);
    setDeliveryMethodId((current) => methodResult.data.some((method) => method.id === current)
      ? current
      : methodResult.data[0]?.id ?? "");
    setPromotionInput(cartResult.data.promotionCode ?? "");
    setPromotionError(null);
    setMessage("");
    setStage("CHECKOUT_READY");
    return true;
  }, []);

  const recoverFromInvalidResume = React.useCallback(async () => {
    verificationRunRef.current += 1;
    setOrderId(null);
    setClientSecret(null);
    setConfirmedOrder(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("orderId");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    await refreshCheckout();
  }, [refreshCheckout]);

  const verifyOrder = React.useCallback(async (targetOrderId: string, resumed = false) => {
    const run = ++verificationRunRef.current;
    setStage("VERIFYING_ORDER"); setMessage("");
    let sawPending = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (run !== verificationRunRef.current) return;
      const result = await api.orders.get({ id: targetOrderId });
      if (run !== verificationRunRef.current) return;
      if (result.ok) {
        if (result.data.paymentStatus === "SUCCEEDED" && confirmedOrderStatuses.has(result.data.status)) { setConfirmedOrder(result.data); setStage("SUCCESS"); return; }
        if (result.data.paymentStatus === "FAILED") { setStage("PAYMENT_FAILED"); return; }
        if (result.data.paymentStatus === "EXPIRED") { setStage("PAYMENT_EXPIRED"); return; }
        sawPending = result.data.paymentStatus === "PENDING";
      } else if (resumed && attempt === 0 && ["VALIDATION_ERROR", "FORBIDDEN", "NOT_FOUND"].includes(result.error.code)) {
        await recoverFromInvalidResume();
        return;
      }
      if (attempt < 4) await pause(1_000);
    }
    if (sawPending) setStage("PAYMENT_PENDING");
    else { setMessage("We could not verify the order status."); setStage("ERROR"); }
  }, [recoverFromInvalidResume]);

  React.useEffect(() => {
    let active = true;
    async function initialise() {
      const auth = await api.auth.getSession();
      if (!active) return;
      if (!auth.ok) {
        setMessage(auth.error.message);
        setStage("ERROR");
        return;
      }
      if (auth.data.user?.role !== "CUSTOMER") { setStage("AUTH_REQUIRED"); return; }
      setSession(auth.data);
      const resumedOrderId = new URLSearchParams(window.location.search).get("orderId");
      if (resumedOrderId) {
        setOrderId(resumedOrderId);
        await verifyOrder(resumedOrderId, true);
        return;
      }
      await refreshCheckout();
    }
    void initialise();
    return () => { active = false; verificationRunRef.current += 1; };
  }, [refreshCheckout, verifyOrder]);

  React.useEffect(() => {
    if (!paymentUiActive || !clientSecret) return;
    const secret = clientSecret;
    let active = true;
    async function mountPaymentElement() {
      const stripe = await getStripeClient();
      const container = stripeContainerRef.current;
      if (!active) return;
      if (!stripe || !container) { setMessage("Secure payment is temporarily unavailable. Please try again."); setStage("PAYMENT_FAILED"); return; }
      const elements = stripe.elements({ clientSecret: secret });
      const paymentElement = elements.create("payment");
      paymentElement.mount(container);
      stripeRef.current = stripe;
      elementsRef.current = elements;
      paymentElementRef.current = paymentElement;
      setStage("PAYMENT_READY");
    }
    void mountPaymentElement();
    return () => {
      active = false;
      paymentElementRef.current?.unmount();
      paymentElementRef.current = null;
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, [clientSecret, paymentUiActive]);

  async function refreshCart(nextStage: Stage = "CHECKOUT_READY") {
    const result = await api.cart.get();
    if (!result.ok) { setMessage(result.error.message); setStage("ERROR"); return; }
    setCart(result.data); setPromotionInput(result.data.promotionCode ?? ""); setPromotionError(null); setMessage(""); setStage(nextStage);
  }

  function handleCheckoutResult(result: CheckoutResult) {
    switch (result.status) {
      case "READY_FOR_PAYMENT": setOrderId(result.orderId); setStage("READY_FOR_PAYMENT"); return;
      case "REQUIRES_CART_REVIEW": setCart(result.cart); setMessage("Your cart changed. Review the authoritative cart before continuing."); setStage("REQUIRES_CART_REVIEW"); return;
      case "OUT_OF_STOCK": setMessage("One or more cart items are no longer available in the requested quantity."); setStage("OUT_OF_STOCK"); return;
      case "INVALID_PROMOTION": setMessage(result.message); setStage("INVALID_PROMOTION"); return;
      case "CHECKOUT_CONFLICT": setMessage(result.message); setStage("CHECKOUT_CONFLICT"); return;
    }
  }

  async function submitCheckout() {
    if (checkoutInFlightRef.current || !cart || !requestFingerprint || !deliveryAddressId || !billingAddressId || !checkoutReady) return;
    checkoutInFlightRef.current = true; setStage("CHECKOUT_SUBMITTING"); setMessage("");
    try {
      const key = idempotency?.fingerprint === requestFingerprint ? idempotency.key : crypto.randomUUID();
      setIdempotency({ fingerprint: requestFingerprint, key });
      const request: CheckoutRequest = { cartId: cart.id, expectedCartRevision: cart.revision, deliveryAddressId, billingAddressId, deliveryMethodId, idempotencyKey: key, ...(cart.promotionCode !== null ? { promotionCode: cart.promotionCode } : {}) };
      const result = await api.checkout.submit(request);
      if (!result.ok) { setMessage(result.error.message); setStage("ERROR"); return; }
      handleCheckoutResult(result.data);
    } finally { checkoutInFlightRef.current = false; }
  }

  async function initiatePayment() {
    if (paymentInFlightRef.current || !orderId) return;
    paymentInFlightRef.current = true; setClientSecret(null); setStage("PAYMENT_INITIALISING"); setMessage("");
    try {
      const result = await api.payment.initiate({ orderId });
      if (!result.ok) { setMessage("Secure payment is temporarily unavailable. Please try again."); setStage("PAYMENT_FAILED"); return; }
      if (result.data.clientSecret === null) { await verifyOrder(orderId); return; }
      setClientSecret(result.data.clientSecret);
    } finally { paymentInFlightRef.current = false; }
  }

  async function confirmPayment() {
    if (paymentInFlightRef.current) return;
    const stripe = stripeRef.current; const elements = elementsRef.current;
    if (!stripe || !elements || !orderId) return;
    paymentInFlightRef.current = true; setStage("PAYMENT_PROCESSING");
    try {
      const returnUrl = new URL("/checkout", window.location.origin);
      returnUrl.searchParams.set("orderId", orderId);
      const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl.toString() }, redirect: "if_required" });
      if (result.error) { setMessage("Your payment could not be completed. Check your details and try again."); setStage("PAYMENT_FAILED"); return; }
      await verifyOrder(orderId);
    } finally { paymentInFlightRef.current = false; }
  }

  async function applyPromotion(code: string | null) {
    if (!cart || controlsFrozen || checkoutInFlightRef.current || promotionInFlightRef.current) return false;
    promotionInFlightRef.current = true;
    setPromotionBusy(true);
    setPromotionError(null);
    try {
      const result = await api.cart.applyPromotion({ cartId: cart.id, expectedRevision: cart.revision, code });
      if (!result.ok) { setPromotionError(result.error.message); return false; }
      setCart(result.data); setPromotionInput(result.data.promotionCode ?? ""); setPromotionError(null); setMessage("");
      return true;
    } finally {
      promotionInFlightRef.current = false;
      setPromotionBusy(false);
    }
  }

  async function removeInvalidPromotion() {
    if (await applyPromotion(null)) setStage("CHECKOUT_READY");
  }

  const busy = stage === "INITIALISING" || stage === "CHECKOUT_SUBMITTING" || stage === "PAYMENT_INITIALISING" || stage === "PAYMENT_PROCESSING" || stage === "VERIFYING_ORDER";
  const recoveryStage = stage === "REQUIRES_CART_REVIEW" || stage === "OUT_OF_STOCK" || stage === "INVALID_PROMOTION" || stage === "CHECKOUT_CONFLICT" || stage === "PAYMENT_FAILED" || stage === "PAYMENT_EXPIRED" || stage === "PAYMENT_PENDING" || stage === "ERROR";
  const showGenericMessage = Boolean(message) && !recoveryStage;

  return <CustomerShell cart={cart} session={session} isLoading={stage === "INITIALISING"}>
    <div className="mx-auto max-w-[var(--container-page)]" aria-busy={busy}>
      <header className="border-b border-border pb-7 sm:pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Complete your selection</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <h1 className="text-4xl font-normal tracking-[-0.055em] text-text sm:text-5xl sm:leading-[1.05]">Checkout</h1>
          {stage !== "AUTH_REQUIRED" && <ol className="flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.13em] text-text-muted" aria-label="Checkout steps">
            {[["01", "Details & delivery"], ["02", "Payment"]].map(([number, label]) => <li key={number} className="flex items-center gap-2"><span className="text-text">{number}</span>{label}</li>)}
          </ol>}
        </div>
      </header>

      {stage === "AUTH_REQUIRED" ? <section className="max-w-[var(--container-reading)] border-b border-warning py-10 sm:py-12" aria-labelledby="auth-recovery-heading">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">Checkout</p>
        <h2 id="auth-recovery-heading" className="mt-3 text-3xl font-normal tracking-[-0.045em] text-text">Sign in to continue</h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-text-muted">You need to sign in with a customer account before continuing to checkout.</p>
        <Link href="/login?next=/checkout" className="mt-7 inline-flex min-h-[48px] items-center bg-primary px-5 py-3 text-sm font-medium !text-[#fff] transition-transform duration-[var(--duration-normal)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none">Sign in <span className="ml-3" aria-hidden="true">→</span></Link>
      </section> : <div className="mt-8 grid grid-cols-1 gap-y-12 lg:mt-10 lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16">
        <section className="lg:col-span-7" aria-label="Checkout details">
          {busy && <div className="border-y border-border py-4 text-sm text-text-muted" role="status">{stage === "VERIFYING_ORDER" ? "Verifying your order with Palermo." : "Processing your request."}</div>}
          {showGenericMessage && <div className="border-y border-warning py-4 text-sm" role="alert">{message}</div>}

          {profile && <>
            <section className="border-b border-border py-8 sm:py-10" aria-labelledby="details-heading">
              <div className="flex items-baseline gap-4"><span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">01</span><h2 id="details-heading" className="text-2xl font-normal tracking-[-0.04em] text-text">Your details</h2></div>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-8">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.13em] text-text-muted">Delivery address</p>
                  <address className="mt-3 not-italic text-sm leading-6 text-text">
                    {profile.deliveryAddress ? <>{profile.deliveryAddress.recipientName}<br />{profile.deliveryAddress.line1}{profile.deliveryAddress.line2 && <><br />{profile.deliveryAddress.line2}</>}<br />{profile.deliveryAddress.suburb}, {profile.deliveryAddress.state} {profile.deliveryAddress.postcode}<br />{profile.deliveryAddress.country}</> : "No saved delivery address."}
                  </address>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.13em] text-text-muted">Billing address</p>
                  <p className="mt-3 text-sm leading-6 text-text">{profile.billingSameAsDelivery ? "Same as delivery address" : profile.billingAddress ? <>{profile.billingAddress.recipientName}<br />{profile.billingAddress.line1}{profile.billingAddress.line2 && <><br />{profile.billingAddress.line2}</>}<br />{profile.billingAddress.suburb}, {profile.billingAddress.state} {profile.billingAddress.postcode}<br />{profile.billingAddress.country}</> : "No saved billing address."}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><Link href="/account" className="border-b border-text pb-1 transition-colors hover:border-text-muted hover:text-text-muted">Manage addresses</Link><span className="text-text-muted">{profile.email}</span></div>
              {!addressReady && <div className="mt-6 border-l-2 border-warning pl-4 text-sm leading-6 text-text" role="alert">Add the required delivery and billing addresses in your profile before checkout.</div>}
            </section>

            <section className="border-b border-border py-8 sm:py-10" aria-labelledby="delivery-heading">
              <div className="flex items-baseline gap-4"><span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">02</span><h2 id="delivery-heading" className="text-2xl font-normal tracking-[-0.04em] text-text">Delivery</h2></div>
              <p className="mt-3 text-sm leading-6 text-text-muted">Choose from the delivery options available for your order.</p>
              {methods.length === 0 ? <div className="mt-6 border-l-2 border-warning pl-4 text-sm leading-6 text-text" role="alert">No delivery methods are currently available.</div> : <fieldset className="mt-6 border-y border-border"><legend className="sr-only">Delivery method</legend>{methods.map((item) => {
                const selected = item.id === deliveryMethodId;
                return <label key={item.id} className={`relative flex min-h-[72px] cursor-pointer items-center justify-between gap-4 border-b border-border px-4 py-4 last:border-b-0 transition-colors hover:bg-surface-muted ${selected ? "bg-surface-muted" : "bg-transparent"}`}>
                  <input type="radio" name="delivery-method" className="sr-only" disabled={controlsFrozen} value={item.id} checked={selected} onChange={() => { if (!checkoutInFlightRef.current) setDeliveryMethodId(item.id); }} />
                  <span className="min-w-0"><span className="block text-sm font-medium text-text">{item.name}</span>{item.displayInformation !== null && <span className="mt-1 block text-xs leading-5 text-text-muted">{item.displayInformation}</span>}</span>
                  <span className="flex shrink-0 items-center gap-3 text-right"><span className="text-sm font-medium tabular-nums text-text">{money(item.charge)}</span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-text" : "border-border-strong"}`} aria-hidden="true">{selected && "✓"}</span><span className="sr-only">{selected ? ", selected" : ""}</span></span>
                </label>;
              })}</fieldset>}
            </section>
          </>}

          {paymentUiActive && <section className="border-b border-border py-8 sm:py-10" aria-labelledby="payment-heading"><div className="flex items-baseline gap-4"><span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">03</span><h2 id="payment-heading" className="text-2xl font-normal tracking-[-0.04em] text-text">Payment</h2></div><div className="mt-6 border border-border bg-surface p-4 sm:p-6"><p className="mb-5 text-sm text-text-muted">Enter your payment details below to complete your order.</p><div ref={stripeContainerRef} />{stage === "PAYMENT_READY" && <Button className="mt-6 w-full rounded-none transition-transform duration-[var(--duration-normal)] hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none" onClick={() => { void confirmPayment(); }}>Confirm payment</Button>}</div></section>}

          {stage === "SUCCESS" && confirmedOrder && <section className="border-b border-success py-8 sm:py-10" aria-labelledby="confirmation-heading"><p className="text-xs font-medium uppercase tracking-[0.16em] text-success">Order confirmed</p><h2 id="confirmation-heading" className="mt-3 text-3xl font-normal tracking-[-0.045em] text-text">Thank you for choosing Palermo.</h2><p className="mt-4 text-sm leading-6 text-text-muted">Order {confirmedOrder.orderNumber} is confirmed. Total: {money(confirmedOrder.total)}.</p></section>}

          {stage === "PAYMENT_PENDING" && <div className="border-b border-warning py-6 text-sm leading-6" role="status"><p className="font-medium">Payment is still being confirmed.</p><p className="mt-1 text-text-muted">Your order status has not changed yet.</p>{orderId && <Button variant="link" className="mt-3" onClick={() => { void verifyOrder(orderId); }}>Check status</Button>}</div>}
          {stage === "PAYMENT_EXPIRED" && <div className="border-b border-warning py-6 text-sm leading-6" role="alert"><p className="font-medium">Your payment session has expired.</p><p className="mt-1 text-text-muted">Start a new payment attempt to continue.</p></div>}
          {stage === "PAYMENT_FAILED" && <div className="border-b border-danger py-6 text-sm leading-6" role="alert"><p className="font-medium">Payment was not completed.</p><p className="mt-1 text-text-muted">{message || "Try again when you are ready."}</p></div>}
          {stage === "REQUIRES_CART_REVIEW" && <div className="border-b border-warning py-6 text-sm leading-6" role="alert"><p className="font-medium">Your cart has changed.</p><p className="mt-1 text-text-muted">{message}</p></div>}
          {stage === "OUT_OF_STOCK" && <div className="border-b border-warning py-6 text-sm leading-6" role="alert"><p className="font-medium">One or more items are no longer available.</p><p className="mt-1 text-text-muted">Refresh your cart to see the current selection.</p></div>}
          {stage === "INVALID_PROMOTION" && <div className="border-b border-warning py-6 text-sm leading-6" role="alert"><p className="font-medium">Your promotion needs attention.</p><p className="mt-1 text-text-muted">{message}</p></div>}
          {stage === "CHECKOUT_CONFLICT" && <div className="border-b border-warning py-6 text-sm leading-6" role="alert"><p className="font-medium">Checkout needs to be refreshed.</p><p className="mt-1 text-text-muted">{message}</p></div>}
          {stage === "ERROR" && <div className="border-b border-danger py-6 text-sm leading-6" role="alert"><p className="font-medium">We could not complete checkout.</p><p className="mt-1 text-text-muted">{message || "Please try again."}</p></div>}
        </section>

        <aside className="lg:col-span-5 lg:pt-0" aria-labelledby="order-summary-title">
          <div className="border-y border-border py-6 lg:sticky lg:top-24">
            <div className="flex items-baseline justify-between gap-4"><h2 id="order-summary-title" className="text-2xl font-normal tracking-[-0.04em] text-text">Your order</h2>{cart?.items.length ? <span className="text-xs uppercase tracking-[0.13em] text-text-muted">{cart.items.reduce((total, item) => total + item.quantity, 0)} item{cart.items.reduce((total, item) => total + item.quantity, 0) === 1 ? "" : "s"}</span> : null}</div>
            <div className="mt-6 divide-y divide-border">
              {cart?.items.length ? cart.items.map((item) => <article key={item.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-4 first:pt-0"><div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">{item.imageUrl ? <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(min-width: 1024px) 160px, 72px" className="object-contain p-1" /> : <div className="flex h-full items-center justify-center px-2 text-center text-[9px] uppercase tracking-[0.13em] text-text-muted">Palermo</div>}</div><div className="min-w-0"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-medium leading-5 text-text">{item.title}</h3><p className="mt-1 text-xs uppercase tracking-[0.11em] text-text-muted">{[item.concentration, item.bottleSize].filter(Boolean).join(" · ")}</p></div><p className="shrink-0 text-sm font-medium tabular-nums text-text">{money(item.itemTotal)}</p></div><p className="mt-3 text-xs text-text-muted">Quantity {item.quantity}</p></div></article>) : <p className="py-4 text-sm text-text-muted">Your cart is empty.</p>}
            </div>
            {cart?.validationMessages.map((item) => <div className="border-l-2 border-warning py-3 pl-3 text-xs leading-5 text-text-muted" role="alert" key={`${item.code}-${item.itemId ?? "cart"}`}>{item.message}</div>)}
            <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex justify-between gap-4 text-text-muted"><span>Subtotal</span><span className="font-medium tabular-nums text-text">{cart ? money(cart.pricing.subtotal) : "—"}</span></div>
              {cart?.pricing.discountTotal && cart.pricing.discountTotal.amountMinor > 0 && <div className="flex justify-between gap-4 text-success"><span>Promotion</span><span className="font-medium tabular-nums">−{money(cart.pricing.discountTotal)}</span></div>}
              <div className="flex justify-between gap-4 text-text-muted"><span>Delivery{selectedDeliveryMethod ? ` · ${selectedDeliveryMethod.name}` : ""}</span><span className="font-medium tabular-nums text-text">{selectedDeliveryMethod ? money(selectedDeliveryMethod.charge) : "Select a method"}</span></div>
              <div className="flex justify-between gap-4 border-t border-border pt-5 text-lg font-medium tabular-nums text-text"><span>Cart total</span><span>{cart ? money(cart.pricing.total) : "—"}</span></div>
              <p className="text-xs leading-5 text-text-muted">Delivery is shown separately and is confirmed with your order.</p>
            </div>
            <div className="mt-6 border-t border-border pt-5"><label htmlFor="promotion-code" className="text-xs font-medium uppercase tracking-[0.13em] text-text-muted">Promotion code</label><div className="mt-3 flex gap-2"><Input id="promotion-code" disabled={controlsFrozen || promotionBusy} aria-label="Promotion code" error={promotionError ?? undefined} className="rounded-none" value={promotionInput} onChange={(event) => { if (!checkoutInFlightRef.current) { setPromotionInput(event.target.value); setPromotionError(null); } }} /><Button disabled={controlsFrozen || promotionBusy} variant="outline" className="rounded-none" onClick={() => { void applyPromotion(promotionInput.trim() || null); }}>Apply</Button></div>{cart?.promotionCode && !controlsFrozen && <Button disabled={promotionBusy} variant="link" className="mt-3 text-xs" onClick={() => { void applyPromotion(null); }}>Remove {cart.promotionCode}</Button>}</div>
            <div className="mt-7">
              {stage === "CHECKOUT_READY" && <Button className="w-full rounded-none transition-transform duration-[var(--duration-normal)] hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none" size="lg" disabled={!cart?.checkoutEligible || !checkoutReady} onClick={() => { void submitCheckout(); }}>Place order <span className="ml-auto" aria-hidden="true">→</span></Button>}
              {stage === "READY_FOR_PAYMENT" && <Button className="w-full rounded-none transition-transform duration-[var(--duration-normal)] hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none" size="lg" onClick={() => { void initiatePayment(); }}>Continue to payment <span className="ml-auto" aria-hidden="true">→</span></Button>}
              {stage === "REQUIRES_CART_REVIEW" && <Button className="w-full rounded-none" size="lg" onClick={() => setStage("CHECKOUT_READY")}>Review updated cart</Button>}
              {stage === "OUT_OF_STOCK" && <Button className="w-full rounded-none" size="lg" onClick={() => { void refreshCart(); }}>Refresh cart</Button>}
              {stage === "INVALID_PROMOTION" && <Button className="w-full rounded-none" size="lg" disabled={promotionBusy} onClick={() => { void removeInvalidPromotion(); }}>Remove promotion</Button>}
              {stage === "CHECKOUT_CONFLICT" && <Button className="w-full rounded-none" size="lg" onClick={() => { void refreshCheckout(); }}>Reload checkout</Button>}
              {(stage === "PAYMENT_FAILED" || stage === "PAYMENT_EXPIRED") && orderId && <Button className="w-full rounded-none" size="lg" onClick={() => { void initiatePayment(); }}>Try payment again</Button>}
              {stage === "ERROR" && orderId && <Button className="w-full rounded-none" size="lg" onClick={() => { void verifyOrder(orderId); }}>Check order status</Button>}
              {stage === "ERROR" && !orderId && <Button className="w-full rounded-none" size="lg" onClick={() => { window.location.reload(); }}>Retry checkout</Button>}
            </div>
          </div>
        </aside>
      </div>}
    </div>
  </CustomerShell>;
}
