"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PrivateLinkFormModal } from "@/components/private-links/PrivateLinkFormModal";
import { PrivateLinkStatusBadge, copyLink } from "@/components/private-links/shared";
import { listPrivateLinks, privateLinkStatus, type PrivateLink } from "@/lib/api/privateLinks";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/currency";
import { useToast } from "@/app/providers/ToastProvider";

export default function PrivateLinksPage() {
  const [links, setLinks] = useState<PrivateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<PrivateLink | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setLinks(await listPrivateLinks());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load private links.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns: DataTableColumn<PrivateLink>[] = [
    {
      key: "label",
      header: "Label",
      accessor: (l) => l.label,
      sortable: true,
      searchable: true,
      render: (l) => (
        <Link href={`/private-links/${l.id}`} className="font-medium text-[#4A4A3C] hover:text-[#B8952F]">
          {l.label}
        </Link>
      ),
    },
    {
      key: "event",
      header: "Event",
      accessor: (l) => `${l.artist_name} ${l.city_name}`,
      searchable: true,
      render: (l) => (
        <div>
          <p>
            {l.artist_name} — {l.city_name}
          </p>
          {l.event_start_at && (
            <p className="text-xs text-[#8C8C78]">{format(new Date(l.event_start_at), "d MMM yyyy")}</p>
          )}
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      accessor: (l) => l.tier_name,
      searchable: true,
      render: (l) => (
        <div>
          <p>{l.tier_name}</p>
          <p className="text-xs text-[#8C8C78]">{formatMoney(l.price_pence, l.currency)}</p>
        </div>
      ),
    },
    {
      key: "available",
      header: "Tickets enabled",
      accessor: (l) => l.quantity,
      sortable: true,
      render: (l) => <span className="font-medium">{l.quantity}</span>,
    },
    {
      key: "sold",
      header: "Sold",
      accessor: (l) => l.tickets_sold,
      sortable: true,
      render: (l) => <span>{l.tickets_sold}</span>,
    },
    {
      key: "left",
      header: "Left",
      accessor: (l) => Math.max(0, l.quantity - l.tickets_sold),
      sortable: true,
      render: (l) => {
        const left = Math.max(0, l.quantity - l.tickets_sold);
        return left === 0 ? (
          <span className="font-medium text-red-600">Sold out</span>
        ) : (
          <span className="font-medium text-green-700">{left}</span>
        );
      },
    },
    {
      key: "expires",
      header: "Expires",
      accessor: (l) => (l.expires_at ? new Date(l.expires_at) : null),
      sortable: true,
      render: (l) =>
        l.expires_at ? format(new Date(l.expires_at), "d MMM yyyy") : <span className="text-[#8C8C78]">Never</span>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (l) => privateLinkStatus(l),
      sortable: true,
      render: (l) => <PrivateLinkStatusBadge link={l} />,
    },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex items-center justify-end gap-3">
          {privateLinkStatus(l) !== "revoked" && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[#B8952F] hover:underline"
              onClick={() => copyLink(l.url, showSuccess, showError)}
            >
              <Copy className="h-3.5 w-3.5" /> Copy link
            </button>
          )}
          <Link href={`/private-links/${l.id}`} className="text-[#B8952F] hover:underline">
            View
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Private Links"
        description="Hidden ticket tiers for an event (e.g. a private Early Bird) that only people with the link can buy"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New private link
          </Button>
        }
      />

      {!loading && links.length === 0 ? (
        <EmptyState
          title="No private links yet"
          message="Create one for an event, then send the link to the people it's for."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={links}
          rowKey={(l) => l.id}
          loading={loading}
          skeletonCols={7}
          searchPlaceholder="Search private links..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      <PrivateLinkFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(link) => {
          setLinks((prev) => [link, ...prev]);
          setCreated(link);
        }}
      />

      <Modal open={!!created} onClose={() => setCreated(null)} title="Private link created" maxWidth="max-w-lg">
        {created && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#4A4A3C]">
              <strong>{created.tier_name}</strong> ({formatMoney(created.price_pence, created.currency)}) is now available
              privately for {created.artist_name} — {created.city_name}. Send this link to the people it&apos;s for:
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-[#EDEAE0] bg-[#FAFAF7] px-3 py-2">
              <code className="flex-1 truncate text-xs text-[#4A4A3C]">{created.url}</code>
              <Button variant="secondary" onClick={() => copyLink(created.url, showSuccess, showError)}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCreated(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
