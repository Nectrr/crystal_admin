import { apiFetch } from "./client";

export interface PrivateLink {
  id: string;
  token: string;
  // Ready-to-share storefront link, built by the API.
  url: string;
  label: string;
  tier_name: string;
  quantity_per_stop: number;
  // Price per charge currency (lowercase), in minor units.
  prices: Record<string, number>;
  max_tickets?: number | null;
  tickets_used: number;
  expires_at?: string | null;
  revoked_at?: string | null;
  stop_count: number;
  created_at: string;
  updated_at: string;
}

export interface SkippedStop {
  tour_stop_id: string;
  artist_name: string;
  city_name: string;
  currency: string;
}

export interface ApplyResult {
  link: PrivateLink;
  tiers_created: number;
  skipped_stops: SkippedStop[];
}

export interface PrivateLinkEvent {
  show_slug: string;
  artist_name: string;
  tour_name: string;
  tour_stop_id: string;
  city_name: string;
  event_start_at?: string | null;
  tier_id: string;
  tier_name: string;
  price_pence: number;
  fee_pence: number;
  currency: string;
  remaining: number;
}

export interface PrivateLinkInput {
  label: string;
  tier_name: string;
  quantity_per_stop: number;
  prices: Record<string, number>;
  max_tickets?: number;
  expires_at?: string;
}

export interface PrivateLinkUpdate {
  label?: string;
  max_tickets?: number;
  expires_at?: string;
  clear_max_tickets?: boolean;
  clear_expires_at?: boolean;
}

export type PrivateLinkStatus = "active" | "expired" | "used_up" | "revoked";

export function privateLinkStatus(l: PrivateLink): PrivateLinkStatus {
  if (l.revoked_at) return "revoked";
  if (l.expires_at && new Date(l.expires_at) <= new Date()) return "expired";
  if (l.max_tickets != null && l.tickets_used >= l.max_tickets) return "used_up";
  return "active";
}

export async function listPrivateLinks(): Promise<PrivateLink[]> {
  const data = await apiFetch<PrivateLink[] | null>("/api/admin/private-links", { method: "GET" });
  return data ?? [];
}

export function getPrivateLink(id: string) {
  return apiFetch<PrivateLink>(`/api/admin/private-links/${id}`, { method: "GET" });
}

export async function listPrivateLinkEvents(id: string): Promise<PrivateLinkEvent[]> {
  const data = await apiFetch<PrivateLinkEvent[] | null>(`/api/admin/private-links/${id}/events`, { method: "GET" });
  return data ?? [];
}

export function createPrivateLink(data: PrivateLinkInput) {
  return apiFetch<ApplyResult>("/api/admin/private-links", { method: "POST", body: data });
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

export function syncPrivateLink(id: string) {
  return apiFetch<ApplyResult>(`/api/admin/private-links/${id}/sync`, { method: "POST" });
}
