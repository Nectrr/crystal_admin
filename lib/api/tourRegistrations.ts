import { apiFetch } from "./client";
import type { CityBreakdown } from "./shows";

export interface TourRegistration {
  id: string;
  city_slug: string;
  full_name: string;
  phone?: string | null;
  email: string;
  newsletter_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface TourRegistrationsResponse {
  registrations: TourRegistration[];
  city_breakdown: CityBreakdown[];
}

export async function listTourRegistrations(): Promise<TourRegistrationsResponse> {
  const data = await apiFetch<TourRegistrationsResponse>("/api/admin/tour-registrations", { method: "GET" });
  return {
    registrations: data.registrations ?? [],
    city_breakdown: data.city_breakdown ?? [],
  };
}

export function deleteTourRegistration(id: string) {
  return apiFetch<void>(`/api/admin/tour-registrations/${id}`, { method: "DELETE" });
}
