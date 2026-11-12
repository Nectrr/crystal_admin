"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PrivateLinkStatusBadge, copyLink } from "@/components/private-links/shared";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { currencySymbol, formatMoney } from "@/lib/currency";
import {
  getPrivateLink,
  regeneratePrivateLink,
  revokePrivateLink,
  updatePrivateLink,
  type PrivateLink,
} from "@/lib/api/privateLinks";

// datetime-local wants "yyyy-MM-ddTHH:mm" in local time.
function toLocalInput(iso?: string | null) {
  return iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "";
}

export default function PrivateLinkDetailPage() {
  const params = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();
  const [link, setLink] = useState<PrivateLink | null>(null);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState("");
  const [tierName, setTierName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<"regenerate" | "revoke" | null>(null);
  const [confirming, setConfirming] = useState(false);

  function applyLink(l: PrivateLink) {
    setLink(l);
    setLabel(l.label);
    setTierName(l.tier_name);
    setPrice((l.price_pence / 100).toFixed(2));
    setQuantity(String(l.quantity));
    setExpiresAt(toLocalInput(l.expires_at));
  }

  const load = useCallback(async () => {
    try {
      applyLink(await getPrivateLink(params.id));
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
    if (!link) return;
    if (!label.trim() || !tierName.trim()) {
      showError("Enter a label and a tier name.");
      return;
    }
    const pricePence = Math.round(parseFloat(price) * 100);
    const qty = parseInt(quantity, 10);
    if (!pricePence || pricePence < 1) {
      showError("Enter a price.");
      return;
    }
    if (!qty || qty < link.tickets_sold) {
      showError(`Tickets available can't be lower than the ${link.tickets_sold} already sold.`);
      return;
    }
    setSaving(true);
    try {
      applyLink(
        await updatePrivateLink(link.id, {
          label: label.trim(),
          tier_name: tierName.trim(),
          price_pence: pricePence,
          quantity: qty,
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
  const pct = link.quantity ? Math.min(100, Math.round((link.tickets_sold / link.quantity) * 100)) : 0;

  return (
    <div>
      <Link href="/private-links" className="mb-4 inline-flex items-center gap-1 text-sm text-[#8C8C78] hover:text-[#B8952F]">
        <ArrowLeft className="h-4 w-4" /> Private links
      </Link>
      <PageHeader
        title={link.label}
        description={`${link.artist_name} — ${link.city_name}${
          link.event_start_at ? ` · ${format(new Date(link.event_start_at), "d MMM yyyy")}` : ""
        }`}
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
            <div className="mb-3 grid grid-cols-3 gap-3">
              {[
                { label: "Tickets enabled", value: link.quantity, cls: "text-[#4A4A3C]" },
                { label: "Sold", value: link.tickets_sold, cls: "text-[#4A4A3C]" },
                {
                  label: "Left",
                  value: Math.max(0, link.quantity - link.tickets_sold),
                  cls: link.quantity - link.tickets_sold > 0 ? "text-green-700" : "text-red-600",
                },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-[#EDEAE0] px-3 py-2">
                  <p className="text-xs text-[#8C8C78]">{c.label}</p>
                  <p className={`text-xl font-semibold ${c.cls}`}>{c.value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#4A4A3C]">
              Sold <strong>{link.tickets_sold}</strong> of {link.quantity} at{" "}
              {formatMoney(link.price_pence, link.currency)}
            </p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#EDEAE0]">
              <div className="h-full bg-[#B8952F]" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#8C8C78]">
              {link.source_tier_name ? `Based on ${link.source_tier_name} · ` : ""}
              {link.expires_at ? `Expires ${format(new Date(link.expires_at), "d MMM yyyy, HH:mm")}` : "Never expires"}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-[#EDEAE0] bg-white p-4">
          <p className="mb-2 text-sm font-medium text-[#4A4A3C]">Settings</p>
          <div className="flex flex-col gap-3">
            <Input id="pl-label" label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Input
              id="pl-tier"
              label="Tier name (buyers see this)"
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                id="pl-price"
                label={`Price (${currencySymbol(link.currency)})`}
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Input
                id="pl-qty"
                label="Tickets available"
                type="number"
                min={Math.max(1, link.tickets_sold)}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
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
            <p className="text-xs text-[#8C8C78]">Price changes only affect new purchases.</p>
            <div className="flex justify-end">
              <Button loading={saving} onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </div>
        </section>
      </div>

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
