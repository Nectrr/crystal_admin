"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { createTourDate, updateTourDate, deleteTourDate, type TourDate, type TourDateInput } from "@/lib/api/artists";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/datetime";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TourDate | null>(null);
  const [draft, setDraft] = useState<TourDateInput>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TourDate | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  }

  function openEdit(date: TourDate) {
    setEditing(date);
    setDraft({
      title: date.title,
      venue: date.venue,
      city: date.city,
      event_date: date.event_date ? toDatetimeLocalValue(date.event_date) : "",
      display_time: date.display_time ?? "",
      price: date.price ?? "",
      price_amount: date.price_amount ?? undefined,
      currency: date.currency,
      image_url: date.image_url ?? "",
      ticket_status: date.ticket_status,
      ticket_href: date.ticket_href ?? "",
      sort_order: date.sort_order,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...draft,
        event_date: draft.event_date ? fromDatetimeLocalValue(draft.event_date) : draft.event_date,
      };
      if (editing) {
        const updated = await updateTourDate(artistId, editing.id, payload);
        setItems((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        showSuccess("Tour date updated.");
      } else {
        const created = await createTourDate(artistId, payload);
        setItems((prev) => [...prev, created]);
        showSuccess("Tour date added.");
      }
      setModalOpen(false);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save tour date.");
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
    {
      key: "image_url",
      header: "Image",
      render: (d) =>
        d.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image_url} alt={d.title} className="h-10 w-10 rounded object-cover border border-[#EDEAE0]" />
        ) : (
          <span className="text-[#8C8C78] text-xs">-</span>
        ),
    },
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
        <div className="flex gap-3">
          <button onClick={() => openEdit(d)} className="text-[#B8952F]">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(d)} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#4A4A3C]">Tour dates</h3>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add tour date
        </Button>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit tour date" : "Add tour date"} maxWidth="max-w-2xl">
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
          <div className="sm:col-span-2">
            <MediaUploadField label="Image" value={draft.image_url} onChange={(url) => setDraft((d) => ({ ...d, image_url: url }))} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
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
        <EmptyState message="No tour dates yet." />
      ) : (
        <DataTable
          columns={tourDateColumns}
          rows={items}
          rowKey={(d) => d.id}
          searchPlaceholder="Search tour dates..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

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
