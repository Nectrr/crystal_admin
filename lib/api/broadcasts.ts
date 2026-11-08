import { apiFetch, buildQuery } from "./client";

/** A custom email sent to a show's paid ticket holders, with delivery progress. */
export interface Broadcast {
  id: string;
  show_id: string;
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
