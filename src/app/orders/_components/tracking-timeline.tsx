import { CheckCircle2, Clock, Package, Truck, type LucideIcon } from "lucide-react";
import type { ShipmentStatus, ShipmentTrackingDto } from "@/contracts/tracking";
import { formatDate } from "./format";
import { ShipmentStatusBadge } from "./status-badges";

const statusIcons: Readonly<Record<ShipmentStatus, LucideIcon>> = {
  PENDING: Clock,
  DISPATCHED: Package,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle2,
};

export interface TrackingTimelineProps {
  tracking: ShipmentTrackingDto;
}

export function TrackingTimeline({ tracking }: TrackingTimelineProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShipmentStatusBadge status={tracking.status} />
          {tracking.trackingReference && (
            <span className="text-xs text-text-muted">Ref: {tracking.trackingReference}</span>
          )}
        </div>
        <span className="text-xs text-text-muted">Updated {formatDate(tracking.updatedAt)}</span>
      </div>

      <ol className="mt-4 space-y-4">
        {tracking.events.map((event, index) => {
          const Icon = statusIcons[event.status];
          const isLast = index === tracking.events.length - 1;
          return (
            <li key={`${event.status}-${event.occurredAt}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {!isLast && <span className="w-px flex-1 bg-border" aria-hidden="true" />}
              </div>
              <div className={isLast ? "pb-0" : "pb-4"}>
                <p className="text-sm font-medium text-text">{event.description}</p>
                <p className="mt-0.5 text-xs text-text-muted">{formatDate(event.occurredAt)}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {tracking.confirmation && (
        <p className="mt-4 text-xs text-text-muted">
          Delivery confirmed by internal simulator {formatDate(tracking.confirmation.deliveredAt)}.
        </p>
      )}
    </div>
  );
}
