"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface AddressOption {
  id: string;
  recipient: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  isDefault: boolean;
}

interface DeliveryMethod {
  id: string;
  title: string;
  eta: string;
  price: number;
}

interface CheckoutItem {
  id: string;
  title: string;
  concentration: string;
  sizeMl: number;
  quantity: number;
  itemTotal: number;
}

const SAVED_ADDRESSES: AddressOption[] = [
  {
    id: "addr_1",
    recipient: "Neil Legaspi",
    street: "Level 14, 440 Collins Street",
    suburb: "Melbourne",
    state: "VIC",
    postcode: "3000",
    isDefault: true,
  },
  {
    id: "addr_2",
    recipient: "Neil Legaspi",
    street: "128 Exhibition Street",
    suburb: "Melbourne",
    state: "VIC",
    postcode: "3000",
    isDefault: false,
  },
];

const DELIVERY_METHODS: DeliveryMethod[] = [
  { id: "std", title: "Standard Insured Courier", eta: "3-5 Business Days", price: 0.0 },
  { id: "exp", title: "Palermo White Glove Express", eta: "1-2 Business Days", price: 25.0 },
];

const ORDER_ITEMS: CheckoutItem[] = [
  {
    id: "item_01",
    title: "Sicilian Bergamot",
    concentration: "Extrait de Parfum",
    sizeMl: 50,
    quantity: 1,
    itemTotal: 145.0,
  },
  {
    id: "item_02",
    title: "Taormina Neroli",
    concentration: "Eau de Parfum",
    sizeMl: 100,
    quantity: 2,
    itemTotal: 360.0,
  },
];

export function CheckoutView() {
  const [isAuthenticated] = React.useState<boolean>(true);
  const [selectedAddressId, setSelectedAddressId] = React.useState<string>("addr_1");
  const [selectedMethodId, setSelectedMethodId] = React.useState<string>("std");
  const [promoCode, setPromoCode] = React.useState<string>("");
  const [appliedDiscount, setAppliedDiscount] = React.useState<number>(0);
  const [promoMessage, setPromoMessage] = React.useState<string | null>(null);

  // Card sandbox state
  const [cardNumber, setCardNumber] = React.useState<string>("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = React.useState<string>("12/28");
  const [cardCvc, setCardCvc] = React.useState<string>("123");

  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<{
    title: string;
    description: string;
    actionHref?: string;
    actionLabel?: string;
  } | null>(null);

  const [orderConfirmation, setOrderConfirmation] = React.useState<{
    orderId: string;
    finalGrandTotal: number;
    paymentIntentId: string;
  } | null>(null);

  const subtotal = ORDER_ITEMS.reduce((sum, item) => sum + item.itemTotal, 0);
  const selectedMethod = DELIVERY_METHODS.find((m) => m.id === selectedMethodId) ?? DELIVERY_METHODS[0];
  const shippingCost = selectedMethod?.price ?? 0;
  const grandTotal = Math.max(0, subtotal + shippingCost - appliedDiscount);

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "PALERMO10") {
      setAppliedDiscount(subtotal * 0.1);
      setPromoMessage("Promotion code PALERMO10 applied (-10%).");
      setErrorMessage(null);
    } else {
      setAppliedDiscount(0);
      setPromoMessage(null);
      setErrorMessage({
        title: "Voucher Not Recognized",
        description: "The promotional code entered is invalid, expired, or does not meet order threshold requirements.",
      });
    }
  };

  const handleSimulateConflict = () => {
    setErrorMessage({
      title: "Item Unavailable",
      description: "One of the items in your bag has just sold out. Please return to your cart to update your selection before completing payment.",
      actionHref: "/cart",
      actionLabel: "Return to Cart",
    });
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setOrderConfirmation({
        orderId: `PLR-${Math.floor(100000 + Math.random() * 900000)}`,
        finalGrandTotal: grandTotal,
        paymentIntentId: "pi_sandbox_3NnE45PalermoStripeAuth",
      });
    } catch {
      setErrorMessage({
        title: "Payment Authorization Failed",
        description: "Your card issuer declined the transaction. Please review your details or try a different card.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16">
        <Alert variant="warning" className="mb-6">
          <p className="font-semibold">Authentication Required</p>
          <p className="text-sm">Please sign in to your Palermo customer profile to access secure checkout.</p>
        </Alert>
        <Card>
          <CardContent className="pt-6">
            <Link href="/">
              <Button className="w-full">Sign In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderConfirmation) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <Badge variant="success" className="mb-4">
          Payment Authorised & Confirmed
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Thank You for Your Order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Palermo Parfums has secured your allocation and generated receipt #{orderConfirmation.orderId}.
        </p>

        <Card className="mt-8 text-left">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">Order Confirmation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Authoritative Order ID</span>
              <span className="font-mono font-bold text-foreground">{orderConfirmation.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stripe Gateway Ref</span>
              <span className="font-mono text-xs text-muted-foreground">{orderConfirmation.paymentIntentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Method</span>
              <span className="font-medium text-foreground">{selectedMethod?.title}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
              <span>Total Debited</span>
              <span>${orderConfirmation.finalGrandTotal.toFixed(2)} AUD</span>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">Return to Catalogue</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-6">
        <Badge variant="neutral" className="mb-2">
          Encrypted Stripe Sandbox Session
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Authorised Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review address, shipping tier, and process your allocation.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" className="mt-6">
          <p className="font-semibold text-base mb-1">{errorMessage.title}</p>
          <p className="text-sm">{errorMessage.description}</p>
          {errorMessage.actionHref && errorMessage.actionLabel && (
            <div className="mt-3">
              <Link href={errorMessage.actionHref}>
                <Button size="sm" variant="outline" className="border-destructive/30 hover:bg-destructive/10">
                  {errorMessage.actionLabel}
                </Button>
              </Link>
            </div>
          )}
        </Alert>
      )}

      {promoMessage && (
        <Alert variant="success" className="mt-6">
          <p className="text-sm">{promoMessage}</p>
        </Alert>
      )}

      <form onSubmit={handleProcessPayment} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">1. Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SAVED_ADDRESSES.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isSelected
                        ? "border-accent bg-accent/5 ring-2 ring-accent"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{addr.recipient}</span>
                      {addr.isDefault && <Badge variant="neutral" className="text-[10px]">Default</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {addr.street}, {addr.suburb} {addr.state} {addr.postcode}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">2. Delivery Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DELIVERY_METHODS.map((method) => {
                const isSelected = selectedMethodId === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={`w-full text-left p-4 rounded-lg border flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-accent bg-accent/5 ring-2 ring-accent"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-foreground">{method.title}</div>
                      <div className="text-xs text-muted-foreground">{method.eta}</div>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {method.price === 0 ? "Complimentary" : `$${method.price.toFixed(2)}`}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">3. Payment Details</CardTitle>
                <Badge variant="accent" className="text-[10px]">Stripe Elements Sandbox</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Card Number</label>
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 •••• •••• 4242"
                  disabled={isProcessing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Expiry</label>
                  <Input
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">CVC</label>
                  <Input
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    disabled={isProcessing}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Live card numbers will not be debited. This uses authenticated Stripe Sandbox mocks.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="sticky top-24">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 text-sm">
              <div className="space-y-3">
                {ORDER_ITEMS.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x {item.sizeMl}ml • {item.concentration}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground">${item.itemTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <label className="text-xs font-medium text-muted-foreground block mb-1">Voucher / Promo Code</label>
                <div className="flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="e.g. PALERMO10"
                    disabled={isProcessing}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={isProcessing || !promoCode}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping ({selectedMethod?.title})</span>
                  <span className="font-medium text-foreground">
                    {shippingCost === 0 ? "Complimentary" : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-accent font-medium">
                    <span>Voucher Discount</span>
                    <span>-${appliedDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between text-base font-bold text-foreground">
                  <span>Authoritative Total</span>
                  <span>${grandTotal.toFixed(2)} AUD</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isProcessing}
              >
                {isProcessing ? "Authorising via Stripe..." : `Confirm & Pay $${grandTotal.toFixed(2)} AUD`}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSimulateConflict}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Simulate Cart Conflict / Out of Stock
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}