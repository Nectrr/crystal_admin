"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { getShow, type TourStop } from "@/lib/api/shows";
import {
  exportReportCsv,
  getAttendanceReport,
  listReportTickets,
  type AttendanceReport,
  type ReportCounts,
  type ReportState,
  type ReportTicket,
} from "@/lib/api/report";
import { useToast } from "@/app/providers/ToastProvider";

const PAGE = 50;

function pct(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "—";
}

function fmtDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function fmtTime(iso?: string | null) {
  return iso
    ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
}

/**
 * Attendance report for a show: scanned vs not-scanned tickets, broken down
 * by tour stop and tier, arrivals over time, and a filterable ticket list
 * with CSV export.
 */
export function ReportTab({ showId }: { showId: string }) {
  const { showError } = useToast();

  const [stops, setStops] = useState<TourStop[]>([]);
  const [stopId, setStopId] = useState("");
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [state, setState] = useState<ReportState | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [tickets, setTickets] = useState<ReportTicket[] | null>(null);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getShow(showId)
      .then((s) => setStops(s.tour_stops ?? []))
      .catch(() => setStops([]));
  }, [showId]);

  const loadReport = useCallback(() => {
    setReport(null);
    getAttendanceReport(showId, stopId)
      .then(setReport)
      .catch((err) => showError(err instanceof ApiError ? err.message : "Failed to load report."));
  }, [showId, stopId, showError]);

  const loadTickets = useCallback(() => {
    setTickets(null);
    listReportTickets(showId, {
      tour_stop_id: stopId || undefined,
      state: state || undefined,
      q: search || undefined,
      limit: PAGE,
      offset,
    })
      .then((r) => {
        setTickets(r.items);
        setTotal(r.total);
      })
      .catch((err) => {
        setTickets([]);
        showError(err instanceof ApiError ? err.message : "Failed to load tickets.");
      });
  }, [showId, stopId, state, search, offset, showError]);

  useEffect(loadReport, [loadReport]);
  useEffect(loadTickets, [loadTickets]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setOffset(0);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  async function handleExport() {
    setExporting(true);
    try {
      const city = stops.find((s) => s.id === stopId)?.city_name ?? "all-stops";
      await exportReportCsv(
        showId,
        { tour_stop_id: stopId || undefined, state: state || undefined, q: search || undefined },
        [city, state || "all"].join(" ")
      );
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const s = report?.summary;
  const maxArrivals = Math.max(1, ...(report?.arrivals.map((a) => a.count) ?? [1]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Tour stop"
          value={stopId}
          onChange={(e) => {
            setOffset(0);
            setStopId(e.target.value);
          }}
        >
          <option value="">All tour stops</option>
          {stops.map((st) => (
            <option key={st.id} value={st.id}>
              {st.city_name}
              {st.venue_name ? ` — ${st.venue_name}` : ""}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            loadReport();
            loadTickets();
          }}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* 1. Summary */}
      {!s ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#B8952F]" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Tickets issued" value={s.issued} />
          <Stat label="Scanned in" value={s.scanned} sub={pct(s.scanned, s.issued)} tone="green" />
          <Stat label="Not scanned" value={s.not_scanned} sub={pct(s.not_scanned, s.issued)} />
          <Stat label="Void / refunded" value={s.void} tone="red" />
          <Stat label="Paid / complimentary" value={`${s.paid} / ${s.comp}`} />
        </div>
      )}

      {/* 2. Per-stop breakdown */}
      {report && (
        <section className="overflow-x-auto rounded-xl border border-[#EDEAE0] bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#FAF8F2] text-left text-xs uppercase text-[#8C8C78]">
              <tr>
                <th className="px-4 py-2">Stop</th>
                <th className="px-4 py-2">Date</th>
                <Num head>Issued</Num>
                <Num head>Scanned</Num>
                <Num head>Not scanned</Num>
                <Num head>% in</Num>
                <Num head>Void</Num>
              </tr>
            </thead>
            <tbody>
              {report.stops.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[#8C8C78]">
                    No tickets yet.
                  </td>
                </tr>
              )}
              {report.stops.map((st) => {
                const key = st.tour_stop_id ?? "none";
                const open = expanded[key];
                return (
                  <Fragment key={key}>
                    <tr className="border-t border-[#EDEAE0]">
                      <td className="px-4 py-2 font-medium text-[#4A4A3C]">
                        <button
                          className="flex items-center gap-1"
                          onClick={() => setExpanded((e) => ({ ...e, [key]: !open }))}
                          title="Show tiers"
                        >
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {st.city_name}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-[#8C8C78]">{fmtDate(st.event_start_at)}</td>
                      <CountCells c={st} />
                    </tr>
                    {open &&
                      st.tiers.map((t) => (
                        <tr key={t.tier_name} className="bg-[#FDFCF8] text-[#8C8C78]">
                          <td className="py-1.5 pl-10 pr-4" colSpan={2}>
                            {t.tier_name}
                          </td>
                          <CountCells c={t} />
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* 4. Arrivals */}
      {report && (
        <section className="rounded-xl border border-[#EDEAE0] bg-white p-5">
          <h3 className="mb-1 text-base font-semibold text-[#4A4A3C]">Arrivals</h3>
          <p className="mb-4 text-xs text-[#8C8C78]">
            Scans per 15 minutes.
            {report.scanned_without_time > 0 &&
              ` ${report.scanned_without_time} ticket${report.scanned_without_time === 1 ? " was" : "s were"} scanned before scan times were recorded and aren't shown.`}
          </p>
          {report.arrivals.length === 0 ? (
            <p className="text-sm text-[#8C8C78]">No timed scans yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {report.arrivals.map((a) => (
                <div key={a.start} className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 text-right text-[#8C8C78]">{fmtTime(a.start)}</span>
                  <div className="h-4 flex-1">
                    <div
                      className="h-4 rounded bg-[#B8952F]"
                      style={{ width: `${Math.max(2, (a.count / maxArrivals) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-[#4A4A3C]">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Ticket list */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Status"
            value={state}
            onChange={(e) => {
              setOffset(0);
              setState(e.target.value as ReportState | "");
            }}
          >
            <option value="">All</option>
            <option value="scanned">Scanned</option>
            <option value="not_scanned">Not scanned</option>
            <option value="void">Void</option>
          </Select>
          <Input
            label="Search"
            placeholder="Name, email or ticket code"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="button" variant="secondary" className="ml-auto" loading={exporting} onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#EDEAE0] bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[#FAF8F2] text-left text-xs uppercase text-[#8C8C78]">
              <tr>
                <th className="px-4 py-2">Attendee</th>
                <th className="px-4 py-2">Stop / tier</th>
                <th className="px-4 py-2">Ticket</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Scanned</th>
              </tr>
            </thead>
            <tbody>
              {tickets === null ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#B8952F]" />
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#8C8C78]">
                    No tickets match.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.ticket_id} className="border-t border-[#EDEAE0]">
                    <td className="px-4 py-2">
                      <p className="font-medium text-[#4A4A3C]">{t.full_name}</p>
                      <p className="text-xs text-[#8C8C78]">{t.email}</p>
                    </td>
                    <td className="px-4 py-2 text-[#4A4A3C]">
                      {t.city_name ?? "—"}
                      <p className="text-xs text-[#8C8C78]">
                        {t.tier_name ?? "Standard"}
                        {t.source === "admin_comp" && " · Complimentary"}
                      </p>
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-mono text-xs text-[#4A4A3C]">{t.ticket_code}</p>
                      {t.order_ticket_count > 1 && (
                        <p className="text-xs text-[#8C8C78]">
                          Ticket {t.ticket_number} of {t.order_ticket_count}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {t.state === "scanned" ? (
                        <Badge color="green">Scanned</Badge>
                      ) : t.state === "void" ? (
                        <Badge color="red">Void</Badge>
                      ) : (
                        <Badge color="gray">Not scanned</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#8C8C78]">
                      {t.state === "scanned" && (t.scanned_at ? fmtTime(t.scanned_at) : "Time not recorded")}
                      {t.scanned_by && <p>by {t.scanned_by}</p>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE && (
          <div className="flex items-center justify-between text-sm text-[#8C8C78]">
            <span>
              {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                Previous
              </Button>
              <Button variant="secondary" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "green" | "red";
}) {
  const color = tone === "green" ? "text-green-700" : tone === "red" ? "text-red-600" : "text-[#4A4A3C]";
  return (
    <div className="rounded-xl border border-[#EDEAE0] bg-white p-4">
      <p className="text-xs text-[#8C8C78]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[#8C8C78]">{sub}</p>}
    </div>
  );
}

function Num({ children, head }: { children: React.ReactNode; head?: boolean }) {
  return head ? <th className="px-4 py-2 text-right">{children}</th> : <td className="px-4 py-2 text-right">{children}</td>;
}

function CountCells({ c }: { c: ReportCounts }) {
  return (
    <>
      <Num>{c.issued}</Num>
      <Num>{c.scanned}</Num>
      <Num>{c.not_scanned}</Num>
      <Num>{pct(c.scanned, c.issued)}</Num>
      <Num>{c.void}</Num>
    </>
  );
}
