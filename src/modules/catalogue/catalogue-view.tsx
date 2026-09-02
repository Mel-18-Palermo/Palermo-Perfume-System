"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Drawer } from "@/components/ui/drawer";

interface PerfumeItem {
  id: string;
  name: string;
  category: "Citrus" | "Floral" | "Woody" | "Oriental";
  price: number;
  description: string;
}

const MOCK_CATALOGUE: PerfumeItem[] = [
  { id: "p1", name: "Santorini Mist", category: "Citrus", price: 120, description: "Crisp Italian lemon, sea salt, and bergamot." },
  { id: "p2", name: "Velvet Damask", category: "Floral", price: 145, description: "Rich Damask rose, jasmine, and spiced pink pepper." },
  { id: "p3", name: "Oud Royale", category: "Woody", price: 180, description: "Smoky cedarwood, dark oud, and aged amber." },
  { id: "p4", name: "Ambre Nuit", category: "Oriental", price: 160, description: "Warm vanilla bourbon, Tonka bean, and benzoin." },
  { id: "p5", name: "Neroli Blanc", category: "Citrus", price: 115, description: "Sun-drenched neroli, sweet orange blossom, and musk." },
  { id: "p6", name: "Cypress Noir", category: "Woody", price: 150, description: "Earthy cypress needle, vetiver, and dark pine." },
];

export function CatalogueView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const searchQuery = searchParams.get("q") || "";
  const selectedCategory = searchParams.get("category") || "All";

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "All") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const filtered = MOCK_CATALOGUE.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["All", "Citrus", "Floral", "Woody", "Oriental"];

  const FilterPanel = () => (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</label>
        <Input
          placeholder="Search fragrance..."
          value={searchQuery}
          onChange={(e) => updateFilters("q", e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
        <div className="mt-2 flex flex-col gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => updateFilters("category", cat)}
              className={`text-left text-sm py-1.5 px-2.5 rounded-md transition-colors ${
                selectedCategory === cat
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-foreground hover:bg-surface-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-2 border-t border-border">
        <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("?", { scroll: false })}>
          Reset Filters
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fragrance Catalogue</h1>
          <p className="text-sm text-muted-foreground">Explore curated bespoke formulations and extrait de parfums.</p>
        </div>
        <Button variant="outline" className="md:hidden" onClick={() => setMobileFilterOpen(true)}>
          Filter
        </Button>
      </div>

      <Drawer isOpen={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} title="Filter Catalogue">
        <FilterPanel />
      </Drawer>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="hidden md:block">
          <div className="p-4 rounded-lg border border-border bg-surface sticky top-24">
            <FilterPanel />
          </div>
        </aside>

        <section className="md:col-span-3">
          {error ? (
            <ErrorState message={error} onRetry={() => setError(null)} />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No fragrances found"
              description="No perfumes matched your search or category criteria. Try resetting your filters."
              action={<Button variant="outline" onClick={() => router.push("?", { scroll: false })}>Clear Filters</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item) => (
                <Card key={item.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{item.name}</CardTitle>
                      <Badge variant="neutral">{item.category}</Badge>
                    </div>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-foreground">${item.price}.00</p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Link href={`/product/${item.id}`} className="w-full">
                      <Button variant="outline" className="w-full">View Details</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}