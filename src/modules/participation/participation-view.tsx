"use client";

import * as React from "react";

import { LoyaltyPanel } from "./loyalty-panel";
import { ReferralPanel } from "./referral-panel";
import { SubscriptionPanel } from "./subscription-panel";

/**
 * Customer participation surface (Issue #278): loyalty points, subscription
 * opt-in/out and referral presentation. Public review presentation lives with the
 * perfume it belongs to, on the perfume detail page.
 */
export function ParticipationView() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 py-2">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Rewards &amp; participation
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Your loyalty balance, boutique subscription preference and referral details.
          Balances and reward states are maintained by Palermo and shown here as recorded.
        </p>
      </header>

      <LoyaltyPanel />
      <SubscriptionPanel />
      <ReferralPanel />
    </div>
  );
}
