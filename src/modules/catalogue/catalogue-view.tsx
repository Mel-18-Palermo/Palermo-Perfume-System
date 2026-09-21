"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PerfumeSummary, CatalogueFilters, CatalogueQuery } from "@/contracts/catalogue";
import type { MoneyValue } from "@/contracts/common";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const PRODUCT_GRID_CLASS =
  "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const COLLAPSED_NOTE_COUNT = 8;

export function CatalogueView({ initialItems = [], initialFilters = null, initialError = null }: CatalogueViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [items, setItems] = React.useState<readonly PerfumeSummary[]>(initialItems ?? []);
  const [filters, setFilters] = React.useState<CatalogueFilters | null>(initialFilters);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [desktopNotesExpanded, setDesktopNotesExpanded] = React.useState(false);

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

  const activeFilterCount =
    selectedFamilies.length +
    selectedNotes.length +
    selectedCollections.length +
    selectedIntensities.length +
    selectedOccasions.length +
    selectedMoods.length +
    selectedWeathers.length +
    Number(Boolean(minPrice)) +
    Number(Boolean(maxPrice));

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
      <fieldset>
        <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text">
          {title}
        </legend>
        <div>
          {options.map((opt) => {
            const isChecked = selected.includes(opt.id);
            return (
              <label
                key={opt.id}
                className="-mx-2 flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-sm px-2 text-sm text-text transition-colors hover:bg-surface-muted"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleListParam(key, opt.id)}
                  className="h-4 w-4 shrink-0 rounded border-border accent-accent focus:ring-accent"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  };

  const renderFilterControls = (prefix: string = "filter", collapseNotes = false) => {
    const noteOptions = filters?.note ?? [];
    const hasMoreNotes = noteOptions.length > COLLAPSED_NOTE_COUNT;
    const visibleNoteOptions =
      collapseNotes && !desktopNotesExpanded
        ? noteOptions.filter(
            (option, index) =>
              index < COLLAPSED_NOTE_COUNT || selectedNotes.includes(option.id)
          )
        : noteOptions;

    return (
      <div className="space-y-6">
        {renderCheckboxGroup("Fragrance Family", "family", filters?.family, selectedFamilies)}
        <div>
          <div id={`${prefix}-note-options`}>
            {renderCheckboxGroup("Fragrance Note", "note", visibleNoteOptions, selectedNotes)}
          </div>
          {collapseNotes && hasMoreNotes && (
            <button
              type="button"
              className="mt-1 flex min-h-11 items-center text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2"
              aria-controls={`${prefix}-note-options`}
              aria-expanded={desktopNotesExpanded}
              onClick={() => setDesktopNotesExpanded((expanded) => !expanded)}
            >
              {desktopNotesExpanded ? "Show fewer notes" : "Show all notes"}
            </button>
          )}
        </div>
        {filters?.collection &&
          renderCheckboxGroup("Collection", "collection", filters.collection, selectedCollections)}
        {renderCheckboxGroup("Intensity", "intensity", filters?.intensity, selectedIntensities)}
        {renderCheckboxGroup("Occasion", "occasion", filters?.occasion, selectedOccasions)}
        {renderCheckboxGroup("Mood", "mood", filters?.mood, selectedMoods)}
        {renderCheckboxGroup("Weather", "weather", filters?.weather, selectedWeathers)}

        <fieldset className="space-y-2">
          <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text">
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
  };

  return (
    <div className="pb-4 sm:pb-8 sm:pt-2 lg:pb-12 lg:pt-4">
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-text lg:text-display">
          Fragrance Catalogue
        </h1>
        <p className="mt-1 max-w-[var(--container-reading)] text-base leading-6 text-text-muted">
            Explore curated formulations, scent profiles, and olfactive compositions.
        </p>
      </div>

      <div className="mt-5 flex w-full items-center gap-2 sm:mt-6 sm:gap-3 lg:pl-64">
          <p className="hidden text-sm text-text-muted lg:block" aria-live="polite">
            {items.length} {items.length === 1 ? "fragrance" : "fragrances"}
          </p>
          <div className="min-w-0 flex-1 lg:ml-auto lg:max-w-80">
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
            className="shrink-0 px-3 lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="pr-3">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-text">Filter By</h2>
            {renderFilterControls("desktop", true)}
          </div>
        </aside>

        <Drawer
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          title="Filter Fragrances"
          size="wide"
          footer={
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Reset
                </Button>
              )}
              <Button onClick={() => setMobileFiltersOpen(false)} className="flex-1">
                View {items.length}
              </Button>
            </div>
          }
        >
          {renderFilterControls("mobile")}
        </Drawer>

        <div className="min-w-0">
          {error ? (
            <ErrorState
              title="Catalogue Error"
              message={error}
              onRetry={() => {
                void loadData();
              }}
            />
          ) : loading ? (
            <div className={PRODUCT_GRID_CLASS}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="overflow-hidden rounded-md">
                  <Skeleton className="aspect-[4/3] w-full sm:aspect-[4/5]" />
                  <div className="space-y-3 p-4 sm:p-5">
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
            <div className={PRODUCT_GRID_CLASS}>
              {items.map((perfume, index) => (
                <article
                  key={perfume.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface transition-colors duration-[var(--duration-normal)] hover:border-border-strong focus-within:ring-2 focus-within:ring-info focus-within:ring-offset-2"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted sm:aspect-[4/5]">
                    {perfume.imageUrl ? (
                      <Image
                        src={perfume.imageUrl}
                        alt={perfume.name}
                        fill
                        loading={index < 4 ? "eager" : "lazy"}
                        className="object-contain motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)] motion-safe:group-hover:scale-[1.015]"
                        sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="text-text-muted text-xs">No image available</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5 xl:p-4">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4">
                      <span className="font-medium text-text">{perfume.primaryFamily.label}</span>
                      {perfume.intensity && (
                        <span className="flex items-center gap-2 text-text-muted before:h-1 before:w-1 before:rounded-full before:bg-border-strong">
                          {perfume.intensity.label}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-h3 font-semibold tracking-tight text-text">
                      <Link
                        href={`/product/${perfume.id}`}
                        className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none"
                      >
                        {perfume.name}
                      </Link>
                    </h2>
                    <div className="mt-auto flex min-h-11 items-end justify-between gap-2 pt-4">
                      <div>
                        <span className="text-xs leading-4 text-text-muted">From</span>
                        <p className="text-base font-semibold tabular-nums text-text">
                        {formatPrice(perfume.priceFrom)}
                        </p>
                      </div>
                      <span className="whitespace-nowrap pb-1 text-sm font-medium text-text xl:text-xs" aria-hidden="true">
                        View fragrance <span className="inline-block motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)] motion-safe:group-hover:translate-x-0.5">→</span>
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
