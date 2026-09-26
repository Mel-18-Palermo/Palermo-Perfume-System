"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { PerfumeDetail, PerfumeVariantSummary, NoteAssignment } from "@/contracts/catalogue";
import type { MoneyValue } from "@/contracts/common";
import type { CartCustomisation, CartDto } from "@/contracts/cart";
import { ProductReviews } from "@/modules/participation/ui/product-reviews";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist/use-wishlist";

function formatMoney(value?: MoneyValue | null): string {
  if (!value) return "$0.00";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: value.currency || "AUD" }).format(value.amountMinor / 100);
}

function customerFacingProductCopy(value: string, fallback: string): string {
  return /\b(demo|demonstration|synthetic|fixture|implementation|university)\b/i.test(value) ? fallback : value;
}

interface PerfumeDetailViewProps { id: string; initialCart?: CartDto | null; onCartChange?: (cart: CartDto) => void; }

const noCustomisation: CartCustomisation = { personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null };
const formControlClassName = "mt-2 block min-h-11 w-full border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function availabilityLabel(availability: PerfumeVariantSummary["availability"]): string {
  return availability === "AVAILABLE" ? "Available" : availability === "OUT_OF_STOCK" ? "Out of stock" : "Unavailable";
}

export function PerfumeDetailView({ id, initialCart = null, onCartChange }: PerfumeDetailViewProps) {
  const [perfume, setPerfume] = React.useState<PerfumeDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [currentId, setCurrentId] = React.useState(id);
  const [cart, setCart] = React.useState<CartDto | null>(initialCart);
  const [previousInitialCart, setPreviousInitialCart] = React.useState<CartDto | null>(initialCart);
  const [quantity, setQuantity] = React.useState(1);
  const [personalisedLabel, setPersonalisedLabel] = React.useState("");
  const [engravingName, setEngravingName] = React.useState("");
  const [giftMessage, setGiftMessage] = React.useState("");
  const [giftPackagingId, setGiftPackagingId] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [cartMessage, setCartMessage] = React.useState<string | null>(null);
  const wishlist = useWishlist();

  if (initialCart !== previousInitialCart) { setPreviousInitialCart(initialCart); setCart(initialCart); }
  if (id !== currentId) { setCurrentId(id); setPerfume(null); setErrorMessage(null); setSelectedVariantId(null); setLoading(true); }

  React.useEffect(() => {
    let active = true;
    api.catalogue.get({ id }).then((res) => {
      if (!active) return;
      if (res.ok) {
        setErrorMessage(null); setPerfume(res.data);
        setSelectedVariantId(res.data.variants.find((variant) => variant.availability === "AVAILABLE")?.id ?? null);
      } else if (res.error.code === "NOT_FOUND") { setErrorMessage(null); setPerfume(null); }
      else setErrorMessage(res.error.message || "Failed to load perfume profile.");
    }).catch(() => { if (active) setErrorMessage("Unable to connect to the catalogue service. Please verify your connection."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="mx-auto max-w-[var(--container-wide)] px-4 py-16 text-sm text-text-muted sm:px-6 lg:px-8">Loading fragrance profile...</div>;
  if (errorMessage) return <div className="mx-auto max-w-[var(--container-wide)] px-4 py-12 sm:px-6 lg:px-8"><section className="max-w-xl border-y border-border py-8" role="alert"><p className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">Catalogue notice</p><p className="mt-3 text-sm leading-6 text-text">{errorMessage}</p><Link href="/catalogue" className="mt-6 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Return to catalogue</Link></section></div>;
  if (!perfume) return <div className="mx-auto max-w-[var(--container-wide)] px-4 py-16 sm:px-6 lg:px-8"><section className="max-w-xl border-y border-border py-10"><p className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">Fragrance collection</p><h1 className="mt-3 text-4xl font-[300] tracking-[-0.055em] text-text sm:text-5xl">Fragrance not found</h1><p className="mt-4 text-sm leading-6 text-text-muted">The fragrance profile you requested is not currently available.</p><Link href="/catalogue" className="mt-8 inline-flex min-h-12 items-center bg-primary px-5 text-sm font-medium !text-primary-text transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none">Explore the collection <span className="ml-3" aria-hidden="true">→</span></Link></section></div>;

  const selectedVariant = perfume.variants.find((variant) => variant.id === selectedVariantId);
  const updateCart = (nextCart: CartDto) => { setCart(nextCart); onCartChange?.(nextCart); };
  const handleAddToCart = async () => {
    if (!selectedVariant || selectedVariant.availability !== "AVAILABLE" || isAdding) return;
    setIsAdding(true); setCartMessage(null);
    try {
      let currentCart = cart;
      if (!currentCart) {
        const cartResult = await api.cart.get();
        if (!cartResult.ok) { setCartMessage(cartResult.error.message || "Unable to prepare your cart."); return; }
        currentCart = cartResult.data; updateCart(currentCart);
      }
      const customisation: CartCustomisation = {
        ...noCustomisation,
        personalisedLabel: selectedVariant.customisations.personalisedLabel && personalisedLabel.trim() ? personalisedLabel.trim() : null,
        engravingName: selectedVariant.customisations.engravingName && engravingName.trim() ? engravingName.trim() : null,
        giftMessage: selectedVariant.customisations.giftMessage && giftMessage.trim() ? giftMessage.trim() : null,
        giftPackagingId: selectedVariant.customisations.giftPackaging.some((option) => option.id === giftPackagingId) ? giftPackagingId : null,
      };
      const result = await api.cart.addItem({ cartId: currentCart.id, expectedRevision: currentCart.revision, variantId: selectedVariant.id, quantity, customisation });
      if (result.ok) { updateCart(result.data); setCartMessage("Added to your cart."); }
      else if (result.error.code === "CONFLICT") { const refreshed = await api.cart.get(); if (refreshed.ok) updateCart(refreshed.data); setCartMessage("Your cart changed in another session. We refreshed it; please add this item again."); }
      else setCartMessage(result.error.message || "Unable to add this item to your cart.");
    } catch { setCartMessage("Unable to add this item to your cart. Please check your connection and try again."); }
    finally { setIsAdding(false); }
  };

  const noteLayers = [
    { label: "Top", notes: perfume.notes.filter((note: NoteAssignment) => note.layer === "TOP") },
    { label: "Middle", notes: perfume.notes.filter((note: NoteAssignment) => note.layer === "MIDDLE") },
    { label: "Base", notes: perfume.notes.filter((note: NoteAssignment) => note.layer === "BASE") },
  ].filter((layer) => layer.notes.length > 0);
  const suitabilityGroups = [
    { label: "Season", tags: perfume.suitability.season }, { label: "Occasion", tags: perfume.suitability.occasion }, { label: "Time of day", tags: perfume.suitability.daypart }, { label: "Mood", tags: perfume.suitability.mood }, { label: "Weather", tags: perfume.suitability.weather },
  ].filter((group) => group.tags.length > 0);
  const displayImage = perfume.images.length > 0 ? perfume.images[0] : null;
  const productName = customerFacingProductCopy(perfume.name, "Fragrance");
  const productDescription = customerFacingProductCopy(perfume.description, "Details for this fragrance are being prepared.");
  const supportsCustomisation = Boolean(selectedVariant && (selectedVariant.customisations.personalisedLabel || selectedVariant.customisations.engravingName || selectedVariant.customisations.giftMessage || selectedVariant.customisations.giftPackaging.length > 0));
  const isSaved = wishlist.savedIds.has(perfume.id);
  const wishlistPending = wishlist.pendingIds.has(perfume.id);
  const wishlistLoginHref = `/login?next=${encodeURIComponent(`/product/${perfume.id}`)}`;

  return <main className="mx-auto max-w-[var(--container-wide)] px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
    <nav aria-label="Breadcrumb" className="mb-7 text-sm text-text-muted sm:mb-9"><ol className="flex items-center gap-2"><li><Link href="/catalogue" className="transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Catalogue</Link></li><li aria-hidden="true">/</li><li className="text-text">{productName}</li></ol></nav>
    <section className="grid gap-y-9 md:grid-cols-12 md:gap-x-8 lg:gap-x-12 xl:gap-x-16" aria-labelledby="product-title">
      <div className="md:col-span-7"><div className="group relative aspect-square overflow-hidden bg-surface-muted md:aspect-[4/5]">{displayImage ? <img src={displayImage.url} alt={customerFacingProductCopy(displayImage.alt || perfume.name, "Fragrance bottle")} className="h-full w-full object-contain transition-transform duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none lg:group-hover:scale-[1.015]" /> : perfume.imageUrl ? <img src={perfume.imageUrl} alt={productName} className="h-full w-full object-contain transition-transform duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none lg:group-hover:scale-[1.015]" /> : <div className="flex h-full items-end p-6"><p className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">Product image pending</p></div>}</div></div>
      <div className="md:col-span-5 md:pt-1 lg:pt-5">
        <header><p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">{perfume.primaryFamily.label}{perfume.intensity ? ` · ${perfume.intensity.label}` : ""}</p><h1 id="product-title" className="mt-3 text-[clamp(3rem,5.1vw,5.25rem)] font-[300] leading-[0.93] tracking-[-0.065em] text-text">{productName}</h1><p className="mt-5 text-lg font-medium tabular-nums text-text">{selectedVariant ? formatMoney(selectedVariant.price) : formatMoney(perfume.priceFrom)}</p><p className="mt-6 hidden max-w-[31rem] text-sm leading-6 text-text-muted md:block md:text-base md:leading-7">{productDescription}</p></header>
        <div className="mt-9 border-t border-border pt-5 sm:mt-10"><fieldset><legend className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">Choose your bottle</legend><div role="radiogroup" aria-label="Available bottle sizes" className="mt-3 border-b border-border">{perfume.variants.map((variant) => { const isSelected = selectedVariantId === variant.id; const isAvailable = variant.availability === "AVAILABLE"; return <label key={variant.id} className={`relative flex min-h-16 cursor-pointer items-center justify-between gap-4 border-t border-border py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${isSelected ? "bg-surface-muted/60" : "hover:bg-surface-muted/40"} ${!isAvailable ? "cursor-not-allowed opacity-55" : ""}`}><input type="radio" name="perfume-variant" value={variant.id} checked={isSelected} disabled={!isAvailable} onChange={() => setSelectedVariantId(variant.id)} className="sr-only" aria-labelledby={`variant-label-${variant.id}`} aria-describedby={`variant-status-${variant.id}`} /><span id={`variant-label-${variant.id}`} className={`pl-3 ${isSelected ? "font-medium text-text" : "text-text"}`}>{variant.bottleSize}{variant.concentration ? ` · ${variant.concentration}` : ""}</span><span className="flex shrink-0 items-center gap-3 pr-3 text-right text-xs text-text-muted"><span className="tabular-nums text-text">{formatMoney(variant.price)}</span><span id={`variant-status-${variant.id}`}>{availabilityLabel(variant.availability)}</span></span></label>; })}</div></fieldset>
          {selectedVariant?.availability === "AVAILABLE" ? <section className="pt-5" aria-labelledby="add-to-cart-heading"><h2 id="add-to-cart-heading" className="sr-only">Add to cart</h2><p className="text-sm text-text">Available</p><div className="mt-4 grid grid-cols-[6rem_1fr] gap-3"><label htmlFor="product-quantity" className="sr-only">Quantity</label><input id="product-quantity" type="number" min={1} max={99} inputMode="numeric" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))} className="min-h-12 w-full border border-border-strong bg-surface px-3 text-sm text-text outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" /><Button type="button" onClick={() => void handleAddToCart()} isLoading={isAdding} className="min-h-12 w-full rounded-none px-5 text-sm font-medium transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none">Add to cart <span className="ml-3" aria-hidden="true">→</span></Button></div>{cartMessage && <p role="status" className={`mt-4 border-l-2 pl-3 text-sm leading-6 ${cartMessage === "Added to your cart." ? "border-primary text-text" : "border-danger text-text"}`}>{cartMessage}</p>}</section> : <p role="status" className="mt-5 border-l border-border-strong pl-3 text-sm leading-6 text-text-muted">This fragrance is currently unavailable to add to your cart.</p>}
          {supportsCustomisation && selectedVariant && <details className="group/details mt-7 border-t border-border pt-4"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><span>Personalise this bottle</span><span className="text-lg font-normal transition-transform duration-200 group-open/details:rotate-45 motion-reduce:transition-none" aria-hidden="true">+</span></summary><div className="grid gap-4 pt-4 sm:grid-cols-2">{selectedVariant.customisations.giftPackaging.length > 0 && <label htmlFor="gift-packaging" className="text-sm text-text">Gift packaging<select id="gift-packaging" value={giftPackagingId} onChange={(event) => setGiftPackagingId(event.target.value)} className={formControlClassName}><option value="">No gift packaging</option>{selectedVariant.customisations.giftPackaging.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}{selectedVariant.customisations.personalisedLabel && <label htmlFor="personalised-label" className="text-sm text-text">Personalised label<input id="personalised-label" value={personalisedLabel} maxLength={100} onChange={(event) => setPersonalisedLabel(event.target.value)} className={formControlClassName} /></label>}{selectedVariant.customisations.engravingName && <label htmlFor="engraving-name" className="text-sm text-text">Engraving name<input id="engraving-name" value={engravingName} maxLength={100} onChange={(event) => setEngravingName(event.target.value)} className={formControlClassName} /></label>}{selectedVariant.customisations.giftMessage && <label htmlFor="gift-message" className="text-sm text-text sm:col-span-2">Gift message<textarea id="gift-message" value={giftMessage} maxLength={100} onChange={(event) => setGiftMessage(event.target.value)} className={formControlClassName} /></label>}</div></details>}
          <div className="mt-3">{wishlist.status === "signed-out" ? <Link href={wishlistLoginHref} className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-border-strong px-5 text-sm font-medium text-text transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Heart className="h-4 w-4" aria-hidden="true" />Sign in to save</Link> : <Button type="button" variant="outline" className="min-h-12 w-full rounded-none" disabled={wishlist.status === "loading" || wishlistPending} isLoading={wishlistPending} onClick={() => void wishlist.toggle(perfume.id)} aria-pressed={isSaved}><Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} aria-hidden="true" />{isSaved ? "Saved" : "Save fragrance"}</Button>}{wishlist.error && <p className="mt-3 border-l-2 border-danger pl-3 text-sm text-danger" role="alert">{wishlist.error.message}</p>}</div>
          <p className="mt-7 max-w-[31rem] text-sm leading-6 text-text-muted md:hidden">{productDescription}</p>
        </div>
      </div>
    </section>
    <section className="mt-16 border-t border-border pt-8 sm:mt-20 sm:pt-10 lg:mt-28 lg:grid lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16" aria-labelledby="olfactory-pyramid-heading"><header className="lg:col-span-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Composition</p><h2 id="olfactory-pyramid-heading" className="mt-3 text-[clamp(2.25rem,3.6vw,3.75rem)] font-[300] leading-[0.98] tracking-[-0.055em] text-text">Olfactory pyramid</h2></header><div className="mt-8 lg:col-span-8 lg:mt-0">{noteLayers.length > 0 ? <dl className="border-t border-border">{noteLayers.map((layer) => <div key={layer.label} className="grid gap-x-6 border-b border-border py-5 sm:grid-cols-[minmax(7rem,0.6fr)_minmax(0,1.4fr)] sm:py-6"><dt className="text-2xl font-[300] leading-none tracking-[-0.04em] text-text">{layer.label}</dt><dd className="mt-3 text-sm leading-6 text-text sm:mt-0 sm:pt-0.5">{layer.notes.map((note) => note.label).join(", ")}</dd></div>)}</dl> : <p className="border-l border-border-strong pl-4 text-sm leading-6 text-text-muted">The olfactory note breakdown is currently being catalogued.</p>}{(perfume.longevity || perfume.projection) && <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm"><div><dt className="text-xs font-medium uppercase tracking-[0.15em] text-text-muted">Longevity</dt><dd className="mt-1 text-text">{perfume.longevity?.label ?? "—"}</dd></div><div><dt className="text-xs font-medium uppercase tracking-[0.15em] text-text-muted">Projection</dt><dd className="mt-1 text-text">{perfume.projection?.label ?? "—"}</dd></div></dl>}</div></section>
    {suitabilityGroups.length > 0 && <section className="mt-16 border-t border-border pt-8 sm:mt-20 sm:pt-10 lg:mt-28 lg:grid lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16" aria-labelledby="atmospheric-suitability-heading"><header className="lg:col-span-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">A factual guide</p><h2 id="atmospheric-suitability-heading" className="mt-3 text-[clamp(2.25rem,3.6vw,3.75rem)] font-[300] leading-[0.98] tracking-[-0.055em] text-text">Atmospheric suitability</h2></header><dl className="mt-8 grid gap-x-8 gap-y-0 border-t border-border sm:grid-cols-2 lg:col-span-8 lg:mt-0">{suitabilityGroups.map((group) => <div key={group.label} className="border-b border-border py-5 sm:py-6"><dt className="text-xs font-medium uppercase tracking-[0.15em] text-text-muted">{group.label}</dt><dd className="mt-3 text-sm leading-6 text-text">{group.tags.map((tag) => tag.label).join(" · ")}</dd></div>)}</dl></section>}
    <ProductReviews perfumeId={perfume.id} />
  </main>;
}
