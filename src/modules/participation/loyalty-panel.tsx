"use client";

import * as React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

import type { LoyaltyOverviewDto } from "./participation-contracts";
import {
  formatDate,
  formatPoints,
  formatSignedPoints,
  LOYALTY_ENTRY_PRESENTATION,
} from "./participation-format";
import {
  fetchLoyaltyOverview,
  readParticipationScenario,
  resolveErrorMessage,
} from "./participation-service";

type PanelStatus = "loading" | "ready" | "error";

function LoyaltySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading your loyalty points</span>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function LoyaltyPanel() {
  const [status, setStatus] = React.useState<PanelStatus>("loading");
  const [data, setData] = React.useState<LoyaltyOverviewDto | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetchLoyaltyOverview(readParticipationScenario())
      .then((result) => {
        setData(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        setErrorMessage(
          resolveErrorMessage(error, "Your loyalty balance could not be loaded.")
        );
        setStatus("error");
      });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRetry = () => {
    setStatus("loading");
    setErrorMessage(null);
    load();
  };

  return (
    <section aria-labelledby="loyalty-heading" className="space-y-4">
      <h2
        id="loyalty-heading"
        className="text-xl font-semibold tracking-tight text-foreground"
      >
        Loyalty points
      </h2>

      {status === "loading" && <LoyaltySkeleton />}

      {status === "error" && (
        <ErrorState
          title="Loyalty points are unavailable"
          message={errorMessage ?? "Your loyalty balance could not be loaded."}
          onRetry={handleRetry}
        />
      )}

      {status === "ready" && data !== null && (
        <div className="space-y-4">
          {/* Summary. Every figure below is server-calculated. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent>
                <p className="text-xs font-medium text-muted-foreground">
                  Available balance
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                  {formatPoints(data.summary.availablePoints)}
                </p>
                {data.summary.redemptionRule !== null && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatPoints(data.summary.redemptionRule.pointsRequired)} ={" "}
                    {data.summary.redemptionRule.rewardLabel}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <p className="text-xs font-medium text-muted-foreground">
                  Lifetime points earned
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                  {formatPoints(data.summary.lifetimePoints)}
                </p>
                <p className="mt-2">
                  {data.summary.redeemable ? (
                    <Badge variant="success">Ready to redeem</Badge>
                  ) : (
                    <Badge variant="neutral">Not yet redeemable</Badge>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* History. */}
          <Card>
            <CardHeader>
              <CardTitle>Points history</CardTitle>
            </CardHeader>
            <CardContent>
              {data.history.length === 0 ? (
                <EmptyState
                  title="No points activity yet"
                  description="Points appear here once one of your orders has been completed."
                  action={
                    <Link href="/">
                      <Button variant="outline" size="sm">
                        Browse the catalogue
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.history.map((entry) => {
                    const presentation = LOYALTY_ENTRY_PRESENTATION[entry.kind];

                    return (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={presentation.variant}>
                              {presentation.label}
                            </Badge>
                            <time
                              dateTime={entry.occurredAt}
                              className="text-xs text-muted-foreground"
                            >
                              {formatDate(entry.occurredAt)}
                            </time>
                          </div>
                          <p className="text-sm text-foreground break-words">
                            {entry.description}
                          </p>
                          {entry.orderReference !== null && (
                            <p className="text-xs text-muted-foreground break-words">
                              Order {entry.orderReference}
                            </p>
                          )}
                        </div>

                        <p
                          className={`shrink-0 text-sm font-semibold tabular-nums sm:text-right ${
                            entry.points < 0 ? "text-muted-foreground" : "text-success"
                          }`}
                        >
                          {formatSignedPoints(entry.points)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
