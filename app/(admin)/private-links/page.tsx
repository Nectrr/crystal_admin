"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Copy, Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PrivateLinkFormModal } from "@/components/private-links/PrivateLinkFormModal";
import { PrivateLinkStatusBadge, copyLink } from "@/components/private-links/shared";
import { listPrivateLinks, privateLinkStatus, type ApplyResult, type PrivateLink } from "@/lib/api/privateLinks";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";

export default function PrivateLinksPage() {
  const [links, setLinks] = useState<PrivateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ApplyResult | null>(null);
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
    { key: "tier", header: "Tier", accessor: (l) => l.tier_name, searchable: true },
    {
      key: "sold",
      header: "Sold",
      accessor: (l) => l.tickets_used,
      sortable: true,
      render: (l) => (
        <span>
          {l.tickets_used} <span className="text-[#8C8C78]">/ {l.max_tickets ?? "∞"}</span>
        </span>
      ),
    },
    { key: "events", header: "Events", accessor: (l) => l.stop_count, sortable: true },
    {
      key: "expires",
      header: "Expires",
      accessor: (l) => (l.expires_at ? new Date(l.expires_at) : null),
      sortable: true,
      render: (l) => (l.expires_at ? format(new Date(l.expires_at), "d MMM yyyy") : <span className="text-[#8C8C78]">Never</span>),
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
        description="Hidden ticket tiers (e.g. a private Early Bird) that only people with the link can buy"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New private link
          </Button>
        }
      />

      {!loading && links.length === 0 ? (
        <EmptyState
          title="No private links yet"
          message="Create one to add a hidden tier to every upcoming event, then send the link to the people it's for."
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
        onCreated={(result) => {
          setLinks((prev) => [result.link, ...prev]);
          setCreated(result);
        }}
      />

      <Modal open={!!created} onClose={() => setCreated(null)} title="Private link created" maxWidth="max-w-lg">
        {created && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#4A4A3C]">
              Hidden tier added to <strong>{created.tiers_created}</strong> event{created.tiers_created === 1 ? "" : "s"}.
              Send this link to the people it&apos;s for:
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-[#EDEAE0] bg-[#FAFAF7] px-3 py-2">
              <code className="flex-1 truncate text-xs text-[#4A4A3C]">{created.link.url}</code>
              <Button variant="secondary" onClick={() => copyLink(created.link.url, showSuccess, showError)}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            {created.skipped_stops.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-4 w-4" /> {created.skipped_stops.length} event(s) skipped — no price for
                  their currency:
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {created.skipped_stops.map((s) => (
                    <li key={s.tour_stop_id}>
                      {s.artist_name} — {s.city_name} ({s.currency.toUpperCase()})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setCreated(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
