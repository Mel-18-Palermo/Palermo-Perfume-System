import type { Endpoint, EntityId } from "./common";
export type PaymentInitiation = Readonly<{ paymentId: EntityId; providerReference: string; clientSecret: string | null }>;
export type PaymentApi = Readonly<{ initiate: Endpoint<{ readonly orderId: EntityId }, PaymentInitiation> }>;
