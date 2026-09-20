"use client";

import { useEffect, useState } from "react";
import type { Dashboard, ReportingPeriod } from "@/contracts/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminMilestoneApi } from "./admin-milestone-api";

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Dashboard };

function periodForMonth(month: string): ReportingPeriod {
  const [year, monthNumber] = month.split("-").map(Number);

  if (
    year === undefined ||
    monthNumber === undefined ||
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    year < 1000 ||
    year > 9999 ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error("Invalid reporting month.");
  }

  return {
    from: new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString(),
    to: new Date(Date.UTC(year, monthNumber, 1)).toISOString(),
  };
}

export function AdminDashboard() {
  const [reportingMonth, setReportingMonth] = useState("2026-09");
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<DashboardState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getAdminMilestoneApi().getDashboard(
          periodForMonth(reportingMonth),
        );

        if (!active) return;

        setState(
          result.ok
            ? { status: "ready", data: result.data }
            : { status: "error", message: result.error.message },
        );
      } catch {
        if (active) {
          setState({
            status: "error",
            message: "The dashboard is temporarily unavailable.",
          });
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [reportingMonth, reloadToken]);

  function reload() {
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  function changeMonth(month: string) {
    if (month === reportingMonth) return;

    setState({ status: "loading" });
    setReportingMonth(month);
  }

  return (
    <section
      aria-labelledby="dashboard-heading"
      className="space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="dashboard-heading"
            className="text-h2 font-semibold"
          >
            Dashboard
          </h2>

          <p className="mt-2 text-sm text-text-muted">
          Reporting period uses UTC · Requires administrator access
          </p>

          <div className="mt-4">
            <label
              htmlFor="dashboard-month"
              className="mb-2 block text-sm font-medium"
            >
              Reporting month
            </label>

            <input
              id="dashboard-month"
              type="month"
              min="1000-01"
              max="9999-12"
              required
              value={reportingMonth}
              onChange={event => {
                if (/^\d{4}-\d{2}$/.test(event.target.value)) {
                  changeMonth(event.target.value);
                }
              }}
              className="min-h-[44px] max-w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        <Button
          variant="outline"
          onClick={reload}
          disabled={state.status === "loading"}
        >
          Refresh dashboard
        </Button>
      </div>

      {state.status === "loading" && (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading dashboard…</span>

          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div role="alert">
          <ErrorState
            title="Could not load the dashboard"
            message={state.message}
            onRetry={reload}
          />
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="min-w-0 p-5">
              <h3 className="text-sm text-text-muted">
                Paid-order sales
              </h3>

              <p className="mt-2 break-words text-h3 font-semibold">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: state.data.totalSales.currency,
                }).format(state.data.totalSales.amountMinor / 100)}
              </p>
            </Card>

            <Card className="min-w-0 p-5">
              <h3 className="text-sm text-text-muted">
                Total orders
              </h3>

              <p className="mt-2 text-h3 font-semibold">
                {state.data.totalOrders}
              </p>
            </Card>

            <Card className="min-w-0 p-5">
              <h3 className="text-sm text-text-muted">
                Low-stock variants
              </h3>

              <p className="mt-2 text-h3 font-semibold">
                {state.data.lowStockVariantCount}
              </p>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-h3 font-semibold">
              Best-selling perfumes
            </h3>

            {state.data.bestSelling.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                No sales recorded for this period.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {state.data.bestSelling.map(item => (
                  <li
                    key={item.perfumeId}
                    className="flex flex-wrap justify-between gap-3 py-3"
                  >
                    <span className="min-w-0 break-words">
                      {item.name}
                    </span>

                    <span>Units sold: {item.unitsSold}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </section>
  );
}