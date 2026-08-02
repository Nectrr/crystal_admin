import { apiFetch } from "./client";

export interface FailedNotification {
  id: string;
  email: string;
  full_name: string;
  city_name: string;
  artist_name: string;
  tour_name: string;
  error: string;
  attempts: number;
  created_at: string;
}

export async function listNotificationFailures(): Promise<FailedNotification[]> {
  const data = await apiFetch<FailedNotification[] | null>("/api/admin/notification-failures", { method: "GET" });
  return data ?? [];
}

export function retryNotification(id: string) {
  return apiFetch<void>(`/api/admin/notification-failures/${id}/retry`, { method: "POST" });
}
