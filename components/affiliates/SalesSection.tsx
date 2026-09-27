"use client";

import { useEffect, useState } from "react";
import { Badge, EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { formatMoney } from "@/lib/currency";
import type { OrderStatus } from "@/lib/api/orders";
import { listSales, type AffiliateSale } from "@/lib/api/affiliates";

const PAGE_LIMIT = 200;

const STATUS_COLOR: Record<OrderStatus, "gold" | "green" | "red" | "gray"> = {
  paid: "green",
  pending: "gold",
  failed: "red",
  sold_out: "red",
  refunded: "gray",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  sold_out: "Sold out",
  refunded: "Refunded",
};

interface SalesSectionProps {
  affiliateId: string;
  // Bumped by the parent whenever something that could change sales happens
  // (e.g. a link was edited), to force a reload.
  refreshKey?: number;
}

export function SalesSection({ affiliateId, refreshKey = 0 }: SalesSectionProps) {
  const { showError } = useToast();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [sales, setSales] = useState<AffiliateSale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await listSales(affiliateId, { status: status || undefined, limit: PAGE_LIMIT });
        if (cancelled) return;
        setSales(res.sales);
        setTotal(res.total);
      } catch (err) {
        if (!cancelled) showError(err instanceof ApiError ? err.message : "Failed to load sales.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliateId, status, refreshKey]);

  const columns: DataTableColumn<AffiliateSale>[] = [
    {
      key: "buyer",
      header: "Buyer",
      accessor: (s) => s.full_name,
      sortable: true,
      searchable: true,
      render: (s) => (
        <div>
          <p className="font-medium text-[#4A4A3C]">{s.full_name}</p>
          <p className="text-xs text-[#8C8C78]">{s.email}</p>
        </div>
      ),
    },
    {
      key: "event",
      header: "Show",
      accessor: (s) => `${s.artist_name} ${s.city_name ?? ""}`,
      searchable: true,
      render: (s) => (
        <div>
          <p>
            {s.artist_name}
            {s.city_name ? ` · ${s.city_name}` : ""}
          </p>
          {s.tier_name && <p className="text-xs text-[#8C8C78]">{s.tier_name}</p>}
        </div>
      ),
    },
    { key: "qty", header: "Qty", accessor: (s) => s.quantity, sortable: true },
    {
      key: "sales",
      header: "Ticket sales",
      accessor: (s) => s.sales_pence,
      sortable: true,
      render: (s) => <>{formatMoney(s.sales_pence, s.currency)}</>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (s) => s.status,
      sortable: true,
      render: (s) => <Badge color={STATUS_COLOR[s.status] ?? "gray"}>{STATUS_LABEL[s.status] ?? s.status}</Badge>,
    },
    {
      key: "commission",
      header: "Commission",
      accessor: (s) => s.commission_pence,
      sortable: true,
      render: (s) => (
        <span className={s.commission_pence > 0 ? "font-medium text-[#4A4A3C]" : "text-[#8C8C78]"}>
          {formatMoney(s.commission_pence, s.currency)}{" "}
          <span className="text-xs text-[#8C8C78]">@ {s.commission_percent}%</span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Ordered",
      accessor: (s) => new Date(s.created_at),
      sortable: true,
      render: (s) => <span className="text-[#8C8C78]">{new Date(s.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#4A4A3C]">Who bought through this affiliate</h2>
          <p className="text-xs text-[#8C8C78]">
            Only paid orders earn commission — pending, failed and refunded orders are listed for reference.
          </p>
        </div>
        <div className="sm:w-44">
          <Select id="sales-status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
            <option value="sold_out">Sold out</option>
          </Select>
        </div>
      </div>

      {!loading && sales.length === 0 ? (
        <EmptyState
          title="No sales yet"
          message="Orders will show up here once someone buys through one of this affiliate's links."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={sales}
          rowKey={(s) => s.order_id}
          loading={loading}
          skeletonCols={7}
          searchPlaceholder="Search buyers..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
      {total > sales.length && (
        <p className="text-xs text-[#8C8C78]">
          Showing the latest {sales.length} of {total} orders.
        </p>
      )}
    </section>
  );
}
