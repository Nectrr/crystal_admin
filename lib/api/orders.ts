import { apiFetch, buildQuery } from "./client";
import { htmlToPdf } from "@/lib/htmlToPdf";

export type OrderStatus = "pending" | "paid" | "failed" | "sold_out" | "refunded";

export interface Order {
  id: string;
  show_id: string;
  tour_stop_id: string;
  full_name: string;
  email: string;
  quantity: number;
  unit_price_pence: number;
  fee_pence: number;
  total_pence: number;
  currency: string;
  status: OrderStatus;
  stripe_payment_intent_id?: string | null;
  failure_reason?: string | null;
  paid_at?: string | null;
  refunded_at?: string | null;
  refunded_pence?: number | null;
  tier_name?: string | null;
  payment_provider?: string;
  /** "checkout" (storefront), "admin_comp" (free) or "admin_invoice" (admin-created, pay by link). */
  source?: OrderSource;
  /** Seats are reserved for an unpaid admin_invoice order until payment_expires_at. */
  capacity_held?: boolean;
  payment_expires_at?: string | null;
  admin_note?: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderSource = "checkout" | "admin_comp" | "admin_invoice";

export interface ManualOrderInput {
  show_id: string;
  tour_stop_id: string;
  tier_id?: string | null;
  quantity: number;
  full_name: string;
  email: string;
  /** "comp" = free and valid now; "invoice" = customer is emailed a pay link, valid once paid. */
  mode: "comp" | "invoice";
  /** Invoice only: override the total (minor units). Omit for tier price × qty + fee. */
  total_pence?: number | null;
  note?: string;
  /** Comp only: send the confirmation + ticket emails. */
  send_email?: boolean;
}

export function createManualOrder(input: ManualOrderInput) {
  return apiFetch<Order>("/api/admin/orders/manual", { method: "POST", body: input });
}

/** Cancels an admin-created order: releases held seats, or voids a comp order's tickets. */
export function cancelManualOrder(id: string) {
  return apiFetch<void>(`/api/admin/orders/${id}/cancel`, { method: "POST" });
}

export function resendPaymentLink(id: string) {
  return apiFetch<void>(`/api/admin/orders/${id}/resend-payment-link`, { method: "POST" });
}

export interface ListOrdersParams {
  status?: OrderStatus;
  /** Server-side search over email, name and order id — covers every page. */
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface ListOrdersResponse {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResponse> {
  const data = await apiFetch<ListOrdersResponse>(`/api/admin/orders${buildQuery({ ...params })}`, {
    method: "GET",
  });
  return { ...data, orders: data.orders ?? [] };
}

export type ExportOrdersParams = Omit<ListOrdersParams, "limit" | "offset"> & { show_id?: string };

/**
 * Downloads every order matching the filters (no paging) as a CSV file.
 * Fetched through apiFetch so the bearer token and refresh-on-401 still
 * apply — a plain <a href> link couldn't carry the Authorization header.
 */
export async function exportOrdersCsv(params: ExportOrdersParams) {
  const csv = await apiFetch<string>(`/api/admin/orders/export${buildQuery({ ...params })}`, {
    method: "GET",
    rawText: true,
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `orders${params.status ? `-${params.status}` : ""}-${stamp}.csv`;
  saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), name);
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface OrderTicket {
  id: string;
  order_id: string;
  ticket_code: string;
  status: TicketStatus;
  email_sent_at?: string | null;
  created_at: string;
}

export async function listOrderTickets(orderId: string): Promise<OrderTicket[]> {
  const data = await apiFetch<OrderTicket[] | null>(`/api/admin/orders/${orderId}/tickets`, { method: "GET" });
  return data ?? [];
}

/**
 * Downloads one ticket as a PDF, in the same design as the ticket email. The
 * API returns the rendered email template; it is converted to PDF in the
 * browser (see lib/htmlToPdf).
 */
export async function downloadTicket(ticket: { id: string; ticket_code: string }) {
  const html = await apiFetch<string>(`/api/admin/tickets/${ticket.id}/download`, { method: "GET", rawText: true });
  saveBlob(await htmlToPdf(html), `ticket-${ticket.ticket_code}.pdf`);
}

/** Downloads every ticket on an order as one PDF, one ticket per page. */
export async function downloadOrderTickets(orderId: string) {
  const html = await apiFetch<string>(`/api/admin/orders/${orderId}/tickets/download`, {
    method: "GET",
    rawText: true,
  });
  saveBlob(await htmlToPdf(html), `tickets-${orderId.slice(0, 8)}.pdf`);
}

// The backend returns 204 No Content on success — no updated order body.
// amountPence is optional; omit it to refund the full order total.
export function refundOrder(id: string, amountPence?: number) {
  return apiFetch<void>(`/api/admin/orders/${id}/refund`, {
    method: "POST",
    body: amountPence != null ? { amount_pence: amountPence } : undefined,
  });
}

export function resendOrderEmail(id: string) {
  return apiFetch<void>(`/api/admin/orders/${id}/resend-email`, { method: "POST" });
}

export type TicketStatus = "valid" | "scanned" | "void";

export interface StopAttendee {
  ticket_id: string;
  ticket_code: string;
  ticket_status: TicketStatus;
  email_sent_at?: string | null;
  order_id: string;
  order_status: OrderStatus;
  full_name: string;
  email: string;
  paid_at?: string | null;
  created_at: string;
  ticket_number: number;
  order_ticket_count: number;
}

export interface NotifyStopOnSaleResponse {
  sent: number;
}

// force=true resends to every registrant, including ones already notified —
// the explicit "resend to everyone again" action. Default (false) only
// reaches registrants who've never been sent this stop's announcement.
export function notifyStopOnSale(showId: string, stopId: string, force = false) {
  return apiFetch<NotifyStopOnSaleResponse>(
    `/api/admin/shows/${showId}/tour-stops/${stopId}/notify-on-sale${force ? "?force=true" : ""}`,
    { method: "POST" }
  );
}

export async function listStopAttendees(showId: string, stopId: string): Promise<StopAttendee[]> {
  const data = await apiFetch<StopAttendee[] | null>(`/api/admin/shows/${showId}/tour-stops/${stopId}/attendees`, {
    method: "GET",
  });
  return data ?? [];
}

/** Manually triggered bulk resend — no scheduling/automation, admin fires this whenever they choose. */
export function sendAllStopTickets(showId: string, stopId: string) {
  return apiFetch<{ sent: number }>(`/api/admin/shows/${showId}/tour-stops/${stopId}/send-tickets`, { method: "POST" });
}

export interface ScanResult {
  ticket: {
    id: string;
    ticket_code: string;
    status: string;
  };
  attendee_name: string;
  attendee_email: string;
  ticket_number: number;
  order_ticket_count: number;
}

export function scanTicket(ticket_code: string) {
  return apiFetch<ScanResult>("/api/admin/tickets/scan", { method: "POST", body: { ticket_code } });
}

/** Read-only ticket status check — does not mark the ticket as scanned. */
export function lookupTicket(ticket_code: string) {
  return apiFetch<ScanResult>(`/api/admin/tickets/lookup/${encodeURIComponent(ticket_code)}`, { method: "GET" });
}
