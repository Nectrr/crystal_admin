"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TH, TR, TD, EmptyState } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PrivateLinkStatusBadge, copyLink } from "@/components/private-links/shared";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { formatMoney } from "@/lib/currency";
import {
  getPrivateLink,
  listPrivateLinkEvents,
  regeneratePrivateLink,
  revokePrivateLink,
  syncPrivateLink,
  updatePrivateLink,
  type PrivateLink,
  type PrivateLinkEvent,
} from "@/lib/api/privateLinks";

// datetime-local wants "yyyy-MM-ddTHH:mm" in local time.
function toLocalInput(iso?: string | null) {
  return iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "";
}

export default function PrivateLinkDetailPage() {
  const params = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();
  const [link, setLink] = useState<PrivateLink | null>(null);
  const [events, setEvents] = useState<PrivateLinkEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState("");
  const [maxTickets, setMaxTickets] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirm, setConfirm] = useState<"regenerate" | "revoke" | null>(null);
  const [confirming, setConfirming] = useState(false);

  function applyLink(l: PrivateLink) {
    setLink(l);
    setLabel(l.label);
    setMaxTickets(l.max_tickets ? String(l.max_tickets) : "");
    setExpiresAt(toLocalInput(l.expires_at));
  }

  const load = useCallback(async () => {
    try {
      const [l, evs] = await Promise.all([getPrivateLink(params.id), listPrivateLinkEvents(params.id)]);
      applyLink(l);
      setEvents(evs);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load private link.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!link || !label.trim()) {
      showError("Enter a label.");
      return;
    }
    const max = maxTickets ? parseInt(maxTickets, 10) : undefined;
    setSaving(true);
    try {
      applyLink(
        await updatePrivateLink(link.id, {
          label: label.trim(),
          max_tickets: max && max > 0 ? max : undefined,
          clear_max_tickets: !maxTickets,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          clear_expires_at: !expiresAt,
        })
      );
      showSuccess("Private link updated.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to update private link.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    if (!link) return;
    setSyncing(true);
    try {
      const res = await syncPrivateLink(link.id);
      applyLink(res.link);
      setEvents(await listPrivateLinkEvents(link.id));
      const skipped = res.skipped_stops.length;
      showSuccess(
        `Added to ${res.tiers_created} new event${res.tiers_created === 1 ? "" : "s"}` +
          (skipped ? ` — ${skipped} skipped (no price for their currency).` : ".")
      );
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to apply to new events.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleConfirm() {
    if (!link || !confirm) return;
    setConfirming(true);
    try {
      if (confirm === "regenerate") {
        applyLink(await regeneratePrivateLink(link.id));
        showSuccess("New link generated — the old one no longer works.");
      } else {
        applyLink(await revokePrivateLink(link.id));
        showSuccess("Private link revoked.");
      }
      setConfirm(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
      </div>
    );
  }
  if (!link) {
    return <EmptyState title="Private link not found" message="It may have been removed." />;
  }

  const revoked = !!link.revoked_at;
  const pct = link.max_tickets ? Math.min(100, Math.round((link.tickets_used / link.max_tickets) * 100)) : null;

  return (
    <div>
      <Link href="/private-links" className="mb-4 inline-flex items-center gap-1 text-sm text-[#8C8C78] hover:text-[#B8952F]">
        <ArrowLeft className="h-4 w-4" /> Private links
      </Link>
      <PageHeader
        title={link.label}
        description={`${link.tier_name} · ${link.quantity_per_stop} per event · ${Object.entries(link.prices)
          .map(([c, p]) => formatMoney(p, c))
          .join(" / ")}`}
        actions={<PrivateLinkStatusBadge link={link} />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-[#EDEAE0] bg-white p-4">
          <p className="mb-2 text-sm font-medium text-[#4A4A3C]">Share link</p>
          {revoked ? (
            <p className="text-sm text-red-600">Revoked — generate a new link to turn it back on.</p>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-[#EDEAE0] bg-[#FAFAF7] px-3 py-2">
              <code className="flex-1 truncate text-xs text-[#4A4A3C]">{link.url}</code>
              <Button variant="secondary" onClick={() => copyLink(link.url, showSuccess, showError)}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm text-[#4A4A3C]">
              Sold <strong>{link.tickets_used}</strong>
              {link.max_tickets ? ` of ${link.max_tickets}` : " (no limit)"}
            </p>
            {pct !== null && (
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#EDEAE0]">
                <div className="h-full bg-[#B8952F]" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="mt-2 text-xs text-[#8C8C78]">
              {link.expires_at ? `Expires ${format(new Date(link.expires_at), "d MMM yyyy, HH:mm")}` : "Never expires"}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-[#EDEAE0] bg-white p-4">
          <p className="mb-2 text-sm font-medium text-[#4A4A3C]">Settings</p>
          <div className="flex flex-col gap-3">
            <Input id="pl-label" label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                id="pl-max"
                label="Max tickets (all events)"
                hint="Empty = no limit."
                type="number"
                min={1}
                value={maxTickets}
                onChange={(e) => setMaxTickets(e.target.value)}
              />
              <Input
                id="pl-expires"
                label="Expires on"
                hint="Empty = never."
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button loading={saving} onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#4A4A3C]">Events ({events.length})</h2>
          <Button variant="secondary" loading={syncing} onClick={handleSync}>
            <RefreshCw className="h-4 w-4" /> Apply to new events
          </Button>
        </div>
        {events.length === 0 ? (
          <EmptyState message="No upcoming published events have this private tier." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Event</TH>
                <TH>Date</TH>
                <TH>Price</TH>
                <TH>Left</TH>
              </TR>
            </THead>
            <TBody>
              {events.map((e) => (
                <TR key={e.tier_id}>
                  <TD>
                    <span className="font-medium">{e.artist_name}</span> — {e.city_name}
                    <p className="text-xs text-[#8C8C78]">{e.tour_name}</p>
                  </TD>
                  <TD>{e.event_start_at ? format(new Date(e.event_start_at), "d MMM yyyy") : "TBC"}</TD>
                  <TD>{formatMoney(e.price_pence, e.currency)}</TD>
                  <TD>{e.remaining} / {link.quantity_per_stop}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <section className="rounded-lg border border-red-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-red-700">Danger zone</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#8C8C78]">
            <strong className="text-[#4A4A3C]">Generate new link</strong> — the old link stops working; send the new one.
          </p>
          <Button variant="secondary" onClick={() => setConfirm("regenerate")}>
            Generate new link
          </Button>
        </div>
        {!revoked && (
          <div className="mt-3 flex flex-col gap-3 border-t border-[#EDEAE0] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#8C8C78]">
              <strong className="text-[#4A4A3C]">Revoke</strong> — turns the link off now. Tickets already bought stay valid.
            </p>
            <Button variant="danger" onClick={() => setConfirm("revoke")}>
              Revoke link
            </Button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "regenerate" ? "Generate a new link?" : "Revoke this link?"}
        message={
          confirm === "regenerate"
            ? "Anyone with the current link will lose access. You'll need to send the new link to the people it's for."
            : "Nobody will be able to buy with this link until you generate a new one. Tickets already bought stay valid."
        }
        confirmLabel={confirm === "regenerate" ? "Generate new link" : "Revoke"}
        danger={confirm === "revoke"}
        loading={confirming}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
