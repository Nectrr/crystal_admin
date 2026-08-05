import { apiFetch } from "./client";

export interface Tier {
  id: string;
  tour_stop_id: string;
  name: string;
  price_pence: number;
  quantity: number;
  tickets_sold: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TierInput {
  name: string;
  price_pence: number;
  quantity: number;
  sort_order: number;
  is_active?: boolean;
}

export async function listTiers(showId: string, stopId: string): Promise<Tier[]> {
  const data = await apiFetch<Tier[] | null>(`/api/admin/shows/${showId}/tour-stops/${stopId}/tiers`, { method: "GET" });
  return data ?? [];
}

export function createTier(showId: string, stopId: string, data: TierInput) {
  return apiFetch<Tier>(`/api/admin/shows/${showId}/tour-stops/${stopId}/tiers`, { method: "POST", body: data });
}

export function updateTier(showId: string, stopId: string, tierId: string, data: Partial<TierInput>) {
  return apiFetch<Tier>(`/api/admin/shows/${showId}/tour-stops/${stopId}/tiers/${tierId}`, { method: "PATCH", body: data });
}

export function deleteTier(showId: string, stopId: string, tierId: string) {
  return apiFetch<void>(`/api/admin/shows/${showId}/tour-stops/${stopId}/tiers/${tierId}`, { method: "DELETE" });
}
