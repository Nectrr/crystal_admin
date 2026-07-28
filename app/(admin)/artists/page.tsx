"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, Badge } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { listArtists, type Artist } from "@/lib/api/artists";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setArtists(await listArtists());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load artists.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: DataTableColumn<Artist>[] = [
    { key: "name", header: "Name", accessor: (a) => a.name, sortable: true, searchable: true, className: "font-medium" },
    {
      key: "location",
      header: "Location",
      accessor: (a) => a.location ?? "",
      sortable: true,
      searchable: true,
      render: (a) => <span className="text-[#8C8C78]">{a.location || "-"}</span>,
    },
    {
      key: "genres",
      header: "Genres",
      accessor: (a) => a.genres?.join(", ") ?? "",
      searchable: true,
      render: (a) => <span className="text-[#8C8C78]">{a.genres?.join(", ") || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => (a.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <Link href={`/artists/${a.id}`} className="text-[#B8952F] hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Artists"
        description="Manage artist profiles, tour dates and projects"
        actions={
          <Link href="/artists/new">
            <Button>
              <Plus className="h-4 w-4" /> New artist
            </Button>
          </Link>
        }
      />
      {!loading && artists.length === 0 ? (
        <EmptyState title="No artists yet" message="Add an artist profile to get started." />
      ) : (
        <DataTable
          columns={columns}
          rows={artists}
          rowKey={(a) => a.id}
          loading={loading}
          skeletonCols={5}
          searchPlaceholder="Search artists..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
}
