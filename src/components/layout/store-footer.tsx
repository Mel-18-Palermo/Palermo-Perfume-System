import Link from "next/link";
import type { Session } from "@/contracts/auth";

const linkClass =
  "flex min-h-11 items-center text-sm text-text-muted transition-colors hover:text-text";

const serviceLinks = [
  {
    href: "/shipping",
    eyebrow: "Delivery information",
    description: "Review available delivery methods, charges and tracking guidance.",
  },
  {
    href: "/quiz",
    eyebrow: "Personal consultation",
    description: "Explore fragrances through Palermo’s guided consultation.",
  },
  {
    href: "/support",
    eyebrow: "Palermo concierge",
    description: "Open the full concierge for product, order and policy support.",
  },
] as const;

export function StoreFooter({ session }: { session: Session | null }) {
  const isAuthenticated = Boolean(session?.user);
  const accountHref = isAuthenticated ? "/account" : "/login?next=/account";
  const ordersHref = isAuthenticated ? "/orders" : "/login?next=/orders";
  const rewardsHref = isAuthenticated
    ? "/account/rewards"
    : "/login?next=/account/rewards";

  return (
    <footer className="mt-auto w-full border-t border-border bg-surface text-text">
      <nav aria-label="Palermo services" className="border-b border-border">
        <div className="mx-auto grid max-w-[var(--container-wide)] md:grid-cols-3">
          {serviceLinks.map((service, index) => (
            <Link
              key={service.href}
              href={service.href}
              className={`group flex min-h-32 flex-col justify-center px-6 py-7 transition-colors hover:bg-surface-muted lg:px-8 ${
                index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                {service.eyebrow}
              </span>
              <span className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
                {service.description}
              </span>
              <span aria-hidden="true" className="mt-3 text-sm transition-transform group-hover:translate-x-1">
                Explore&nbsp;→
              </span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-[var(--container-wide)] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 border-b border-border py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(9rem,0.65fr))] lg:gap-8 lg:py-16">
          <div className="max-w-md">
            <p className="text-2xl font-bold tracking-tight">PALERMO</p>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              Modern fragrance, considered through a personal consultation and a focused catalogue.
            </p>
            <div className="mt-8 border-l-2 border-text pl-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                {isAuthenticated ? "Palermo updates" : "Your Palermo"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {isAuthenticated
                  ? "Review your saved update preference with rewards and referrals."
                  : "Sign in to manage your account, saved fragrances and Palermo updates."}
              </p>
              <Link
                href={isAuthenticated ? "/account/rewards" : "/login?next=/account"}
                className={`${linkClass} mt-2 underline decoration-border underline-offset-4`}
              >
                {isAuthenticated ? "Manage Palermo updates" : "Sign in to your account"}
              </Link>
            </div>
          </div>

          <nav aria-label="Explore Palermo">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Explore</p>
            <div className="mt-4 flex flex-col">
              <Link href="/catalogue" className={linkClass}>Catalogue</Link>
              <Link href="/quiz" className={linkClass}>Consultation</Link>
              <Link href="/wishlist" className={linkClass}>Wishlist</Link>
            </div>
          </nav>

          <nav aria-label="Client services">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Client Services</p>
            <div className="mt-4 flex flex-col">
              <Link href={accountHref} className={linkClass}>Account</Link>
              <Link href={ordersHref} className={linkClass}>Orders</Link>
              <Link href={rewardsHref} className={linkClass}>Rewards &amp; referrals</Link>
              <Link href="/support" className={linkClass}>Customer Support</Link>
            </div>
          </nav>

          <nav aria-label="Legal information">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Legal</p>
            <div className="mt-4 flex flex-col">
              <Link href="/terms" className={linkClass}>Terms &amp; Conditions</Link>
              <Link href="/privacy" className={linkClass}>Privacy Policy</Link>
              <Link href="/shipping" className={linkClass}>Shipping &amp; Delivery</Link>
              <Link href="/returns" className={linkClass}>Returns &amp; Refunds</Link>
            </div>
          </nav>
        </div>

        <div className="py-7 sm:py-9">
          <p className="overflow-hidden text-[clamp(3.25rem,12vw,10rem)] font-bold leading-[0.78] tracking-[-0.065em]">
            PALERMO
          </p>
          <p className="mt-7 text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Palermo Perfume System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
