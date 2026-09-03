"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";

interface Variant {
  size: string;
  price: number;
  inStock: boolean;
}

interface PerfumeDetail {
  id: string;
  name: string;
  family: string;
  description: string;
  intensity: string;
  longevity: string;
  projection: string;
  suitability: string;
  notes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  variants: Variant[];
}

const CATALOGUE_DETAILS: Record<string, PerfumeDetail> = {
  p1: {
    id: "p1",
    name: "Santorini Mist",
    family: "Fresh Citrus Aquatic",
    description: "Crisp Italian lemon, sea salt, and bergamot evoking early morning Mediterranean shores.",
    intensity: "Moderate",
    longevity: "7–9 Hours",
    projection: "Arm's length",
    suitability: "Spring / Summer Daytime",
    notes: {
      top: ["Calabrian Lemon", "Sicilian Bergamot", "Sea Mist"],
      middle: ["Orange Blossom", "White Lily", "Crisp Apple"],
      base: ["Mineral Driftwood", "White Musk", "Cedarwood"],
    },
    variants: [
      { size: "30ml Extrait", price: 75, inStock: true },
      { size: "50ml Extrait", price: 120, inStock: true },
      { size: "100ml Extrait", price: 195, inStock: true },
    ],
  },
  p2: {
    id: "p2",
    name: "Velvet Damask",
    family: "Floral Amber",
    description: "Rich Damask rose, intoxicating jasmine, and spiced pink pepper blended into deep vanilla.",
    intensity: "Strong",
    longevity: "8–10 Hours",
    projection: "Pronounced",
    suitability: "Evening / Autumn",
    notes: {
      top: ["Damask Rose Petals", "Pink Pepper"],
      middle: ["Night Jasmine", "Black Currant"],
      base: ["Bourbon Vanilla", "Dark Amber"],
    },
    variants: [
      { size: "50ml Extrait", price: 145, inStock: true },
      { size: "100ml Extrait", price: 220, inStock: true },
    ],
  },
};

const DEFAULT_VARIANT: Variant = {
  size: "Standard",
  price: 0,
  inStock: false,
};

export function PerfumeDetailView({ id }: { id: string }) {
  const item = CATALOGUE_DETAILS[id];
  const [selectedVariantIndex, setSelectedVariantIndex] = React.useState(0);

  if (!item) {
    return (
      <div className="py-12">
        <ErrorState
          title="Fragrance Not Available"
          message="The requested perfume formulation could not be located in our active canonical catalogue."
        />
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button variant="outline">Return to Catalogue</Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedVariant: Variant =
    item.variants[selectedVariantIndex] ?? item.variants[0] ?? DEFAULT_VARIANT;

  return (
    <div className="space-y-10 py-4">
      <nav aria-label="Breadcrumb">
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          &larr; Back to Catalogue
        </Link>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="flex flex-col items-center justify-center min-h-[380px] rounded-xl border border-border bg-surface-muted p-8 text-center">
          <div className="w-32 h-32 rounded-full border-4 border-accent flex items-center justify-center bg-surface">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center px-2">
              {item.family}
            </span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground uppercase tracking-widest font-mono">
            Virtual Olfactory Wheel
          </p>
        </div>

        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{item.family}</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{item.name}</h1>
            <p className="text-muted-foreground leading-relaxed">{item.description}</p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Size & Concentration
            </span>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Bottle sizes">
              {item.variants.map((v, idx) => (
                <button
                  key={v.size}
                  type="button"
                  role="radio"
                  aria-checked={selectedVariantIndex === idx}
                  onClick={() => setSelectedVariantIndex(idx)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    selectedVariantIndex === idx
                      ? "border-accent bg-accent/15 text-foreground ring-2 ring-accent"
                      : "border-border bg-surface text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {v.size} — ${v.price}.00
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-foreground">
              ${selectedVariant?.price ?? 0}.00
            </span>
            <span className="text-xs text-muted-foreground">Includes complimentary luxury packaging</span>
          </div>

          <Button size="lg" className="w-full">
            Add to Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">Fragrance Profile Metrics</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Intensity</p>
                <p className="font-medium text-foreground">{item.intensity}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Longevity</p>
                <p className="font-medium text-foreground">{item.longevity}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Projection</p>
                <p className="font-medium text-foreground">{item.projection}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Best Suited</p>
                <p className="font-medium text-foreground">{item.suitability}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">Olfactory Notes Pyramid</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-accent uppercase">Top Notes: </span>
                <span className="text-foreground">{item.notes.top.join(", ")}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-accent uppercase">Heart Notes: </span>
                <span className="text-foreground">{item.notes.middle.join(", ")}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-accent uppercase">Base Notes: </span>
                <span className="text-foreground">{item.notes.base.join(", ")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}