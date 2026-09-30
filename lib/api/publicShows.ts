import { API_BASE_URL } from "./client";
import type { Show } from "./shows";

export interface PublicShowStats {
  total_registrations: number;
}

export async function getPublicShows(): Promise<Show[]> {
  const res = await fetch(`${API_BASE_URL}/shows`);
  if (!res.ok) throw new Error("Failed to fetch shows");
  return res.json();
}

export async function getPublicShow(slug: string): Promise<Show> {
  const res = await fetch(`${API_BASE_URL}/shows/${slug}`);
  if (!res.ok) throw new Error("Failed to fetch show");
  return res.json();
}

export async function getPublicShowStats(slug: string): Promise<PublicShowStats> {
  const res = await fetch(`${API_BASE_URL}/shows/${slug}/stats`);
  if (!res.ok) throw new Error("Failed to fetch show stats");
  return res.json();
}

export interface RegisterRequest {
  tour_stop_id?: string | null;
  full_name: string;
  phone: string;
  email: string;
  newsletter_opt_in: boolean;
}

export async function registerForShow(slug: string, req: RegisterRequest): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/shows/${slug}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to register");
  }
}
