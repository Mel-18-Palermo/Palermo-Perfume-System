"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import type { ReferralOverviewDto } from "./participation-contracts";
import {
  formatDate,
  formatPoints,
  REFERRAL_STATUS_PRESENTATION,
} from "./participation-format";
import {
  fetchReferralOverview,
  readParticipationScenario,
  resolveErrorMessage,
} from "./participation-service";

type PanelStatus = "loading" | "ready" | "error";
type CopyTarget = "code" | "link";

export function ReferralPanel() {
  const [status, setStatus] = React.useState<PanelStatus>("loading");
  const [data, setData] = React.useState<ReferralOverviewDto | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [copyMessage, setCopyMessage] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetchReferralOverview(readParticipationScenario())
      .then((result) => {
        setData(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        setErrorMessage(
          resolveErrorMessage(error, "Your referral details could not be loaded.")
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

  const handleCopy = (target: CopyTarget, value: string) => {
    const label = target === "code" ? "Referral code" : "Referral link";

    if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
      setCopyMessage(`${label} could not be copied automatically. Select the text to copy it.`);
      return;
    }

    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopyMessage(`${label} copied to your clipboard.`);
      })
      .catch(() => {
        setCopyMessage(`${label} could not be copied. Select the text to copy it.`);
      });
  };

  return (
    <section aria-labelledby="referral-heading" className="space-y-4">
      <h2
        id="referral-heading"
        className="text-xl font-semibold tracking-tight text-foreground"
      >
        Refer a friend
      </h2>

      {status === "loading" && (
        <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading your referral details</span>
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {status === "error" && (
        <ErrorState
          title="Referral details are unavailable"
          message={errorMessage ?? "Your referral details could not be loaded."}
          onRetry={handleRetry}
        />
      )}

      {status === "ready" && data !== null && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your referral code</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {data.rewardRuleLabel}
              </p>

              {/* Code presentation. Wraps rather than overflowing on narrow screens. */}
              <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Referral code</p>
                  <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-foreground break-all">
                    {data.code}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => handleCopy("code", data.code)}
                  className="w-full shrink-0 sm:w-auto"
                >
                  Copy code
                </Button>
              </div>

              {/* Link presentation. The read-only field keeps long URLs usable. */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  label="Referral link"
                  id="referral-link"
                  value={data.shareUrl}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                  helperText="Share this link so your invitation is tracked."
                  className="font-mono"
                />
                <Button
                  type="button"
                  size="lg"
                  onClick={() => handleCopy("link", data.shareUrl)}
                  className="w-full shrink-0 sm:mb-6 sm:w-auto"
                >
                  Copy link
                </Button>
              </div>

              <p role="status" aria-live="polite" className="min-h-4 text-xs text-success">
                {copyMessage}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referral reward status</CardTitle>
            </CardHeader>

            <CardContent>
              {data.rewards.length === 0 ? (
                <EmptyState
                  title="No referrals yet"
                  description="Once someone joins with your code, their reward status will appear here."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.rewards.map((reward) => {
                    const presentation = REFERRAL_STATUS_PRESENTATION[reward.status];

                    return (
                      <li
                        key={reward.id}
                        className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={presentation.variant}>
                              {presentation.label}
                            </Badge>
                            <time
                              dateTime={reward.updatedAt}
                              className="text-xs text-muted-foreground"
                            >
                              {formatDate(reward.updatedAt)}
                            </time>
                          </div>
                          <p className="text-sm text-foreground break-all">
                            {reward.inviteeLabel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {presentation.description}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground sm:text-right">
                          {reward.pointsAwarded === null
                            ? "—"
                            : formatPoints(reward.pointsAwarded)}
                          <span className="sr-only">
                            {reward.pointsAwarded === null
                              ? " no points awarded yet"
                              : " awarded"}
                          </span>
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
