"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { createPrivateLink, type ApplyResult } from "@/lib/api/privateLinks";

const CURRENCIES = ["gbp", "ngn", "usd", "eur", "ghs"];

interface PriceRow {
  currency: string;
  amount: string;
}

interface PrivateLinkFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (result: ApplyResult) => void;
}

export function PrivateLinkFormModal({ open, onClose, onCreated }: PrivateLinkFormModalProps) {
  const { showError } = useToast();
  const [label, setLabel] = useState("");
  const [tierName, setTierName] = useState("Early Bird (Private)");
  const [quantity, setQuantity] = useState("20");
  const [prices, setPrices] = useState<PriceRow[]>([{ currency: "gbp", amount: "" }]);
  const [maxTickets, setMaxTickets] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setTierName("Early Bird (Private)");
    setQuantity("20");
    setPrices([{ currency: "gbp", amount: "" }]);
    setMaxTickets("");
    setExpiresAt("");
  }, [open]);

  function updatePrice(i: number, patch: Partial<PriceRow>) {
    setPrices((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function handleSave() {
    if (!label.trim() || !tierName.trim()) {
      showError("Enter a label and a tier name.");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      showError("Tickets per event must be at least 1.");
      return;
    }
    const priceMap: Record<string, number> = {};
    for (const p of prices) {
      const amount = Math.round(parseFloat(p.amount) * 100);
      if (!amount || amount < 1) {
        showError(`Enter a price for ${p.currency.toUpperCase()}.`);
        return;
      }
      priceMap[p.currency] = amount;
    }
    const max = maxTickets ? parseInt(maxTickets, 10) : undefined;

    setSaving(true);
    try {
      const result = await createPrivateLink({
        label: label.trim(),
        tier_name: tierName.trim(),
        quantity_per_stop: qty,
        prices: priceMap,
        max_tickets: max && max > 0 ? max : undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onCreated(result);
      onClose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to create private link.");
    } finally {
      setSaving(false);
    }
  }

  const unusedCurrencies = CURRENCIES.filter((c) => !prices.some((p) => p.currency === c));

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
          <Input
            id="pl-tier"
            label="Tier name (buyers see this)"
            required
            value={tierName}
            onChange={(e) => setTierName(e.target.value)}
          />
          <Input
            id="pl-qty"
            label="Tickets per event"
            type="number"
            min={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-[#4A4A3C]">Price per currency</p>
          <div className="flex flex-col gap-2">
            {prices.map((p, i) => (
              <div key={i} className="flex items-end gap-2">
                <Select
                  id={`pl-cur-${i}`}
                  value={p.currency}
                  onChange={(e) => updatePrice(i, { currency: e.target.value })}
                  className="w-28"
                >
                  {[p.currency, ...unusedCurrencies].map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </Select>
                <Input
                  id={`pl-amt-${i}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="25.00"
                  value={p.amount}
                  onChange={(e) => updatePrice(i, { amount: e.target.value })}
                />
                {prices.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPrices((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remove currency"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {unusedCurrencies.length > 0 && (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-sm text-[#B8952F] hover:underline"
              onClick={() => setPrices((prev) => [...prev, { currency: unusedCurrencies[0], amount: "" }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add currency
            </button>
          )}
          <p className="mt-1 text-xs text-[#8C8C78]">
            Events charged in a currency without a price here are skipped.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            id="pl-max"
            label="Max tickets (all events)"
            hint="Leave empty for no limit."
            type="number"
            min={1}
            value={maxTickets}
            onChange={(e) => setMaxTickets(e.target.value)}
          />
          <Input
            id="pl-expires"
            label="Expires on"
            hint="Leave empty to never expire."
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <p className="rounded-lg bg-[#F5E9CE]/40 px-3 py-2 text-xs text-[#4A4A3C]">
          This adds a hidden tier to every upcoming event. Only people with the link can see or buy it.
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
