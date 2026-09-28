import Link from "next/link";

const links = [["Profile", "/account"], ["Purchases", "/orders"], ["Saved fragrances", "/wishlist"], ["Rewards & referrals", "/account/rewards"]] as const;

export function AccountHub() {
  return <nav aria-label="Your Palermo" className="mx-auto mb-8 max-w-[1180px] border-y border-border py-4"><p className="mb-3 text-xs font-medium uppercase tracking-[.16em] text-text-muted">Your Palermo</p><ul className="flex flex-wrap gap-x-6 gap-y-2">{links.map(([label, href]) => <li key={href}><Link href={href} className="inline-flex min-h-11 items-center text-sm font-medium text-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{label}</Link></li>)}</ul></nav>;
}
