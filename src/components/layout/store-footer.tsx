import * as React from "react";
import Link from "next/link";

export function StoreFooter() {
  return (
    <footer className="border-t border-border bg-surface text-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <span className="text-lg font-bold tracking-tight text-foreground">PALERMO</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bespoke extrait de parfum formulated with traditional maceration principles.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Collections
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Fragrance Catalogue
                </Link>
              </li>
              <li>
                <Link href="/quiz" className="text-muted-foreground hover:text-foreground transition-colors">
                  Fragrance Quiz
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Customer Care
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/support" className="text-muted-foreground hover:text-foreground transition-colors">
                  AI Concierge & Support
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-muted-foreground hover:text-foreground transition-colors">
                  Your Cart
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Boutique
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Melbourne Flagship Atelier<br />
              Insured courier dispatch nationally.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row justify-between text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Palermo Parfums. All rights reserved.</p>
          <p>Extrait de Parfum Formulation Standards</p>
        </div>
      </div>
    </footer>
  );
}