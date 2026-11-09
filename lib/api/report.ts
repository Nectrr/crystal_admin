import { apiFetch, buildQuery } from "./client";
import { saveBlob } from "./orders";

export type ReportState = "scanned" | "not_scanned" | "void";

export interface ReportCounts {
  issued: number;
  scanned: number;
  not_scanned: number;
  void: number;
  comp: number;
  paid: number;
}

export interface ReportStopRow extends ReportCounts {
  tour_stop_id: string | null;
  city_name: string;
  event_start_at?: string | null;
  tiers: (ReportCounts & { tier_name: string })[];
}

export interface AttendanceReport {
  summary: ReportCounts;
  stops: ReportStopRow[];
  arrivals: { start: string; count: number }[];
  scanned_without_time: number;
}

export interface ReportTicket {
  ticket_id: string;
  ticket_code: string;
  state: ReportState;
  scanned_at?: string | null;
  scanned_by?: string | null;
  order_id: string;
  full_name: string;
  email: string;
  tier_name?: string | null;
  city_name?: string | null;
  source: string;
  ticket_number: number;
  order_ticket_count: number;
}

export interface ReportTicketsParams {
  tour_stop_id?: string;
  state?: ReportState;
  q?: string;
  limit?: number;
  offset?: number;
}

export function getAttendanceReport(showId: string, tourStopId?: string) {
  return apiFetch<AttendanceReport>(
    `/api/admin/shows/${showId}/report${buildQuery({ tour_stop_id: tourStopId || undefined })}`,
    { method: "GET" }
  );
}

export function listReportTickets(showId: string, params: ReportTicketsParams) {
  return apiFetch<{ items: ReportTicket[]; total: number }>(
    `/api/admin/shows/${showId}/report/tickets${buildQuery({ ...params })}`,
    { method: "GET" }
  );
}

export async function exportReportCsv(showId: string, params: ReportTicketsParams, label: string) {
  const csv = await apiFetch<string>(
    `/api/admin/shows/${showId}/report/tickets.csv${buildQuery({ ...params, limit: undefined, offset: undefined })}`,
    { method: "GET", rawText: true }
  );
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const stamp = new Date().toISOString().slice(0, 10);
  saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `attendance-${slug}-${stamp}.csv`);
}
