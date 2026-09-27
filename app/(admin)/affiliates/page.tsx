"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, Badge } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { AffiliateFormModal } from "@/components/affiliates/AffiliateFormModal";
import { listAffiliates, type AffiliateWithSummary } from "@/lib/api/affiliates";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/currency";
import { useToast } from "@/app/providers/ToastProvider";

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setAffiliates(await listAffiliates());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load affiliates.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalOwed = affiliates.reduce((sum, a) => sum + a.summary.balance_pence, 0);
  const totalEarned = affiliates.reduce((sum, a) => sum + a.summary.earned_pence, 0);
  const totalSales = affiliates.reduce((sum, a) => sum + a.summary.sales_pence, 0);

  const columns: DataTableColumn<AffiliateWithSummary>[] = [
    {
      key: "name",
      header: "Affiliate",
      accessor: (a) => a.name,
      sortable: true,
      searchable: true,
      render: (a) => (
        <div>
          <Link href={`/affiliates/${a.id}`} className="font-medium text-[#4A4A3C] hover:text-[#B8952F]">
            {a.name}
          </Link>
          {(a.email || a.phone) && <p className="text-xs text-[#8C8C78]">{a.email || a.phone}</p>}
        </div>
      ),
    },
    { key: "links", header: "Links", accessor: (a) => a.link_count, sortable: true },
    {
      key: "orders",
      header: "Paid orders",
      accessor: (a) => a.summary.paid_orders,
      sortable: true,
      render: (a) => (
        <span>
          {a.summary.paid_orders} <span className="text-[#8C8C78]">({a.summary.tickets} tickets)</span>
        </span>
      ),
    },
    {
      key: "sales",
      header: "Sales",
      accessor: (a) => a.summary.sales_pence,
      sortable: true,
      render: (a) => <>{formatMoney(a.summary.sales_pence, a.currency)}</>,
    },
    {
      key: "earned",
      header: "Commission earned",
      accessor: (a) => a.summary.earned_pence,
      sortable: true,
      render: (a) => <>{formatMoney(a.summary.earned_pence, a.currency)}</>,
    },
    {
      key: "paid_out",
      header: "Paid out",
      accessor: (a) => a.summary.paid_out_pence,
      sortable: true,
      render: (a) => <>{formatMoney(a.summary.paid_out_pence, a.currency)}</>,
    },
    {
      key: "balance",
      header: "Balance owed",
      accessor: (a) => a.summary.balance_pence,
      sortable: true,
      render: (a) => (
        <span className={a.summary.balance_pence > 0 ? "font-semibold text-[#B8952F]" : "text-[#8C8C78]"}>
          {formatMoney(a.summary.balance_pence, a.currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (a) => (a.is_active ? 1 : 0),
      sortable: true,
      render: (a) => (a.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <Link href={`/affiliates/${a.id}`} className="text-[#B8952F] hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Affiliates"
        description="People who help sell tickets through their own links, and what you owe them"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New affiliate
          </Button>
        }
      />

      {!loading && affiliates.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryTile label="Sales through affiliates" value={formatMoney(totalSales, "gbp")} />
          <SummaryTile label="Commission earned" value={formatMoney(totalEarned, "gbp")} />
          <SummaryTile label="Total balance owed" value={formatMoney(totalOwed, "gbp")} highlight={totalOwed > 0} />
        </div>
      )}

      {!loading && affiliates.length === 0 ? (
        <EmptyState
          title="No affiliates yet"
          message="Add someone who wants to help sell tickets, then generate a referral link for them."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={affiliates}
          rowKey={(a) => a.id}
          loading={loading}
          skeletonCols={8}
          searchPlaceholder="Search affiliates..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      <AffiliateFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(created) => setAffiliates((prev) => [created, ...prev])}
      />
    </div>
  );
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-[#EDEAE0] bg-white px-4 py-3">
      <p className="text-xs text-[#8C8C78]">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${highlight ? "text-[#B8952F]" : "text-[#4A4A3C]"}`}>{value}</p>
    </div>
  );
}
