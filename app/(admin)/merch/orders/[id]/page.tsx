"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Mail, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TH, TD, TR, Badge } from "@/components/ui/Table";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  getMerchOrder,
  refundMerchOrder,
  resendMerchOrderEmail,
  type MerchOrderWithItems,
  type MerchOrderStatus,
} from "@/lib/api/merch";
import { formatMoney } from "@/lib/currency";

const STATUS_COLOR: Record<MerchOrderStatus, "gold" | "green" | "red" | "gray"> = {
  pending: "gold",
  paid: "green",
  failed: "red",
  sold_out: "gray",
  refunded: "gray",
};

function sanitizeAmountChars(raw: string): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    const [intPart, decPart] = cleaned.split(".");
    cleaned = decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : `${intPart}.`;
  }
  return cleaned;
}

function clampAmount(raw: string, maxMajorUnits: number): string {
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return raw;
  return value > maxMajorUnits ? maxMajorUnits.toFixed(2) : raw;
}

export default function MerchOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();
  const [order, setOrder] = useState<MerchOrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [resending, setResending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const o = await getMerchOrder(params.id);
      setOrder(o);
      setRefundAmountInput((o.subtotal_pence / 100).toFixed(2));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleRefund() {
    if (!order) return;
    const amountPence = Math.round(parseFloat(refundAmountInput) * 100);
    if (!Number.isFinite(amountPence) || amountPence <= 0 || amountPence > order.subtotal_pence) {
      setRefundError(`Enter an amount between 0.01 and ${(order.subtotal_pence / 100).toFixed(2)}.`);
      return;
    }
    setRefunding(true);
    setRefundError(null);
    try {
      await refundMerchOrder(order.id, amountPence);
      showSuccess(`Refunded ${formatMoney(amountPence, order.currency)}.`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 400)) {
        setRefundError(err.message || "This order can't be refunded (not paid, or already refunded).");
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to refund order.");
      }
    } finally {
      setRefunding(false);
    }
  }

  async function handleResend() {
    if (!order) return;
    setResending(true);
    try {
      await resendMerchOrderEmail(order.id);
      showSuccess("Confirmation email resent.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showError("Order isn't paid, so there's no confirmation to resend.");
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to resend email.");
      }
    } finally {
      setResending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
      </div>
    );
  }
  if (!order) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Order #${order.id.slice(0, 8)}`}
        description={new Date(order.created_at).toLocaleString()}
        actions={
          <div className="flex items-center gap-2">
            <Badge color={STATUS_COLOR[order.status]}>{order.status}</Badge>
            <Button variant="secondary" loading={resending} onClick={handleResend}>
              <Mail className="h-4 w-4" /> Resend email
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-lg border border-[#EDEAE0] overflow-hidden">
            <Table>
              <THead>
                <tr>
                  <TH>Item</TH>
                  <TH>Qty</TH>
                  <TH>Unit</TH>
                  <TH>Line total</TH>
                </tr>
              </THead>
              <TBody>
                {order.items.map((it) => (
                  <TR key={it.id}>
                    <TD>
                      <p className="font-medium">{it.product_name}</p>
                      <p className="text-xs text-[#8C8C78]">{it.variant_label}</p>
                    </TD>
                    <TD>{it.quantity}</TD>
                    <TD>{formatMoney(it.unit_price_pence, order.currency)}</TD>
                    <TD className="font-medium">{formatMoney(it.line_total_pence, order.currency)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <p className="text-sm text-[#4A4A3C]">
              <span className="text-[#8C8C78] mr-3">Total</span>
              <span className="font-semibold text-base">{formatMoney(order.subtotal_pence, order.currency)}</span>
            </p>
          </div>

          {order.status === "paid" && (
            <div className="rounded-lg border border-red-200 bg-red-50/40 p-5">
              <h3 className="text-sm font-semibold text-red-700 mb-1">Refund</h3>
              <p className="text-xs text-[#8C8C78] mb-4">
                Issues a Stripe refund and releases the stock this order&apos;s items held. Cannot be undone.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <Input
                  label={`Amount (${order.currency.toUpperCase()})`}
                  type="text"
                  inputMode="decimal"
                  value={refundAmountInput}
                  onChange={(e) => {
                    setRefundAmountInput(sanitizeAmountChars(e.target.value));
                    setRefundError(null);
                  }}
                  onBlur={() => setRefundAmountInput((v) => clampAmount(v, order.subtotal_pence / 100))}
                  error={refundError ?? undefined}
                  hint={`Max ${(order.subtotal_pence / 100).toFixed(2)}. Leave as-is for a full refund.`}
                  className="max-w-[160px]"
                />
                <Button variant="danger" loading={refunding} onClick={handleRefund}>
                  <RotateCcw className="h-4 w-4" /> Issue refund
                </Button>
              </div>
            </div>
          )}

          {order.status === "refunded" && order.refunded_pence != null && (
            <p className="text-sm text-[#8C8C78]">
              Refunded {formatMoney(order.refunded_pence, order.currency)}
              {order.refunded_at && ` on ${new Date(order.refunded_at).toLocaleString()}`}.
            </p>
          )}

          {order.status === "failed" && order.failure_reason && (
            <p className="text-sm text-red-600">Failure reason: {order.failure_reason}</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-[#EDEAE0] p-5">
            <h3 className="text-sm font-semibold text-[#4A4A3C] mb-4">Buyer</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs text-[#8C8C78]">Full name</p>
                <p className="text-[#4A4A3C]">{order.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C8C78]">Email</p>
                <p className="text-[#4A4A3C]">{order.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#EDEAE0] p-5">
            <h3 className="text-sm font-semibold text-[#4A4A3C] mb-4">Shipping address</h3>
            <p className="text-sm text-[#4A4A3C] leading-relaxed">
              {order.address_line1}
              <br />
              {order.city}
              <br />
              {order.postcode}
            </p>
          </div>

          {order.paid_at && (
            <div className="rounded-lg border border-[#EDEAE0] p-5">
              <h3 className="text-sm font-semibold text-[#4A4A3C] mb-4">Payment</h3>
              <div className="flex flex-col gap-3 text-sm">
                {order.stripe_payment_intent_id && (
                  <div>
                    <p className="text-xs text-[#8C8C78]">Stripe PaymentIntent</p>
                    <p className="text-[#4A4A3C] font-mono text-xs">{order.stripe_payment_intent_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[#8C8C78]">Paid at</p>
                  <p className="text-[#4A4A3C]">{new Date(order.paid_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
