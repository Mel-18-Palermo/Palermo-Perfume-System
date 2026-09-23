"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogueFilters, CatalogueQuery, PerfumeSummary } from "@/contracts/catalogue";
import type { MoneyValue } from "@/contracts/common";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface CatalogueViewProps {
  initialItems?: readonly PerfumeSummary[] | null;
  initialFilters?: CatalogueFilters | null;
  initialError?: string | null;
}

type ListDimension = "family" | "note" | "collection" | "intensity" | "occasion" | "mood" | "weather";
type Audience = "Women" | "Men" | "Unisex";

const PRODUCT_GRID_CLASS = "grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-7 lg:gap-y-14";
const COLLAPSED_NOTE_COUNT = 8;
const AUDIENCES = [
  { id: "women", label: "Women", graphic: "FOR / HER" },
  { id: "men", label: "Men", graphic: "FOR / HIM" },
  { id: "unisex", label: "Unisex", graphic: "UN / ISEX" },
] as const;

function formatPrice(money: MoneyValue): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: money.currency }).format(money.amountMinor / 100);
}
function isUsefulFamily(label: string): boolean {
  return label.trim().toLowerCase() !== "unclassified";
}
function audienceFor(perfume: PerfumeSummary): Audience | null {
  if (perfume.audience === "MEN") return "Men";
  if (perfume.audience === "UNISEX") return "Unisex";
  if (perfume.audience === "WOMEN") return "Women";
  return null;
}

export function CatalogueView({ initialItems = [], initialFilters = null, initialError = null }: CatalogueViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [items, setItems] = React.useState<readonly PerfumeSummary[]>(initialItems ?? []);
  const [filters, setFilters] = React.useState<CatalogueFilters | null>(initialFilters);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [notesExpanded, setNotesExpanded] = React.useState(false);
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
  const hasActiveFilters = Boolean(searchQuery || selectedFamilies.length || selectedNotes.length || selectedCollections.length || selectedIntensities.length || selectedOccasions.length || selectedMoods.length || selectedWeathers.length || minPrice || maxPrice);
  const activeFilterCount = selectedFamilies.length + selectedNotes.length + selectedCollections.length + selectedIntensities.length + selectedOccasions.length + selectedMoods.length + selectedWeathers.length + Number(Boolean(minPrice)) + Number(Boolean(maxPrice));

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedValue = value.trim();
    if (trimmedValue) params.set(key, trimmedValue);
    else params.delete(key);
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const toggleListParam = (key: string, id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const values = params.getAll(key);
    params.delete(key);
    (values.includes(id) ? values.filter((value) => value !== id) : [...values, id]).forEach((value) => params.append(key, value));
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const clearListParam = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const clearFilters = () => router.replace("?", { scroll: false });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(searchParamsString);
    const queryText = params.get("q")?.trim();
    const query: CatalogueQuery = {
      page: 1, pageSize: 24,
      ...(queryText ? { q: queryText } : {}),
      ...(params.getAll("family").length ? { family: params.getAll("family") } : {}),
      ...(params.getAll("note").length ? { note: params.getAll("note") } : {}),
      ...(params.getAll("collection").length ? { collection: params.getAll("collection") } : {}),
      ...(params.getAll("intensity").length ? { intensity: params.getAll("intensity") } : {}),
      ...(params.getAll("occasion").length ? { occasion: params.getAll("occasion") } : {}),
      ...(params.getAll("mood").length ? { mood: params.getAll("mood") } : {}),
      ...(params.getAll("weather").length ? { weather: params.getAll("weather") } : {}),
      ...(minPrice && !Number.isNaN(Number(minPrice)) ? { minPrice: Math.round(Number(minPrice) * 100) } : {}),
      ...(maxPrice && !Number.isNaN(Number(maxPrice)) ? { maxPrice: Math.round(Number(maxPrice) * 100) } : {}),
    };
    try {
      const result = await api.catalogue.list(query);
      if (result.ok) setItems(result.data.items);
      else { setError("Failed to load catalogue items. Please try again."); setItems([]); }
      if (!filters) {
        const filterResult = await api.catalogue.getFilters();
        if (filterResult.ok) setFilters(filterResult.data);
      }
    } catch {
      setError("Unable to load catalogue. Please check your connection and try again.");
      setItems([]);
    } finally { setLoading(false); }
  }, [filters, maxPrice, minPrice, searchParamsString]);
  React.useEffect(() => {
    const timeoutId = setTimeout(() => void loadData(), 0);
    return () => clearTimeout(timeoutId);
  }, [loadData]);

  const sections = React.useMemo(() => AUDIENCES.map((audience) => ({
    ...audience, items: items.filter((perfume) => audienceFor(perfume) === audience.label),
  })).filter((section) => section.items.length), [items]);
  const featureProduct = sections[0]?.items.at(-1);

  const checkboxGroup = (title: string, key: ListDimension, options: readonly { id: string; label: string }[] | undefined, selected: readonly string[]) => {
    if (!options?.length) return null;
    return <fieldset><legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text">{title}</legend><div>{options.map((option) => <label key={option.id} className="-mx-1 flex min-h-11 items-center gap-3 px-1 text-sm text-text-muted transition-colors hover:text-text"><input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggleListParam(key, option.id)} className="h-4 w-4 rounded border-border accent-accent" /><span>{option.label}</span></label>)}</div></fieldset>;
  };
  const filterControls = () => {
    const notes = filters?.note ?? [];
    const visibleNotes = notesExpanded ? notes : notes.filter((option, index) => index < COLLAPSED_NOTE_COUNT || selectedNotes.includes(option.id));
    return <div className="space-y-7">
      {checkboxGroup("Fragrance family", "family", filters?.family.filter((family) => isUsefulFamily(family.label)), selectedFamilies)}
      <div>{checkboxGroup("Fragrance note", "note", visibleNotes, selectedNotes)}{notes.length > COLLAPSED_NOTE_COUNT && <button type="button" onClick={() => setNotesExpanded((expanded) => !expanded)} className="mt-1 min-h-11 text-sm text-text-muted underline underline-offset-4 hover:text-text">{notesExpanded ? "Show fewer notes" : "Show all notes"}</button>}</div>
      {filters?.collection && checkboxGroup("Collection", "collection", filters.collection, selectedCollections)}
      {checkboxGroup("Intensity", "intensity", filters?.intensity, selectedIntensities)}
      {checkboxGroup("Occasion", "occasion", filters?.occasion, selectedOccasions)}
      {checkboxGroup("Mood", "mood", filters?.mood, selectedMoods)}
      {checkboxGroup("Weather", "weather", filters?.weather, selectedWeathers)}
      <fieldset><legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text">Price range ($)</legend><div className="grid grid-cols-2 gap-2"><Input aria-label="Minimum price" type="number" min="0" placeholder="Min" value={minPrice} onChange={(event) => updateParam("minPrice", event.target.value)} /><Input aria-label="Maximum price" type="number" min="0" placeholder="Max" value={maxPrice} onChange={(event) => updateParam("maxPrice", event.target.value)} /></div></fieldset>
    </div>;
  };
  const productTile = (perfume: PerfumeSummary, index: number) => {
    const family = isUsefulFamily(perfume.primaryFamily.label) ? perfume.primaryFamily.label : null;
    const audience = audienceFor(perfume);
    return <article key={perfume.id} className="group min-w-0"><Link href={`/product/${perfume.id}`} className="relative block aspect-[4/5] overflow-hidden bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2" aria-label={`View ${perfume.name}`}>{perfume.imageUrl ? <Image src={perfume.imageUrl} alt={perfume.name} fill loading={index < 4 ? "eager" : "lazy"} className="object-contain p-3 motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:group-hover:scale-[1.015] sm:p-6" sizes="(max-width: 1023px) calc((100vw - 4rem) / 2), 18rem" /> : <div className="flex h-full items-center justify-center text-xs text-text-muted">Image unavailable</div>}</Link><div className="flex min-h-[7.5rem] flex-col pt-3 sm:min-h-[8.25rem] sm:pt-4"><p className="min-h-4 text-[10px] font-medium uppercase leading-4 tracking-[0.12em] text-text-muted sm:text-[11px]">{audience}{family ? ` · ${family}` : ""}</p><h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5 tracking-[-0.02em] text-text sm:text-[1.05rem]"><Link href={`/product/${perfume.id}`} className="decoration-border-strong underline-offset-4 hover:underline focus-visible:outline-none">{perfume.name}</Link></h2><p className="mt-1.5 text-xs tabular-nums text-text-muted sm:mt-2 sm:text-sm">{formatPrice(perfume.priceFrom)}</p>{perfume.availability === "OUT_OF_STOCK" && <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">Sold out</p>}</div></article>;
  };
  const featureBand = (perfume: PerfumeSummary) => {
    const audience = audienceFor(perfume);
    const family = isUsefulFamily(perfume.primaryFamily.label) ? perfume.primaryFamily.label : null;
    const graphic = AUDIENCES.find((entry) => entry.label === audience)?.graphic ?? "PAL / ERMO";
    return <section className="grid overflow-hidden border-y border-border bg-surface-muted lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]" aria-labelledby={`feature-${perfume.id}`}><Link href={`/product/${perfume.id}`} className="relative flex min-h-56 items-end overflow-hidden bg-primary px-5 py-5 text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-inset sm:min-h-72 sm:px-9 sm:py-8 lg:min-h-[25rem] lg:px-12 lg:py-10" aria-label={`View ${perfume.name}`}><span aria-hidden="true" className="absolute -right-[0.08em] -top-[0.13em] whitespace-pre-line text-right text-[clamp(4.5rem,13vw,11rem)] font-medium leading-[0.73] tracking-[-0.09em] text-primary-text/15">{graphic.replace(" / ", "\n")}</span><div className="relative border-l border-primary-text/40 pl-3 text-[10px] font-medium uppercase tracking-[0.15em] sm:pl-4 sm:text-[11px]"><p>Palermo</p><p className="mt-1 text-primary-text/65">{perfume.sku ?? "Eau de parfum"}</p><p className="mt-5 text-primary-text/65">50 ml</p></div></Link><div className="flex min-h-64 flex-col justify-center bg-surface px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Featured fragrance</p><h2 id={`feature-${perfume.id}`} className="mt-4 text-[2rem] font-medium leading-[1.08] tracking-[-0.04em] text-text sm:text-[2.5rem]">{perfume.name}</h2><p className="mt-3 text-sm text-text-muted">{audience}{family ? ` / ${family}` : ""}</p><Link href={`/product/${perfume.id}`} className="mt-8 w-fit text-sm font-medium text-text underline decoration-border-strong underline-offset-8 transition-colors hover:decoration-text focus-visible:outline-none">View fragrance</Link></div></section>;
  };

  return <div className="pb-12 pt-2 sm:pb-16 sm:pt-4 lg:pb-20 lg:pt-6">
    <div className="max-w-2xl"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Palermo collection</p><h1 className="text-[2.15rem] font-medium leading-[1.08] tracking-[-0.045em] text-text sm:text-[2.6rem] lg:text-[3.1rem]">Fragrance catalogue</h1><p className="mt-3 max-w-xl text-base leading-6 text-text-muted">A considered collection of modern fragrances, composed for every kind of day.</p></div>
    <nav className="mt-8 border-y border-border py-4 sm:mt-9 sm:py-5" aria-label="Browse the catalogue"><div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-8"><span className="mr-1 text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">Browse by</span>{AUDIENCES.map((audience) => <a key={audience.id} href={`#catalogue-${audience.id}`} className="min-h-11 py-2 text-sm text-text transition-colors hover:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">{audience.label}</a>)}<span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" /><button type="button" onClick={() => clearListParam("family")} className={`min-h-11 py-2 text-sm transition-colors ${selectedFamilies.length === 0 ? "font-medium text-text underline decoration-border-strong underline-offset-8" : "text-text-muted hover:text-text"}`} aria-pressed={selectedFamilies.length === 0}>All families</button>{(filters?.family ?? []).filter((family) => isUsefulFamily(family.label)).map((family) => <button key={family.id} type="button" onClick={() => toggleListParam("family", family.id)} className={`min-h-11 py-2 text-sm transition-colors ${selectedFamilies.includes(family.id) ? "font-medium text-text underline decoration-border-strong underline-offset-8" : "text-text-muted hover:text-text"}`} aria-pressed={selectedFamilies.includes(family.id)}>{family.label}</button>)}</div></nav>
    <div className="mt-4 flex items-center gap-2 sm:mt-5 sm:gap-3"><p className="mr-auto hidden text-sm text-text-muted lg:block" aria-live="polite">{loading ? "Loading collection" : `${items.length} ${items.length === 1 ? "fragrance" : "fragrances"}`}</p><div className="min-w-0 flex-1 sm:max-w-sm"><label htmlFor="catalogue-search-input" className="sr-only">Search fragrances</label><Input id="catalogue-search-input" type="search" placeholder="Search the collection" value={searchQuery} onChange={(event) => updateParam("q", event.target.value)} /></div><Button variant="outline" className="min-h-11 shrink-0 rounded-sm px-4" onClick={() => setFiltersOpen(true)}>Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}</Button></div>
    {hasActiveFilters && <div className="mt-4 flex items-center gap-3 text-sm text-text-muted"><span>{activeFilterCount + Number(Boolean(searchQuery))} active filter{activeFilterCount + Number(Boolean(searchQuery)) === 1 ? "" : "s"}</span><button type="button" onClick={clearFilters} className="min-h-11 font-medium text-text underline underline-offset-4 hover:text-primary">Clear all</button></div>}
    <Drawer isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} title="Refine collection" size="wide" footer={<div className="flex items-center gap-3">{hasActiveFilters && <Button variant="outline" onClick={clearFilters} className="flex-1">Reset</Button>}<Button onClick={() => setFiltersOpen(false)} className="flex-1">View {items.length}</Button></div>}>{filterControls()}</Drawer>
    <div className="mt-10 min-w-0 sm:mt-12 lg:mt-14">{error ? <section className="border-t border-danger pt-8 sm:pt-10"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">Catalogue unavailable</p><h2 className="mt-3 text-h2 font-medium tracking-tight text-text">The collection could not be loaded.</h2><p className="mt-2 max-w-md text-sm leading-6 text-text-muted">{error}</p><Button className="mt-6 rounded-sm" variant="outline" onClick={() => void loadData()}>Try again</Button></section> : loading ? <div className={PRODUCT_GRID_CLASS}>{Array.from({ length: 8 }).map((_, index) => <div key={index}><Skeleton className="aspect-[4/5] w-full rounded-none" /><div className="space-y-2 pt-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-16" /></div></div>)}</div> : items.length === 0 ? <section className="border-t border-border pt-8 sm:pt-10"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">No matches</p><h2 className="mt-3 text-h2 font-medium tracking-tight text-text">No fragrances match this selection.</h2><p className="mt-2 max-w-md text-sm leading-6 text-text-muted">Try another search term or return to the complete collection.</p><Button className="mt-6 rounded-sm" variant="outline" onClick={clearFilters}>View all fragrances</Button></section> : <div className="space-y-16 sm:space-y-20 lg:space-y-24">{sections.map((section, sectionIndex) => <React.Fragment key={section.id}><section id={`catalogue-${section.id}`} className="scroll-mt-24" aria-labelledby={`catalogue-section-${section.id}`}><div className="mb-7 flex items-end justify-between gap-4 border-t border-border pt-5 sm:mb-8 sm:pt-6"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Audience</p><h2 id={`catalogue-section-${section.id}`} className="mt-2 text-h2 font-medium tracking-[-0.03em] text-text sm:text-[1.8rem]">{section.label} fragrances</h2></div><p className="pb-0.5 text-sm text-text-muted">{section.items.length}</p></div><div className={PRODUCT_GRID_CLASS}>{section.items.map((perfume, itemIndex) => productTile(perfume, sectionIndex * 12 + itemIndex))}</div></section>{sectionIndex === 0 && featureProduct && featureBand(featureProduct)}</React.Fragment>)}</div>}</div>
  </div>;
}
