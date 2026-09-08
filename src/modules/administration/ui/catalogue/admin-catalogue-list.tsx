"use client";

import * as React from "react";
import type { AdminPerfume } from "@/contracts/admin";
import { getAdminCatalogueApi } from "./admin-catalogue-api";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import {
  AdminBadge,
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
} from "./admin-ui-kit";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: readonly AdminPerfume[] };

export interface AdminCatalogueListProps {
  onCreate?: () => void;
  onEdit?: (perfume: AdminPerfume) => void;
  onArchived?: (perfume: AdminPerfume) => void;
}

export function AdminCatalogueList({ onCreate, onEdit, onArchived }: AdminCatalogueListProps) {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = React.useState(0);
  const [archiveTarget, setArchiveTarget] = React.useState<AdminPerfume | null>(null);
  const [archivePending, setArchivePending] = React.useState(false);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    const api = getAdminCatalogueApi();
    void api.listCatalogue({ page: 1, pageSize: 20 }).then(result => {
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      setState({ status: "ready", items: result.data.items });
    });
  }, []);

  React.useEffect(() => {
    load();
  }, [load, reloadToken]);

  const retry = () => {
    setState({ status: "loading" });
    setReloadToken(token => token + 1);
  };

  const openArchiveDialog = (perfume: AdminPerfume) => {
    setArchiveError(null);
    setArchiveTarget(perfume);
  };

  const closeArchiveDialog = () => {
    if (archivePending) return;
    setArchiveTarget(null);
    setArchiveError(null);
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    setArchivePending(true);
    setArchiveError(null);
    const api = getAdminCatalogueApi();
    void api
      .archivePerfume({ id: archiveTarget.perfume.id, expectedRevision: archiveTarget.revision })
      .then(result => {
        setArchivePending(false);
        if (!result.ok) {
          setArchiveError(result.error.message);
          return;
        }
        setState(current =>
          current.status === "ready"
            ? {
                status: "ready",
                items: current.items.map(item =>
                  item.perfume.id === result.data.perfume.id ? result.data : item,
                ),
              }
            : current,
        );
        setArchiveTarget(null);
        onArchived?.(result.data);
      });
  };

  return (
    <section aria-labelledby="admin-catalogue-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="admin-catalogue-heading" className="text-h2 font-semibold">
          Catalogue
        </h2>
        <AdminButton onClick={onCreate} disabled={state.status !== "ready"}>
          Add perfume
        </AdminButton>
      </div>

      {state.status === "loading" ? (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading catalogue…</span>
          <AdminSkeleton className="h-14 w-full" />
          <AdminSkeleton className="h-14 w-full" />
          <AdminSkeleton className="h-14 w-full" />
        </div>
      ) : null}

      {state.status === "error" ? (
        <AdminErrorState title="Could not load the catalogue" message={state.message} onRetry={retry} />
      ) : null}

      {state.status === "ready" && state.items.length === 0 ? (
        <AdminEmptyState
          title="No perfumes yet"
          description="Perfumes you add will appear here."
          action={<AdminButton onClick={onCreate}>Add your first perfume</AdminButton>}
        />
      ) : null}

      {state.status === "ready" && state.items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-label text-text-muted">
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Family</th>
                <th scope="col" className="px-4 py-3">From</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.items.map(item => (
                <tr key={item.perfume.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium">{item.perfume.name}</td>
                  <td className="px-4 py-3 text-text-muted">{item.perfume.primaryFamily.label}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {(item.perfume.priceFrom.amountMinor / 100).toFixed(2)} {item.perfume.priceFrom.currency}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge status={item.status === "ACTIVE" ? "active" : "archived"}>
                      {item.status === "ACTIVE" ? "Active" : "Archived"}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <AdminButton variant="secondary" size="sm" onClick={() => onEdit?.(item)}>
                        Edit
                      </AdminButton>
                      {item.status === "ACTIVE" ? (
                        <AdminButton variant="danger" size="sm" onClick={() => openArchiveDialog(item)}>
                          Archive
                        </AdminButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <AdminConfirmDialog
        isOpen={archiveTarget !== null}
        title={archiveTarget ? `Archive "${archiveTarget.perfume.name}"?` : "Archive perfume?"}
        description="Archived perfumes are hidden from customers but are not deleted. You can review archived items later."
        confirmLabel="Archive"
        isPending={archivePending}
        errorMessage={archiveError}
        onConfirm={confirmArchive}
        onCancel={closeArchiveDialog}
      />
    </section>
  );
}
