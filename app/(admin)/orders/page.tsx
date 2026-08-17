"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TH, TD, TR, EmptyState, Badge, TableSkeleton } from "@/components/ui/Table";
import { Select, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { listOrders, refundOrder, type Order, type OrderStatus } from "@/lib/api/orders";
import { formatMoney } from "@/lib/currency";

const STATUS_COLOR: Record<OrderStatus, "gold" | "green" | "red" | "gray"> = {
  pending: "gold",
  paid: "green",
  failed: "red",
  sold_out: "gray",
  refunded: "gray",
};

const LIMIT = 50;

export default function OrdersPage() {
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await listOrders({
        status: status || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        limit: LIMIT,
        offset,
      });
      setOrders(res.orders);
      setTotal(res.total);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, status, from, to]);

  function openRefund(o: Order) {
    setRefundTarget(o);
    setRefundError(null);
    // Prefills with the ticket price only, excluding the (non-refundable)
    // transaction fee — admin can still adjust up to the full total.
    setRefundAmountInput(((o.total_pence - o.fee_pence) / 100).toFixed(2));
  }

  function closeRefund() {
    setRefundTarget(null);
    setRefundError(null);
  }

  async function handleRefund() {
    if (!refundTarget) return;
    const amountPence = Math.round(parseFloat(refundAmountInput) * 100);
    if (!Number.isFinite(amountPence) || amountPence <= 0 || amountPence > refundTarget.total_pence) {
      setRefundError(`Enter an amount between 0.01 and ${(refundTarget.total_pence / 100).toFixed(2)}.`);
      return;
    }
    setRefunding(true);
    setRefundError(null);
    try {
      await refundOrder(refundTarget.id, amountPence);
      setOrders((prev) =>
        prev.map((o) => (o.id === refundTarget.id ? { ...o, status: "refunded", refunded_pence: amountPence } : o))
      );
      showSuccess(`Refunded ${formatMoney(amountPence, refundTarget.currency)}.`);
      closeRefund();
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

  const page = Math.floor(offset / LIMIT) + 1;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  // Search only filters within the currently-loaded server page — pagination/total stay
  // server-driven (offset/limit/total against the API), so we don't duplicate that logic
  // with client-side DataTable pagination which would misrepresent the real total.
  const q = query.trim().toLowerCase();
  const filteredOrders = q
    ? orders.filter((o) => o.full_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
    : orders;

  return (
    <div>
      <PageHeader title="Orders" description="Global order & ticket sales view" />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setOffset(0);
            setStatus(e.target.value as OrderStatus | "");
          }}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="sold_out">Sold out</option>
          <option value="refunded">Refunded</option>
        </Select>
        <Input
          label="From"
          type="date"
          value={from}
          onChange={(e) => {
            setOffset(0);
            setFrom(e.target.value);
          }}
        />
        <Input
          label="To"
          type="date"
          value={to}
          onChange={(e) => {
            setOffset(0);
            setTo(e.target.value);
          }}
        />
        <div className="relative">
          <label className="block text-sm font-medium text-[#4A4A3C] mb-1">Search</label>
          <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.5rem)] h-4 w-4 -translate-y-1/2 text-[#8C8C78]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email..."
            className="rounded-lg border border-[#EDEAE0] bg-white py-2 pl-9 pr-3 text-sm text-[#4A4A3C] focus:outline-none focus:ring-2 focus:ring-[#B8952F]/40 focus:border-[#B8952F]"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" message="Orders will appear here once tickets start selling." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState title="No matches" message="No orders on this page match your search." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Qty</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {filteredOrders.map((o) => (
                  <TR key={o.id}>
                    <TD className="font-medium">{o.full_name}</TD>
                    <TD className="text-[#8C8C78]">{o.email}</TD>
                    <TD>{o.quantity}</TD>
                    <TD>
                      {(o.total_pence / 100).toFixed(2)} {o.currency}
                    </TD>
                    <TD>
                      <Badge color={STATUS_COLOR[o.status]}>{o.status}</Badge>
                      {o.status === "failed" && o.failure_reason && (
                        <p className="text-xs text-red-600 mt-1 max-w-[220px]" title={o.failure_reason}>
                          {o.failure_reason}
                        </p>
                      )}
                    </TD>
                    <TD className="text-[#8C8C78]">{new Date(o.created_at).toLocaleString()}</TD>
                    <TD>
                      {o.status === "paid" && (
                        <button onClick={() => openRefund(o)} className="text-[#B8952F] flex items-center gap-1">
                          <RotateCcw className="h-3.5 w-3.5" /> Refund
                        </button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Mobile stacked cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredOrders.map((o) => (
              <div key={o.id} className="rounded-lg border border-[#EDEAE0] bg-white p-4 flex flex-col gap-2 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[#4A4A3C]">{o.full_name}</p>
                    <p className="text-xs text-[#8C8C78]">{o.email}</p>
                  </div>
                  <Badge color={STATUS_COLOR[o.status]}>{o.status}</Badge>
                </div>
                {o.status === "failed" && o.failure_reason && <p className="text-xs text-red-600">{o.failure_reason}</p>}
                <div className="flex items-center justify-between text-sm text-[#4A4A3C] border-t border-[#EDEAE0] pt-2">
                  <span className="text-[#8C8C78]">Qty {o.quantity}</span>
                  <span className="font-medium">
                    {(o.total_pence / 100).toFixed(2)} {o.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#8C8C78]">
                  <span>{new Date(o.created_at).toLocaleString()}</span>
                  {o.status === "paid" && (
                    <button onClick={() => openRefund(o)} className="text-[#B8952F] flex items-center gap-1 text-xs font-medium">
                      <RotateCcw className="h-3.5 w-3.5" /> Refund
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-[#8C8C78]">
              {total} order{total === 1 ? "" : "s"} · page {page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}>
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={offset + LIMIT >= total}
                onClick={() => setOffset((o) => o + LIMIT)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal open={!!refundTarget} onClose={closeRefund} title="Refund order" maxWidth="max-w-md">
        {refundTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#4A4A3C]">
              {refundTarget.full_name} · {refundTarget.quantity} ticket{refundTarget.quantity === 1 ? "" : "s"} · order
              total {formatMoney(refundTarget.total_pence, refundTarget.currency)}
            </p>
            <Input
              label={`Refund amount (${refundTarget.currency.toUpperCase()})`}
              type="number"
              step="0.01"
              min={0.01}
              max={refundTarget.total_pence / 100}
              value={refundAmountInput}
              onChange={(e) => {
                setRefundAmountInput(e.target.value);
                setRefundError(null);
              }}
              error={refundError ?? undefined}
              hint={`Excludes the ${formatMoney(refundTarget.fee_pence, refundTarget.currency)} transaction fee by default. Adjust up to the full total if needed.`}
            />
            <p className="text-xs text-[#8C8C78]">
              This voids all tickets on this order and releases their capacity, regardless of the amount refunded.
              Cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeRefund}>
                Cancel
              </Button>
              <Button type="button" variant="danger" loading={refunding} onClick={handleRefund}>
                Refund
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
