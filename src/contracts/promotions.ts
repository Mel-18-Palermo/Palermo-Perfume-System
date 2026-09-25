import type { Endpoint, EntityId, Timestamp } from "./common";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type PromotionInput = Readonly<{
  code: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  currency?: string | null;
  eligibility?: JsonValue;
  active: boolean;
  activeFrom?: Timestamp | null;
  activeUntil?: Timestamp | null;
}>;

export type PromotionUpdate = PromotionInput & Readonly<{
  promotionId: EntityId;
}>;

export type PromotionalContentInput = Readonly<{
  title: string;
  brief: string;
  promotionId?: EntityId;
}>;

export type PromotionalContentReview = Readonly<{
  contentId: EntityId;
  status: "APPROVED" | "REJECTED";
}>;

export type PromotionsAdminApi = Readonly<{
  createPromotion: Endpoint<PromotionInput, { readonly id: EntityId }>;
  updatePromotion: Endpoint<PromotionUpdate, null>;
  createPromotionalContent: Endpoint<PromotionalContentInput, { readonly id: EntityId }>;
  generatePromotionalContent: Endpoint<{ readonly contentId: EntityId }, null>;
  reviewPromotionalContent: Endpoint<PromotionalContentReview, null>;
}>;
