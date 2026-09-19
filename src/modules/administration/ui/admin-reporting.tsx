"use client";

import { useEffect, useState } from "react";
import type { Dashboard, ReportingPeriod } from "@/contracts/admin";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

type ReportState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Dashboard };

function periodForMonth(month: string): ReportingPeriod {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Select a valid reporting month.");
  }

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));

  if (
    year < 1000 ||
    year > 9999 ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error("Select a valid reporting month.");
  }

  return {
    from: new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString(),
    to: new Date(Date.UTC(year, monthNumber, 1)).toISOString(),
  };
}

export function AdminReporting() {
  const [month, setMonth] = useState("2026-09");
  const [period, setPeriod] = useState<ReportingPeriod>(() =>
    periodForMonth("2026-09"),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<ReportState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await api.admin.getDashboard(period);

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
            message: "Reporting is temporarily unavailable.",
          });
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [period, reloadToken]);

  function applyMonth() {
    try {
      const nextPeriod = periodForMonth(month);
      setFormError(null);
      setState({ status: "loading" });
      setPeriod(nextPeriod);
    } catch {
      setFormError("Select a valid reporting month.");
    }
  }

  function retry() {
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  return (
    <section aria-labelledby="reporting-heading" className="space-y-6">
      <div>
        <h2 id="reporting-heading" className="text-h2 font-semibold">
          Reporting
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Monthly sales and orders. Administrator reporting access is
          required. All reporting dates use UTC.
        </p>
      </div>

      <form
        onSubmit={event => {
          event.preventDefault();
          applyMonth();
        }}
        className="flex flex-wrap items-end gap-4"
      >
        <div className="min-w-0">
          <label
            htmlFor="reporting-month"
            className="mb-2 block text-sm font-medium"
          >
            Reporting month
          </label>
          <input
            id="reporting-month"
            type="month"
            min="1000-01"
            max="9999-12"
            required
            value={month}
            onChange={event => {
              setMonth(event.target.value);
              setFormError(null);
            }}
            aria-invalid={formError !== null}
            aria-describedby={formError ? "reporting-month-error" : undefined}
            className="min-h-[44px] max-w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <Button type="submit" disabled={state.status === "loading"}>
          {state.status === "loading" ? "Loading report…" : "Load report"}
        </Button>

        {formError && (
          <p
            id="reporting-month-error"
            role="alert"
            className="w-full text-sm text-danger"
          >
            {formError}
          </p>
        )}
      </form>

      {state.status === "loading" && (
        <div role="status" aria-busy="true" className="space-y-3">
          <span className="sr-only">Loading report…</span>
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      )}

      {state.status === "error" && (
        <div role="alert">
          <ErrorState
            title="Could not load the report"
            message={state.message}
            onRetry={retry}
          />
        </div>
      )}

      {state.status === "ready" && (
        <>
          <p className="text-sm text-text-muted">
            Report period: {state.data.period.from.slice(0, 10)} inclusive
            {" to "}
            {state.data.period.to.slice(0, 10)} exclusive (UTC).
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="min-w-0 p-5">
              <h3 className="text-sm text-text-muted">Paid-order sales</h3>
              <p className="mt-2 break-words text-h3 font-semibold">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: state.data.totalSales.currency,
                  currencyDisplay: "code",
                }).format(state.data.totalSales.amountMinor / 100)}
              </p>
            </Card>

            <Card className="min-w-0 p-5">
              <h3 className="text-sm text-text-muted">Total orders</h3>
              <p className="mt-2 text-h3 font-semibold">
                {state.data.totalOrders}
              </p>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-h3 font-semibold">
              Best-selling perfumes
            </h3>

            {state.data.bestSelling.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                No best-selling results were returned for this period.
              </p>
            ) : (
              <div
                role="region"
                aria-label="Best-selling perfumes table"
                tabIndex={0}
                className="mt-4 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Perfumes and units sold in the selected report period
                  </caption>
                  <thead className="border-b border-border">
                    <tr>
                      <th scope="col" className="py-3 pr-4">Perfume</th>
                      <th scope="col" className="py-3 text-right">
                        Units sold
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.bestSelling.map(item => (
                      <tr
                        key={item.perfumeId}
                        className="border-b border-border last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="break-words py-3 pr-4 font-medium"
                        >
                          {item.name}
                        </th>
                        <td className="py-3 text-right">{item.unitsSold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </section>
  );
}