"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { getShow, getTicketSettings, listShows, type Show, type TourStop } from "@/lib/api/shows";
import { listTiers, type Tier } from "@/lib/api/tiers";
import { createManualOrder, type Order } from "@/lib/api/orders";
import { formatMoney } from "@/lib/currency";

type Mode = "comp" | "invoice";

/**
 * Create a ticket order for someone from the dashboard, either
 * complimentary (free, tickets valid immediately) or "requires payment"
 * (seats held 72h, customer emailed a pay link, tickets issued once paid).
 */
export function CreateOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const [shows, setShows] = useState<Show[]>([]);
  const [showId, setShowId] = useState("");
  const [stops, setStops] = useState<TourStop[]>([]);
  const [stopId, setStopId] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tierId, setTierId] = useState("");
  const [flat, setFlat] = useState<{ price: number; fee: number; currency: string } | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("comp");
  const [customTotal, setCustomTotal] = useState("");
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listShows()
      .then(setShows)
      .catch(() => setShows([]));
  }, [open]);

  useEffect(() => {
    setStops([]);
    setStopId("");
    setFlat(null);
    if (!showId) return;
    getShow(showId)
      .then((s) => setStops(s.tour_stops ?? []))
      .catch(() => setStops([]));
    getTicketSettings(showId)
      .then((t) => setFlat({ price: t.price_pence, fee: t.fee_pence, currency: t.currency }))
      .catch(() => setFlat(null));
  }, [showId]);

  useEffect(() => {
    setTiers([]);
    setTierId("");
    if (!showId || !stopId) return;
    listTiers(showId, stopId)
      .then((t) => {
        setTiers(t);
        if (t.length === 1) setTierId(t[0].id);
      })
      .catch(() => setTiers([]));
  }, [showId, stopId]);

  const stop = stops.find((s) => s.id === stopId);
  const tier = tiers.find((t) => t.id === tierId);
  const qty = Math.max(0, parseInt(quantity, 10) || 0);
  const currency = flat?.currency ?? "gbp";

  // Mirrors the server's default: tier (or flat) price × qty + per-ticket fee.
  const defaultTotal = useMemo(() => {
    const unit = tier ? tier.price_pence : flat?.price;
    if (unit == null || !qty) return null;
    const fee = stop?.fee_pence ?? flat?.fee ?? 0;
    return unit * qty + fee * qty;
  }, [tier, flat, stop, qty]);

  const seatsLeft = (() => {
    const stopLeft = stop?.capacity != null ? stop.capacity - (stop.tickets_sold ?? 0) : null;
    const tierLeft = tier ? tier.quantity - tier.tickets_sold : null;
    if (stopLeft == null) return tierLeft;
    if (tierLeft == null) return stopLeft;
    return Math.min(stopLeft, tierLeft);
  })();

  function reset() {
    setShowId("");
    setQuantity("1");
    setFullName("");
    setEmail("");
    setMode("comp");
    setCustomTotal("");
    setNote("");
    setSendEmail(true);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    if (!showId || !stopId) return setError("Choose a show and tour stop.");
    if (tiers.length > 1 && !tierId) return setError("Choose a ticket type.");
    if (!qty) return setError("Enter how many tickets.");
    if (!fullName.trim() || !email.includes("@")) return setError("Enter the customer's name and email.");

    let totalPence: number | null = null;
    if (mode === "invoice" && customTotal.trim()) {
      totalPence = Math.round(parseFloat(customTotal) * 100);
      if (!Number.isFinite(totalPence) || totalPence <= 0) return setError("Enter a valid total, or leave it blank.");
    }

    setSaving(true);
    try {
      const order = await createManualOrder({
        show_id: showId,
        tour_stop_id: stopId,
        tier_id: tierId || null,
        quantity: qty,
        full_name: fullName.trim(),
        email: email.trim(),
        mode,
        total_pence: totalPence,
        note: note.trim() || undefined,
        send_email: mode === "comp" ? sendEmail : undefined,
      });
      onCreated(order);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create order" maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["comp", "Complimentary", "Free — tickets valid now"],
              ["invoice", "Requires payment", "Pay link emailed; seats held 72h"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-lg border-2 px-3 py-2 text-left ${
                mode === value ? "border-[#B8952F] bg-[#B8952F]/5" : "border-[#EDEAE0]"
              }`}
            >
              <p className="text-sm font-medium text-[#4A4A3C]">{label}</p>
              <p className="text-xs text-[#8C8C78]">{hint}</p>
            </button>
          ))}
        </div>

        <Select label="Show" value={showId} onChange={(e) => setShowId(e.target.value)}>
          <option value="">Select a show…</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.artist_name} — {s.tour_name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Tour stop" value={stopId} onChange={(e) => setStopId(e.target.value)} disabled={!showId}>
            <option value="">Select…</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city_name}
              </option>
            ))}
          </Select>
          <Select
            label="Ticket type"
            value={tierId}
            onChange={(e) => setTierId(e.target.value)}
            disabled={!stopId || tiers.length === 0}
          >
            <option value="">{tiers.length === 0 ? "Standard" : "Select…"}</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {formatMoney(t.price_pence, currency)}
                {t.access_link_id ? " (private)" : ""}
                {!t.is_active ? " (off sale)" : ""}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          hint={seatsLeft != null ? `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left` : undefined}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Customer name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Customer email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {mode === "invoice" ? (
          <Input
            label={`Total to charge (${currency.toUpperCase()})`}
            type="text"
            inputMode="decimal"
            value={customTotal}
            onChange={(e) => setCustomTotal(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={defaultTotal != null ? (defaultTotal / 100).toFixed(2) : ""}
            hint={
              defaultTotal != null
                ? `Leave blank to charge ${formatMoney(defaultTotal, currency)} (ticket price × ${qty} + fees).`
                : "Leave blank to charge the normal price."
            }
          />
        ) : (
          <label className="flex items-center gap-2 text-sm text-[#4A4A3C]">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Email the tickets to the customer now
          </label>
        )}

        <Textarea
          label="Internal note (optional)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Artist guest list, sponsor, VIP…"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-[#8C8C78]">
          {mode === "comp"
            ? "Tickets count against the stop's capacity, like a normal sale."
            : "Seats are reserved now. If the customer hasn't paid within 72 hours, the order expires and the seats go back on sale."}
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={saving} onClick={handleSubmit}>
            {mode === "comp" ? "Create tickets" : "Create & email pay link"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
