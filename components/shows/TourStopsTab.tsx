"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Users, Tag, Power, Megaphone } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { StopAttendeesModal } from "@/components/shows/StopAttendeesModal";
import { TierManagerModal } from "@/components/shows/TierManagerModal";
import { TicketSummaryPanel } from "@/components/shows/TicketSummaryPanel";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  createTourStop,
  updateTourStop,
  deleteTourStop,
  getShowOrders,
  type TourStop,
  type HeroImageInput,
} from "@/lib/api/shows";
import { notifyStopOnSale, type Order } from "@/lib/api/orders";
import { HeroImageField } from "@/components/ui/HeroImageField";

interface TourStopsTabProps {
  showId: string;
  stops: TourStop[];
  onChange: (stops: TourStop[]) => void;
}

type Draft = {
  city_name: string;
  venue_name: string;
  venue_address: string;
  event_start_at: string;
  capacity: string;
  fee_pence: string;
  sales_start_at: string;
  sales_end_at: string;
  sort_order: string;
};

const emptyDraft: Draft = {
  city_name: "",
  venue_name: "",
  venue_address: "",
  event_start_at: "",
  capacity: "",
  fee_pence: "",
  sales_start_at: "",
  sales_end_at: "",
  sort_order: "0",
};

// A stop with no date set is never "past" — there's nothing to compare
// against, so it's treated as still manageable. Mirrors the backend's
// TOUR_STOP_DATE_PASSED guard in UpdateTourStop.
function isStopPast(stop: TourStop): boolean {
  return !!stop.event_start_at && new Date(stop.event_start_at) < new Date();
}

export function TourStopsTab({ showId, stops, onChange }: TourStopsTabProps) {
  const { showSuccess, showError } = useToast();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TourStop | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [attendeesStop, setAttendeesStop] = useState<TourStop | null>(null);
  const [tiersStop, setTiersStop] = useState<TourStop | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<TourStop | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setOrders(await getShowOrders(showId));
      } catch {
        // read-only section, ignore failures silently besides console
      }
    })();
  }, [showId]);

  async function handleNotify() {
    if (!notifyTarget) return;
    setNotifying(true);
    try {
      // force=true — this button always resends to every registrant, even
      // ones already notified, since admins use it to re-announce a stop on
      // demand rather than only reaching people missed the first time.
      const { sent: queued } = await notifyStopOnSale(showId, notifyTarget.id, true);
      showSuccess(
        `Queued ${queued} announcement email${queued === 1 ? "" : "s"} for ${notifyTarget.city_name} — they'll go out automatically over the next few minutes (and resume on their own if a daily send limit is hit).`
      );
      setNotifyTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to send notification.");
    } finally {
      setNotifying(false);
    }
  }

  async function handleToggleOnSale(stop: TourStop) {
    setTogglingId(stop.id);
    try {
      const updated = await updateTourStop(showId, stop.id, { is_on_sale: !stop.is_on_sale }, undefined, false);
      onChange(stops.map((s) => (s.id === stop.id ? updated : s)));
      showSuccess(updated.is_on_sale ? `${stop.city_name} is now on sale.` : `${stop.city_name} is no longer on sale.`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to update sale status.");
    } finally {
      setTogglingId(null);
    }
  }

  function toPayload(d: Draft) {
    return {
      city_name: d.city_name,
      venue_name: d.venue_name || undefined,
      venue_address: d.venue_address || undefined,
      event_start_at: d.event_start_at ? new Date(d.event_start_at).toISOString() : undefined,
      capacity: d.capacity ? Number(d.capacity) : undefined,
      fee_pence: d.fee_pence ? Math.round(parseFloat(d.fee_pence) * 100) : undefined,
      sales_start_at: d.sales_start_at ? new Date(d.sales_start_at).toISOString() : undefined,
      sales_end_at: d.sales_end_at ? new Date(d.sales_end_at).toISOString() : undefined,
      sort_order: Number(d.sort_order || 0),
    };
  }

  async function handleCreate(d: Draft, coverImage: HeroImageInput | undefined) {
    setSaving(true);
    try {
      const useMultipart = coverImage?.mode === "file";
      const created = await createTourStop(showId, toPayload(d), coverImage, useMultipart);
      onChange([...stops, created]);
      setAdding(false);
      setDraft(emptyDraft);
      showSuccess("Tour stop added.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to add tour stop.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(stop: TourStop, d: Draft, coverImage: HeroImageInput | undefined) {
    setSaving(true);
    try {
      const useMultipart = coverImage?.mode === "file";
      const updated = await updateTourStop(showId, stop.id, toPayload(d), coverImage, useMultipart);
      onChange(stops.map((s) => (s.id === stop.id ? updated : s)));
      setEditingId(null);
      showSuccess("Tour stop updated.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to update tour stop.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTourStop(showId, deleteTarget.id);
      onChange(stops.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      showSuccess("Tour stop deleted.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === "TOUR_STOP_HAS_ORDERS") {
        setDeleteError("This tour stop can't be deleted because tickets have already been sold for it.");
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to delete tour stop.");
      }
    } finally {
      setDeleting(false);
    }
  }

  const editingStop = stops.find((s) => s.id === editingId) ?? null;

  const stopColumns: DataTableColumn<TourStop>[] = [
    { key: "city_name", header: "City", accessor: (s) => s.city_name, sortable: true, searchable: true, className: "font-medium" },
    {
      key: "venue_name",
      header: "Venue",
      accessor: (s) => s.venue_name ?? "",
      sortable: true,
      searchable: true,
      render: (s) => <>{s.venue_name || "-"}</>,
    },
    {
      key: "event_start_at",
      header: "Date",
      accessor: (s) => (s.event_start_at ? new Date(s.event_start_at) : null),
      sortable: true,
      render: (s) => (
        <span className="text-[#8C8C78]">{s.event_start_at ? new Date(s.event_start_at).toLocaleString() : "-"}</span>
      ),
    },
    { key: "capacity", header: "Capacity", accessor: (s) => s.capacity ?? 0, sortable: true, render: (s) => <>{s.capacity ?? "-"}</> },
    {
      key: "is_on_sale",
      header: "Sale Status",
      accessor: (s) => (s.is_on_sale ? 1 : 0),
      sortable: true,
      render: (s) => <Badge color={s.is_on_sale ? "green" : "gray"}>{s.is_on_sale ? "On sale" : "Not on sale"}</Badge>,
    },
    { key: "sort_order", header: "Order", accessor: (s) => s.sort_order, sortable: true },
    {
      key: "actions",
      header: "",
      render: (stop) => {
        const past = isStopPast(stop);
        return (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggleOnSale(stop)}
            disabled={togglingId === stop.id || (past && !stop.is_on_sale)}
            className={`${stop.is_on_sale ? "text-green-600 hover:text-green-700" : "text-[#8C8C78] hover:text-[#4A4A3C]"} disabled:opacity-30 disabled:hover:text-[#8C8C78]`}
            title={past && !stop.is_on_sale ? "This event has already happened — can't be put on sale" : stop.is_on_sale ? "Turn ticket sales off" : "Turn ticket sales on"}
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAttendeesStop(stop)}
            disabled={past}
            className="text-[#8C8C78] hover:text-[#4A4A3C] disabled:opacity-30 disabled:hover:text-[#8C8C78]"
            title={past ? "Event has passed" : "View attendees"}
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTiersStop(stop)}
            disabled={past}
            className="text-[#8C8C78] hover:text-[#4A4A3C] disabled:opacity-30 disabled:hover:text-[#8C8C78]"
            title={past ? "Event has passed" : "Manage pricing tiers"}
          >
            <Tag className="h-4 w-4" />
          </button>
          <button
            onClick={() => setNotifyTarget(stop)}
            disabled={past || !stop.is_on_sale}
            className="text-[#8C8C78] hover:text-[#4A4A3C] disabled:opacity-30 disabled:hover:text-[#8C8C78]"
            title={past ? "Event has passed" : stop.is_on_sale ? "Resend \"tickets on sale\" email to all registrants" : "Turn sales on before notifying"}
          >
            <Megaphone className="h-4 w-4" />
          </button>
          <button onClick={() => setEditingId(stop.id)} className="text-[#B8952F]">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(stop)} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        );
      },
    },
  ];

  const orderColumns: DataTableColumn<Order>[] = [
    { key: "full_name", header: "Name", accessor: (o) => o.full_name, sortable: true, searchable: true },
    {
      key: "email",
      header: "Email",
      accessor: (o) => o.email,
      sortable: true,
      searchable: true,
      render: (o) => <span className="text-[#8C8C78]">{o.email}</span>,
    },
    { key: "quantity", header: "Qty", accessor: (o) => o.quantity, sortable: true },
    {
      key: "total_pence",
      header: "Total",
      accessor: (o) => o.total_pence,
      sortable: true,
      render: (o) => (
        <span>
          {(o.total_pence / 100).toFixed(2)} {o.currency}
        </span>
      ),
    },
    { key: "status", header: "Status", accessor: (o) => o.status, sortable: true, searchable: true },
    {
      key: "created_at",
      header: "Created",
      accessor: (o) => new Date(o.created_at),
      sortable: true,
      render: (o) => <span className="text-[#8C8C78]">{new Date(o.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <TicketSummaryPanel showId={showId} />

      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add tour stop
        </Button>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add tour stop" maxWidth="max-w-2xl">
        <StopEditor draft={draft} onCancel={() => setAdding(false)} onSave={handleCreate} saving={saving} />
      </Modal>

      <Modal open={!!editingStop} onClose={() => setEditingId(null)} title="Edit tour stop" maxWidth="max-w-2xl">
        {editingStop && (
          <StopEditor
            draft={{
              city_name: editingStop.city_name,
              venue_name: editingStop.venue_name ?? "",
              venue_address: editingStop.venue_address ?? "",
              event_start_at: editingStop.event_start_at ? editingStop.event_start_at.slice(0, 16) : "",
              capacity: editingStop.capacity?.toString() ?? "",
              fee_pence: editingStop.fee_pence != null ? (editingStop.fee_pence / 100).toFixed(2) : "",
              sales_start_at: editingStop.sales_start_at ? editingStop.sales_start_at.slice(0, 16) : "",
              sales_end_at: editingStop.sales_end_at ? editingStop.sales_end_at.slice(0, 16) : "",
              sort_order: editingStop.sort_order.toString(),
            }}
            currentCoverImage={editingStop.cover_image}
            onCancel={() => setEditingId(null)}
            onSave={(d, coverImage) => handleUpdate(editingStop, d, coverImage)}
            saving={saving}
          />
        )}
      </Modal>

      {stops.length === 0 && !adding ? (
        <EmptyState message="No tour stops yet." />
      ) : (
        <DataTable
          columns={stopColumns}
          rows={stops.slice().sort((a, b) => a.sort_order - b.sort_order)}
          rowKey={(stop) => stop.id}
          searchPlaceholder="Search tour stops..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-2">Orders for this show</h3>
        <DataTable
          columns={orderColumns}
          rows={orders}
          rowKey={(o) => o.id}
          emptyMessage="No orders yet."
          searchPlaceholder="Search orders..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tour stop"
        message={deleteError ?? `Delete ${deleteTarget?.city_name}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />

      <StopAttendeesModal
        showId={showId}
        stopId={attendeesStop?.id ?? null}
        stopLabel={attendeesStop?.city_name}
        onClose={() => setAttendeesStop(null)}
      />

      <TierManagerModal
        showId={showId}
        stopId={tiersStop?.id ?? null}
        stopLabel={tiersStop?.city_name}
        onClose={() => setTiersStop(null)}
      />

      <ConfirmDialog
        open={!!notifyTarget}
        title="Notify registrants"
        message={`Resend the "tickets are on sale" email to everyone who registered interest for ${notifyTarget?.city_name} — including anyone already notified before?`}
        confirmLabel="Resend to everyone"
        loading={notifying}
        onConfirm={handleNotify}
        onCancel={() => setNotifyTarget(null)}
      />
    </div>
  );
}

function StopEditor({
  draft,
  currentCoverImage,
  onCancel,
  onSave,
  saving,
}: {
  draft: Draft;
  currentCoverImage?: string | null;
  onCancel: () => void;
  onSave: (draft: Draft, coverImage: HeroImageInput | undefined) => void;
  saving: boolean;
}) {
  const [local, setLocal] = useState(draft);
  const [coverImage, setCoverImage] = useState<HeroImageInput | undefined>(undefined);
  return (
    <div className="rounded-lg border border-[#EDEAE0] p-4 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="City"
          required
          value={local.city_name}
          onChange={(e) => setLocal((d) => ({ ...d, city_name: e.target.value }))}
        />
        <Input
          label="Venue name"
          value={local.venue_name}
          onChange={(e) => setLocal((d) => ({ ...d, venue_name: e.target.value }))}
        />
        <Input
          label="Venue address"
          value={local.venue_address}
          onChange={(e) => setLocal((d) => ({ ...d, venue_address: e.target.value }))}
        />
        <Input
          label="Event start"
          type="datetime-local"
          value={local.event_start_at}
          onChange={(e) => setLocal((d) => ({ ...d, event_start_at: e.target.value }))}
        />
        <Input
          label="Capacity"
          type="number"
          value={local.capacity}
          onChange={(e) => setLocal((d) => ({ ...d, capacity: e.target.value }))}
        />
        <Input
          label="Transaction fee (£)"
          type="number"
          step="0.01"
          min={0}
          placeholder="Uses show's default fee"
          value={local.fee_pence}
          onChange={(e) => setLocal((d) => ({ ...d, fee_pence: e.target.value }))}
        />
        <Input
          label="Sales start"
          type="datetime-local"
          value={local.sales_start_at}
          onChange={(e) => setLocal((d) => ({ ...d, sales_start_at: e.target.value }))}
        />
        <Input
          label="Sales end"
          type="datetime-local"
          value={local.sales_end_at}
          onChange={(e) => setLocal((d) => ({ ...d, sales_end_at: e.target.value }))}
        />
        <Input
          label="Sort order"
          type="number"
          value={local.sort_order}
          onChange={(e) => setLocal((d) => ({ ...d, sort_order: e.target.value }))}
        />
      </div>
      <HeroImageField
        label="Cover image (optional)"
        currentUrl={currentCoverImage}
        value={coverImage}
        onChange={setCoverImage}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" loading={saving} onClick={() => onSave(local, coverImage)}>
          Save
        </Button>
      </div>
    </div>
  );
}
