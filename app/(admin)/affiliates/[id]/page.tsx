"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Power, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AffiliateFormModal } from "@/components/affiliates/AffiliateFormModal";
import { LinksSection } from "@/components/affiliates/LinksSection";
import { SalesSection } from "@/components/affiliates/SalesSection";
import { PayoutsSection } from "@/components/affiliates/PayoutsSection";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { formatMoney } from "@/lib/currency";
import {
  deleteAffiliate,
  getAffiliate,
  updateAffiliate,
  type AffiliateDetail,
  type AffiliateLink,
  type AffiliateWithSummary,
} from "@/lib/api/affiliates";

export default function AffiliateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [affiliate, setAffiliate] = useState<AffiliateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setAffiliate(await getAffiliate(params.id));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load affiliate.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Merge a PATCH/edit response (no links in it) into the loaded detail.
  function applySaved(saved: AffiliateWithSummary) {
    setAffiliate((prev) => (prev ? { ...prev, ...saved, links: prev.links } : prev));
  }

  async function handleToggleActive() {
    if (!affiliate) return;
    setToggling(true);
    try {
      const saved = await updateAffiliate(affiliate.id, { is_active: !affiliate.is_active });
      applySaved(saved);
      showSuccess(saved.is_active ? "Affiliate is active again." : "Affiliate deactivated — their links won't credit new sales.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to update affiliate.");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!affiliate) return;
    setDeleting(true);
    try {
      await deleteAffiliate(affiliate.id);
      showSuccess("Affiliate deleted.");
      router.push("/affiliates");
    } catch (err) {
      if (err instanceof ApiError && err.code === "AFFILIATE_HAS_SALES") {
        showError("This affiliate already has sales, so they can't be deleted. Deactivate them instead.");
        setDeleteOpen(false);
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to delete affiliate.");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div>
        <Link href="/affiliates" className="inline-flex items-center gap-1 text-sm text-[#B8952F] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to affiliates
        </Link>
        <p className="mt-4 text-sm text-[#8C8C78]">Affiliate not found.</p>
      </div>
    );
  }

  const { summary, currency } = affiliate;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/affiliates" className="mb-3 inline-flex items-center gap-1 text-sm text-[#B8952F] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to affiliates
        </Link>
        <PageHeader
          title={affiliate.name}
          description={[affiliate.email, affiliate.phone].filter(Boolean).join(" · ") || "No contact details"}
          actions={
            <>
              {affiliate.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
              <Button variant="secondary" loading={toggling} onClick={handleToggleActive}>
                <Power className="h-4 w-4" /> {affiliate.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          }
        />
        {affiliate.notes && <p className="-mt-3 text-sm text-[#8C8C78]">{affiliate.notes}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Paid orders" value={`${summary.paid_orders}`} sub={`${summary.tickets} tickets`} />
        <Tile label="Sales" value={formatMoney(summary.sales_pence, currency)} />
        <Tile label="Commission earned" value={formatMoney(summary.earned_pence, currency)} />
        <Tile label="Paid out" value={formatMoney(summary.paid_out_pence, currency)} />
        <Tile label="Balance owed" value={formatMoney(summary.balance_pence, currency)} highlight={summary.balance_pence > 0} />
      </div>

      <LinksSection
        affiliateId={affiliate.id}
        links={affiliate.links}
        currency={currency}
        onChange={(links: AffiliateLink[]) => setAffiliate((prev) => (prev ? { ...prev, links, link_count: links.length } : prev))}
      />

      <SalesSection affiliateId={affiliate.id} refreshKey={summary.paid_orders} />

      <PayoutsSection affiliateId={affiliate.id} currency={currency} balancePence={summary.balance_pence} onChanged={load} />

      <AffiliateFormModal open={editing} affiliate={affiliate} onClose={() => setEditing(false)} onSaved={applySaved} />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete affiliate"
        message={`Delete ${affiliate.name} and all their links? This can't be undone. If they've made any sales, deactivate them instead.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function Tile({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-[#EDEAE0] bg-white px-4 py-3">
      <p className="text-xs text-[#8C8C78]">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${highlight ? "text-[#B8952F]" : "text-[#4A4A3C]"}`}>{value}</p>
      {sub && <p className="text-xs text-[#8C8C78]">{sub}</p>}
    </div>
  );
}
