"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { createAuthHttpClient } from "@/lib/auth/client";
import { createProfileHttpClient } from "@/lib/profile/client";
import { createCheckoutHttpClient } from "@/lib/checkout/client";
import { createCartHttpClient } from "@/lib/cart/client";
import { createPaymentHttpClient } from "@/lib/payment/client";
import { getStripeClient } from "@/lib/payment/stripe-elements";
import type { DeliveryMethod, CheckoutResult, CheckoutRequest } from "@/contracts/checkout";
import type { CustomerProfile } from "@/contracts/profile";
import type { CartDto } from "@/contracts/cart";

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idemp_${Date.now()}`;
}

export function CheckoutView() {
  const [sessionLoading, setSessionLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [deliveryMethods, setDeliveryMethods] = React.useState<readonly DeliveryMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = React.useState<string>("");
  const [promotionCode, setPromotionCode] = React.useState<string>("");

  const [isLoadingData, setIsLoadingData] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<{ title: string; message: string } | null>(null);

  const [checkoutResult, setCheckoutResult] = React.useState<CheckoutResult | null>(null);
  const [paymentInitiation, setPaymentInitiation] = React.useState<{
    paymentId: string;
    clientSecret: string | null;
  } | null>(null);
  const [idempotencyKey] = React.useState<string>(generateIdempotencyKey);

  React.useEffect(() => {
    let mounted = true;
    const authClient = createAuthHttpClient();

    void authClient.getSession().then((result) => {
      if (!mounted) return;
      if (result.ok && result.data.user && result.data.user.role === "CUSTOMER") {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setSessionLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setIsAuthenticated(false);
      setSessionLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;

    const profileClient = createProfileHttpClient();
    const checkoutClient = createCheckoutHttpClient();
    const cartClient = createCartHttpClient();

    void Promise.all([
      profileClient.get(),
      checkoutClient.getDeliveryMethods(),
      cartClient.get(),
    ]).then(([profileRes, methodsRes, cartRes]) => {
      if (!mounted) return;
      if (profileRes.ok) {
        setProfile(profileRes.data);
      }
      if (methodsRes.ok && methodsRes.data.length > 0) {
        setDeliveryMethods(methodsRes.data);
        const firstMethod = methodsRes.data[0];
        if (firstMethod) {
          setSelectedMethodId(firstMethod.id);
        }
      }
      if (cartRes.ok) {
        setCart(cartRes.data);
      }
      setIsLoadingData(false);
    }).catch(() => {
      if (!mounted) return;
      setIsLoadingData(false);
    });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const handleSubmitCheckout = async () => {
    if (!cart || !profile?.deliveryAddress?.id) {
      setErrorBanner({
        title: "Missing Delivery Information",
        message: "A registered delivery address is required before proceeding with checkout.",
      });
      return;
    }

    if (!selectedMethodId) {
      setErrorBanner({
        title: "Missing Delivery Method",
        message: "Please select an available delivery method.",
      });
      return;
    }

    setIsSubmitting(true);
    setErrorBanner(null);

    const checkoutClient = createCheckoutHttpClient();
    const billingAddressId = profile.billingSameAsDelivery || !profile.billingAddress?.id
      ? profile.deliveryAddress.id
      : profile.billingAddress.id;

    const trimmedPromo = promotionCode.trim();
    const checkoutPayload: CheckoutRequest = {
      cartId: cart.id,
      expectedCartRevision: cart.revision,
      deliveryAddressId: profile.deliveryAddress.id,
      billingAddressId,
      deliveryMethodId: selectedMethodId,
      idempotencyKey,
      ...(trimmedPromo.length > 0 ? { promotionCode: trimmedPromo } : {}),
    };

    const result = await checkoutClient.submit(checkoutPayload);

    if (!result.ok) {
      setIsSubmitting(false);
      setErrorBanner({
        title: "Checkout Error",
        message: result.error.message,
      });
      return;
    }

    const payload = result.data;
    setCheckoutResult(payload);

    if (payload.status === "READY_FOR_PAYMENT") {
      const paymentClient = createPaymentHttpClient();
      const paymentRes = await paymentClient.initiate({ orderId: payload.orderId });
      if (paymentRes.ok) {
        setPaymentInitiation(paymentRes.data);
        void getStripeClient();
      } else {
        setErrorBanner({
          title: "Payment Initiation Failed",
          message: paymentRes.error.message,
        });
      }
    } else if (payload.status === "REQUIRES_CART_REVIEW") {
      setCart(payload.cart);
      setErrorBanner({
        title: "Cart Updated",
        message: "Your cart has changed. Please review the updated items and totals before completing checkout.",
      });
    } else if (payload.status === "OUT_OF_STOCK") {
      setErrorBanner({
        title: "Items Unavailable",
        message: "One or more selected items are currently out of stock. Please return to your cart.",
      });
    } else if (payload.status === "INVALID_PROMOTION") {
      setErrorBanner({
        title: "Promotion Invalid",
        message: payload.message,
      });
    } else if (payload.status === "CHECKOUT_CONFLICT") {
      setErrorBanner({
        title: "Order Conflict",
        message: payload.message,
      });
    }

    setIsSubmitting(false);
  };

  if (sessionLoading || isLoadingData) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Initialising secure checkout session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          title="Sign In Required"
          description="You must be signed in to access the checkout and complete your order."
          action={
            <Link href="/auth/login?redirect=/checkout">
              <Button size="lg" className="mt-4">
                Sign In to Customer Account
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (checkoutResult?.status === "READY_FOR_PAYMENT") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl">Payment Authorisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-md bg-surface-muted p-4 text-sm space-y-1">
              <p><span className="font-semibold text-foreground">Order ID:</span> {checkoutResult.orderId}</p>
              <p><span className="font-semibold text-foreground">Payment Attempt:</span> {checkoutResult.paymentAttemptId}</p>
              {paymentInitiation?.clientSecret && (
                <p className="text-xs text-muted-foreground">Provider session confirmed. Card inputs protected by provider boundary.</p>
              )}
            </div>

            <div id="stripe-payment-element" className="p-4 border border-dashed border-border rounded-md text-center text-sm text-muted-foreground">
              Provider-controlled Stripe Payment Element boundary. Palermo server never inspects or retains raw PAN/CVC.
            </div>

            {errorBanner && (
              <Alert variant="danger">
                <p className="font-semibold">{errorBanner.title}</p>
                <p className="text-sm">{errorBanner.message}</p>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border pt-4">
            <Link href="/cart">
              <Button variant="outline">Return to Bag</Button>
            </Link>
            <Button disabled={!paymentInitiation}>Confirm Payment</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review your delivery details and proceed to payment.</p>
      </div>

      {errorBanner && (
        <Alert variant="danger" className="mt-6">
          <p className="font-semibold">{errorBanner.title}</p>
          <p className="text-sm">{errorBanner.message}</p>
        </Alert>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-sm">
              {profile?.deliveryAddress ? (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{profile.deliveryAddress.recipientName}</p>
                  <p className="text-muted-foreground">{profile.deliveryAddress.line1}</p>
                  {profile.deliveryAddress.line2 && <p className="text-muted-foreground">{profile.deliveryAddress.line2}</p>}
                  <p className="text-muted-foreground">
                    {profile.deliveryAddress.suburb}, {profile.deliveryAddress.state} {profile.deliveryAddress.postcode}
                  </p>
                  <p className="text-muted-foreground">{profile.deliveryAddress.country}</p>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <p>No delivery address found in profile.</p>
                  <Link href="/account/profile" className="text-accent underline text-xs mt-2 inline-block">
                    Add delivery address
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Delivery Method</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {deliveryMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground">No delivery methods available.</p>
              ) : (
                deliveryMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center justify-between p-4 border rounded-md cursor-pointer transition-colors ${
                      selectedMethodId === method.id ? "border-foreground bg-surface-muted" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value={method.id}
                        checked={selectedMethodId === method.id}
                        onChange={() => { setSelectedMethodId(method.id); }}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{method.name}</p>
                        {method.displayInformation && (
                          <p className="text-xs text-muted-foreground">{method.displayInformation}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="neutral">
                      {method.charge.amountMinor === 0 ? "Complimentary" : `$${(method.charge.amountMinor / 100).toFixed(2)}`}
                    </Badge>
                  </label>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Promotion Code</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter promo code (optional)"
                  value={promotionCode}
                  onChange={(e) => { setPromotionCode(e.target.value); }}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="sticky top-24">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span className="font-medium text-foreground">
                  {cart?.pricing.subtotal ? `$${(cart.pricing.subtotal.amountMinor / 100).toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span className="font-medium text-foreground">
                  Calculated by delivery selection
                </span>
              </div>
              {cart?.pricing.discountTotal && cart.pricing.discountTotal.amountMinor > 0 && (
                <div className="flex justify-between text-accent">
                  <span>Discount</span>
                  <span className="font-medium">-${(cart.pricing.discountTotal.amountMinor / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between text-base font-bold text-foreground">
                <span>Total</span>
                <span>{cart?.pricing.total ? `$${(cart.pricing.total.amountMinor / 100).toFixed(2)}` : "—"}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => { void handleSubmitCheckout(); }}
                disabled={isSubmitting || !cart || !profile?.deliveryAddress}
              >
                {isSubmitting ? "Submitting Order..." : "Proceed to Payment"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
