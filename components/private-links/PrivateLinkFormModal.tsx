"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { currencySymbol, formatMoney } from "@/lib/currency";
import { getShow, listShows, type Show } from "@/lib/api/shows";
import { listTiers, type Tier } from "@/lib/api/tiers";
import { createPrivateLink, type PrivateLink } from "@/lib/api/privateLinks";

interface PrivateLinkFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (link: PrivateLink) => void;
}

export function PrivateLinkFormModal({ open, onClose, onCreated }: PrivateLinkFormModalProps) {
  const { showError } = useToast();
  const [shows, setShows] = useState<Show[]>([]);
  const [show, setShow] = useState<Show | null>(null);
  const [showId, setShowId] = useState("");
  const [stopId, setStopId] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tierId, setTierId] = useState("");
  const [loadingTiers, setLoadingTiers] = useState(false);

  const [label, setLabel] = useState("");
  const [tierName, setTierName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("20");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowId("");
    setShow(null);
    setStopId("");
    setTiers([]);
    setTierId("");
    setLabel("");
    setTierName("");
    setPrice("");
    setQuantity("20");
    setExpiresAt("");
    (async () => {
      try {
        setShows((await listShows()).filter((s) => !s.is_past));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load events.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Show -> its tour stops.
  useEffect(() => {
    setShow(null);
    setStopId("");
    if (!showId) return;
    (async () => {
      try {
        setShow(await getShow(showId));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load event dates.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  // Stop -> its public tiers.
  useEffect(() => {
    setTiers([]);
    setTierId("");
    if (!showId || !stopId) return;
    setLoadingTiers(true);
    (async () => {
      try {
        setTiers((await listTiers(showId, stopId)).filter((t) => !t.access_link_id));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load tiers.");
      } finally {
        setLoadingTiers(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopId]);

  const stops = useMemo(
    () => (show?.tour_stops ?? []).filter((s) => !s.event_start_at || new Date(s.event_start_at) > new Date()),
    [show]
  );
  const currency = show?.ticketing?.currency ?? "gbp";

  // Picking a tier brings in its name and price; both stay editable.
  function handleTierChange(id: string) {
    setTierId(id);
    const tier = tiers.find((t) => t.id === id);
    if (!tier) return;
    setTierName(`${tier.name} (Private)`);
    setPrice((tier.price_pence / 100).toFixed(2));
  }

  async function handleSave() {
    if (!stopId) {
      showError("Choose an event and date.");
      return;
    }
    if (!label.trim() || !tierName.trim()) {
      showError("Enter a label and a tier name.");
      return;
    }
    const pricePence = Math.round(parseFloat(price) * 100);
    if (!pricePence || pricePence < 1) {
      showError("Enter a price.");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      showError("Quantity must be at least 1.");
      return;
    }
    setSaving(true);
    try {
      const link = await createPrivateLink({
        label: label.trim(),
        tour_stop_id: stopId,
        source_tier_id: tierId || undefined,
        tier_name: tierName.trim(),
        price_pence: pricePence,
        quantity: qty,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onCreated(link);
      onClose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to create private link.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New private link" maxWidth="max-w-lg">
      <div className="flex flex-col gap-3">
        <Input
          id="pl-label"
          label="Label"
          hint="Internal only — e.g. who you're sending it to."
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select id="pl-show" label="Event" value={showId} onChange={(e) => setShowId(e.target.value)}>
            <option value="">Choose event…</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.artist_name} — {s.tour_name}
              </option>
            ))}
          </Select>
          <Select
            id="pl-stop"
            label="Date / city"
            value={stopId}
            onChange={(e) => setStopId(e.target.value)}
            disabled={!show}
          >
            <option value="">{show && stops.length === 0 ? "No upcoming dates" : "Choose date…"}</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city_name}
                {s.event_start_at ? ` — ${format(new Date(s.event_start_at), "d MMM yyyy")}` : ""}
              </option>
            ))}
          </Select>
        </div>

        <Select
          id="pl-tier-src"
          label="Based on tier"
          hint="Brings in that tier's price — you can change it below."
          value={tierId}
          onChange={(e) => handleTierChange(e.target.value)}
          disabled={!stopId || loadingTiers}
        >
          <option value="">
            {loadingTiers ? "Loading tiers…" : stopId && tiers.length === 0 ? "No tiers on this date" : "Choose tier…"}
          </option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {formatMoney(t.price_pence, currency)}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Input
              id="pl-tier"
              label="Tier name (buyers see this)"
              required
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
            />
          </div>
          <Input
            id="pl-price"
            label={`Price (${currencySymbol(currency)})`}
            type="number"
            min={0}
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            id="pl-qty"
            label="Tickets available"
            type="number"
            min={1}
            required
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

        <p className="rounded-lg bg-[#F5E9CE]/40 px-3 py-2 text-xs text-[#4A4A3C]">
          This adds a hidden tier to the chosen date. Only people with the link can see or buy it — the normal tiers
          stay as they are.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={saving} onClick={handleSave}>
            Create link
          </Button>
        </div>
      </div>
    </Modal>
  );
}
