"use client";

import * as React from "react";
import { AdminButton } from "./admin-ui-kit";

export interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Archive",
  cancelLabel = "Cancel",
  isPending = false,
  errorMessage = null,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (!isPending) onCancel();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [isPending, onCancel]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-confirm-dialog-title"
      aria-describedby="admin-confirm-dialog-description"
      className="w-full max-w-md rounded-lg border border-border bg-surface p-0 shadow-md backdrop:bg-black/40"
    >
      <div className="p-6">
        <h2 id="admin-confirm-dialog-title" className="text-h3 font-semibold">
          {title}
        </h2>
        <p id="admin-confirm-dialog-description" className="mt-2 text-sm text-text-muted">
          {description}
        </p>
        {errorMessage ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <AdminButton variant="secondary" size="sm" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </AdminButton>
          <AdminButton variant="danger" size="sm" onClick={onConfirm} isLoading={isPending} disabled={isPending}>
            {confirmLabel}
          </AdminButton>
        </div>
      </div>
    </dialog>
  );
}
