"use client";

import { useEffect, useState } from "react";
import { Banknote, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { formatMoney } from "@/lib/currency";
import { createPayout, deletePayout, listPayouts, type AffiliatePayout } from "@/lib/api/affiliates";

interface PayoutsSectionProps {
  affiliateId: string;
  currency: string;
  balancePence: number;
  // Called after a payout is recorded or removed so the parent can refresh
  // the affiliate's balance.
  onChanged: () => void;
}

export function PayoutsSection({ affiliateId, currency, balancePence, onChanged }: PayoutsSectionProps) {
  const { showSuccess, showError } = useToast();
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AffiliatePayout | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setPayouts(await listPayouts(affiliateId));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load payouts.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliateId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePayout(affiliateId, deleteTarget.id);
      setPayouts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      showSuccess("Payout removed — the amount is back on their balance.");
      onChanged();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to remove payout.");
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<AffiliatePayout>[] = [
    {
      key: "paid_at",
      header: "Date",
      accessor: (p) => new Date(p.paid_at),
      sortable: true,
      render: (p) => <>{new Date(p.paid_at).toLocaleDateString()}</>,
    },
    {
      key: "amount",
      header: "Amount",
      accessor: (p) => p.amount_pence,
      sortable: true,
      render: (p) => <span className="font-medium">{formatMoney(p.amount_pence, currency)}</span>,
    },
    { key: "method", header: "Method", accessor: (p) => p.method ?? "", render: (p) => <>{p.method || "-"}</> },
    { key: "reference", header: "Reference", accessor: (p) => p.reference ?? "", render: (p) => <>{p.reference || "-"}</> },
    {
      key: "note",
      header: "Note",
      accessor: (p) => p.note ?? "",
      render: (p) => <span className="text-[#8C8C78]">{p.note || "-"}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <button onClick={() => setDeleteTarget(p)} className="text-red-500" title="Remove this payout">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#4A4A3C]">Payouts</h2>
          <p className="text-xs text-[#8C8C78]">
            A record of what you&apos;ve paid them. Recording a payout here doesn&apos;t send any money.
          </p>
        </div>
        <Button onClick={() => setRecording(true)}>
          <Banknote className="h-4 w-4" /> Record payout
        </Button>
      </div>

      {!loading && payouts.length === 0 ? (
        <EmptyState title="No payouts yet" message="Record a payout after you've paid this affiliate." />
      ) : (
        <DataTable
          columns={columns}
          rows={payouts}
          rowKey={(p) => p.id}
          loading={loading}
          skeletonCols={6}
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      <RecordPayoutModal
        open={recording}
        affiliateId={affiliateId}
        currency={currency}
        balancePence={balancePence}
        onClose={() => setRecording(false)}
        onRecorded={(p) => {
          setPayouts((prev) => [p, ...prev]);
          onChanged();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove payout"
        message={`Remove the ${deleteTarget ? formatMoney(deleteTarget.amount_pence, currency) : ""} payout? Use this only to fix a mistake — it puts the amount back on their balance owed.`}
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}

function RecordPayoutModal({
  open,
  affiliateId,
  currency,
  balancePence,
  onClose,
  onRecorded,
}: {
  open: boolean;
  affiliateId: string;
  currency: string;
  balancePence: number;
  onClose: () => void;
  onRecorded: (payout: AffiliatePayout) => void;
}) {
  const { showSuccess, showError } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(balancePence > 0 ? (balancePence / 100).toFixed(2) : "");
    setMethod("");
    setReference("");
    setNote("");
    // Prefill only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSave() {
    const pence = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(pence) || pence < 1) {
      showError("Enter the amount you paid.");
      return;
    }
    setSaving(true);
    try {
      const payout = await createPayout(affiliateId, {
        amount_pence: pence,
        method: method.trim() || undefined,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      showSuccess(`Payout of ${formatMoney(payout.amount_pence, currency)} recorded.`);
      onRecorded(payout);
      onClose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to record payout.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record payout" maxWidth="max-w-md">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[#8C8C78]">Currently owed: {formatMoney(balancePence, currency)}</p>
        <Input
          id="payout-amount"
          label="Amount paid"
          type="number"
          min={0.01}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            id="payout-method"
            label="Method"
            placeholder="Bank transfer"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
          <Input
            id="payout-reference"
            label="Reference"
            placeholder="Transfer ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
        <Input id="payout-note" label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={saving} onClick={handleSave}>
            Record payout
          </Button>
        </div>
      </div>
    </Modal>
  );
}
