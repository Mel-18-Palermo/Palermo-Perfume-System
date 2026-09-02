"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
}

const CATEGORIES = ["All", "Citrus", "Floral", "Woody", "Oriental"];

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Santorini Mist",
    category: "Citrus",
    price: 120,
    description: "Crisp Italian lemon, sea salt, and bergamot.",
  },
  {
    id: "p2",
    name: "Velvet Damask",
    category: "Floral",
    price: 145,
    description: "Rich Damask rose, jasmine, and spiced pink pepper.",
  },
  {
    id: "p3",
    name: "Oud Royale",
    category: "Woody",
    price: 180,
    description: "Smoky cedarwood, dark oud, and aged amber.",
  },
  {
    id: "p4",
    name: "Ambre Nuit",
    category: "Oriental",
    price: 160,
    description: "Warm vanilla bourbon, Tonka bean, and benzoin.",
  },
  {
    id: "p5",
    name: "Neroli Blanc",
    category: "Citrus",
    price: 115,
    description: "Sun-drenched neroli, sweet orange blossom, and musk.",
  },
  {
    id: "p6",
    name: "Cypress Noir",
    category: "Woody",
    price: 150,
    description: "Earthy cypress needle, vetiver, and dark pine.",
  },
];

interface FilterPanelProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategorySelect: (cat: string) => void;
  onReset: () => void;
}

function FilterPanel({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
  onReset,
}: FilterPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="search-fragrance" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
          Search
        </label>
        <Input
          id="search-fragrance"
          placeholder="Search fragrance..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Category
        </span>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategorySelect(cat)}
              className={`text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onReset} className="w-full">
        Reset Filters
      </Button>
    </div>
  );
}

export function CatalogueView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMobileFilterOpen, setIsMobileFilterOpen] = React.useState(false);

  const q = searchParams.get("q") ?? "";
  const cat = searchParams.get("category") ?? "All";

  const updateFilters = (newQ: string, newCat: string) => {
    const params = new URLSearchParams();
    if (newQ.trim()) params.set("q", newQ.trim());
    if (newCat && newCat !== "All") params.set("category", newCat);
    const queryString = params.toString();
    router.replace(queryString ? `/?${queryString}` : "/");
  };

  const handleSearchChange = (value: string) => {
    updateFilters(value, cat);
  };

  const handleCategorySelect = (selected: string) => {
    updateFilters(q, selected);
    setIsMobileFilterOpen(false);
  };

  const handleReset = () => {
    router.replace("/");
    setIsMobileFilterOpen(false);
  };

  const filteredProducts = React.useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesSearch =
        q === "" ||
        product.name.toLowerCase().includes(q.toLowerCase()) ||
        product.description.toLowerCase().includes(q.toLowerCase());
      const matchesCategory =
        cat.toLowerCase() === "all" ||
        product.category.toLowerCase() === cat.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [q, cat]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Fragrance Catalogue
          </h1>
          <p className="text-sm text-muted-foreground">
            Explore curated bespoke formulations and extrait de parfums.
          </p>
        </div>
        <Button
          variant="outline"
          className="md:hidden"
          onClick={() => setIsMobileFilterOpen(true)}
        >
          Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="hidden md:block">
          <div className="p-4 rounded-lg border border-border bg-surface sticky top-24">
            <FilterPanel
              searchQuery={q}
              onSearchChange={handleSearchChange}
              selectedCategory={cat}
              onCategorySelect={handleCategorySelect}
              onReset={handleReset}
            />
          </div>
        </aside>

        <main className="md:col-span-3">
          {filteredProducts.length === 0 ? (
            <EmptyState
              title="No fragrances found"
              description="Try adjusting your search terms or filter selections."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((item) => (
                <Card key={item.id} className="flex flex-col justify-between">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <Badge variant="neutral">{item.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      ${item.price}.00
                    </p>
                  </CardContent>
                  <div className="p-5 pt-0">
                    <Link href={`/product/${item.id}`} className="w-full">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      <Drawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Fragrances"
      >
        <div className="p-4">
          <FilterPanel
            searchQuery={q}
            onSearchChange={handleSearchChange}
            selectedCategory={cat}
            onCategorySelect={handleCategorySelect}
            onReset={handleReset}
          />
        </div>
      </Drawer>
    </div>
  );
}