"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, Badge } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { listShows, type Show } from "@/lib/api/shows";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";

function StatusBadge({ s }: { s: Show }) {
  if (s.deleted_at) return <Badge color="red">Deleted</Badge>;
  return (
    <div className="flex items-center gap-1.5">
      {s.is_active ? <Badge color="green">Published</Badge> : <Badge color="gray">Draft</Badge>}
      {s.is_past && <Badge color="gray">Past</Badge>}
    </div>
  );
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setShows(await listShows());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load shows.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: DataTableColumn<Show>[] = [
    {
      key: "artist_name",
      header: "Artist",
      accessor: (s) => s.artist_name,
      sortable: true,
      searchable: true,
      className: "font-medium",
    },
    {
      key: "tour_name",
      header: "Tour",
      accessor: (s) => s.tour_name,
      sortable: true,
      searchable: true,
    },
    {
      key: "slug",
      header: "Slug",
      accessor: (s) => s.slug,
      searchable: true,
      className: "text-[#8C8C78]",
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge s={s} />,
    },
    {
      key: "updated_at",
      header: "Updated",
      accessor: (s) => new Date(s.updated_at),
      sortable: true,
      render: (s) => <span className="text-[#8C8C78]">{new Date(s.updated_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <Link href={`/shows/${s.id}`} className="text-[#B8952F] hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Shows"
        description="Manage tours, hero content, ticketing and registrations"
        actions={
          <Link href="/shows/new">
            <Button>
              <Plus className="h-4 w-4" /> New show
            </Button>
          </Link>
        }
      />
      {!loading && shows.length === 0 ? (
        <EmptyState title="No shows yet" message="Create your first show to start selling tickets." />
      ) : (
        <DataTable
          columns={columns}
          rows={shows}
          rowKey={(s) => s.id}
          loading={loading}
          skeletonCols={5}
          searchPlaceholder="Search shows..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
          renderMobileCard={(s) => (
            <Link
              key={s.id}
              href={`/shows/${s.id}`}
              className="rounded-lg border border-[#EDEAE0] bg-white p-4 flex items-center justify-between gap-3 shadow-sm hover:border-[#B8952F]/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#4A4A3C] truncate">{s.artist_name}</p>
                <p className="text-xs text-[#8C8C78] truncate">{s.tour_name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge s={s} />
                  <span className="text-xs text-[#8C8C78]">{new Date(s.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8C8C78] shrink-0" />
            </Link>
          )}
        />
      )}
    </div>
  );
}
