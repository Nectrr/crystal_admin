import { apiFetch, buildQuery } from "./client";

// A private link is one hidden tier on one event, unlocked by its URL.
export interface PrivateLink {
  id: string;
  token: string;
  // Ready-to-share storefront link, built by the API.
  url: string;
  label: string;

  show_id: string;
  show_slug: string;
  artist_name: string;
  tour_name: string;
  tour_stop_id: string;
  city_name: string;
  event_start_at?: string | null;

  // The public tier it was based on, e.g. "Early Bird".
  source_tier_id?: string | null;
  source_tier_name?: string | null;

  tier_id: string;
  tier_name: string;
  price_pence: number;
  currency: string;
  quantity: number;
  tickets_sold: number;

  expires_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivateLinkInput {
  label: string;
  tour_stop_id: string;
  source_tier_id?: string;
  tier_name: string;
  price_pence: number;
  quantity: number;
  expires_at?: string;
}

export interface PrivateLinkUpdate {
  label?: string;
  tier_name?: string;
  price_pence?: number;
  quantity?: number;
  expires_at?: string;
  clear_expires_at?: boolean;
}

export type PrivateLinkStatus = "active" | "expired" | "sold_out" | "revoked";

export function privateLinkStatus(l: PrivateLink): PrivateLinkStatus {
  if (l.revoked_at) return "revoked";
  if (l.expires_at && new Date(l.expires_at) <= new Date()) return "expired";
  if (l.tickets_sold >= l.quantity) return "sold_out";
  return "active";
}

export async function listPrivateLinks(params: { show_id?: string } = {}): Promise<PrivateLink[]> {
  const data = await apiFetch<PrivateLink[] | null>(`/api/admin/private-links${buildQuery(params)}`, { method: "GET" });
  return data ?? [];
}

export function getPrivateLink(id: string) {
  return apiFetch<PrivateLink>(`/api/admin/private-links/${id}`, { method: "GET" });
}

export function createPrivateLink(data: PrivateLinkInput) {
  return apiFetch<PrivateLink>("/api/admin/private-links", { method: "POST", body: data });
}

export function updatePrivateLink(id: string, data: PrivateLinkUpdate) {
  return apiFetch<PrivateLink>(`/api/admin/private-links/${id}`, { method: "PATCH", body: data });
}

export function regeneratePrivateLink(id: string) {
  return apiFetch<PrivateLink>(`/api/admin/private-links/${id}/regenerate`, { method: "POST" });
}

export function revokePrivateLink(id: string) {
  return apiFetch<PrivateLink>(`/api/admin/private-links/${id}/revoke`, { method: "POST" });
}
