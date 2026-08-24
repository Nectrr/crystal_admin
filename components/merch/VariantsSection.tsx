"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { EmptyState, Badge } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  createMerchVariant,
  updateMerchVariant,
  deleteMerchVariant,
  type MerchVariant,
} from "@/lib/api/merch";

interface Draft {
  label: string;
  unlimited: boolean;
  stockQuantity: string;
  sortOrder: number;
}

const emptyDraft: Draft = { label: "", unlimited: true, stockQuantity: "", sortOrder: 0 };

export function VariantsSection({ productId, variants }: { productId: string; variants: MerchVariant[] }) {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState(variants);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MerchVariant | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MerchVariant | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  }

  function openEdit(v: MerchVariant) {
    setEditing(v);
    setDraft({
      label: v.label,
      unlimited: v.stock_quantity == null,
      stockQuantity: v.stock_quantity != null ? String(v.stock_quantity) : "",
      sortOrder: v.sort_order,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!draft.label.trim()) {
      showError("Label is required.");
      return;
    }
    const stockQuantity = draft.unlimited ? null : Number(draft.stockQuantity) || 0;
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateMerchVariant(productId, editing.id, {
          label: draft.label,
          stock_quantity: stockQuantity,
          sort_order: draft.sortOrder,
        });
        setItems((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        showSuccess("Variant updated.");
      } else {
        const created = await createMerchVariant(productId, {
          label: draft.label,
          stock_quantity: stockQuantity,
          sort_order: draft.sortOrder,
        });
        setItems((prev) => [...prev, created]);
        showSuccess("Variant added.");
      }
      setModalOpen(false);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save variant.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMerchVariant(productId, deleteTarget.id);
      setItems((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      showSuccess("Variant removed.");
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showError("This variant has already been sold in an order and can't be deleted.");
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to delete variant.");
      }
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<MerchVariant>[] = [
    { key: "label", header: "Label", accessor: (v) => v.label, sortable: true, searchable: true, className: "font-medium" },
    {
      key: "stock",
      header: "Stock",
      render: (v) => <span className="text-[#8C8C78]">{v.stock_quantity == null ? "Unlimited" : v.stock_quantity}</span>,
    },
    {
      key: "sold",
      header: "Sold",
      accessor: (v) => v.quantity_sold,
      sortable: true,
      render: (v) => <span className="text-[#8C8C78]">{v.quantity_sold}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (v) => (v.in_stock ? <Badge color="green">In Stock</Badge> : <Badge color="red">Out of Stock</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (v) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(v)} className="text-[#B8952F]">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(v)} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#4A4A3C]">Variants</h3>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add variant
        </Button>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit variant" : "Add variant"} maxWidth="max-w-md">
        <div className="flex flex-col gap-3">
          <Input label="Label" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="Small, One Size..." />

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={draft.unlimited}
              onChange={(e) => setDraft((d) => ({ ...d, unlimited: e.target.checked }))}
              className="h-4 w-4 rounded border-[#EDEAE0] text-[#B8952F] focus:ring-[#B8952F]/40"
            />
            <span className="text-sm text-[#4A4A3C]">Unlimited stock</span>
          </label>

          {!draft.unlimited && (
            <Input
              label="Stock quantity"
              type="number"
              min={0}
              value={draft.stockQuantity}
              onChange={(e) => setDraft((d) => ({ ...d, stockQuantity: e.target.value }))}
            />
          )}

          <Input
            label="Sort order"
            type="number"
            value={draft.sortOrder}
            onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) }))}
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {items.length === 0 ? (
        <EmptyState message="No variants yet — add at least one so this product can be purchased." />
      ) : (
        <DataTable columns={columns} rows={items} rowKey={(v) => v.id} searchable={false} paginate={false} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete variant"
        message={`Delete "${deleteTarget?.label}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
