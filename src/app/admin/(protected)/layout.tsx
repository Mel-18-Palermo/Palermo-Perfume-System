import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminResponsiveNavigation } from "@/modules/administration/ui/admin-responsive-navigation";
import { AdminSessionPreview } from "@/modules/administration/ui/admin-session-preview";
import { SESSION_COOKIE } from "@/lib/auth/http";
import { getIdentityService } from "@/lib/auth/runtime";

type ProtectedAdminLayoutProps = Readonly<{ children: ReactNode }>;

/**
 * The proxy supplies the deep-link redirect. This server check remains the
 * render boundary, so a protected shell can never be streamed to a non-admin.
 */
export default async function ProtectedAdminLayout({ children }: ProtectedAdminLayoutProps) {
  const cookieStore = await cookies();
  const principal = await getIdentityService().principal(cookieStore.get(SESSION_COOKIE)?.value);

  if (principal?.user.role !== "ADMIN") redirect("/admin/login");

  return (
    <div className="min-h-screen bg-bg text-text">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:p-4 focus:text-primary-text"
      >
        Skip to main content
      </a>

      <header className="border-b border-primary-hover bg-primary text-primary-text">
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6 lg:px-8">
          <div>
            <p className="text-h3 font-semibold tracking-tight">PALERMO</p>
            <p className="text-sm text-primary-text/70">Operational console</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-wide lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-surface p-4 md:p-6 lg:min-h-screen lg:border-b-0 lg:border-r">
          <AdminResponsiveNavigation />
        </aside>

        <main id="admin-content" tabIndex={-1} className="min-w-0 p-4 md:p-6 lg:p-8">
          <AdminSessionPreview administratorName={principal.user.displayName}>{children}</AdminSessionPreview>
        </main>
      </div>
    </div>
  );
}
