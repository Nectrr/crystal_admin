"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TH, TD, TR, EmptyState, Badge, TableSkeleton } from "@/components/ui/Table";
import { Select, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { listMerchOrders, type MerchOrder, type MerchOrderStatus } from "@/lib/api/merch";
import { formatMoney } from "@/lib/currency";

const STATUS_COLOR: Record<MerchOrderStatus, "gold" | "green" | "red" | "gray"> = {
  pending: "gold",
  paid: "green",
  failed: "red",
  sold_out: "gray",
  refunded: "gray",
};

const LIMIT = 50;

export default function MerchOrdersPage() {
  const { showError } = useToast();
  const [orders, setOrders] = useState<MerchOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<MerchOrderStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await listMerchOrders({
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, status, from, to]);

  const page = Math.floor(offset / LIMIT) + 1;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  // Search only filters within the currently-loaded server page — pagination/total stay
  // server-driven, matching the ticket orders page's same tradeoff.
  const q = query.trim().toLowerCase();
  const filteredOrders = q
    ? orders.filter((o) => o.full_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
    : orders;

  return (
    <div>
      <PageHeader title="Orders" description="Merch order history" />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setOffset(0);
            setStatus(e.target.value as MerchOrderStatus | "");
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
        <EmptyState title="No orders found" message="Orders will appear here once merch starts selling." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState title="No matches" message="No orders on this page match your search." />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Order</TH>
                  <TH>Buyer</TH>
                  <TH>Items</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </tr>
              </THead>
              <TBody>
                {filteredOrders.map((o) => (
                  <TR key={o.id} className="cursor-pointer">
                    <TD className="font-mono text-xs text-[#B8952F]">
                      <Link href={`/merch/orders/${o.id}`} className="hover:underline">
                        {o.id.slice(0, 8)}
                      </Link>
                    </TD>
                    <TD>
                      <p className="font-medium">{o.full_name}</p>
                      <p className="text-xs text-[#8C8C78]">{o.email}</p>
                    </TD>
                    <TD>{o.item_count}</TD>
                    <TD>{formatMoney(o.subtotal_pence, o.currency)}</TD>
                    <TD>
                      <Badge color={STATUS_COLOR[o.status]}>{o.status}</Badge>
                    </TD>
                    <TD className="text-[#8C8C78]">{new Date(o.created_at).toLocaleString()}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filteredOrders.map((o) => (
              <Link
                key={o.id}
                href={`/merch/orders/${o.id}`}
                className="rounded-lg border border-[#EDEAE0] bg-white p-4 flex flex-col gap-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[#4A4A3C]">{o.full_name}</p>
                    <p className="text-xs text-[#8C8C78]">{o.email}</p>
                  </div>
                  <Badge color={STATUS_COLOR[o.status]}>{o.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-[#4A4A3C] border-t border-[#EDEAE0] pt-2">
                  <span className="text-[#8C8C78]">
                    {o.item_count} item{o.item_count === 1 ? "" : "s"}
                  </span>
                  <span className="font-medium">{formatMoney(o.subtotal_pence, o.currency)}</span>
                </div>
                <p className="text-xs text-[#8C8C78]">{new Date(o.created_at).toLocaleString()}</p>
              </Link>
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
              <Button variant="secondary" disabled={offset + LIMIT >= total} onClick={() => setOffset((o) => o + LIMIT)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
