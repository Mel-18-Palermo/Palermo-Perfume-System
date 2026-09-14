"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PerfumeSummary, CatalogueFilters, CatalogueQuery } from "@/contracts/catalogue";
import type { MoneyValue } from "@/contracts/common";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Drawer } from "@/components/ui/drawer";

interface CatalogueViewProps {
  initialItems?: readonly PerfumeSummary[] | null;
  initialFilters?: CatalogueFilters | null;
  initialError?: string | null;
}

function formatPrice(money: MoneyValue): string {
  const amount = money.amountMinor / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: money.currency,
  }).format(amount);
}

type ListDimension = "family" | "note" | "collection" | "intensity" | "occasion" | "mood" | "weather";

export function CatalogueView({ initialItems = [], initialFilters = null, initialError = null }: CatalogueViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [items, setItems] = React.useState<readonly PerfumeSummary[]>(initialItems ?? []);
  const [filters, setFilters] = React.useState<CatalogueFilters | null>(initialFilters);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  const searchQuery = searchParams.get("q") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const selectedFamilies = searchParams.getAll("family");
  const selectedNotes = searchParams.getAll("note");
  const selectedCollections = searchParams.getAll("collection");
  const selectedIntensities = searchParams.getAll("intensity");
  const selectedOccasions = searchParams.getAll("occasion");
  const selectedMoods = searchParams.getAll("mood");
  const selectedWeathers = searchParams.getAll("weather");

  const toggleListParam = (key: string, id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);
    params.delete(key);
    if (current.includes(id)) {
      current.filter((item) => item !== id).forEach((val) => params.append(key, val));
    } else {
      [...current, id].forEach((val) => params.append(key, val));
    }
    params.delete("page");
    router.replace("?" + params.toString(), { scroll: false });
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set(key, value.trim());
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace("?" + params.toString(), { scroll: false });
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedFamilies.length > 0 ||
    selectedNotes.length > 0 ||
    selectedCollections.length > 0 ||
    selectedIntensities.length > 0 ||
    selectedOccasions.length > 0 ||
    selectedMoods.length > 0 ||
    selectedWeathers.length > 0 ||
    minPrice ||
    maxPrice
  );

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const sp = new URLSearchParams(searchParamsString);
    const q = sp.get("q") ?? "";
    const minP = sp.get("minPrice") ?? "";
    const maxP = sp.get("maxPrice") ?? "";

    const families = sp.getAll("family");
    const notes = sp.getAll("note");
    const collections = sp.getAll("collection");
    const intensities = sp.getAll("intensity");
    const occasions = sp.getAll("occasion");
    const moods = sp.getAll("mood");
    const weathers = sp.getAll("weather");

    const query: CatalogueQuery = {
      page: 1,
      pageSize: 24,
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(families.length > 0 ? { family: families } : {}),
      ...(notes.length > 0 ? { note: notes } : {}),
      ...(collections.length > 0 ? { collection: collections } : {}),
      ...(intensities.length > 0 ? { intensity: intensities } : {}),
      ...(occasions.length > 0 ? { occasion: occasions } : {}),
      ...(moods.length > 0 ? { mood: moods } : {}),
      ...(weathers.length > 0 ? { weather: weathers } : {}),
      ...(minP && !isNaN(Number(minP)) ? { minPrice: Math.round(Number(minP) * 100) } : {}),
      ...(maxP && !isNaN(Number(maxP)) ? { maxPrice: Math.round(Number(maxP) * 100) } : {}),
    };

    try {
      const res = await api.catalogue.list(query);
      if (!res.ok) {
        setError("Failed to load catalogue items. Please try again.");
        setItems([]);
      } else {
        setItems(res.data.items);
      }

      if (!filters) {
        const filterRes = await api.catalogue.getFilters();
        if (filterRes.ok) {
          setFilters(filterRes.data);
        }
      }
    } catch {
      setError("Unable to load catalogue. Please check your connection and try again.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchParamsString, filters]);

  React.useEffect(() => {
    let ignore = false;
    const timeoutId = setTimeout(() => {
      if (!ignore) {
        void loadData();
      }
    }, 0);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [loadData]);

  const clearFilters = () => {
    router.replace("?", { scroll: false });
  };

  const renderCheckboxGroup = (
    title: string,
    key: ListDimension,
    options?: readonly { id: string; label: string }[],
    selected: readonly string[] = []
  ) => {
    if (!options || options.length === 0) return null;
    return (
      <fieldset className="space-y-2">
        <legend className="block text-xs font-semibold uppercase tracking-wider text-text mb-1">
          {title}
        </legend>
        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
          {options.map((opt) => {
            const isChecked = selected.includes(opt.id);
            return (
              <label
                key={opt.id}
                className="flex items-center gap-2 text-sm text-text cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleListParam(key, opt.id)}
                  className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  };

  const renderFilterControls = (prefix: string = "filter") => (
    <div className="space-y-5">
      {renderCheckboxGroup("Fragrance Family", "family", filters?.family, selectedFamilies)}
      {renderCheckboxGroup("Fragrance Note", "note", filters?.note, selectedNotes)}
      {filters?.collection &&
        renderCheckboxGroup("Collection", "collection", filters.collection, selectedCollections)}
      {renderCheckboxGroup("Intensity", "intensity", filters?.intensity, selectedIntensities)}
      {renderCheckboxGroup("Occasion", "occasion", filters?.occasion, selectedOccasions)}
      {renderCheckboxGroup("Mood", "mood", filters?.mood, selectedMoods)}
      {renderCheckboxGroup("Weather", "weather", filters?.weather, selectedWeathers)}

      <fieldset className="space-y-2">
        <legend className="block text-xs font-semibold uppercase tracking-wider text-text mb-1">
          Price Range ($)
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${prefix}-min-price`} className="sr-only">
              Minimum price
            </label>
            <Input
              id={`${prefix}-min-price`}
              aria-label="Minimum price"
              type="number"
              placeholder="Min"
              min="0"
              value={minPrice}
              onChange={(e) => updateParam("minPrice", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${prefix}-max-price`} className="sr-only">
              Maximum price
            </label>
            <Input
              id={`${prefix}-max-price`}
              aria-label="Maximum price"
              type="number"
              placeholder="Max"
              min="0"
              value={maxPrice}
              onChange={(e) => updateParam("maxPrice", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
          Reset Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text">Fragrance Catalogue</h1>
          <p className="mt-1 text-sm text-text-muted">
            Explore curated formulations, scent profiles, and olfactive compositions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-full md:w-72">
            <label htmlFor="catalogue-search-input" className="sr-only">
              Search fragrances
            </label>
            <Input
              id="catalogue-search-input"
              aria-label="Search fragrances"
              type="search"
              placeholder="Search fragrances..."
              value={searchQuery}
              onChange={(e) => updateParam("q", e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="md:hidden min-h-[44px]"
            onClick={() => setMobileFiltersOpen(true)}
          >
            Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="hidden md:block md:col-span-1 border-r border-border pr-6">
          <div className="sticky top-24">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text mb-4">Filter By</h2>
            {renderFilterControls("desktop")}
          </div>
        </aside>

        <Drawer
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          title="Filter Fragrances"
        >
          <div className="p-4">
            {renderFilterControls("mobile")}
          </div>
        </Drawer>

        <div className="col-span-1 md:col-span-3">
          {error ? (
            <ErrorState
              title="Catalogue Error"
              message={error}
              onRetry={() => {
                void loadData();
              }}
            />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <Skeleton className="h-64 w-full" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No fragrances match your criteria"
              description="Try modifying your search keywords or clearing applied filters."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((perfume) => (
                <Card key={perfume.id} className="flex flex-col overflow-hidden hover:border-border-strong transition-colors">
                  <div className="relative h-64 w-full bg-surface-muted flex items-center justify-center overflow-hidden">
                    {perfume.imageUrl ? (
                      <Image
                        src={perfume.imageUrl}
                        alt={perfume.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="text-text-muted text-xs">No image available</div>
                    )}
                  </div>
                  <CardHeader className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="accent">{perfume.primaryFamily.label}</Badge>
                      {perfume.intensity && (
                        <Badge variant="neutral">{perfume.intensity.label}</Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-1">{perfume.name}</CardTitle>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <span className="text-xs text-text-muted">From</span>
                      <p className="text-sm font-semibold text-text">
                        {formatPrice(perfume.priceFrom)}
                      </p>
                    </div>
                    <Link
                      href={"/product/" + perfume.id}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-muted text-text text-sm font-medium min-h-[44px] px-4 transition-colors"
                    >
                      View Details
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
