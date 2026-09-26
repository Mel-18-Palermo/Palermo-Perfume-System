"use client";

import * as React from "react";
import type { AppError } from "@/contracts/common";
import { api } from "@/lib/api";

type WishlistStatus = "loading" | "ready" | "signed-out" | "error";
const unavailable: AppError = { code: "TEMPORARILY_UNAVAILABLE", message: "The wishlist service is temporarily unavailable. Try again later." };
const requiresSignIn = (code: AppError["code"]) => code === "UNAUTHENTICATED" || code === "FORBIDDEN";

export function useWishlist() {
  const [status, setStatus] = React.useState<WishlistStatus>("loading");
  const [savedIds, setSavedIds] = React.useState<ReadonlySet<string>>(() => new Set());
  const [pendingIds, setPendingIds] = React.useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = React.useState<AppError | null>(null);

  React.useEffect(() => {
    let active = true;
    void api.wishlist.get().then(result => {
      if (!active) return;
      if (!result.ok) {
        setStatus(requiresSignIn(result.error.code) ? "signed-out" : "error");
        setError(requiresSignIn(result.error.code) ? null : result.error);
        return;
      }
      setSavedIds(new Set(result.data.items.map(item => item.perfumeId)));
      setStatus("ready");
      setError(null);
    }).catch(() => {
      if (active) { setStatus("error"); setError(unavailable); }
    });
    return () => { active = false; };
  }, []);

  const toggle = React.useCallback(async (perfumeId: string) => {
    if (status === "signed-out" || pendingIds.has(perfumeId)) return;
    setPendingIds(current => new Set(current).add(perfumeId));
    setError(null);
    try {
      const result = savedIds.has(perfumeId) ? await api.wishlist.remove({ perfumeId }) : await api.wishlist.add({ perfumeId });
      if (!result.ok) {
        if (requiresSignIn(result.error.code)) setStatus("signed-out");
        else setError(result.error);
        return;
      }
      setSavedIds(new Set(result.data.items.map(item => item.perfumeId)));
      setStatus("ready");
    } catch { setError(unavailable); }
    finally {
      setPendingIds(current => { const next = new Set(current); next.delete(perfumeId); return next; });
    }
  }, [pendingIds, savedIds, status]);

  return { status, savedIds, pendingIds, error, toggle } as const;
}
