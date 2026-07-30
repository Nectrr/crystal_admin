"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { StopAttendeesModal } from "@/components/shows/StopAttendeesModal";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { createTourStop, updateTourStop, deleteTourStop, type TourStop } from "@/lib/api/shows";

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
  sort_order: string;
};

const emptyDraft: Draft = { city_name: "", venue_name: "", venue_address: "", event_start_at: "", capacity: "", sort_order: "0" };

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

  function toPayload(d: Draft) {
    return {
      city_name: d.city_name,
      venue_name: d.venue_name || undefined,
      venue_address: d.venue_address || undefined,
      event_start_at: d.event_start_at ? new Date(d.event_start_at).toISOString() : undefined,
      capacity: d.capacity ? Number(d.capacity) : undefined,
      sort_order: Number(d.sort_order || 0),
    };
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const created = await createTourStop(showId, toPayload(draft));
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

  async function handleUpdate(stop: TourStop, d: Draft) {
    setSaving(true);
    try {
      const updated = await updateTourStop(showId, stop.id, toPayload(d));
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
    { key: "sort_order", header: "Order", accessor: (s) => s.sort_order, sortable: true },
    {
      key: "actions",
      header: "",
      render: (stop) => (
        <div className="flex gap-3">
          <button onClick={() => setAttendeesStop(stop)} className="text-[#8C8C78] hover:text-[#4A4A3C]" title="View attendees">
            <Users className="h-4 w-4" />
          </button>
          <button onClick={() => setEditingId(stop.id)} className="text-[#B8952F]">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(stop)} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add tour stop
        </Button>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add tour stop" maxWidth="max-w-2xl">
        <StopEditor draft={draft} setDraft={setDraft} onCancel={() => setAdding(false)} onSave={handleCreate} saving={saving} />
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
              sort_order: editingStop.sort_order.toString(),
            }}
            setDraft={(d) => handleUpdate(editingStop, typeof d === "function" ? d(draft) : d)}
            onCancel={() => setEditingId(null)}
            onSave={() => {}}
            saving={saving}
            inline
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
    </div>
  );
}

function StopEditor({
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
          label="Sort order"
          type="number"
          value={local.sort_order}
          onChange={(e) => setLocal((d) => ({ ...d, sort_order: e.target.value }))}
        />
      </div>
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
