import type {
  AdminDeliveryAddressSnapshot,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminShipment,
} from "../../contracts/admin";
import type { ApiResult, Page, PageRequest } from "../../contracts/common";
import { failure, success } from "../../lib/api/result";
import type { Prisma, PrismaClient } from "../../lib/db/generated/client";

const entityId = /^[0-9a-f-]{10,64}$/i;
const include = {
  customer: { select: { name: true, email: true } },
  items: true,
  payment: true,
  shipment: { include: { events: { orderBy: { occurredAt: "asc" } } } },
} as const;

type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof include }>;

function address(value: unknown): AdminDeliveryAddressSnapshot {
  const input = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

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

export class AdminOrdersService {
  constructor(private readonly db: PrismaClient) {}

  private summary(order: LoadedOrder): AdminOrderSummary {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      placedAt: order.placedAt.toISOString(),
      status: order.status,
      paymentStatus: order.payment?.status ?? "PENDING",
      shipmentState: order.shipment?.status ?? "NOT_CREATED",
      trackingPresent: Boolean(order.shipment?.trackingReference),
      total: { amountMinor: order.totalMinor, currency: order.currency },
    };
  }

  private shipment(order: LoadedOrder): AdminShipment | null {
    if (!order.shipment) return null;

    return {
      state: order.shipment.status,
      trackingReference: order.shipment.trackingReference,
      deliveredAt: order.shipment.deliveredAt?.toISOString() ?? null,
      events: order.shipment.events.map(event => ({
        status: event.status,
        description: event.description,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  }

  private detail(order: LoadedOrder): AdminOrderDetail {
    return {
      ...this.summary(order),
      items: order.items.map(item => ({
        id: item.id,
        sku: item.skuSnapshot,
        title: item.nameSnapshot,
        quantity: item.quantity,
        unitPrice: { amountMinor: item.unitPriceMinor, currency: order.currency },
        lineTotal: { amountMinor: item.unitPriceMinor * item.quantity, currency: order.currency },
        personalisation: {
          personalisedLabel: item.personalisedLabel,
          engravingName: item.engravingName,
          giftMessage: item.giftMessage,
          giftPackagingId: item.giftPackagingId,
        },
      })),
      subtotal: { amountMinor: order.subtotalMinor, currency: order.currency },
      discountTotal: { amountMinor: order.discountTotalMinor, currency: order.currency },
      deliveryCharge: { amountMinor: order.deliveryChargeMinor, currency: order.currency },
      deliveryAddress: address(order.deliveryAddressSnapshot),
      paymentReference: order.payment?.providerReference ?? null,
      shipment: this.shipment(order),
      cancellationRequest: order.cancellationRequestedAt
        ? { requestedAt: order.cancellationRequestedAt.toISOString() }
        : null,
    };
  }

  async list(request: PageRequest): Promise<ApiResult<Page<AdminOrderSummary>>> {
    const page = request.page ?? 1;
    const pageSize = request.pageSize ?? 20;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize)
      || pageSize < 1 || pageSize > 50) return failure("VALIDATION_ERROR");

    const orders = await this.db.order.findMany({
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

  async get(orderId: string): Promise<ApiResult<AdminOrderDetail>> {
    if (!entityId.test(orderId)) return failure("NOT_FOUND");
    const order = await this.db.order.findUnique({ where: { id: orderId }, include });
    return order ? success(this.detail(order)) : failure("NOT_FOUND");
  }
}
