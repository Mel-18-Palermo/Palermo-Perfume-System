

export type FragranceIntensity = "light" | "moderate" | "strong";

export interface Address {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface FragrancePreferences {
  favouriteNoteIds: string[];
  preferredIntensity: FragranceIntensity | null;
  sensitivityNotes?: string;
}

export interface FragranceIdentity {
  primaryFamily: string;
  explanation: string;
  isStale: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  deliveryAddress: Address | null;
  billingAddress: Address | null;
  billingSameAsDelivery: boolean;
  fragrancePreferences: FragrancePreferences;
  fragranceIdentity: FragranceIdentity | null;
  accountStatus: "ACTIVE" | "PENDING_VERIFICATION" | "DEACTIVATED";
}

export interface FragranceNoteOption {
  id: string;
  label: string;
}
