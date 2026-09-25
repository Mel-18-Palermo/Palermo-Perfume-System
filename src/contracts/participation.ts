import type { Endpoint } from "./common";

export type ParticipationApi = Readonly<{
  setSubscription: Endpoint<{ readonly optedIn: boolean }, { readonly optedIn: boolean }>;
  referralCode: Endpoint<void, { readonly code: string }>;
  applyReferral: Endpoint<{ readonly code: string }, null>;
}>;
