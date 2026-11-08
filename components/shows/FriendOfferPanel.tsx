"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ApiError } from "@/lib/api/client";
import { type TourStop } from "@/lib/api/shows";
import { listTiers, type Tier } from "@/lib/api/tiers";
import { countBroadcastRecipients, createFriendOffer } from "@/lib/api/broadcasts";
import { formatMoney } from "@/lib/currency";
import { useToast } from "@/app/providers/ToastProvider";

const DEFAULT_BODY =
  "<p>Thank you for getting your ticket! Want to bring a friend along? As a thank-you, here's a special discounted price on extra tickets — only for existing ticket holders, and only while they last.</p>";

/**
 * "Bring a friend": emails every paid ticket holder of one tour stop a private
 * link to buy extra tickets at a discount (% or fixed amount off a ticket type).
 */
export function FriendOfferPanel({
  showId,
  stops,
  currency,
  onSent,
}: {
  showId: string;
  stops: TourStop[];
  currency: string;
  onSent: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [stopId, setStopId] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tierId, setTierId] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("20");
  const [quantity, setQuantity] = useState("50");
  const [expiresOn, setExpiresOn] = useState("");
  const [subject, setSubject] = useState("Bring a friend — special price on extra tickets");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [editorKey, setEditorKey] = useState(0);
  const [recipients, setRecipients] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setTiers([]);
    setTierId("");
    setRecipients(null);
    if (!stopId) return;
    listTiers(showId, stopId)
      .then((all) => {
        // Only public ticket types can be discounted.
        const pub = all.filter((t) => !t.access_link_id);
        setTiers(pub);
        if (pub.length === 1) setTierId(pub[0].id);
      })
      .catch(() => setTiers([]));
    countBroadcastRecipients(showId, stopId)
      .then(setRecipients)
      .catch(() => setRecipients(0));
  }, [showId, stopId]);

  const tier = tiers.find((t) => t.id === tierId);
  const value = parseFloat(discountValue) || 0;
  const valuePence = discountType === "percent" ? Math.round(value) : Math.round(value * 100);
  const newPrice = !tier
    ? null
    : discountType === "percent"
      ? Math.round((tier.price_pence * (100 - valuePence)) / 100)
      : tier.price_pence - valuePence;
  const qty = parseInt(quantity, 10) || 0;
  const priceOk = newPrice != null && newPrice >= 1 && (discountType !== "percent" || (valuePence >= 1 && valuePence <= 99));
  const bodyOk = body.replace(/<[^>]*>/g, "").trim() !== "";
  const valid = !!stopId && !!tier && priceOk && qty > 0 && subject.trim() !== "" && bodyOk && !!recipients;
  const stopName = stops.find((s) => s.id === stopId)?.city_name ?? "";

  async function handleSend() {
    if (!tier) return;
    setSending(true);
    try {
      const res = await createFriendOffer(showId, {
        tour_stop_id: stopId,
        source_tier_id: tier.id,
        discount_type: discountType,
        discount_value: valuePence,
        quantity: qty,
        // End of the chosen day, local time.
        expires_at: expiresOn ? new Date(`${expiresOn}T23:59:59`).toISOString() : null,
        subject: subject.trim(),
        body_html: body,
      });
      showSuccess(
        `Offer sent to ${res.broadcast.recipient_count} ticket holder${res.broadcast.recipient_count === 1 ? "" : "s"}. The link is listed under Private links.`
      );
      setConfirmOpen(false);
      setBody(DEFAULT_BODY);
      setEditorKey((k) => k + 1);
      onSent();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to send the offer.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[#EDEAE0] bg-white p-5">
      <div className="flex items-start gap-3">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-[#B8952F]" />
        <div>
          <h3 className="text-base font-semibold text-[#4A4A3C]">Bring-a-friend offer</h3>
          <p className="text-sm text-[#8C8C78]">
            Email everyone who already has a ticket for a tour stop a private link to buy extra tickets at a discount.
            The email includes the price, the saving and a &ldquo;Buy a ticket for a friend&rdquo; button.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="Tour stop" value={stopId} onChange={(e) => setStopId(e.target.value)}>
          <option value="">Select…</option>
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.city_name}
            </option>
          ))}
        </Select>
        <Select
          label="Ticket type to discount"
          value={tierId}
          onChange={(e) => setTierId(e.target.value)}
          disabled={!stopId || tiers.length === 0}
          hint={stopId && tiers.length === 0 ? "This stop has no ticket types to discount." : undefined}
        >
          <option value="">Select…</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {formatMoney(t.price_pence, currency)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label="Discount"
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "percent" | "amount")}
        >
          <option value="percent">% off</option>
          <option value="amount">Amount off</option>
        </Select>
        <Input
          label={discountType === "percent" ? "Percent" : `Amount (${currency.toUpperCase()})`}
          type="text"
          inputMode="decimal"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value.replace(/[^0-9.]/g, ""))}
        />
        <Input
          label="Tickets available"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Input label="Offer ends (optional)" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
      </div>

      {tier && (
        <p className={`text-sm ${priceOk ? "text-[#4A4A3C]" : "text-red-600"}`}>
          {priceOk && newPrice != null ? (
            <>
              <span className="text-[#8C8C78] line-through">{formatMoney(tier.price_pence, currency)}</span>{" "}
              <strong>{formatMoney(newPrice, currency)}</strong> per ticket (+ booking fee) ·{" "}
              {recipients ?? "…"} ticket holder{recipients === 1 ? "" : "s"} in {stopName}
            </>
          ) : (
            "That discount is bigger than the ticket price."
          )}
        </p>
      )}

      <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
      <RichTextEditor key={editorKey} label="Message" value={body} onChange={setBody} />

      <div className="flex justify-end">
        <Button type="button" disabled={!valid} onClick={() => setConfirmOpen(true)}>
          <Gift className="h-4 w-4" />
          Send offer to {recipients ?? "…"} ticket holder{recipients === 1 ? "" : "s"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Send bring-a-friend offer"
        message={`Create a private link selling up to ${qty} "${tier?.name}" ticket(s) at ${
          newPrice != null ? formatMoney(newPrice, currency) : ""
        } and email it to ${recipients} ticket holder(s) in ${stopName}? Anyone with the link can use it, so it's also listed under Private links where you can revoke it.`}
        confirmLabel="Send offer"
        danger={false}
        loading={sending}
        onConfirm={handleSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
