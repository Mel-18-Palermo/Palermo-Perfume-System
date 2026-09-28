import type { Endpoint, EntityId, Page, PageRequest, Timestamp } from "./common";

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

export type PromotionRecord = PromotionInput & Readonly<{
  id: EntityId;
}>;

export type PromotionalContentStatus =
  | "DRAFT"
  | "GENERATED"
  | "PREVIEW"
  | "APPROVED"
  | "REJECTED"
  | "FAILED";

export type PromotionalContentRecord = Readonly<{
  id: EntityId;
  promotionId: EntityId | null;
  title: string;
  brief: string;
  status: PromotionalContentStatus;
  provider: string | null;
  previewUrl: string | null;
  failureCode: string | null;
  reviewedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}>;

export type PromotionsAdminApi = Readonly<{
  listPromotions: Endpoint<PageRequest, Page<PromotionRecord>>;
  listPromotionalContent: Endpoint<PageRequest, Page<PromotionalContentRecord>>;
  createPromotion: Endpoint<PromotionInput, { readonly id: EntityId }>;
  updatePromotion: Endpoint<PromotionUpdate, null>;
  createPromotionalContent: Endpoint<PromotionalContentInput, { readonly id: EntityId }>;
  generatePromotionalContent: Endpoint<{ readonly contentId: EntityId }, null>;
  reviewPromotionalContent: Endpoint<PromotionalContentReview, null>;
}>;
