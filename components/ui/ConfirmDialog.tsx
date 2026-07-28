"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-sm" closeOnBackdrop={!loading}>
      <div className="flex items-center gap-3 mb-2">
        <AlertTriangle className={`h-5 w-5 ${danger ? "text-red-500" : "text-[#B8952F]"}`} />
        <h3 className="text-base font-semibold text-[#4A4A3C]">{title}</h3>
      </div>
      <p className="text-sm text-[#8C8C78] mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
