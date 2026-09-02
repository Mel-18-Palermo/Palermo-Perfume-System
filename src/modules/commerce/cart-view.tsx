"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

export interface CartCustomisation {
  engravingText?: string;
  giftBox?: boolean;
}

export interface CartItemDto {
  id: string;
  variantId: string;
  title: string;
  concentration: string;
  sizeMl: number;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  customisation?: CartCustomisation;
}

export interface CartPricingDto {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  currency: string;
}

export interface CartValidationMessage {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface CartDto {
  id: string;
  kind: "VISITOR" | "CUSTOMER";
  items: CartItemDto[];
  pricing: CartPricingDto;
  checkoutEligible: boolean;
  validationMessages: CartValidationMessage[];
}

const INITIAL_CART: CartDto = {
  id: "cart_sess_01",
  kind: "VISITOR",
  checkoutEligible: true,
  items: [
    {
      id: "item_01",
      variantId: "p1-50ml",
      title: "Sicilian Bergamot",
      concentration: "Extrait de Parfum",
      sizeMl: 50,
      quantity: 1,
      unitPrice: 145.0,
      itemTotal: 145.0,
      customisation: {
        engravingText: "PALERMO 2026",
        giftBox: true,
      },
    },
    {
      id: "item_02",
      variantId: "p2-100ml",
      title: "Taormina Neroli",
      concentration: "Eau de Parfum",
      sizeMl: 100,
      quantity: 2,
      unitPrice: 180.0,
      itemTotal: 360.0,
    },
  ],
  pricing: {
    subtotal: 505.0,
    discountTotal: 0.0,
    shippingTotal: 15.0,
    grandTotal: 520.0,
    currency: "AUD",
  },
  validationMessages: [],
};

export function CartView() {
  const [cart, setCart] = React.useState<CartDto>(INITIAL_CART);
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null);
  const [isMutating, setIsMutating] = React.useState<boolean>(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const simulateServerMutation = (updatedItems: CartItemDto[]) => {
    const subtotal = updatedItems.reduce((acc, item) => acc + item.itemTotal, 0);
    const shippingTotal = subtotal > 0 ? (subtotal > 300 ? 0 : 15.0) : 0;
    const grandTotal = subtotal + shippingTotal;

    const messages: CartValidationMessage[] = [];
    if (subtotal > 0 && subtotal < 50) {
      messages.push({
        id: "msg_min_order",
        severity: "warning",
        message: "Orders under $50 may incur an additional remote handling fee at checkout.",
      });
    }

    return {
      ...cart,
      items: updatedItems,
      pricing: {
        ...cart.pricing,
        subtotal,
        shippingTotal,
        grandTotal,
      },
      checkoutEligible: updatedItems.length > 0,
      validationMessages: messages,
    };
  };

  const handleUpdateQuantity = async (itemId: string, delta: number) => {
    setPendingItemId(itemId);
    setIsMutating(true);
    setServerError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const updated = cart.items
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              itemTotal: nextQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItemDto[];

      setCart(simulateServerMutation(updated));
    } catch {
      setServerError("Unable to update item quantity. Please verify connection and retry.");
    } finally {
      setPendingItemId(null);
      setIsMutating(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setPendingItemId(itemId);
    setIsMutating(true);
    setServerError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const updated = cart.items.filter((item) => item.id !== itemId);
      setCart(simulateServerMutation(updated));
    } catch {
      setServerError("Unable to remove item from cart. Server mutation rejected.");
    } finally {
      setPendingItemId(null);
      setIsMutating(false);
    }
  };

  const handleClearCart = async () => {
    setIsMutating(true);
    setServerError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setCart({
        ...cart,
        items: [],
        pricing: {
          subtotal: 0,
          discountTotal: 0,
          shippingTotal: 0,
          grandTotal: 0,
          currency: "AUD",
        },
        checkoutEligible: false,
        validationMessages: [],
      });
    } catch {
      setServerError("Failed to reset cart session.");
    } finally {
      setIsMutating(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: cart.pricing.currency,
    }).format(amount);
  };

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          title="Your Shopping Bag is Empty"
          description="Explore our haute parfumerie collection to select your signature fragrance."
          action={
            <Link href="/">
              <Button size="lg" className="mt-4">
                Explore Fragrance Catalogue
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Shopping Bag</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cart.items.reduce((acc, i) => acc + i.quantity, 0)} items registered to your session
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCart}
          disabled={isMutating}
          aria-label="Empty cart"
        >
          Clear Cart
        </Button>
      </div>

      {serverError && (
        <Alert variant="danger" className="mt-6">
          <p className="font-semibold">Cart Mutation Error</p>
          <p className="text-sm">{serverError}</p>
        </Alert>
      )}

      {cart.validationMessages.map((msg) => {
        const alertVariant = msg.severity === "error" ? "danger" : msg.severity === "warning" ? "warning" : "info";
        return (
          <Alert key={msg.id} variant={alertVariant} className="mt-4">
            <p className="font-semibold capitalize">{msg.severity}</p>
            <p className="text-sm">{msg.message}</p>
          </Alert>
        );
      })}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          {cart.items.map((item) => {
            const isItemPending = pendingItemId === item.id;

            return (
              <Card key={item.id} className="relative transition-opacity" style={{ opacity: isItemPending ? 0.6 : 1 }}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                        <Badge variant="neutral" className="text-xs">
                          {item.concentration}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.sizeMl}ml flacon</p>

                      {item.customisation && (
                        <div className="mt-3 rounded-md bg-surface-muted p-2.5 text-xs text-muted-foreground space-y-1">
                          {item.customisation.engravingText && (
                            <p>
                              <span className="font-semibold text-foreground">Engraving: </span>
                              &ldquo;{item.customisation.engravingText}&rdquo;
                            </p>
                          )}
                          {item.customisation.giftBox && (
                            <p>
                              <span className="font-semibold text-foreground">Packaging: </span>
                              Signature Palermo Presentation Box
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right sm:self-start">
                      <span className="text-lg font-bold text-foreground">
                        {formatPrice(item.itemTotal)}
                      </span>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.unitPrice)} each</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground mr-2 font-medium">Quantity</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        disabled={isMutating}
                        aria-label={`Decrease quantity of ${item.title}`}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        disabled={isMutating}
                        aria-label={`Increase quantity of ${item.title}`}
                      >
                        +
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isMutating}
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-4">
          <Card className="sticky top-24">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(cart.pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Shipping</span>
                <span className="font-medium text-foreground">
                  {cart.pricing.shippingTotal === 0 ? "Complimentary" : formatPrice(cart.pricing.shippingTotal)}
                </span>
              </div>
              {cart.pricing.discountTotal > 0 && (
                <div className="flex justify-between text-accent">
                  <span>Savings</span>
                  <span className="font-medium">-{formatPrice(cart.pricing.discountTotal)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between text-base font-bold text-foreground">
                <span>Authoritative Total</span>
                <span>{formatPrice(cart.pricing.grandTotal)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Calculated strictly by authoritative cart service. Tax included.
              </p>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                className="w-full"
                size="lg"
                disabled={!cart.checkoutEligible || isMutating || cart.items.length === 0}
              >
                {!cart.checkoutEligible ? "Cart Ineligible for Checkout" : "Proceed to Checkout"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}