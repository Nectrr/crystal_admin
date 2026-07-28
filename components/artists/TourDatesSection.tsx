"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { createTourDate, deleteTourDate, type TourDate, type TourDateInput } from "@/lib/api/artists";

const emptyDraft: TourDateInput = {
  title: "",
  venue: "",
  city: "",
  event_date: "",
  display_time: "",
  price: "",
  price_amount: undefined,
  currency: "GBP",
  image_url: "",
  ticket_status: "on-sale",
  ticket_href: "",
  sort_order: 0,
};

export function TourDatesSection({ artistId, dates }: { artistId: string; dates: TourDate[] }) {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState(dates);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<TourDateInput>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TourDate | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      const created = await createTourDate(artistId, {
        ...draft,
        event_date: draft.event_date ? new Date(draft.event_date).toISOString() : draft.event_date,
      });
      setItems((prev) => [...prev, created]);
      setAdding(false);
      setDraft(emptyDraft);
      showSuccess("Tour date added.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to add tour date.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTourDate(artistId, deleteTarget.id);
      setItems((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      showSuccess("Tour date removed.");
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete tour date.");
    } finally {
      setDeleting(false);
    }
  }

  const tourDateColumns: DataTableColumn<TourDate>[] = [
    { key: "title", header: "Title", accessor: (d) => d.title, sortable: true, searchable: true, className: "font-medium" },
    {
      key: "city_venue",
      header: "City / Venue",
      accessor: (d) => `${d.city} — ${d.venue}`,
      searchable: true,
      render: (d) => (
        <span className="text-[#8C8C78]">
          {d.city} — {d.venue}
        </span>
      ),
    },
    {
      key: "event_date",
      header: "Date",
      accessor: (d) => new Date(d.event_date),
      sortable: true,
      render: (d) => <span className="text-[#8C8C78]">{new Date(d.event_date).toLocaleDateString()}</span>,
    },
    { key: "ticket_status", header: "Status", accessor: (d) => d.ticket_status, sortable: true, searchable: true },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <button onClick={() => setDeleteTarget(d)} className="text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#4A4A3C]">Tour dates</h3>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add tour date
        </Button>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add tour date" maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          <Input label="Venue" value={draft.venue} onChange={(e) => setDraft((d) => ({ ...d, venue: e.target.value }))} />
          <Input label="City" value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
          <Input
            label="Event date"
            type="datetime-local"
            value={draft.event_date}
            onChange={(e) => setDraft((d) => ({ ...d, event_date: e.target.value }))}
          />
          <Input
            label="Display time"
            value={draft.display_time ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, display_time: e.target.value }))}
          />
          <Input label="Price label" value={draft.price ?? ""} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} />
          <Input
            label="Price amount"
            type="number"
            value={draft.price_amount ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, price_amount: e.target.value ? Number(e.target.value) : undefined }))}
          />
          <Input label="Currency" value={draft.currency} onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))} />
          <Select
            label="Ticket status"
            value={draft.ticket_status}
            onChange={(e) => setDraft((d) => ({ ...d, ticket_status: e.target.value as TourDateInput["ticket_status"] }))}
          >
            <option value="on-sale">On sale</option>
            <option value="register-interest">Register interest</option>
            <option value="sold-out">Sold out</option>
          </Select>
          <Input
            label="Ticket link"
            value={draft.ticket_href ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, ticket_href: e.target.value }))}
          />
          <Input
            label="Sort order"
            type="number"
            value={draft.sort_order}
            onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
          />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleCreate}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {items.length === 0 && !adding ? (
        <EmptyState message="No tour dates yet." />
      ) : items.length > 0 ? (
        <DataTable
          columns={tourDateColumns}
          rows={items}
          rowKey={(d) => d.id}
          searchPlaceholder="Search tour dates..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tour date"
        message={`Delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
