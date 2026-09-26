import type { Endpoint } from "./common";

export type ParticipationAccount = Readonly<{
  subscription: Readonly<{ optedIn: boolean }>;
  loyalty: Readonly<{
    points: number;
    entries: readonly Readonly<{ id: string; type: "ORDER_REWARD" | "REFERRAL_REWARD"; points: number; createdAt: string }>[];
  }>;
  referral: Readonly<{
    code: string | null;
    received: Readonly<{ status: "ATTRIBUTED" | "QUALIFIED"; createdAt: string; qualifiedAt: string | null }> | null;
  }>;
}>;

export type ParticipationApi = Readonly<{
  account: Endpoint<void, ParticipationAccount>;
  setSubscription: Endpoint<{ readonly optedIn: boolean }, { readonly optedIn: boolean }>;
  referralCode: Endpoint<void, { readonly code: string }>;
  applyReferral: Endpoint<{ readonly code: string }, null>;
}>;
