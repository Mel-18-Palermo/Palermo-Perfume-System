"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, RefreshCw } from "lucide-react";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { AppError } from "@/contracts/common";
import type { WishlistItem } from "@/contracts/wishlist";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { canLoadWishlist } from "./wishlist-session";
import { WishlistItemRow } from "./wishlist-item";

type WishlistState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "signed-out" }>
  | Readonly<{ status: "error"; error: AppError }>
  | Readonly<{ status: "ready"; items: readonly WishlistItem[] }>;

async function safely<T>(work: () => Promise<T>): Promise<T | null> {
  try {
    return await work();
  } catch {
    return null;
  }
}

export function WishlistView() {
  const [shell, setShell] = React.useState<{ session: Session | null; cart: CartDto | null }>({ session: null, cart: null });
  const [sessionResolved, setSessionResolved] = React.useState(false);
  const [sessionError, setSessionError] = React.useState<AppError | null>(null);
  const [state, setState] = React.useState<WishlistState>({ status: "loading" });
  const [reloadToken, setReloadToken] = React.useState(0);
  const [removing, setRemoving] = React.useState<ReadonlySet<string>>(() => new Set());
  const [actionError, setActionError] = React.useState<AppError | null>(null);

  React.useEffect(() => {
    let active = true;

    async function loadShell() {
      const [sessionResult, cartResult] = await Promise.all([
        safely(() => api.auth.getSession()),
        safely(() => api.cart.get()),
      ]);
      if (!active) return;

      if (!sessionResult?.ok) {
        const error = sessionResult?.error ?? {
          code: "TEMPORARILY_UNAVAILABLE" as const,
          message: "The account service is temporarily unavailable. Try again later.",
        };
        setSessionError(error);
        setState({ status: "error", error });
        setSessionResolved(true);
        return;
      }

      setShell({
        session: sessionResult.data,
        cart: cartResult?.ok ? cartResult.data : null,
      });
      setSessionResolved(true);
    }

    void loadShell();
    return () => { active = false; };
  }, [reloadToken]);

  React.useEffect(() => {
    if (!sessionResolved || sessionError) return;
    if (!canLoadWishlist(shell.session, sessionResolved)) return;

    let active = true;

    void safely(() => api.wishlist.get()).then(result => {
      if (!active) return;
      if (!result) {
        setState({ status: "error", error: { code: "TEMPORARILY_UNAVAILABLE", message: "The wishlist service is temporarily unavailable. Try again later." } });
      } else if (!result.ok) {
        setState(result.error.code === "UNAUTHENTICATED" || result.error.code === "FORBIDDEN"
          ? { status: "signed-out" }
          : { status: "error", error: result.error });
      } else {
        setState({ status: "ready", items: result.data.items });
      }
    });

    return () => { active = false; };
  }, [sessionError, sessionResolved, shell.session, reloadToken]);

  function retry() {
    setSessionResolved(false);
    setSessionError(null);
    setState({ status: "loading" });
    setActionError(null);
    setReloadToken(current => current + 1);
  }

  async function remove(perfumeId: string) {
    setActionError(null);
    setRemoving(current => new Set(current).add(perfumeId));
    const result = await safely(() => api.wishlist.remove({ perfumeId }));
    setRemoving(current => {
      const next = new Set(current);
      next.delete(perfumeId);
      return next;
    });

    if (!result) {
      setActionError({ code: "TEMPORARILY_UNAVAILABLE", message: "The wishlist service is temporarily unavailable. Try again later." });
    } else if (!result.ok) {
      if (result.error.code === "UNAUTHENTICATED" || result.error.code === "FORBIDDEN") setState({ status: "signed-out" });
      else setActionError(result.error);
    } else {
      setState({ status: "ready", items: result.data.items });
    }
  }

  const visibleState: WishlistState = sessionResolved && !sessionError && !canLoadWishlist(shell.session, sessionResolved)
    ? { status: "signed-out" }
    : state;

  return (
    <CustomerShell cart={shell.cart} session={shell.session} isLoading={!sessionResolved}>
      <section className="mx-auto max-w-[var(--container-page)]" aria-labelledby="wishlist-heading">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">Your Palermo</p>
        <h1 id="wishlist-heading" className="mt-3 text-h1 tracking-tight text-text">Saved fragrances</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">A considered collection of fragrances to return to.</p>

        <div className="mt-8" aria-live="polite">
          {visibleState.status === "loading" ? (
            <div className="space-y-0 border-t border-border" aria-busy="true" aria-label="Loading wishlist">
              {[0, 1, 2].map(key => (
                <div key={key} className="grid gap-5 border-b border-border py-6 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-center">
                  <Skeleton className="aspect-[4/5] w-full rounded-none sm:w-[7.5rem]" />
                  <div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-6 w-52" /><Skeleton className="h-4 w-40" /></div>
                  <Skeleton className="h-11 w-36 rounded-none" />
                </div>
              ))}
            </div>
          ) : null}

          {visibleState.status === "signed-out" ? (
            <div className="border-y border-border py-12 sm:py-16">
              <Heart className="h-5 w-5 text-text-muted" aria-hidden="true" />
              <h2 className="mt-4 text-h2 tracking-tight text-text">Sign in to see your wishlist</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">Saved fragrances stay with your Palermo customer account across devices.</p>
              <Link href="/login?next=/wishlist" className="mt-6 inline-flex min-h-11 items-center justify-center bg-text px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text">Sign in</Link>
            </div>
          ) : null}

          {visibleState.status === "error" ? (
            <div className="border-y border-danger/30 py-12" role="alert">
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-danger">Unable to load wishlist</p>
              <h2 className="mt-3 text-h2 tracking-tight text-text">Your saved fragrances are still safe.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">{visibleState.error.message}</p>
              <Button type="button" variant="outline" size="sm" onClick={retry} className="mt-6 rounded-none"><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry</Button>
            </div>
          ) : null}

          {visibleState.status === "ready" && visibleState.items.length === 0 ? (
            <div className="border-y border-border py-12 sm:py-16">
              <Heart className="h-5 w-5 text-text-muted" aria-hidden="true" />
              <h2 className="mt-4 text-h2 tracking-tight text-text">Nothing saved yet</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">Explore the collection and save the fragrances you want to consider again.</p>
              <Link href="/catalogue" className="mt-6 inline-flex min-h-11 items-center justify-center border border-text px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-text transition-colors hover:bg-text hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text">Explore the collection</Link>
            </div>
          ) : null}

          {visibleState.status === "ready" && visibleState.items.length > 0 ? (
            <>
              {actionError ? <p className="mb-5 border-l-2 border-danger pl-4 text-sm text-danger" role="alert">{actionError.message}</p> : null}
              <ul className="border-t border-border">
                {visibleState.items.map(item => <WishlistItemRow key={item.perfumeId} item={item} removing={removing.has(item.perfumeId)} onRemove={perfumeId => { void remove(perfumeId); }} />)}
              </ul>
            </>
          ) : null}
        </div>
      </section>
    </CustomerShell>
  );
}
