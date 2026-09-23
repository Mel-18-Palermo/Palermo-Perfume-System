"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
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
  initialError?: string | null;
  initialLoading?: boolean;
  onCartChange?: (cart: CartDto | null) => void;
}

export function CartView({
  initialCart = null,
  initialError = null,
  initialLoading = false,
  onCartChange,
}: CartViewProps) {
  const [cart, setCart] = React.useState<CartDto | null>(initialCart);
  const [prevInitialCart, setPrevInitialCart] = React.useState<CartDto | null>(initialCart);

  const [serverError, setServerError] = React.useState<string | null>(initialError);
  const [prevInitialError, setPrevInitialError] = React.useState<string | null>(initialError);

  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null);
  const [isMutating, setIsMutating] = React.useState<boolean>(false);
  const [isStaleRecovering, setIsStaleRecovering] = React.useState<boolean>(false);

  // Adjust state during render when props change (idiomatic React without useEffect cascading render)
  if (initialCart !== prevInitialCart) {
    setPrevInitialCart(initialCart);
    setCart(initialCart);
  }

  if (initialError !== prevInitialError) {
    setPrevInitialError(initialError);
    setServerError(initialError);
  }

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
      setIsStaleRecovering(false);
    }
  }, [updateCartState]);

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

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-[var(--container-wide)] px-4 py-16 sm:px-6 lg:px-8" role="status">
        <div className="border-y border-border py-8 text-sm text-text-muted">Loading your selection...</div>
      </div>
    );
  }

  // Explicitly surface initial request failures instead of masking them with an empty cart
  if (serverError && (!cart || cart.items.length === 0)) {
    return (
      <div className="mx-auto max-w-[var(--container-wide)] px-4 py-12 sm:px-6 lg:px-8">
        <Alert variant="danger" className="rounded-none border-x-0 px-0" role="alert">
          <p className="font-semibold">Cart Error</p>
          <p className="text-sm">{serverError}</p>
        </Alert>
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => void refreshCart()}>
            Retry Loading Bag
          </Button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-[var(--container-wide)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <section className="max-w-xl border-t border-border pt-10 sm:pt-12" aria-labelledby="empty-cart-title">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Your selection</p>
          <h1 id="empty-cart-title" className="mt-4 text-4xl font-normal tracking-[-0.055em] text-text sm:text-5xl sm:leading-[1.05]">
            Your cart is empty.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-text-muted">Explore the collection to find a fragrance that feels like yours.</p>
          <Link
            href="/catalogue"
            className="mt-8 inline-flex min-h-[48px] items-center justify-center bg-primary px-6 py-3 text-sm font-medium !text-[#fff] transition-transform duration-[var(--duration-normal)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none"
          >
            Explore the collection <span className="ml-3" aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    );
  }

  const totalItemCount = cart.items.reduce((acc, i) => acc + i.quantity, 0);
  const authenticationMessage = cart.validationMessages?.find((message) => message.code === "AUTHENTICATION_REQUIRED");
  const otherValidationMessages = cart.validationMessages?.filter((message) => message.code !== "AUTHENTICATION_REQUIRED") ?? [];

  return (
    <main
      className="mx-auto max-w-[var(--container-wide)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16"
      aria-busy={isMutating}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {isMutating ? "Updating shopping bag items..." : isStaleRecovering ? "Refreshing cart data..." : ""}
      </div>

      <header className="border-b border-border pb-7 sm:pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Your selection</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h1 className="text-4xl font-normal tracking-[-0.055em] text-text sm:text-5xl sm:leading-[1.05]">Cart</h1>
          <p className="pb-1 text-sm text-text-muted">
            {totalItemCount} {totalItemCount === 1 ? "fragrance" : "fragrances"}
          </p>
        </div>
      </header>

      {serverError && (
        <Alert variant="danger" className="mt-6 rounded-none border-x-0 px-0" role="alert">
          <p className="font-semibold">Cart Notice</p>
          <p className="text-sm">{serverError}</p>
        </Alert>
      )}

      {otherValidationMessages.length > 0 && (
        <div className="mt-4 space-y-2" aria-label="Cart validation messages">
          {otherValidationMessages.map((msg: CartValidationMessage, index: number) => (
            <Alert key={`${msg.code}-${msg.itemId ?? index}`} variant="warning" className="rounded-none border-x-0 px-0" role="alert">
              <p className="font-semibold text-xs uppercase tracking-wider">{msg.code.replace(/_/g, " ")}</p>
              <p className="text-sm">{msg.message}</p>
            </Alert>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-y-12 lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16">
        <section className="lg:col-span-8" aria-label="Cart items">
          {cart.items.map((item: CartItemDto) => {
            const isItemPending = pendingItemId === item.id;

            return (
              <article
                key={item.id}
                className={`grid grid-cols-[minmax(7.25rem,34%)_1fr] gap-x-5 border-b border-border py-6 first:pt-0 sm:grid-cols-[12.5rem_1fr] sm:gap-x-8 sm:py-8 md:grid-cols-[14rem_1fr] ${isItemPending ? "pointer-events-none opacity-60" : ""}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 224px, (min-width: 640px) 200px, 34vw"
                      className="object-contain p-3 transition-transform duration-[var(--duration-slow)] ease-out hover:scale-[1.025] motion-reduce:transition-none motion-reduce:hover:scale-100"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs uppercase tracking-[0.16em] text-text-muted">Palermo<br />Parfums</div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-2xl font-normal leading-[1.1] tracking-[-0.04em] text-text sm:text-3xl">{item.title}</h2>
                      <p className="mt-2 text-xs uppercase tracking-[0.13em] text-text-muted">
                        {[item.concentration, item.bottleSize].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-text sm:text-base">{formatMoney(item.itemTotal)}</p>
                  </div>

                  {item.customisation && (item.customisation.personalisedLabel || item.customisation.engravingName || item.customisation.giftMessage || item.customisation.giftPackagingId != null) && (
                    <div className="mt-5 border-l border-border-strong pl-3 text-xs leading-5 text-text-muted">
                          {item.customisation.personalisedLabel && (
                            <p>
                              <span className="font-medium text-text">Label: </span>
                              &ldquo;{item.customisation.personalisedLabel}&rdquo;
                            </p>
                          )}
                          {item.customisation.engravingName && (
                            <p>
                              <span className="font-medium text-text">Engraving: </span>
                              &ldquo;{item.customisation.engravingName}&rdquo;
                            </p>
                          )}
                          {item.customisation.giftMessage && (
                            <p>
                              <span className="font-medium text-text">Gift message: </span>
                              &ldquo;{item.customisation.giftMessage}&rdquo;
                            </p>
                          )}
                        {item.customisation.giftPackagingId != null && (
                          <p>
                            <span className="font-medium text-text">Gift packaging: </span>
                            Selected
                          </p>
                        )}
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-x-5 gap-y-3 pt-6 sm:pt-8">
                    <div>
                      <span className="block text-xs font-medium uppercase tracking-[0.13em] text-text-muted">Quantity</span>
                      <div className="mt-2 flex items-center border-y border-border">
                        <button
                          type="button"
                          className="flex h-11 w-11 items-center justify-center text-lg transition-colors hover:bg-surface-muted active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:opacity-40"
                        onClick={() => void handleUpdateQuantity(item.id, item.quantity, -1)}
                        disabled={isMutating || isStaleRecovering}
                        aria-label={`Decrease quantity of ${item.title}`}
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-sm font-medium tabular-nums text-text" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center text-lg transition-colors hover:bg-surface-muted active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:opacity-40"
                        onClick={() => void handleUpdateQuantity(item.id, item.quantity, 1)}
                        disabled={isMutating || isStaleRecovering}
                        aria-label={`Increase quantity of ${item.title}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="min-h-11 border-b border-transparent pb-px text-xs text-text-muted transition-colors hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
                      onClick={() => void handleRemoveItem(item.id)}
                      disabled={isMutating || isStaleRecovering}
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      Remove
                    </button>
                  </div>
                  </div>
                  <p className="mt-3 text-xs tabular-nums text-text-muted">{formatMoney(item.unitPrice)} each</p>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="lg:col-span-4 lg:pt-0" aria-labelledby="order-summary-title">
          <div className="border-y border-border py-6 lg:sticky lg:top-24">
            <h2 id="order-summary-title" className="text-2xl font-normal tracking-[-0.04em] text-text">Order summary</h2>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span className="font-medium tabular-nums text-text">{formatMoney(cart.pricing.subtotal)}</span>
              </div>
              {cart.pricing.discountTotal && cart.pricing.discountTotal.amountMinor > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Savings</span>
                  <span className="font-medium tabular-nums">-{formatMoney(cart.pricing.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-5 text-lg font-medium tabular-nums text-text">
                <span>Total</span>
                <span>{formatMoney(cart.pricing.total)}</span>
              </div>
            </div>
            <p className="mt-5 text-xs leading-5 text-text-muted">Delivery options and calculated shipping costs are quoted separately at checkout.</p>
            {authenticationMessage && (
              <div className="mt-5 text-xs leading-5 text-text-muted" role="status">
                <span className="font-medium uppercase tracking-[0.13em] text-text">Checkout</span>
                <p className="mt-1">{authenticationMessage.message}</p>
              </div>
            )}
            <div className="mt-7">
              {cart.checkoutEligible ? (
                <Link
                  href="/checkout"
                  className="inline-flex min-h-[52px] w-full items-center justify-between bg-primary px-5 py-3 text-sm font-medium text-primary-text transition-transform duration-[var(--duration-normal)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none"
                >
                  Proceed to checkout <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <Button
                  className="min-h-[52px] w-full rounded-none"
                  size="lg"
                  disabled
                  aria-disabled="true"
                >
                  Cart Ineligible for Checkout
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
