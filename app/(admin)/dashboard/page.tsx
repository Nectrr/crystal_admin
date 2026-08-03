"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Users, Newspaper, Ticket, MapPin, Mail, Wallet, Undo2, RotateCcw, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD, EmptyState, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { getDashboardStats, type DashboardStats } from "@/lib/api/dashboard";
import type { OrderStatus } from "@/lib/api/orders";
import { listNotificationFailures, retryNotification, type FailedNotification } from "@/lib/api/notifications";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";

const TILES: { key: keyof Omit<DashboardStats, "payments">; label: string; icon: typeof LayoutGrid }[] = [
  { key: "active_shows", label: "Active Shows", icon: Ticket },
  { key: "active_artists", label: "Active Artists", icon: Users },
  { key: "published_articles", label: "Published Articles", icon: Newspaper },
  { key: "show_registrations", label: "Show Registrations", icon: LayoutGrid },
  { key: "tour_registrations", label: "Tour Registrations", icon: MapPin },
  { key: "newsletter_subscribers", label: "Newsletter Subscribers", icon: Mail },
];

const STATUS_BADGE: Record<OrderStatus, "gold" | "green" | "red" | "gray"> = {
  pending: "gold",
  paid: "green",
  failed: "red",
  sold_out: "gray",
  refunded: "red",
};

function formatMoney(pence: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(pence / 100);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<FailedNotification[] | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setStats(await getDashboardStats());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    })();
    loadFailures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFailures() {
    try {
      setFailures(await listNotificationFailures());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load failed sends.");
      setFailures([]);
    }
  }

  async function handleRetry(id: string) {
    setRetryingId(id);
    try {
      await retryNotification(id);
      setFailures((prev) => prev?.filter((f) => f.id !== id) ?? prev);
      showSuccess("Queued for retry.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to retry.");
    } finally {
      setRetryingId(null);
    }
  }

  const payments = stats?.payments;
  const primaryCurrency = payments?.revenue_by_show[0]?.currency ?? "gbp";
  const netRevenuePence = payments ? payments.total_revenue_pence - payments.refunds.total_pence : 0;
  const maxShowRevenue = payments ? Math.max(1, ...payments.revenue_by_show.map((r) => r.total_pence)) : 1;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <PageHeader title="Dashboard" description="Overview of CrystalCity activity" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TILES.map((tile) => (
              <div key={tile.key} className="rounded-xl border border-[#EDEAE0] bg-white p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-[#EDEAE0] animate-skeleton shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-6 w-16 rounded bg-[#EDEAE0] animate-skeleton" />
                  <div className="h-3 w-24 rounded bg-[#EDEAE0] animate-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <div
                  key={tile.key}
                  className="group rounded-xl border border-[#EDEAE0] bg-white p-5 flex items-center gap-4 shadow-sm transition-shadow hover:shadow-md hover:border-[#B8952F]/30"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F5E9CE] shrink-0 transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5 text-[#B8952F]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold text-[#4A4A3C] tabular-nums">{stats?.[tile.key] ?? "-"}</p>
                    <p className="text-sm text-[#8C8C78] truncate">{tile.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !payments && stats && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-[#4A4A3C]">Payments</h2>
          <EmptyState
            title="No payment data yet"
            message="This account's dashboard response doesn't include a payments overview yet."
          />
        </div>
      )}

      {!loading && payments && (
        <div className="flex flex-col gap-6">
          <h2 className="text-base font-semibold text-[#4A4A3C]">Payments</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#EDEAE0] bg-white p-5">
              <div className="flex items-center gap-2 text-[#8C8C78] text-sm mb-2">
                <Wallet className="h-4 w-4 text-[#B8952F]" /> Gross revenue
              </div>
              <p className="text-2xl font-semibold text-[#4A4A3C] tabular-nums">
                {formatMoney(payments.total_revenue_pence, primaryCurrency)}
              </p>
            </div>
            <div className="rounded-xl border border-[#EDEAE0] bg-white p-5">
              <div className="flex items-center gap-2 text-[#8C8C78] text-sm mb-2">
                <Wallet className="h-4 w-4 text-[#B8952F]" /> Net revenue
              </div>
              <p className="text-2xl font-semibold text-[#4A4A3C] tabular-nums">
                {formatMoney(netRevenuePence, primaryCurrency)}
              </p>
              <p className="text-xs text-[#8C8C78] mt-1">Gross minus refunds</p>
            </div>
            <div className="rounded-xl border border-[#EDEAE0] bg-white p-5">
              <div className="flex items-center gap-2 text-[#8C8C78] text-sm mb-2">
                <Undo2 className="h-4 w-4 text-[#B8952F]" /> Refunds
              </div>
              <p className="text-2xl font-semibold text-[#4A4A3C] tabular-nums">
                {formatMoney(payments.refunds.total_pence, primaryCurrency)}
              </p>
              <p className="text-xs text-[#8C8C78] mt-1">{payments.refunds.count} refunded orders</p>
            </div>
            <div className="rounded-xl border border-[#EDEAE0] bg-white p-5">
              <p className="text-[#8C8C78] text-sm mb-2">Orders by status</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(payments.orders_by_status).length === 0 ? (
                  <span className="text-sm text-[#8C8C78]">No orders yet</span>
                ) : (
                  (Object.entries(payments.orders_by_status) as [OrderStatus, number][]).map(([status, count]) => (
                    <Badge key={status} color={STATUS_BADGE[status] ?? "gray"}>
                      {status.replace("_", " ")}: {count}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-[#4A4A3C] mb-3">Revenue by show</h3>
              {payments.revenue_by_show.length === 0 ? (
                <EmptyState message="No revenue recorded yet." />
              ) : (
                <div className="flex flex-col gap-2">
                  {payments.revenue_by_show.map((r) => (
                    <div key={`${r.show_id}-${r.currency}`} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-[#4A4A3C] truncate">{r.artist_name}</span>
                      <div className="flex-1 h-3 rounded-full bg-[#F5E9CE]/60 overflow-hidden">
                        <div
                          className="h-full bg-[#B8952F] rounded-full"
                          style={{ width: `${(r.total_pence / maxShowRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-sm text-[#8C8C78] tabular-nums">
                        {formatMoney(r.total_pence, r.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#4A4A3C] mb-3">Recent transactions</h3>
              {payments.recent_transactions.length === 0 ? (
                <EmptyState message="No transactions yet." />
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <TH>Buyer</TH>
                      <TH>Show</TH>
                      <TH>Total</TH>
                      <TH>Status</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {payments.recent_transactions.map((t) => (
                      <TR key={t.id}>
                        <TD>
                          <div>{t.full_name}</div>
                          <div className="text-xs text-[#8C8C78]">{t.email}</div>
                        </TD>
                        <TD className="text-[#8C8C78]">{t.artist_name}</TD>
                        <TD className="tabular-nums">{formatMoney(t.total_pence, t.currency)}</TD>
                        <TD>
                          <Badge color={STATUS_BADGE[t.status] ?? "gray"}>{t.status.replace("_", " ")}</Badge>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${failures && failures.length > 0 ? "text-red-600" : "text-[#8C8C78]"}`} />
          <h2 className="text-base font-semibold text-[#4A4A3C]">Failed ticket-on-sale emails</h2>
        </div>
        {failures === null ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 rounded-full border-2 border-[#EDEAE0] border-t-[#B8952F] animate-spin" />
          </div>
        ) : failures.length === 0 ? (
          <EmptyState message="No failed sends right now — every announcement email that's been attempted has gone out successfully." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Recipient</TH>
                <TH>Show / City</TH>
                <TH>Error</TH>
                <TH>Attempts</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {failures.map((f) => (
                <TR key={f.id}>
                  <TD>
                    <div>{f.full_name}</div>
                    <div className="text-xs text-[#8C8C78]">{f.email}</div>
                  </TD>
                  <TD className="text-[#8C8C78]">
                    {f.artist_name} — {f.tour_name} ({f.city_name})
                  </TD>
                  <TD className="text-red-700 text-xs max-w-xs">
                    <span className="block truncate" title={f.error}>
                      {f.error}
                    </span>
                  </TD>
                  <TD>{f.attempts}</TD>
                  <TD>
                    <Button
                      variant="secondary"
                      className="!px-2 !py-1 text-xs"
                      loading={retryingId === f.id}
                      onClick={() => handleRetry(f.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retry
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
