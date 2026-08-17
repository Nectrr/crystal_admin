import { apiFetch, buildQuery } from "./client";

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
  created_at: string;
  updated_at: string;
}

export interface ListOrdersParams {
  status?: OrderStatus;
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
