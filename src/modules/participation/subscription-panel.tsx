"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

import type { SubscriptionStateDto } from "./participation-contracts";
import { formatDate } from "./participation-format";
import {
  fetchSubscriptionState,
  readParticipationScenario,
  resolveErrorMessage,
  updateSubscriptionState,
} from "./participation-service";

type PanelStatus = "loading" | "ready" | "error";

export function SubscriptionPanel() {
  const [status, setStatus] = React.useState<PanelStatus>("loading");
  const [data, setData] = React.useState<SubscriptionStateDto | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = React.useState<string | null>(null);
  const [updateErrorMessage, setUpdateErrorMessage] = React.useState<string | null>(null);
  const [isUpdating, setIsUpdating] = React.useState<boolean>(false);

  const load = React.useCallback(() => {
    fetchSubscriptionState(readParticipationScenario())
      .then((result) => {
        setData(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        setLoadErrorMessage(
          resolveErrorMessage(error, "Your subscription preference could not be loaded.")
        );
        setStatus("error");
      });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRetry = () => {
    setStatus("loading");
    setLoadErrorMessage(null);
    load();
  };

  const optedIn = data?.status === "OPTED_IN";

  const handleToggle = () => {
    if (data === null || isUpdating) return;

    setUpdateErrorMessage(null);
    setIsUpdating(true);

    // The next status is the plain inverse of the server-held record (D-076).
    updateSubscriptionState(
      data.status === "OPTED_IN" ? "OPTED_OUT" : "OPTED_IN",
      readParticipationScenario()
    )
      .then((result) => {
        setData(result);
      })
      .catch((error: unknown) => {
        setUpdateErrorMessage(
          resolveErrorMessage(error, "Your subscription preference could not be updated.")
        );
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  return (
    <section aria-labelledby="subscription-heading" className="space-y-4">
      <h2
        id="subscription-heading"
        className="text-xl font-semibold tracking-tight text-foreground"
      >
        Subscription
      </h2>

      {status === "loading" && (
        <div role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading your subscription preference</span>
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {status === "error" && (
        <ErrorState
          title="Subscription preference is unavailable"
          message={loadErrorMessage ?? "Your subscription preference could not be loaded."}
          onRetry={handleRetry}
        />
      )}

      {status === "ready" && data !== null && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <CardTitle>{data.channelLabel}</CardTitle>
              <Badge variant={optedIn ? "success" : "neutral"}>
                {optedIn ? "Subscribed" : "Not subscribed"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {data.description}
            </p>

            {updateErrorMessage !== null && (
              <Alert variant="danger" title="Preference not updated">
                {updateErrorMessage} Your current preference is unchanged.
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {optedIn
                  ? `You are subscribed${
                      data.updatedAt !== null ? ` since ${formatDate(data.updatedAt)}` : ""
                    }.`
                  : "You are not currently subscribed."}
              </p>

              <Button
                type="button"
                size="lg"
                variant={optedIn ? "outline" : "primary"}
                isLoading={isUpdating}
                onClick={handleToggle}
                className="w-full sm:w-auto"
              >
                {optedIn ? "Opt out" : "Opt in"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
