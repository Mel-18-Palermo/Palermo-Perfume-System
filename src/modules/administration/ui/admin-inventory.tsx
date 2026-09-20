"use client";

import { useEffect, useState } from "react";
import type { InventoryBalance } from "@/contracts/admin";
import type { Page } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminMilestoneApi } from "./admin-milestone-api";
import { AdminProductionBatches } from "./admin-production-batches";

type InventoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Page<InventoryBalance> };

export function AdminInventory() {
  const [state, setState] = useState<InventoryState>({
    status: "loading",
  });
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getAdminMilestoneApi().listInventory({
          page,
          pageSize: 20,
        });

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
            message: "Inventory is temporarily unavailable.",
          });
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [page, reloadToken]);

  function refresh() {
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  function changePage(nextPage: number) {
    setState({ status: "loading" });
    setPage(nextPage);
  }

  return (
    <section
      aria-labelledby="inventory-heading"
      className="space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="inventory-heading"
            className="text-h2 font-semibold"
          >
            Inventory
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Variant stock balances
          </p>
        </div>

        <Button
          variant="outline"
          onClick={refresh}
          disabled={state.status === "loading"}
        >
          Refresh inventory
        </Button>
      </div>

      {state.status === "loading" && (
        <div role="status" aria-busy="true" className="space-y-3">
          <span className="sr-only">Loading inventory…</span>
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      )}

      {state.status === "error" && (
        <div role="alert">
          <ErrorState
            title="Could not load inventory"
            message={state.message}
            onRetry={refresh}
          />
        </div>
      )}

      {state.status === "ready" && (
        <>
          {state.data.items.length === 0 ? (
            <Card className="p-5">
              <h3 className="text-h3 font-semibold">
                No inventory records
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                No stock balances were returned for this page.
              </p>
            </Card>
          ) : (
            <div
              role="region"
              aria-label="Variant inventory table, scroll horizontally on small screens"
              tabIndex={0}
              className="overflow-x-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">
                  Variant stock balances and low-stock status
                </caption>
                <thead className="border-b border-border bg-surface-muted">
                  <tr>
                    <th scope="col" className="p-4">SKU</th>
                    <th scope="col" className="p-4">On hand</th>
                    <th scope="col" className="p-4">Reserved</th>
                    <th scope="col" className="p-4">Available</th>
                    <th scope="col" className="p-4">Low-stock threshold</th>
                    <th scope="col" className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.items.map(item => (
                    <tr
                      key={item.variantId}
                      className="border-b border-border last:border-b-0"
                    >
                      <th scope="row" className="p-4 font-medium">
                        {item.sku}
                      </th>
                      <td className="p-4">{item.onHand}</td>
                      <td className="p-4">{item.reserved}</td>
                      <td className="p-4">{item.available}</td>
                      <td className="p-4">{item.lowStockThreshold}</td>
                      <td className="p-4">
                        <span
                          className={
                            item.lowStock
                              ? "rounded-md border border-border bg-surface-muted px-2 py-1 font-semibold"
                              : "text-text-muted"
                          }
                        >
                          {item.lowStock ? "Low stock" : "Not low"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <nav
            aria-label="Inventory pagination"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <Button
              variant="outline"
              disabled={state.data.page <= 1}
              onClick={() => changePage(state.data.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {state.data.page}
            </span>
            <Button
              variant="outline"
              disabled={!state.data.hasMore}
              onClick={() => changePage(state.data.page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}
            <AdminProductionBatches onReleased={refresh} />
    </section>
  );
}