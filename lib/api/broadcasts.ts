import { apiFetch, buildQuery } from "./client";

/** A custom email sent to a show's paid ticket holders, with delivery progress. */
export interface Broadcast {
  id: string;
  /** Null for site-wide emails. */
  show_id?: string | null;
  /** Site-wide emails: the chosen groups, comma-separated. */
  audience?: string | null;
  tour_stop_id?: string | null;
  tour_stop_name?: string | null;
  subject: string;
  body_html: string;
  recipient_count: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
  created_at: string;
}

export interface BroadcastInput {
  /** Omit / null to email ticket holders of every tour stop. */
  tour_stop_id?: string | null;
  subject: string;
  body_html: string;
}

export async function listBroadcasts(showId: string): Promise<Broadcast[]> {
  const data = await apiFetch<Broadcast[] | null>(`/api/admin/shows/${showId}/broadcasts`, { method: "GET" });
  return data ?? [];
}

/** How many distinct paid ticket-holder emails the selection would reach. */
export async function countBroadcastRecipients(showId: string, tourStopId?: string | null): Promise<number> {
  const data = await apiFetch<{ count: number }>(
    `/api/admin/shows/${showId}/broadcasts/recipients${buildQuery({ tour_stop_id: tourStopId ?? undefined })}`,
    { method: "GET" }
  );
  return data.count;
}

export function createBroadcast(showId: string, input: BroadcastInput) {
  return apiFetch<Broadcast>(`/api/admin/shows/${showId}/broadcasts`, { method: "POST", body: input });
}

export function sendTestBroadcast(showId: string, input: BroadcastInput & { email: string }) {
  return apiFetch<void>(`/api/admin/shows/${showId}/broadcasts/test`, { method: "POST", body: input });
}

export function retryBroadcast(showId: string, broadcastId: string) {
  return apiFetch<{ requeued: number }>(`/api/admin/shows/${showId}/broadcasts/${broadcastId}/retry`, {
    method: "POST",
  });
}

export interface FriendOfferInput {
  tour_stop_id: string;
  /** Public ticket type whose price is discounted. */
  source_tier_id: string;
  discount_type: "percent" | "amount";
  /** Percent (1-99) or amount off in minor units (pence). */
  discount_value: number;
  /** Max discounted tickets sold through the link. */
  quantity: number;
  expires_at?: string | null;
  subject: string;
  body_html: string;
}

/** Creates a discounted private link and emails it to the stop's ticket holders. */
export function createFriendOffer(showId: string, input: FriendOfferInput) {
  return apiFetch<{ link: { id: string; url: string; price_pence: number }; broadcast: Broadcast }>(
    `/api/admin/shows/${showId}/friend-offers`,
    { method: "POST", body: input }
  );
}

// ---- Site-wide emails (everyone in the database) ----

export type AudienceKey = "ticket_buyers" | "registrations" | "newsletter" | "merch" | "contacts";

export interface AudienceCounts {
  sources: Record<AudienceKey, number>;
  total: number;
  unsubscribed: number;
}

export interface GlobalBroadcastInput {
  audience: AudienceKey[];
  subject: string;
  body_html: string;
}

export function getGlobalAudience(audience: AudienceKey[]) {
  return apiFetch<AudienceCounts>(
    `/api/admin/broadcasts/audience${buildQuery({ audience: audience.join(",") || undefined })}`,
    { method: "GET" }
  );
}

export async function listGlobalBroadcasts(): Promise<Broadcast[]> {
  return (await apiFetch<Broadcast[] | null>(`/api/admin/broadcasts`, { method: "GET" })) ?? [];
}

export function createGlobalBroadcast(input: GlobalBroadcastInput) {
  return apiFetch<Broadcast>(`/api/admin/broadcasts`, { method: "POST", body: input });
}

export function sendTestGlobalBroadcast(input: GlobalBroadcastInput & { email: string }) {
  return apiFetch<void>(`/api/admin/broadcasts/test`, { method: "POST", body: input });
}

export function retryGlobalBroadcast(broadcastId: string) {
  return apiFetch<{ requeued: number }>(`/api/admin/broadcasts/${broadcastId}/retry`, { method: "POST" });
}
