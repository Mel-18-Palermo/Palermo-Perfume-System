"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { PerfumeDetail, PerfumeVariantSummary, NoteAssignment } from "@/contracts/catalogue";
import type { MoneyValue } from "@/contracts/common";
import type { CartCustomisation, CartDto } from "@/contracts/cart";

function formatMoney(value?: MoneyValue | null): string {
  if (!value) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: value.currency || "AUD",
  }).format(value.amountMinor / 100);
}

interface PerfumeDetailViewProps {
  id: string;
  initialCart?: CartDto | null;
  onCartChange?: (cart: CartDto) => void;
}

const noCustomisation: CartCustomisation = {
  personalisedLabel: null,
  engravingName: null,
  giftMessage: null,
  giftPackagingId: null,
};

export function PerfumeDetailView({ id, initialCart = null, onCartChange }: PerfumeDetailViewProps) {
  const [perfume, setPerfume] = React.useState<PerfumeDetail | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [currentId, setCurrentId] = React.useState<string>(id);
  const [cart, setCart] = React.useState<CartDto | null>(initialCart);
  const [previousInitialCart, setPreviousInitialCart] = React.useState<CartDto | null>(initialCart);
  const [quantity, setQuantity] = React.useState(1);
  const [personalisedLabel, setPersonalisedLabel] = React.useState("");
  const [engravingName, setEngravingName] = React.useState("");
  const [giftMessage, setGiftMessage] = React.useState("");
  const [giftPackagingId, setGiftPackagingId] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [cartMessage, setCartMessage] = React.useState<string | null>(null);

  if (initialCart !== previousInitialCart) {
    setPreviousInitialCart(initialCart);
    setCart(initialCart);
  }

  if (id !== currentId) {
    setCurrentId(id);
    setPerfume(null);
    setErrorMessage(null);
    setSelectedVariantId(null);
    setLoading(true);
  }

  React.useEffect(() => {
    let active = true;

    api.catalogue
      .get({ id })
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setErrorMessage(null);
          setPerfume(res.data);
          const firstAvailable = res.data.variants.find((v) => v.availability === "AVAILABLE");
          setSelectedVariantId(firstAvailable ? firstAvailable.id : null);
        } else {
          if (res.error.code === "NOT_FOUND") {
            setErrorMessage(null);
            setPerfume(null);
          } else {
            setErrorMessage(res.error.message || "Failed to load perfume profile.");
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setErrorMessage("Unable to connect to the catalogue service. Please verify your connection.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center text-sm text-text-muted">
        Loading fragrance profile...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Alert variant="danger" role="alert">
          <p className="font-semibold">Catalogue Error</p>
          <p className="text-sm">{errorMessage}</p>
        </Alert>
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted transition-colors"
          >
            Return to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (!perfume) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          title="Fragrance Not Found"
          description="The perfume profile you requested does not exist or is currently unavailable."
          action={
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors mt-4"
            >
              Explore Fragrance Catalogue
            </Link>
          }
        />
      </div>
    );
  }

  const selectedVariant: PerfumeVariantSummary | undefined =
    perfume.variants.find((v) => v.id === selectedVariantId);

  const updateCart = (nextCart: CartDto) => {
    setCart(nextCart);
    onCartChange?.(nextCart);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant || selectedVariant.availability !== "AVAILABLE" || isAdding) return;

    setIsAdding(true);
    setCartMessage(null);
    try {
      let currentCart = cart;
      if (!currentCart) {
        const cartResult = await api.cart.get();
        if (!cartResult.ok) {
          setCartMessage(cartResult.error.message || "Unable to prepare your cart.");
          return;
        }
        currentCart = cartResult.data;
        updateCart(currentCart);
      }

      const customisation: CartCustomisation = {
        ...noCustomisation,
        personalisedLabel: selectedVariant.customisations.personalisedLabel && personalisedLabel.trim() ? personalisedLabel.trim() : null,
        engravingName: selectedVariant.customisations.engravingName && engravingName.trim() ? engravingName.trim() : null,
        giftMessage: selectedVariant.customisations.giftMessage && giftMessage.trim() ? giftMessage.trim() : null,
        giftPackagingId: selectedVariant.customisations.giftPackaging.some((option) => option.id === giftPackagingId) ? giftPackagingId : null,
      };
      const result = await api.cart.addItem({
        cartId: currentCart.id,
        expectedRevision: currentCart.revision,
        variantId: selectedVariant.id,
        quantity,
        customisation,
      });
      if (result.ok) {
        updateCart(result.data);
        setCartMessage("Added to your cart.");
      } else if (result.error.code === "CONFLICT") {
        const refreshed = await api.cart.get();
        if (refreshed.ok) updateCart(refreshed.data);
        setCartMessage("Your cart changed in another session. We refreshed it; please add this item again.");
      } else {
        setCartMessage(result.error.message || "Unable to add this item to your cart.");
      }
    } catch {
      setCartMessage("Unable to add this item to your cart. Please check your connection and try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const topNotes = perfume.notes.filter((n: NoteAssignment) => n.layer === "TOP");
  const middleNotes = perfume.notes.filter((n: NoteAssignment) => n.layer === "MIDDLE");
  const baseNotes = perfume.notes.filter((n: NoteAssignment) => n.layer === "BASE");
  const suitabilityTags = [
    ...perfume.suitability.season,
    ...perfume.suitability.occasion,
    ...perfume.suitability.daypart,
    ...perfume.suitability.mood,
    ...perfume.suitability.weather,
  ];

  const displayImage = perfume.images && perfume.images.length > 0 ? perfume.images[0] : null;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-text-muted">
          <li>
            <Link href="/" className="hover:text-text transition-colors">
              Catalogue
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-text">{perfume.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="w-full aspect-[4/5] rounded-lg border border-border bg-surface-muted flex flex-col items-center justify-center overflow-hidden p-6 relative">
            {displayImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImage.url}
                alt={displayImage.alt || perfume.name}
                className="w-full h-full object-cover rounded"
              />
            ) : perfume.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={perfume.imageUrl}
                alt={perfume.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full border border-border flex items-center justify-center text-text-muted font-mono text-xs">
                  [IMG]
                </div>
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Imagery Unavailable</p>
                <p className="text-xs text-text-muted">Bottle photography currently being prepared for this fragrance profile.</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-7 space-y-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="neutral">{perfume.primaryFamily.label}</Badge>
              {perfume.intensity && (
                <Badge variant="info">{perfume.intensity.label}</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">{perfume.name}</h1>
            <p className="mt-2 text-2xl font-semibold text-text">
              {selectedVariant ? formatMoney(selectedVariant.price) : formatMoney(perfume.priceFrom)}
            </p>
          </div>

          <div className="prose prose-sm text-text-muted">
            <p className="leading-relaxed">{perfume.description}</p>
          </div>

          <div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-text">Select Bottle Size & Formulation</legend>
              <div role="radiogroup" aria-label="Available bottle sizes" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {perfume.variants.map((v: PerfumeVariantSummary) => {
                  const isSelected = selectedVariantId === v.id;
                  const isAvailable = v.availability === "AVAILABLE";

                  return (
                    <label
                      key={v.id}
                      className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-surface hover:bg-surface-muted/50"
                      } ${!isAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="perfume-variant"
                        value={v.id}
                        checked={isSelected}
                        disabled={!isAvailable}
                        onChange={() => setSelectedVariantId(v.id)}
                        className="sr-only"
                        aria-labelledby={`variant-label-${v.id}`}
                        aria-describedby={`variant-status-${v.id}`}
                      />
                      <div className="flex w-full items-center justify-between">
                        <div className="text-sm">
                          <p id={`variant-label-${v.id}`} className="font-semibold text-text">
                            {v.bottleSize}
                            {v.concentration ? ` \u00B7 ${v.concentration}` : ""}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">{formatMoney(v.price)}</p>
                        </div>
                        <div id={`variant-status-${v.id}`} className="text-right">
                          {v.availability === "AVAILABLE" ? (
                            <span className="text-xs font-medium text-primary">In Stock</span>
                          ) : v.availability === "OUT_OF_STOCK" ? (
                            <span className="text-xs font-medium text-danger">Out of Stock</span>
                          ) : (
                            <span className="text-xs font-medium text-text-muted">Unavailable</span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {selectedVariant && selectedVariant.availability === "AVAILABLE" && (
            <Card className="border-border">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-base font-semibold text-text">Add to cart</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-text">
                    Quantity
                    <input type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))} className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
                  </label>
                  {selectedVariant.customisations.giftPackaging.length > 0 && (
                    <label className="text-sm font-medium text-text">
                      Gift packaging
                      <select value={giftPackagingId} onChange={(event) => setGiftPackagingId(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                        <option value="">No gift packaging</option>
                        {selectedVariant.customisations.giftPackaging.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </label>
                  )}
                  {selectedVariant.customisations.personalisedLabel && <label className="text-sm font-medium text-text">Personalised label<input value={personalisedLabel} maxLength={100} onChange={(event) => setPersonalisedLabel(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>}
                  {selectedVariant.customisations.engravingName && <label className="text-sm font-medium text-text">Engraving name<input value={engravingName} maxLength={100} onChange={(event) => setEngravingName(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>}
                  {selectedVariant.customisations.giftMessage && <label className="text-sm font-medium text-text sm:col-span-2">Gift message<textarea value={giftMessage} maxLength={100} onChange={(event) => setGiftMessage(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>}
                </div>
                {cartMessage && <Alert variant={cartMessage === "Added to your cart." ? "success" : "danger"} role="status">{cartMessage}</Alert>}
                <Button type="button" onClick={() => void handleAddToCart()} isLoading={isAdding}>Add to Cart</Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-base font-semibold text-text tracking-wide uppercase">Olfactory Pyramid</h2>

              <div className="space-y-4 text-sm">
                {topNotes.length > 0 && (
                  <div className="border-l-2 border-primary/40 pl-4 py-1">
                    <span className="text-xs uppercase tracking-wider font-semibold text-text-muted block">Top Notes</span>
                    <p className="mt-1 text-text">{topNotes.map((n) => n.label).join(", ")}</p>
                  </div>
                )}
                {middleNotes.length > 0 && (
                  <div className="border-l-2 border-primary/60 pl-4 py-1">
                    <span className="text-xs uppercase tracking-wider font-semibold text-text-muted block">Heart Notes</span>
                    <p className="mt-1 text-text">{middleNotes.map((n) => n.label).join(", ")}</p>
                  </div>
                )}
                {baseNotes.length > 0 && (
                  <div className="border-l-2 border-primary pl-4 py-1">
                    <span className="text-xs uppercase tracking-wider font-semibold text-text-muted block">Base Notes</span>
                    <p className="mt-1 text-text">{baseNotes.map((n) => n.label).join(", ")}</p>
                  </div>
                )}
                {perfume.notes.length === 0 && (
                  <p className="text-xs text-text-muted italic">Olfactory note breakdown currently being catalogued.</p>
                )}
              </div>

              {(perfume.longevity || perfume.projection) && (
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
                  {perfume.longevity && (
                    <div>
                      <span className="font-semibold text-text block">Longevity</span>
                      <span className="text-text-muted">{perfume.longevity.label}</span>
                    </div>
                  )}
                  {perfume.projection && (
                    <div>
                      <span className="font-semibold text-text block">Projection</span>
                      <span className="text-text-muted">{perfume.projection.label}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-3 pt-2 text-xs text-text-muted" aria-labelledby="atmospheric-suitability-heading">
            <h3 id="atmospheric-suitability-heading" className="font-semibold text-text uppercase tracking-wider">Atmospheric Suitability</h3>
            {suitabilityTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {perfume.suitability.season?.map((s) => (
                  <Badge key={s.id} variant="neutral" className="text-xs">{s.label}</Badge>
                ))}
                {perfume.suitability.occasion?.map((o) => (
                  <Badge key={o.id} variant="neutral" className="text-xs">{o.label}</Badge>
                ))}
                {perfume.suitability.daypart?.map((d) => (
                  <Badge key={d.id} variant="neutral" className="text-xs">{d.label}</Badge>
                ))}
                {perfume.suitability.mood?.map((m) => (
                  <Badge key={m.id} variant="neutral" className="text-xs">{m.label}</Badge>
                ))}
                {perfume.suitability.weather?.map((w) => (
                  <Badge key={w.id} variant="neutral" className="text-xs">{w.label}</Badge>
                ))}
              </div>
            ) : (
              <p>Suitability information is currently unavailable.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
