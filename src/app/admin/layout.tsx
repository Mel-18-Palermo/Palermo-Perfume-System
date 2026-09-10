import { AdminSessionPreview } from "@/modules/administration/ui/admin-session-preview";
import type { ReactNode } from "react";

import { AdminResponsiveNavigation } from "@/modules/administration/ui/admin-responsive-navigation";

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:p-4 focus:text-primary-text"
      >
        Skip to main content
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6 lg:px-8">
          <div>
            <p className="text-h3 font-semibold">Palermo</p>
            <p className="text-sm text-text-muted">Administration</p>
          </div>
          <p className="text-sm text-text-muted">Interface preview</p>
        </div>
      </header>

      <div className="mx-auto max-w-wide lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-b border-border p-4 md:p-6 lg:min-h-screen lg:border-b-0 lg:border-r">
          <AdminResponsiveNavigation />
        </aside>

        <main
          id="admin-content"
          tabIndex={-1}
          className="min-w-0 p-4 md:p-6 lg:p-8"
        >
          <AdminSessionPreview>{children}</AdminSessionPreview>
        </main>
      </div>
    </div>
  );
}
