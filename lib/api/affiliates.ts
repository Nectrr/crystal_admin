import { apiFetch, buildQuery } from "./client";
import type { OrderStatus } from "./orders";

export interface AffiliateSummary {
  paid_orders: number;
  tickets: number;
  sales_pence: number;
  earned_pence: number;
  paid_out_pence: number;
  // earned - paid out
  balance_pence: number;
}

export interface Affiliate {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AffiliateWithSummary extends Affiliate {
  link_count: number;
  currency: string;
  summary: AffiliateSummary;
}

export interface AffiliateLink {
  id: string;
  affiliate_id: string;
  code: string;
  show_id?: string | null;
  tour_stop_id?: string | null;
  commission_percent: number;
  is_active: boolean;
  // Ready-to-share storefront link, built by the API.
  url: string;
  artist_name?: string | null;
  tour_name?: string | null;
  city_name?: string | null;
  paid_orders: number;
  sales_pence: number;
  earned_pence: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateDetail extends AffiliateWithSummary {
  links: AffiliateLink[];
}

export interface AffiliateSale {
  order_id: string;
  link_code: string;
  full_name: string;
  email: string;
  artist_name: string;
  tour_name: string;
  city_name?: string | null;
  tier_name?: string | null;
  quantity: number;
  // Ticket price x quantity, excluding the transaction fee.
  sales_pence: number;
  total_pence: number;
  currency: string;
  status: OrderStatus;
  commission_percent: number;
  // 0 unless the order is paid.
  commission_pence: number;
  paid_at?: string | null;
  created_at: string;
}

export interface AffiliateSalesResponse {
  sales: AffiliateSale[];
  total: number;
  limit: number;
  offset: number;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount_pence: number;
  method?: string | null;
  reference?: string | null;
  note?: string | null;
  paid_at: string;
  created_at: string;
}

export interface AffiliateInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface LinkInput {
  show_id?: string;
  tour_stop_id?: string;
  commission_percent: number;
  code?: string;
}

export interface PayoutInput {
  amount_pence: number;
  method?: string;
  reference?: string;
  note?: string;
  paid_at?: string;
}

export async function listAffiliates(): Promise<AffiliateWithSummary[]> {
  const data = await apiFetch<AffiliateWithSummary[] | null>("/api/admin/affiliates", { method: "GET" });
  return data ?? [];
}

export function getAffiliate(id: string) {
  return apiFetch<AffiliateDetail>(`/api/admin/affiliates/${id}`, { method: "GET" });
}

export function createAffiliate(data: AffiliateInput) {
  return apiFetch<AffiliateWithSummary>("/api/admin/affiliates", { method: "POST", body: data });
}

export function updateAffiliate(id: string, data: Partial<AffiliateInput & { is_active: boolean }>) {
  return apiFetch<AffiliateWithSummary>(`/api/admin/affiliates/${id}`, { method: "PATCH", body: data });
}

export function deleteAffiliate(id: string) {
  return apiFetch<void>(`/api/admin/affiliates/${id}`, { method: "DELETE" });
}

export function createLink(affiliateId: string, data: LinkInput) {
  return apiFetch<AffiliateLink>(`/api/admin/affiliates/${affiliateId}/links`, { method: "POST", body: data });
}

export function updateLink(
  affiliateId: string,
  linkId: string,
  data: Partial<{ commission_percent: number; is_active: boolean }>
) {
  return apiFetch<AffiliateLink>(`/api/admin/affiliates/${affiliateId}/links/${linkId}`, { method: "PATCH", body: data });
}

export function deleteLink(affiliateId: string, linkId: string) {
  return apiFetch<void>(`/api/admin/affiliates/${affiliateId}/links/${linkId}`, { method: "DELETE" });
}

export function listSales(affiliateId: string, params: { status?: OrderStatus; limit?: number; offset?: number } = {}) {
  return apiFetch<AffiliateSalesResponse>(`/api/admin/affiliates/${affiliateId}/sales${buildQuery(params)}`, {
    method: "GET",
  });
}

export async function listPayouts(affiliateId: string): Promise<AffiliatePayout[]> {
  const data = await apiFetch<AffiliatePayout[] | null>(`/api/admin/affiliates/${affiliateId}/payouts`, {
    method: "GET",
  });
  return data ?? [];
}

export function createPayout(affiliateId: string, data: PayoutInput) {
  return apiFetch<AffiliatePayout>(`/api/admin/affiliates/${affiliateId}/payouts`, { method: "POST", body: data });
}

export function deletePayout(affiliateId: string, payoutId: string) {
  return apiFetch<void>(`/api/admin/affiliates/${affiliateId}/payouts/${payoutId}`, { method: "DELETE" });
}
