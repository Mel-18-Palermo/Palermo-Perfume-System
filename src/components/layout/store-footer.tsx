import * as React from "react";
import Link from "next/link";

export function StoreFooter() {
  return (
    <footer className="w-full border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-[var(--container-wide)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="text-base font-bold tracking-tight text-text">PALERMO</span>
            <p className="mt-2 text-xs text-text-muted leading-relaxed">
              Palermo Perfume System
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text">Navigation</h4>
            <div className="mt-3 flex flex-col space-y-2">
              <Link href="/catalogue" className="text-xs text-text-muted hover:text-text">Catalogue</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text">System</h4>
            <p className="mt-3 text-xs text-text-muted">
              Built to SRS v1.0 specifications.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-border/60 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted">
          <p>&copy; {new Date().getFullYear()} Palermo Perfume System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
