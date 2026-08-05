"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Power } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, Badge } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { listTiers, createTier, updateTier, deleteTier, type Tier, type TierInput } from "@/lib/api/tiers";

interface TierManagerModalProps {
  showId: string;
  stopId: string | null;
  stopLabel?: string;
  onClose: () => void;
}

type Draft = { name: string; price: string; quantity: string; sort_order: string; is_active: boolean };
const emptyDraft: Draft = { name: "", price: "", quantity: "", sort_order: "0", is_active: true };

function toPayload(d: Draft): TierInput {
  return {
    name: d.name,
    price_pence: Math.round(parseFloat(d.price || "0") * 100),
    quantity: Number(d.quantity || 0),
    sort_order: Number(d.sort_order || 0),
    is_active: d.is_active,
  };
}

export function TierManagerModal({ showId, stopId, stopLabel, onClose }: TierManagerModalProps) {
  const { showSuccess, showError } = useToast();
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!stopId) {
      setTiers(null);
      return;
    }
    (async () => {
      try {
        setTiers(await listTiers(showId, stopId));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load pricing tiers.");
        setTiers([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId, stopId]);

  async function handleCreate() {
    if (!stopId) return;
    setSaving(true);
    try {
      const created = await createTier(showId, stopId, toPayload(draft));
      setTiers((prev) => [...(prev ?? []), created]);
      setAdding(false);
      setDraft(emptyDraft);
      showSuccess("Tier added.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to add tier.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(tier: Tier, d: Draft) {
    if (!stopId) return;
    setSaving(true);
    try {
      const updated = await updateTier(showId, stopId, tier.id, toPayload(d));
      setTiers((prev) => prev?.map((t) => (t.id === tier.id ? updated : t)) ?? prev);
      setEditingId(null);
      showSuccess("Tier updated.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to update tier.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!stopId || !deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTier(showId, stopId, deleteTarget.id);
      setTiers((prev) => prev?.filter((t) => t.id !== deleteTarget.id) ?? prev);
      setDeleteTarget(null);
      showSuccess("Tier deleted.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === "TIER_HAS_ORDERS") {
        setDeleteError("This tier can't be deleted because tickets have already been sold at it.");
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to delete tier.");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(tier: Tier) {
    if (!stopId) return;
    setTogglingId(tier.id);
    try {
      const updated = await updateTier(showId, stopId, tier.id, { is_active: !tier.is_active });
      setTiers((prev) => prev?.map((t) => (t.id === tier.id ? updated : t)) ?? prev);
      showSuccess(updated.is_active ? `${tier.name} is now on sale.` : `${tier.name} is no longer on sale.`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to update tier status.");
    } finally {
      setTogglingId(null);
    }
  }

  const editingTier = tiers?.find((t) => t.id === editingId) ?? null;
  const sorted = tiers?.slice().sort((a, b) => a.sort_order - b.sort_order) ?? [];

  const columns: DataTableColumn<Tier>[] = [
    {
      key: "name",
      header: "Tier",
      accessor: (t) => t.name,
      sortable: true,
      searchable: true,
      className: "font-medium",
      render: (t) => (
        <div className="flex items-center gap-2">
          {t.name}
          <Badge color={t.is_active ? "green" : "gray"}>{t.is_active ? "On sale" : "Not on sale"}</Badge>
        </div>
      ),
    },
    {
      key: "price_pence",
      header: "Price",
      accessor: (t) => t.price_pence,
      sortable: true,
      render: (t) => <>£{(t.price_pence / 100).toFixed(2)}</>,
    },
    { key: "quantity", header: "Allocation", accessor: (t) => t.quantity, sortable: true },
    {
      key: "tickets_sold",
      header: "Sold",
      accessor: (t) => t.tickets_sold,
      sortable: true,
      render: (t) => (
        <span className={t.tickets_sold >= t.quantity ? "text-red-600 font-medium" : ""}>
          {t.tickets_sold} / {t.quantity}
        </span>
      ),
    },
    { key: "sort_order", header: "Order", accessor: (t) => t.sort_order, sortable: true },
    {
      key: "actions",
      header: "",
      render: (tier) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggleActive(tier)}
            disabled={togglingId === tier.id}
            className={tier.is_active ? "text-green-600 hover:text-green-700" : "text-[#8C8C78] hover:text-[#4A4A3C]"}
            title={tier.is_active ? "Turn this tier off sale" : "Turn this tier on sale"}
          >
            <Power className="h-4 w-4" />
          </button>
          <button onClick={() => setEditingId(tier.id)} className="text-[#B8952F]">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(tier)} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Modal open={!!stopId} onClose={onClose} title={stopLabel ? `Pricing tiers — ${stopLabel}` : "Pricing tiers"} maxWidth="max-w-3xl">
      {tiers === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-[#B8952F]" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#8C8C78]">
            Tiers marked &quot;On sale&quot; are purchasable right now — you can have more than one on sale at the same time
            (e.g. Early Bird and General together). Turn a tier off to pull it from sale without deleting it. Leave this
            empty to sell at the show&apos;s flat price instead.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add tier
            </Button>
          </div>

          <Modal open={adding} onClose={() => setAdding(false)} title="Add pricing tier" maxWidth="max-w-lg">
            <TierEditor draft={draft} setDraft={setDraft} onCancel={() => setAdding(false)} onSave={handleCreate} saving={saving} />
          </Modal>

          <Modal open={!!editingTier} onClose={() => setEditingId(null)} title="Edit pricing tier" maxWidth="max-w-lg">
            {editingTier && (
              <TierEditor
                draft={{
                  name: editingTier.name,
                  price: (editingTier.price_pence / 100).toFixed(2),
                  quantity: editingTier.quantity.toString(),
                  sort_order: editingTier.sort_order.toString(),
                  is_active: editingTier.is_active,
                }}
                setDraft={(d) => handleUpdate(editingTier, typeof d === "function" ? d(draft) : d)}
                onCancel={() => setEditingId(null)}
                onSave={() => {}}
                saving={saving}
                inline
              />
            )}
          </Modal>

          {sorted.length === 0 && !adding ? (
            <EmptyState message="No pricing tiers — this stop sells at the show's flat price." />
          ) : (
            <DataTable columns={columns} rows={sorted} rowKey={(t) => t.id} pageSize={10} pageSizeOptions={[10, 20, 50]} />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tier"
        message={deleteError ?? `Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </Modal>
  );
}

function TierEditor({
  draft,
  setDraft,
  onCancel,
  onSave,
  saving,
  inline,
}: {
  draft: Draft;
  setDraft: (d: Draft | ((prev: Draft) => Draft)) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  inline?: boolean;
}) {
  const [local, setLocal] = useState(draft);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Tier name"
          required
          placeholder="Early Bird"
          value={local.name}
          onChange={(e) => setLocal((d) => ({ ...d, name: e.target.value }))}
        />
        <Input
          label="Price (£)"
          type="number"
          step="0.01"
          min={0.01}
          value={local.price}
          onChange={(e) => setLocal((d) => ({ ...d, price: e.target.value }))}
        />
        <Input
          label="Allocation (quantity)"
          type="number"
          min={1}
          value={local.quantity}
          onChange={(e) => setLocal((d) => ({ ...d, quantity: e.target.value }))}
        />
        <Input
          label="Display order"
          type="number"
          min={0}
          value={local.sort_order}
          onChange={(e) => setLocal((d) => ({ ...d, sort_order: e.target.value }))}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-[#4A4A3C]">
        <input
          type="checkbox"
          checked={local.is_active}
          onChange={(e) => setLocal((d) => ({ ...d, is_active: e.target.checked }))}
        />
        On sale
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          loading={saving}
          onClick={() => {
            setDraft(local);
            if (!inline) onSave();
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
