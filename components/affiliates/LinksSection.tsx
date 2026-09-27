"use client";

import { useEffect, useState } from "react";
import { Copy, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { formatMoney } from "@/lib/currency";
import { getShow, listShows, type Show, type TourStop } from "@/lib/api/shows";
import { createLink, deleteLink, updateLink, type AffiliateLink } from "@/lib/api/affiliates";

interface LinksSectionProps {
  affiliateId: string;
  links: AffiliateLink[];
  currency: string;
  onChange: (links: AffiliateLink[]) => void;
}

function scopeLabel(l: AffiliateLink): string {
  if (!l.show_id) return "Any show";
  const show = [l.artist_name, l.tour_name].filter(Boolean).join(" — ") || "Show";
  return l.city_name ? `${show} · ${l.city_name}` : `${show} · all cities`;
}

export function LinksSection({ affiliateId, links, currency, onChange }: LinksSectionProps) {
  const { showSuccess, showError } = useToast();
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<AffiliateLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AffiliateLink | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showSuccess("Link copied.");
    } catch {
      showError("Couldn't copy automatically — select and copy the link manually.");
    }
  }

  function replaceLink(updated: AffiliateLink) {
    onChange(links.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleToggle(link: AffiliateLink) {
    setTogglingId(link.id);
    try {
      const updated = await updateLink(affiliateId, link.id, { is_active: !link.is_active });
      replaceLink(updated);
      showSuccess(updated.is_active ? "Link is live again." : "Link switched off — it won't credit new sales.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to update link.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLink(affiliateId, deleteTarget.id);
      onChange(links.filter((l) => l.id !== deleteTarget.id));
      setDeleteTarget(null);
      showSuccess("Link deleted.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "LINK_HAS_SALES") {
        showError("This link already has sales, so it can't be deleted. Switch it off instead.");
        setDeleteTarget(null);
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to delete link.");
      }
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<AffiliateLink>[] = [
    {
      key: "scope",
      header: "Applies to",
      accessor: (l) => scopeLabel(l),
      sortable: true,
      searchable: true,
      render: (l) => (
        <div>
          <p className="font-medium text-[#4A4A3C]">{scopeLabel(l)}</p>
          <p className="max-w-[26rem] truncate text-xs text-[#8C8C78]" title={l.url}>
            {l.url}
          </p>
        </div>
      ),
    },
    {
      key: "code",
      header: "Code",
      accessor: (l) => l.code,
      searchable: true,
      render: (l) => <code className="rounded bg-[#F5E9CE]/50 px-1.5 py-0.5 text-xs">{l.code}</code>,
    },
    {
      key: "percent",
      header: "Commission",
      accessor: (l) => l.commission_percent,
      sortable: true,
      render: (l) => <>{l.commission_percent}%</>,
    },
    {
      key: "sales",
      header: "Sales",
      accessor: (l) => l.sales_pence,
      sortable: true,
      render: (l) => (
        <span>
          {formatMoney(l.sales_pence, currency)} <span className="text-[#8C8C78]">({l.paid_orders})</span>
        </span>
      ),
    },
    {
      key: "earned",
      header: "Earned",
      accessor: (l) => l.earned_pence,
      sortable: true,
      render: (l) => <>{formatMoney(l.earned_pence, currency)}</>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (l) => (l.is_active ? 1 : 0),
      render: (l) => (l.is_active ? <Badge color="green">Live</Badge> : <Badge color="gray">Off</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex items-center gap-3">
          <button onClick={() => copy(l.url)} className="text-[#8C8C78] hover:text-[#4A4A3C]" title="Copy link">
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggle(l)}
            disabled={togglingId === l.id}
            className={l.is_active ? "text-green-600 hover:text-green-700" : "text-[#8C8C78] hover:text-[#4A4A3C]"}
            title={l.is_active ? "Switch this link off" : "Switch this link on"}
          >
            <Power className="h-4 w-4" />
          </button>
          <button onClick={() => setEditing(l)} className="text-[#B8952F]" title="Change commission %">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(l)} className="text-red-500" title="Delete link">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#4A4A3C]">Referral links</h2>
        <Button onClick={() => setGenerating(true)}>
          <Plus className="h-4 w-4" /> Generate link
        </Button>
      </div>

      {links.length === 0 ? (
        <EmptyState
          title="No links yet"
          message="Generate a link for a show or city, set their commission, and send it to them."
        />
      ) : (
        <DataTable columns={columns} rows={links} rowKey={(l) => l.id} pageSize={10} pageSizeOptions={[10, 20, 50]} />
      )}

      <GenerateLinkModal
        open={generating}
        affiliateId={affiliateId}
        onClose={() => setGenerating(false)}
        onCreated={(link) => onChange([link, ...links])}
        onCopy={copy}
      />

      <EditPercentModal
        link={editing}
        affiliateId={affiliateId}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          replaceLink(updated);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete link"
        message={`Delete the link ${deleteTarget?.code}? Anyone using it will no longer be credited to this affiliate.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}

function GenerateLinkModal({
  open,
  affiliateId,
  onClose,
  onCreated,
  onCopy,
}: {
  open: boolean;
  affiliateId: string;
  onClose: () => void;
  onCreated: (link: AffiliateLink) => void;
  onCopy: (url: string) => void;
}) {
  const { showError } = useToast();
  const [shows, setShows] = useState<Show[] | null>(null);
  const [showId, setShowId] = useState("");
  const [stops, setStops] = useState<TourStop[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopId, setStopId] = useState("");
  const [percent, setPercent] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<AffiliateLink | null>(null);

  useEffect(() => {
    if (!open) return;
    setShowId("");
    setStops([]);
    setStopId("");
    setPercent("");
    setCode("");
    setCreated(null);
    if (shows === null) {
      (async () => {
        try {
          setShows(await listShows());
        } catch (err) {
          showError(err instanceof ApiError ? err.message : "Failed to load shows.");
          setShows([]);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleShowChange(id: string) {
    setShowId(id);
    setStopId("");
    setStops([]);
    if (!id) return;
    setLoadingStops(true);
    try {
      const show = await getShow(id);
      setStops((show.tour_stops ?? []).slice().sort((a, b) => a.sort_order - b.sort_order));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load this show's cities.");
    } finally {
      setLoadingStops(false);
    }
  }

  async function handleCreate() {
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      showError("Enter a commission between 0 and 100%.");
      return;
    }
    setSaving(true);
    try {
      const link = await createLink(affiliateId, {
        show_id: showId || undefined,
        tour_stop_id: stopId || undefined,
        commission_percent: pct,
        code: code.trim() || undefined,
      });
      onCreated(link);
      setCreated(link);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CODE_TAKEN") {
        showError("That code is already used by another link — pick a different one.");
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to generate link.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate referral link" maxWidth="max-w-lg">
      {created ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[#4A4A3C]">
            Link ready — <strong>{created.commission_percent}%</strong> commission on {scopeLabel(created).toLowerCase()}.
          </p>
          <div className="rounded-lg border border-[#EDEAE0] bg-[#FAF8F2] p-3 text-sm break-all">{created.url}</div>
          {!created.show_id && (
            <p className="text-xs text-[#8C8C78]">
              This link works on any show: add <code>?ref={created.code}</code> (or <code>&amp;ref={created.code}</code>)
              to any crystalcity.uk page address.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Done
            </Button>
            <Button type="button" onClick={() => onCopy(created.url)}>
              <Copy className="h-4 w-4" /> Copy link
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Select
            id="link-show"
            label="Show"
            value={showId}
            onChange={(e) => handleShowChange(e.target.value)}
            disabled={shows === null}
          >
            <option value="">Any show</option>
            {(shows ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.artist_name} — {s.tour_name}
              </option>
            ))}
          </Select>
          <Select
            id="link-stop"
            label="City"
            value={stopId}
            onChange={(e) => setStopId(e.target.value)}
            disabled={!showId || loadingStops}
            hint={showId ? "Only sales for this city will count." : "Pick a show to limit the link to one city."}
          >
            <option value="">{showId ? "All cities" : "—"}</option>
            {stops.map((st) => (
              <option key={st.id} value={st.id}>
                {st.city_name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="link-percent"
              label="Commission (%)"
              type="number"
              min={0.01}
              max={100}
              step="0.01"
              placeholder="10"
              hint="Of the ticket price, not the fee."
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
            <Input
              id="link-code"
              label="Custom code (optional)"
              placeholder="Auto-generated"
              hint="3–32 letters, numbers, - or _"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleCreate}>
              Generate link
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function EditPercentModal({
  link,
  affiliateId,
  onClose,
  onSaved,
}: {
  link: AffiliateLink | null;
  affiliateId: string;
  onClose: () => void;
  onSaved: (link: AffiliateLink) => void;
}) {
  const { showSuccess, showError } = useToast();
  const [percent, setPercent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (link) setPercent(String(link.commission_percent));
  }, [link]);

  async function handleSave() {
    if (!link) return;
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      showError("Enter a commission between 0 and 100%.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateLink(affiliateId, link.id, { commission_percent: pct });
      showSuccess("Commission updated for new sales.");
      onSaved(updated);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to update commission.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!link} onClose={onClose} title={`Commission — ${link?.code ?? ""}`} maxWidth="max-w-sm">
      <div className="flex flex-col gap-3">
        <Input
          id="edit-percent"
          label="Commission (%)"
          type="number"
          min={0.01}
          max={100}
          step="0.01"
          hint="Only applies to orders placed after this change — past sales keep the rate they were bought at."
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={saving} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
