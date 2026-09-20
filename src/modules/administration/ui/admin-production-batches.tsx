"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductionBatch } from "@/contracts/admin";
import type { Page } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminMilestoneApi } from "./admin-milestone-api";

type BatchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Page<ProductionBatch> };

export function AdminProductionBatches({
  onReleased,
}: {
  onReleased: () => void;
}) {
  const [state, setState] = useState<BatchState>({
    status: "loading",
  });
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [selected, setSelected] = useState<ProductionBatch | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const releaseKeys = useRef(new Map<string, string>());
  const releaseInFlight = useRef(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getAdminMilestoneApi().listBatches({
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
            message: "Production batches are temporarily unavailable.",
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
    setSelected(null);
    setActionError(null);
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  function changePage(nextPage: number) {
    setSelected(null);
    setActionError(null);
    setState({ status: "loading" });
    setPage(nextPage);
  }

  async function release() {
    if (!selected || releaseInFlight.current) return;

    const batch = selected;
    releaseInFlight.current = true;
    setPending(true);
    setActionError(null);
    setNotice("");

    try {
      let key = releaseKeys.current.get(batch.id);
      if (!key) {
        key = crypto.randomUUID();
        releaseKeys.current.set(batch.id, key);
      }

      const result = await getAdminMilestoneApi().releaseBatch({
        id: batch.id,
        idempotencyKey: key,
      });

      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }

      setState(current =>
        current.status === "ready"
          ? {
              status: "ready",
              data: {
                ...current.data,
                items: current.data.items.map(item =>
                  item.id === result.data.id ? result.data : item,
                ),
              },
            }
          : current,
      );
      setSelected(null);
      setNotice(`Batch ${result.data.batchCode}: ${result.data.status}.`);
      onReleased();
    } catch {
      setActionError(
        "The release result could not be confirmed. Refresh batches to check the status before retrying.",
      );
    } finally {
      releaseInFlight.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="batches-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="batches-heading" className="text-h2 font-semibold">
          Production batches
        </h2>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={pending || state.status === "loading"}
        >
          Refresh batches
        </Button>
      </div>

      <p className="text-sm text-text-muted">
        Review recorded batches before release.
      </p>

      <p role="status" className="text-sm">{notice}</p>

      {state.status === "loading" && (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading production batches…</span>
          <Skeleton className="h-28" />
        </div>
      )}

      {state.status === "error" && (
        <div role="alert">
          <ErrorState
            title="Could not load production batches"
            message={state.message}
            onRetry={refresh}
          />
        </div>
      )}

      {state.status === "ready" && (
        <>
          {state.data.items.length === 0 && (
            <Card className="p-5">
              No production batches were returned for this page.
            </Card>
          )}

          <ul className="space-y-4">
            {state.data.items.map(batch => (
              <li key={batch.id}>
                <Card className="space-y-4 p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="break-all font-semibold">
                      {batch.batchCode}
                    </h3>
                    <span className="text-sm">{batch.status}</span>
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-text-muted">Variant ID</dt>
                      <dd className="break-all">{batch.variantId}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Produced quantity</dt>
                      <dd>{batch.producedQuantity}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Production date (UTC)</dt>
                      <dd>{batch.productionDate.slice(0, 10)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Released at (UTC)</dt>
                      <dd className="break-all">
                        {batch.releasedAt ?? "Not released"}
                      </dd>
                    </div>
                  </dl>

                  {batch.status === "RECORDED" && (
                    <Button
                      disabled={pending || selected?.id === batch.id}
                      onClick={() => {
                        setSelected(batch);
                        setActionError(null);
                        setNotice("");
                      }}
                    >
                      Review release
                    </Button>
                  )}

                  {selected?.id === batch.id && (
                    <div
                      role="group"
                      aria-label={`Confirm release of ${batch.batchCode}`}
                      aria-busy={pending}
                      className="space-y-3 rounded-md border border-border p-4"
                    >
                      <p>
                        Release {batch.producedQuantity} units from this batch?
                        Stock changes are determined by the service.
                      </p>

                      {actionError && (
                        <p role="alert" className="text-sm text-danger">
                          {actionError}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={pending}
                          onClick={() => void release()}
                        >
                          {pending ? "Releasing…" : "Confirm release"}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            setSelected(null);
                            setActionError(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>

          <nav
            aria-label="Production batch pagination"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <Button
              variant="outline"
              disabled={pending || state.data.page <= 1}
              onClick={() => changePage(state.data.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">Page {state.data.page}</span>
            <Button
              variant="outline"
              disabled={pending || !state.data.hasMore}
              onClick={() => changePage(state.data.page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}