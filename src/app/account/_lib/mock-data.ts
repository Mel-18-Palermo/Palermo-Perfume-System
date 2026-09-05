import type { CustomerProfile, FragranceNoteOption } from "./types";

// Standing in for the real API client from #241/#252.
// Swap the two fetch functions below for real calls once that lands.

export const MOCK_FRAGRANCE_NOTES: FragranceNoteOption[] = [
  { id: "bergamot", label: "Bergamot" },
  { id: "jasmine", label: "Jasmine" },
  { id: "sandalwood", label: "Sandalwood" },
  { id: "vanilla", label: "Vanilla" },
  { id: "amber", label: "Amber" },
  { id: "citrus", label: "Citrus" },
];

const MOCK_PROFILE: CustomerProfile = {
  id: "cust_mock_001",
  name: "Alex Rivera",
  email: "alex.rivera@example.com",
  deliveryAddress: {
    recipientName: "Alex Rivera",
    line1: "12 Ocean View Terrace",
    city: "Sydney",
    region: "NSW",
    postalCode: "2000",
    country: "Australia",
  },
  billingAddress: null,
  billingSameAsDelivery: true,
  fragrancePreferences: {
    favouriteNoteIds: ["jasmine", "sandalwood"],
    preferredIntensity: "moderate",
    sensitivityNotes: "",
  },
  fragranceIdentity: {
    primaryFamily: "Woody Floral",
    explanation:
      "Based on your favourite notes (Jasmine, Sandalwood) and moderate intensity preference.",
    isStale: false,
  },
  accountStatus: "ACTIVE",
};

export function fetchMockProfile(): Promise<CustomerProfile> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_PROFILE), 700);
  });
}

export function fetchMockProfileError(): Promise<CustomerProfile> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Unable to load profile right now.")), 700);
  });
}
