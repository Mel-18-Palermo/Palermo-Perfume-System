"use client";

import * as React from "react";
import type { Stripe, StripeElements, StripePaymentElement } from "@stripe/stripe-js";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { CheckoutRequest, CheckoutResult, DeliveryMethod } from "@/contracts/checkout";
import type { OrderDetail } from "@/contracts/orders";
import type { CustomerProfile } from "@/contracts/profile";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      if (!stripe || !container) { setMessage("Stripe payment is unavailable."); setStage("PAYMENT_FAILED"); return; }
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
    setCart(result.data); setPromotionInput(result.data.promotionCode ?? ""); setMessage(""); setStage(nextStage);
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
      if (!result.ok) { setMessage(result.error.message); setStage("PAYMENT_FAILED"); return; }
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
      if (result.error) { setMessage(result.error.message ?? "Payment failed."); setStage("PAYMENT_FAILED"); return; }
      await verifyOrder(orderId);
    } finally { paymentInFlightRef.current = false; }
  }

  async function applyPromotion(code: string | null) {
    if (!cart || controlsFrozen || checkoutInFlightRef.current || promotionInFlightRef.current) return false;
    promotionInFlightRef.current = true;
    setPromotionBusy(true);
    try {
      const result = await api.cart.applyPromotion({ cartId: cart.id, expectedRevision: cart.revision, code });
      if (!result.ok) { setMessage(result.error.message); return false; }
      setCart(result.data); setPromotionInput(result.data.promotionCode ?? ""); setMessage("");
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
  return <CustomerShell cart={cart} session={session} isLoading={stage === "INITIALISING"}>
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <section className="space-y-4">
        <h1 className="text-h1">Checkout</h1>
        {busy && <Alert title="Please wait">{stage === "VERIFYING_ORDER" ? "Verifying your order with Palermo." : "Processing your request."}</Alert>}
        {stage === "AUTH_REQUIRED" && <Alert variant="warning" title="Sign in required">Sign in as a customer to continue.</Alert>}
        {message && <Alert variant="warning">{message}</Alert>}
        {profile && <Card><CardHeader><CardTitle>Addresses and delivery</CardTitle></CardHeader><CardContent className="space-y-3">
          <p>Delivery: {profile.deliveryAddress ? [profile.deliveryAddress.recipientName, profile.deliveryAddress.line1, profile.deliveryAddress.suburb].join(", ") : "No saved delivery address."}</p>
          <p>Billing: {profile.billingSameAsDelivery ? "Same as delivery" : profile.billingAddress?.line1 ?? "No saved billing address."}</p>
          {!addressReady && <Alert variant="warning">Add the required delivery and billing addresses in your profile before checkout.</Alert>}
          {methods.length === 0 ? <Alert variant="warning">No delivery methods are currently available.</Alert> : <label className="block">Delivery method<select disabled={controlsFrozen} className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3" value={deliveryMethodId} onChange={(event) => { if (!checkoutInFlightRef.current) setDeliveryMethodId(event.target.value); }}>{methods.map((item) => <option key={item.id} value={item.id}>{item.name} — {money(item.charge)}</option>)}</select></label>}
        </CardContent></Card>}
        {paymentUiActive && <Card><CardHeader><CardTitle>Secure payment</CardTitle></CardHeader><CardContent><div ref={stripeContainerRef}/>{stage === "PAYMENT_READY" && <Button className="mt-4" onClick={() => { void confirmPayment(); }}>Confirm payment</Button>}</CardContent></Card>}
        {stage === "SUCCESS" && confirmedOrder && <Alert variant="success" title="Order confirmed">Order {confirmedOrder.orderNumber} is confirmed. Authoritative total: {money(confirmedOrder.total)}.</Alert>}
        {stage === "PAYMENT_PENDING" && orderId && <Alert title="Payment pending">Palermo still reports this payment as pending. <Button variant="link" onClick={() => { void verifyOrder(orderId); }}>Check status</Button></Alert>}
        {stage === "PAYMENT_EXPIRED" && <Alert variant="warning" title="Payment expired">Start a new canonical payment attempt to continue.</Alert>}
        {stage === "PAYMENT_FAILED" && <Alert variant="danger" title="Payment failed">The payment was not completed. You may retry through Palermo.</Alert>}
      </section>
      <aside className="space-y-4">
        <Card><CardHeader><CardTitle>Order summary</CardTitle></CardHeader><CardContent>
          {cart?.items.length ? cart.items.map((item) => <p key={item.id}>{item.title} × {item.quantity} — {money(item.itemTotal)}</p>) : <p>Your cart is empty.</p>}
          {cart?.validationMessages.map((item) => <Alert className="mt-2" variant="warning" key={`${item.code}-${item.itemId ?? "cart"}`}>{item.message}</Alert>)}
          <p className="mt-3 font-semibold">Cart total: {cart ? money(cart.pricing.total) : ""}</p>
          {selectedDeliveryMethod && <p>Delivery ({selectedDeliveryMethod.name}): {money(selectedDeliveryMethod.charge)} quoted separately</p>}
          <div className="mt-3 flex gap-2"><Input disabled={controlsFrozen || promotionBusy} aria-label="Promotion code" value={promotionInput} onChange={(event) => { if (!checkoutInFlightRef.current) setPromotionInput(event.target.value); }}/><Button disabled={controlsFrozen || promotionBusy} variant="outline" onClick={() => { void applyPromotion(promotionInput.trim() || null); }}>Apply</Button></div>
          {cart?.promotionCode && !controlsFrozen && <Button disabled={promotionBusy} variant="link" onClick={() => { void applyPromotion(null); }}>Remove {cart.promotionCode}</Button>}
        </CardContent></Card>
        {stage === "CHECKOUT_READY" && <Button className="w-full" disabled={!cart?.checkoutEligible || !checkoutReady} onClick={() => { void submitCheckout(); }}>Place order</Button>}
        {stage === "READY_FOR_PAYMENT" && <Button className="w-full" onClick={() => { void initiatePayment(); }}>Continue to payment</Button>}
        {stage === "REQUIRES_CART_REVIEW" && <Button className="w-full" onClick={() => setStage("CHECKOUT_READY")}>Review updated cart</Button>}
        {stage === "OUT_OF_STOCK" && <Button className="w-full" onClick={() => { void refreshCart(); }}>Refresh cart</Button>}
        {stage === "INVALID_PROMOTION" && <Button className="w-full" disabled={promotionBusy} onClick={() => { void removeInvalidPromotion(); }}>Remove promotion</Button>}
        {stage === "CHECKOUT_CONFLICT" && <Button className="w-full" onClick={() => { void refreshCheckout(); }}>Reload checkout</Button>}
        {(stage === "PAYMENT_FAILED" || stage === "PAYMENT_EXPIRED") && orderId && <Button className="w-full" onClick={() => { void initiatePayment(); }}>Retry payment</Button>}
        {stage === "ERROR" && orderId && <Button className="w-full" onClick={() => { void verifyOrder(orderId); }}>Retry order verification</Button>}
        {stage === "ERROR" && !orderId && <Button className="w-full" onClick={() => { window.location.reload(); }}>Retry checkout</Button>}
      </aside>
    </div>
  </CustomerShell>;
}
