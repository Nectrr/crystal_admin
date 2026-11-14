"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Table";
import { formatMoney } from "@/lib/currency";
import { saveBlob } from "@/lib/api/orders";
import type { StopRevenue } from "@/lib/api/dashboard";

type SortKey = "event" | "city" | "date" | "tickets_sold" | "gross_pence" | "refunded_pence" | "net_pence";

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "event", label: "Event" },
  { key: "city", label: "City" },
  { key: "date", label: "Date" },
  { key: "tickets_sold", label: "Tickets", numeric: true },
  { key: "gross_pence", label: "Gross", numeric: true },
  { key: "refunded_pence", label: "Refunded", numeric: true },
  { key: "net_pence", label: "Net", numeric: true },
];

function value(r: StopRevenue, key: SortKey): string | number {
  switch (key) {
    case "event":
      return `${r.artist_name} ${r.tour_name}`.toLowerCase();
    case "city":
      return r.city_name.toLowerCase();
    case "date":
      return r.event_start_at ? new Date(r.event_start_at).getTime() : 0;
    default:
      return r[key];
  }
}

/**
 * Ticket revenue per event and city, sortable by any column and filterable
 * by event. Money is grouped per currency, so totals never mix £ and ₦.
 */
export function RevenueByStopTable({ rows }: { rows: StopRevenue[] }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "net_pence", desc: true });
  const [showId, setShowId] = useState("");

  const shows = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.show_id, `${r.artist_name} — ${r.tour_name}`));
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const visible = useMemo(() => {
    const list = rows.filter((r) => !showId || r.show_id === showId);
    return [...list].sort((a, b) => {
      const va = value(a, sort.key);
      const vb = value(b, sort.key);
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.desc ? -c : c;
    });
  }, [rows, showId, sort]);

  const totals = useMemo(() => {
    const m = new Map<string, { tickets: number; gross: number; refunded: number; net: number }>();
    visible.forEach((r) => {
      const t = m.get(r.currency) ?? { tickets: 0, gross: 0, refunded: 0, net: 0 };
      t.tickets += r.tickets_sold;
      t.gross += r.gross_pence;
      t.refunded += r.refunded_pence;
      t.net += r.net_pence;
      m.set(r.currency, t);
    });
    return Array.from(m.entries());
  }, [visible]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: COLUMNS.find((c) => c.key === key)?.numeric ?? false }));
  }

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Event", "City", "Date", "Currency", "Paid orders", "Tickets", "Gross", "Refunded", "Net"].map(esc).join(","),
      ...visible.map((r) =>
        [
          `${r.artist_name} — ${r.tour_name}`,
          r.city_name,
          r.event_start_at ? new Date(r.event_start_at).toISOString().slice(0, 10) : "",
          r.currency.toUpperCase(),
          r.paid_orders,
          r.tickets_sold,
          (r.gross_pence / 100).toFixed(2),
          (r.refunded_pence / 100).toFixed(2),
          (r.net_pence / 100).toFixed(2),
        ]
          .map(esc)
          .join(",")
      ),
    ];
    saveBlob(
      new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
      `revenue-by-city-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#4A4A3C]">Revenue by event &amp; city</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={showId} onChange={(e) => setShowId(e.target.value)} aria-label="Filter by event">
            <option value="">All events</option>
            {shows.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Button type="button" variant="secondary" onClick={exportCsv} disabled={visible.length === 0}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState message="No revenue recorded yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#EDEAE0] bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#FAF8F2] text-xs uppercase text-[#8C8C78]">
              <tr>
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key;
                  const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
                  return (
                    <th key={c.key} className={`px-4 py-2 ${c.numeric ? "text-right" : "text-left"}`}>
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`inline-flex items-center gap-1 uppercase ${active ? "text-[#4A4A3C]" : ""}`}
                      >
                        {c.label}
                        <Icon className="h-3 w-3" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={`${r.show_id}-${r.tour_stop_id ?? "none"}-${r.currency}`} className="border-t border-[#EDEAE0]">
                  <td className="px-4 py-2 text-[#4A4A3C]">
                    <p className="font-medium">{r.artist_name}</p>
                    <p className="text-xs text-[#8C8C78]">{r.tour_name}</p>
                  </td>
                  <td className="px-4 py-2 text-[#4A4A3C]">{r.city_name}</td>
                  <td className="px-4 py-2 text-[#8C8C78]">
                    {r.event_start_at
                      ? new Date(r.event_start_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.tickets_sold}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.gross_pence, r.currency)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-red-600">
                    {r.refunded_pence ? formatMoney(r.refunded_pence, r.currency) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">{formatMoney(r.net_pence, r.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {totals.map(([cur, t]) => (
                <tr key={cur} className="border-t-2 border-[#EDEAE0] bg-[#FAF8F2] font-semibold text-[#4A4A3C]">
                  <td className="px-4 py-2" colSpan={3}>
                    Total{totals.length > 1 ? ` (${cur.toUpperCase()})` : ""}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{t.tickets}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(t.gross, cur)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-red-600">{t.refunded ? formatMoney(t.refunded, cur) : "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(t.net, cur)}</td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
