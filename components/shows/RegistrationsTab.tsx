"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  getShowRegistrations,
  deleteShowRegistration,
  type ShowRegistrationsResponse,
  type ShowRegistration,
} from "@/lib/api/shows";

export function RegistrationsTab({ showId }: { showId: string }) {
  const { showSuccess, showError } = useToast();
  const [data, setData] = useState<ShowRegistrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setData(await getShowRegistrations(showId));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteShowRegistration(showId, deleteId);
      setData((d) => (d ? { ...d, registrations: d.registrations.filter((r) => r.id !== deleteId) } : d));
      showSuccess("Registration removed.");
      setDeleteId(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete registration.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return null;
  if (!data) return <EmptyState message="Unable to load registrations." />;

  const maxCount = Math.max(1, ...data.city_breakdown.map((c) => c.count));

  const registrationColumns: DataTableColumn<ShowRegistration>[] = [
    { key: "full_name", header: "Name", accessor: (r) => r.full_name, sortable: true, searchable: true },
    {
      key: "email",
      header: "Email",
      accessor: (r) => r.email,
      sortable: true,
      searchable: true,
      render: (r) => <span className="text-[#8C8C78]">{r.email}</span>,
    },
    {
      key: "city_name",
      header: "City",
      accessor: (r) => r.city_name || "Unspecified",
      sortable: true,
      searchable: true,
    },
    {
      key: "created_at",
      header: "Registered",
      accessor: (r) => new Date(r.created_at),
      sortable: true,
      render: (r) => <span className="text-[#8C8C78]">{new Date(r.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button onClick={() => setDeleteId(r.id)} className="text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-3">By city</h3>
        {data.city_breakdown.length === 0 ? (
          <EmptyState message="No registrations yet." />
        ) : (
          <div className="flex flex-col gap-2 max-w-xl">
            {data.city_breakdown.map((c) => (
              <div key={c.tour_stop_id || c.city_slug || c.city_name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-[#4A4A3C] truncate">{c.city_name || "Unspecified"}</span>
                <div className="flex-1 h-3 rounded-full bg-[#F5E9CE]/60 overflow-hidden">
                  <div
                    className="h-full bg-[#B8952F] rounded-full"
                    style={{ width: `${(c.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm text-[#8C8C78]">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-2">Registrations</h3>
        <DataTable
          columns={registrationColumns}
          rows={data.registrations}
          rowKey={(r) => r.id}
          emptyMessage="No registrations yet."
          searchPlaceholder="Search registrations..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Remove registration"
        message="This will permanently remove this registration."
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
