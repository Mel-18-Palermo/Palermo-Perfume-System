"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import type { CartDto, CartItemDto, CartValidationMessage } from "@/contracts/cart";
import type { MoneyValue } from "@/contracts/common";

function formatMoney(value?: MoneyValue | null): string {
  if (!value) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: value.currency || "AUD",
  }).format(value.amountMinor / 100);
}

export interface CartViewProps {
  initialCart?: CartDto | null;
  initialLoading?: boolean;
  onCartChange?: (cart: CartDto | null) => void;
}

export function CartView({
  initialCart = null,
  initialLoading = false,
  onCartChange,
}: CartViewProps) {
  const [cart, setCart] = React.useState<CartDto | null>(initialCart);
  const [loading, setLoading] = React.useState<boolean>(initialLoading);
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null);
  const [isMutating, setIsMutating] = React.useState<boolean>(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isStaleRecovering, setIsStaleRecovering] = React.useState<boolean>(false);

  const updateCartState = React.useCallback(
    (nextCart: CartDto | null) => {
      setCart(nextCart);
      onCartChange?.(nextCart);
    },
    [onCartChange]
  );

  const refreshCart = React.useCallback(async () => {
    try {
      const res = await api.cart.get();
      if (res.ok) {
        updateCartState(res.data);
        setServerError(null);
      } else {
        setServerError(res.error.message || "Unable to load cart.");
      }
    } catch {
      setServerError("Unable to load shopping cart. Please check your connection.");
    } finally {
      setLoading(false);
      setIsStaleRecovering(false);
    }
  }, [updateCartState]);

  React.useEffect(() => {
    let active = true;

    if (!initialCart && initialLoading) {
      void api.cart
        .get()
        .then((res) => {
          if (!active) return;
          if (res.ok) {
            updateCartState(res.data);
            setServerError(null);
          } else {
            setServerError(res.error.message || "Unable to load cart.");
          }
        })
        .catch(() => {
          if (!active) return;
          setServerError("Unable to load shopping cart. Please check your connection.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [initialCart, initialLoading, updateCartState]);

  const handleUpdateQuantity = async (itemId: string, currentQty: number, delta: number) => {
    if (!cart || isMutating) return;
    const nextQty = currentQty + delta;
    if (nextQty <= 0) {
      await handleRemoveItem(itemId);
      return;
    }

    setPendingItemId(itemId);
    setIsMutating(true);
    setServerError(null);

    try {
      const res = await api.cart.updateQuantity({
        cartId: cart.id,
        expectedRevision: cart.revision,
        itemId,
        quantity: nextQty,
      });

      if (res.ok) {
        updateCartState(res.data);
        setServerError(null);
      } else {
        if (res.error.code === "CONFLICT") {
          setIsStaleRecovering(true);
          setServerError("Your cart was modified in another session. Refreshing latest state...");
          await refreshCart();
        } else {
          setServerError(res.error.message || "Failed to update quantity.");
        }
      }
    } catch {
      setServerError("Unable to update item quantity. Please verify connection and retry.");
    } finally {
      setPendingItemId(null);
      setIsMutating(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!cart || isMutating) return;
    setPendingItemId(itemId);
    setIsMutating(true);
    setServerError(null);

    try {
      const res = await api.cart.removeItem({
        cartId: cart.id,
        expectedRevision: cart.revision,
        itemId,
      });

      if (res.ok) {
        updateCartState(res.data);
        setServerError(null);
      } else {
        if (res.error.code === "CONFLICT") {
          setIsStaleRecovering(true);
          setServerError("Your cart was modified in another session. Refreshing latest state...");
          await refreshCart();
        } else {
          setServerError(res.error.message || "Failed to remove item.");
        }
      }
    } catch {
      setServerError("Unable to remove item from cart. Please verify connection and retry.");
    } finally {
      setPendingItemId(null);
      setIsMutating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center text-text-muted">
        Loading shopping bag...
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          title="Your Shopping Bag is Empty"
          description="Explore our haute parfumerie collection to select your signature fragrance."
          action={
            <Link
              href="/"
              className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-surface shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Explore Fragrance Catalogue
            </Link>
          }
        />
      </div>
    );
  }

  const totalItemCount = cart.items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-text">Shopping Bag</h1>
        <p className="mt-1 text-sm text-text-muted">
          {totalItemCount} {totalItemCount === 1 ? "item" : "items"} registered to your session
        </p>
      </div>

      {serverError && (
        <Alert variant="danger" className="mt-6" role="alert">
          <p className="font-semibold">Cart Notice</p>
          <p className="text-sm">{serverError}</p>
        </Alert>
      )}

      {cart.validationMessages && cart.validationMessages.length > 0 && (
        <div className="mt-4 space-y-2" aria-label="Cart validation messages">
          {cart.validationMessages.map((msg: CartValidationMessage, index: number) => (
            <Alert key={`${msg.code}-${msg.itemId ?? index}`} variant="warning" role="alert">
              <p className="font-semibold text-xs uppercase tracking-wider">{msg.code.replace(/_/g, " ")}</p>
              <p className="text-sm">{msg.message}</p>
            </Alert>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          {cart.items.map((item: CartItemDto) => {
            const isItemPending = pendingItemId === item.id;

            return (
              <Card
                key={item.id}
                className={`relative transition-opacity ${isItemPending ? "opacity-60 pointer-events-none" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-text">{item.title}</h2>
                        {item.concentration && (
                          <Badge variant="neutral" className="text-xs">
                            {item.concentration}
                          </Badge>
                        )}
                      </div>
                      {item.bottleSize && (
                        <p className="text-sm text-text-muted">{item.bottleSize}</p>
                      )}

                      {item.customisation && (
                        <div className="mt-3 rounded-md bg-surface-muted p-2.5 text-xs text-text-muted space-y-1">
                          {item.customisation.personalisedLabel && (
                            <p>
                              <span className="font-semibold text-text">Label: </span>
                              &ldquo;{item.customisation.personalisedLabel}&rdquo;
                            </p>
                          )}
                          {item.customisation.engravingName && (
                            <p>
                              <span className="font-semibold text-text">Engraving: </span>
                              &ldquo;{item.customisation.engravingName}&rdquo;
                            </p>
                          )}
                          {item.customisation.giftMessage && (
                            <p>
                              <span className="font-semibold text-text">Gift Message: </span>
                              &ldquo;{item.customisation.giftMessage}&rdquo;
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right sm:self-start">
                      <span className="text-lg font-bold text-text">
                        {formatMoney(item.itemTotal)}
                      </span>
                      <p className="text-xs text-text-muted">{formatMoney(item.unitPrice)} each</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted mr-2 font-medium">Quantity</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 text-base"
                        onClick={() => void handleUpdateQuantity(item.id, item.quantity, -1)}
                        disabled={isMutating || isStaleRecovering}
                        aria-label={`Decrease quantity of ${item.title}`}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold text-text" aria-live="polite">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 text-base"
                        onClick={() => void handleUpdateQuantity(item.id, item.quantity, 1)}
                        disabled={isMutating || isStaleRecovering}
                        aria-label={`Increase quantity of ${item.title}`}
                      >
                        +
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] text-xs text-danger hover:bg-danger/10 hover:text-danger"
                      onClick={() => void handleRemoveItem(item.id)}
                      disabled={isMutating || isStaleRecovering}
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
              <div className="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span className="font-medium text-text">{formatMoney(cart.pricing.subtotal)}</span>
              </div>
              {cart.pricing.discountTotal && cart.pricing.discountTotal.amountMinor > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Savings</span>
                  <span className="font-medium">-{formatMoney(cart.pricing.discountTotal)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between text-base font-bold text-text">
                <span>Total</span>
                <span>{formatMoney(cart.pricing.total)}</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Delivery options and calculated shipping costs are quoted separately at checkout.
              </p>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                className="w-full min-h-[44px]"
                size="lg"
                disabled
                aria-disabled="true"
              >
                {!cart.checkoutEligible
                  ? "Cart Ineligible for Checkout"
                  : "Checkout Unavailable (Coming Soon)"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}