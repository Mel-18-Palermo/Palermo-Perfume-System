import type { ApiResult, PageRequest } from "../../../contracts/common";
import type { DeliveryMethod } from "../../../contracts/checkout";
import type { Invoice, OrderDetail, OrdersApi, OrderSummary } from "../../../contracts/orders";
import { failure, success } from "../../../lib/api/result";
import type { Prisma, PrismaClient } from "../../../lib/db/generated/client";

const include = { items: true, payment: true, invoice: true, shipment: true } as const;
type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof include }>;

const entityId = /^[0-9a-f-]{10,64}$/i;
const requestKey = /^[A-Za-z0-9_-]{16,128}$/;
const cancellableStatuses = ["PLACED", "CONFIRMED", "PROCESSING"] as const;

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function address(value: unknown): {
  recipientName: string;
  line1: string;
  line2: string | null;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
} {
  const input = object(value);
  return {
    recipientName: typeof input["recipientName"] === "string" ? input["recipientName"] : "",
    line1: typeof input["line1"] === "string" ? input["line1"] : "",
    line2: typeof input["line2"] === "string" ? input["line2"] : null,
    suburb: typeof input["suburb"] === "string" ? input["suburb"] : "",
    state: typeof input["state"] === "string" ? input["state"] : "",
    postcode: typeof input["postcode"] === "string" ? input["postcode"] : "",
    country: typeof input["country"] === "string" ? input["country"] : "",
  };
}

function deliveryMethod(value: unknown): DeliveryMethod {
  const input = object(value);
  return {
    id: typeof input["id"] === "string" ? input["id"] : "",
    name: typeof input["name"] === "string" ? input["name"] : "",
    charge: {
      amountMinor: typeof input["chargeMinor"] === "number"
        && Number.isSafeInteger(input["chargeMinor"]) && input["chargeMinor"] >= 0
        ? input["chargeMinor"]
        : 0,
      currency: typeof input["currency"] === "string" ? input["currency"] : "",
    },
    displayInformation: typeof input["displayInformation"] === "string"
      ? input["displayInformation"]
      : null,
  };
}

function cancellable(order: LoadedOrder): boolean {
  return order.cancellationRequestedAt === null
    && cancellableStatuses.some(status => status === order.status);
}

export class OrdersService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  private summary(order: LoadedOrder): OrderSummary {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      placedAt: order.placedAt.toISOString(),
      status: order.status,
      paymentStatus: order.payment?.status ?? "PENDING",
      total: { amountMinor: order.totalMinor, currency: order.currency },
    };
  }

  private detail(order: LoadedOrder): OrderDetail {
    return {
      ...this.summary(order),
      items: order.items.map(item => ({
        id: item.id,
        variantId: item.variantId,
        sku: item.skuSnapshot,
        title: item.nameSnapshot,
        quantity: item.quantity,
        unitPrice: { amountMinor: item.unitPriceMinor, currency: order.currency },
        customisation: {
          personalisedLabel: item.personalisedLabel,
          engravingName: item.engravingName,
          giftMessage: item.giftMessage,
          giftPackagingId: item.giftPackagingId,
        },
      })),
      subtotal: { amountMinor: order.subtotalMinor, currency: order.currency },
      discountTotal: { amountMinor: order.discountTotalMinor, currency: order.currency },
      deliveryAddress: address(order.deliveryAddressSnapshot),
      billingAddress: address(order.billingAddressSnapshot),
      deliveryMethod: deliveryMethod(order.deliveryMethodSnapshot),
      invoiceId: order.invoice?.id ?? null,
      shipmentId: order.shipment?.id ?? null,
      canRequestCancellation: cancellable(order),
      cancellationRequest: order.cancellationRequestedAt
        ? { requestedAt: order.cancellationRequestedAt.toISOString() }
        : null,
    };
  }

  private async load(customerId: string, orderId: string): Promise<LoadedOrder | null> {
    return this.db.order.findFirst({ where: { id: orderId, customerId }, include });
  }

  async list(customerId: string, request: PageRequest): Promise<ApiResult<{
    items: readonly OrderSummary[];
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>> {
    if (!entityId.test(customerId)) return failure("UNAUTHENTICATED");
    const page = request.page ?? 1;
    const pageSize = request.pageSize ?? 20;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize)
      || pageSize < 1 || pageSize > 50) return failure("VALIDATION_ERROR");
    const orders = await this.db.order.findMany({
      where: { customerId },
      include,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    });
    return success({
      items: orders.slice(0, pageSize).map(order => this.summary(order)),
      page,
      pageSize,
      hasMore: orders.length > pageSize,
    });
  }

  async get(customerId: string, orderId: string): Promise<ApiResult<OrderDetail>> {
    const order = entityId.test(customerId) && entityId.test(orderId)
      ? await this.load(customerId, orderId)
      : null;
    return order
      ? success(this.detail(order))
      : failure(entityId.test(customerId) ? "NOT_FOUND" : "UNAUTHENTICATED");
  }

  /** Invoice reads are side-effect free. Creation belongs to verified payment finalisation. */
  async invoice(customerId: string, orderId: string): Promise<ApiResult<Invoice>> {
    const order = entityId.test(customerId) && entityId.test(orderId)
      ? await this.load(customerId, orderId)
      : null;
    if (!order) return failure(entityId.test(customerId) ? "NOT_FOUND" : "UNAUTHENTICATED");
    if (order.payment?.status !== "SUCCEEDED") return failure("CONFLICT");
    if (!order.invoice || !order.payment.providerReference
      || order.invoice.paymentReferenceSnapshot !== order.payment.providerReference
      || order.invoice.totalMinor !== order.totalMinor || order.invoice.currency !== order.currency) {
      return failure("TEMPORARILY_UNAVAILABLE");
    }
    return success({
      id: order.invoice.id,
      invoiceNumber: order.invoice.invoiceNumber,
      issuedAt: order.invoice.issuedAt.toISOString(),
      order: this.detail(order),
      paymentReference: order.invoice.paymentReferenceSnapshot,
    });
  }

  async cancel(
    customerId: string,
    orderId: string,
    idempotencyKey: string,
  ): Promise<ApiResult<{ requestedAt: string }>> {
    if (!entityId.test(customerId) || !entityId.test(orderId) || !requestKey.test(idempotencyKey)) {
      return failure("VALIDATION_ERROR");
    }
    const order = await this.load(customerId, orderId);
    if (!order) return failure("NOT_FOUND");
    if (order.cancellationRequestedAt) {
      return success({ requestedAt: order.cancellationRequestedAt.toISOString() });
    }
    if (!cancellableStatuses.some(status => status === order.status)) return failure("CONFLICT");
    const reused = await this.db.order.findFirst({
      where: { cancellationIdempotencyKey: idempotencyKey, NOT: { id: order.id } },
      select: { id: true },
    });
    if (reused) return failure("CONFLICT");
    const requestedAt = this.now();
    try {
      const changed = await this.db.order.updateMany({
        where: {
          id: order.id,
          customerId,
          status: { in: [...cancellableStatuses] },
          cancellationRequestedAt: null,
        },
        data: { cancellationRequestedAt: requestedAt, cancellationIdempotencyKey: idempotencyKey },
      });
      if (changed.count === 1) return success({ requestedAt: requestedAt.toISOString() });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
    const current = await this.load(customerId, orderId);
    return current?.cancellationRequestedAt
      ? success({ requestedAt: current.cancellationRequestedAt.toISOString() })
      : failure("CONFLICT");
  }
}

export function ordersApi(service: OrdersService, customerId: string): OrdersApi {
  return {
    list: input => service.list(customerId, input),
    get: input => service.get(customerId, input.id),
    getInvoice: input => service.invoice(customerId, input.orderId),
    requestCancellation: input => service.cancel(customerId, input.orderId, input.idempotencyKey),
  };
}
