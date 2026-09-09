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
  initialItems?: readonly PerfumeSummary[];
  initialFilters?: CatalogueFilters | null;
}

function formatPrice(money: MoneyValue): string {
  const amount = money.amountMinor / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: money.currency,
  }).format(amount);
}

export function CatalogueView({ initialItems = [], initialFilters = null }: CatalogueViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = React.useState<readonly PerfumeSummary[]>(initialItems);
  const [filters, setFilters] = React.useState<CatalogueFilters | null>(initialFilters);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  const searchQuery = searchParams.get("q") ?? "";
  const selectedFamily = searchParams.get("family") ?? "";
  const selectedIntensity = searchParams.get("intensity") ?? "";
  const selectedOccasion = searchParams.get("occasion") ?? "";
  const selectedMood = searchParams.get("mood") ?? "";
  const selectedWeather = searchParams.get("weather") ?? "";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const query: CatalogueQuery = {
      page: 1,
      pageSize: 24,
      ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
      ...(selectedFamily ? { family: [selectedFamily] } : {}),
      ...(selectedIntensity ? { intensity: [selectedIntensity] } : {}),
      ...(selectedOccasion ? { occasion: [selectedOccasion] } : {}),
      ...(selectedMood ? { mood: [selectedMood] } : {}),
      ...(selectedWeather ? { weather: [selectedWeather] } : {}),
    };

    try {
      const res = await api.catalogue.list(query);
      if (!res.ok) {
        setError(res.error.message || "Failed to load catalogue.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalogue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedFamily, selectedIntensity, selectedOccasion, selectedMood, selectedWeather, filters]);

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

  const filterControls = (
    <div className="space-y-4">
      <div>
        <label htmlFor="filter-family" className="block text-xs font-semibold uppercase tracking-wider text-text mb-1.5">
          Fragrance Family
        </label>
        <select
          id="filter-family"
          value={selectedFamily}
          onChange={(e) => updateParam("family", e.target.value)}
          className="w-full min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Families</option>
          {filters?.family?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-intensity" className="block text-xs font-semibold uppercase tracking-wider text-text mb-1.5">
          Intensity
        </label>
        <select
          id="filter-intensity"
          value={selectedIntensity}
          onChange={(e) => updateParam("intensity", e.target.value)}
          className="w-full min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Intensities</option>
          {filters?.intensity?.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-occasion" className="block text-xs font-semibold uppercase tracking-wider text-text mb-1.5">
          Occasion
        </label>
        <select
          id="filter-occasion"
          value={selectedOccasion}
          onChange={(e) => updateParam("occasion", e.target.value)}
          className="w-full min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Occasions</option>
          {filters?.occasion?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-mood" className="block text-xs font-semibold uppercase tracking-wider text-text mb-1.5">
          Mood
        </label>
        <select
          id="filter-mood"
          value={selectedMood}
          onChange={(e) => updateParam("mood", e.target.value)}
          className="w-full min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Moods</option>
          {filters?.mood?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-weather" className="block text-xs font-semibold uppercase tracking-wider text-text mb-1.5">
          Weather
        </label>
        <select
          id="filter-weather"
          value={selectedWeather}
          onChange={(e) => updateParam("weather", e.target.value)}
          className="w-full min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Weather</option>
          {filters?.weather?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {(selectedFamily || selectedIntensity || selectedOccasion || selectedMood || selectedWeather || searchQuery) && (
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
            <Input
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
            {filterControls}
          </div>
        </aside>

        <Drawer
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          title="Filter Fragrances"
        >
          <div className="p-2">
            {filterControls}
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
                      href={`/catalogue/${perfume.id}`}
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