import * as React from "react";
import Link from "next/link";

export function StoreFooter() {
  return (
    <footer className="w-full border-t border-border bg-surface mt-auto">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="text-base font-bold tracking-tight text-foreground">PALERMO</span>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Premium fine fragrance curation, custom profiles, and intelligent scents.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Quick Links</h4>
            <div className="mt-3 flex flex-col space-y-2">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">Catalogue</Link>
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">About Us</Link>
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">Shipping & Returns</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Customer Care</h4>
            <p className="mt-3 text-xs text-muted-foreground">
              Questions or assistance? Reach out to support@palermoperfumes.com
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-border/60 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Palermo Perfume System. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Built to SRS v1.0 specifications.</p>
        </div>
      </div>
    </footer>
  );
}