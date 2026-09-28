import { CheckCircle2, Clock, Package, Truck, type LucideIcon } from "lucide-react";
import type { ShipmentStatus, ShipmentTrackingDto } from "@/contracts/tracking";
import { formatDate } from "./format";

const statusIcons: Readonly<Record<ShipmentStatus, LucideIcon>> = {
  PENDING: Clock,
  DISPATCHED: Package,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle2,
};

const statusLabels: Readonly<Record<ShipmentStatus, string>> = {
  PENDING: "Awaiting dispatch",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
};

export interface TrackingTimelineProps {
  tracking: ShipmentTrackingDto;
}

export function TrackingTimeline({ tracking }: TrackingTimelineProps) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
        <p className="text-sm font-medium text-text">{statusLabels[tracking.status]}</p>
        {tracking.trackingReference && <span className="text-xs text-text-muted">Tracking reference {tracking.trackingReference}</span>}
      </div>

      <ol className="mt-5 space-y-0 border-l border-border">
        {tracking.events.map((event, index) => {
          const Icon = statusIcons[event.status];
          return (
            <li key={`${event.status}-${event.occurredAt}-${index}`} className="relative pl-6 pb-5 last:pb-0">
              <span className="absolute -left-[9px] top-0.5 flex h-[17px] w-[17px] items-center justify-center rounded-full border border-border bg-surface text-text">
                <Icon className="h-3 w-3" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-text">{event.description}</p>
                <p className="mt-0.5 text-xs text-text-muted">{formatDate(event.occurredAt)}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {tracking.confirmation && (
        <p className="mt-4 text-xs text-text-muted">
          Delivery confirmed {formatDate(tracking.confirmation.deliveredAt)}.
        </p>
      )}
    </div>
  );
}
