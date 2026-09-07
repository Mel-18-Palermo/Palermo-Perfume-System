import type { Acknowledgement, Endpoint, EntityId, Option, Revision, Timestamp } from "./common";
import type { AccountStatus } from "./auth";

export type AddressInput = Readonly<{
  recipientName: string; line1: string; line2: string | null;
  suburb: string; state: string; postcode: string; country: string;
}>;
export type Address = AddressInput & Readonly<{ id: EntityId }>;
export type FragrancePreferences = Readonly<{
  favouriteNoteIds: readonly EntityId[]; preferredIntensityId: EntityId | null;
  /** Optional non-medical fragrance avoidance information. */
  sensitivityAvoidance: string | null;
}>;
export type FragranceIdentity = Readonly<{
  primaryFamily: Option; explanation: string; status: "CURRENT" | "STALE"; generatedAt: Timestamp;
}>;
export type CustomerProfile = Readonly<{
  id: EntityId; name: string; email: string; accountStatus: AccountStatus; revision: Revision;
  deliveryAddress: Address | null; billingAddress: Address | null; billingSameAsDelivery: boolean;
  preferences: FragrancePreferences; fragranceIdentity: FragranceIdentity | null;
}>;
export type ProfileUpdate = Readonly<{
  expectedRevision: Revision; name: string; preferences: FragrancePreferences;
}>;
export type BillingAddressInput =
  | Readonly<{ kind: "USE_DELIVERY" }>
  | Readonly<{ kind: "SEPARATE"; address: AddressInput }>;
export type ProfileApi = Readonly<{
  get: Endpoint<void, CustomerProfile>;
  update: Endpoint<ProfileUpdate, CustomerProfile>;
  setDeliveryAddress: Endpoint<{
    readonly expectedRevision: Revision; readonly address: AddressInput;
  }, CustomerProfile>;
  setBillingAddress: Endpoint<{
    readonly expectedRevision: Revision; readonly billing: BillingAddressInput;
  }, CustomerProfile>;
  generateIdentity: Endpoint<{ readonly expectedRevision: Revision }, CustomerProfile>;
  deactivate: Endpoint<{ readonly expectedRevision: Revision }, Acknowledgement>;
}>;
