import { apiFetch } from "./client";

export interface DashboardStats {
  active_shows: number;
  active_artists: number;
  published_articles: number;
  show_registrations: number;
  tour_registrations: number;
  newsletter_subscribers: number;
}

export function getDashboardStats() {
  return apiFetch<DashboardStats>("/api/admin/dashboard/stats", { method: "GET" });
}
