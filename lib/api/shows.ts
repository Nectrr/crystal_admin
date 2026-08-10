import { apiFetch } from "./client";

export interface TicketSettings {
  show_id: string;
  currency: string;
  price_pence: number;
  fee_pence: number;
  max_per_order: number;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Show {
  id: string;
  slug: string;
  artist_name: string;
  tour_name: string;
  description: string;
  hero_image_1?: string | null;
  hero_image_2?: string | null;
  hero_image_3?: string | null;
  fan_goal?: number | null;
  is_active: boolean;
  // Computed by the backend from tour stop dates — true once every stop
  // has a past EventStartAt. Not settable; there's nothing to send back on
  // create/update.
  is_past: boolean;
  published_at: string;
  meta_title?: string | null;
  meta_description?: string | null;
  subtitle?: string | null;
  overview?: string | null;
  things_to_know?: string | null;
  display_time?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  ticketing?: TicketSettings;
  tour_stops?: TourStop[];
}

export interface TourStop {
  id: string;
  show_id: string;
  city_name: string;
  venue_name?: string | null;
  venue_address?: string | null;
  event_start_at?: string | null;
  capacity?: number | null;
  tickets_sold?: number;
  is_on_sale: boolean;
  fee_pence?: number | null;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ShowRegistration {
  id: string;
  show_id: string;
  tour_stop_id?: string | null;
  full_name: string;
  email: string;
  city_name?: string | null;
  phone?: string | null;
  newsletter_opt_in?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CityBreakdown {
  tour_stop_id?: string | null;
  city_slug?: string | null;
  city_name: string;
  count: number;
}

export interface ShowRegistrationsResponse {
  registrations: ShowRegistration[];
  city_breakdown: CityBreakdown[];
}

export interface ShowFormFields {
  slug: string;
  artist_name: string;
  tour_name: string;
  description: string;
  fan_goal?: number | null;
  is_active?: boolean;
  published_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  subtitle?: string | null;
  overview?: string | null;
  things_to_know?: string | null;
  display_time?: string | null;
}

export type HeroImageInput = { mode: "url"; value: string } | { mode: "file"; value: File } | { mode: "none" };

export async function listShows(): Promise<Show[]> {
  const data = await apiFetch<Show[] | null>("/api/admin/shows", { method: "GET" });
  return data ?? [];
}

export function getShow(id: string) {
  return apiFetch<Show>(`/api/admin/shows/${id}`, { method: "GET" });
}

function buildShowFormData(fields: ShowFormFields, images: Record<string, HeroImageInput | undefined>): FormData {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  Object.entries(images).forEach(([key, input]) => {
    if (!input) return;
    if (input.mode === "file") form.append(key, input.value);
    else if (input.mode === "url") form.append(key, input.value);
    // "none" -> omit entirely so backend leaves existing image unchanged
  });
  return form;
}

export function createShow(
  fields: ShowFormFields,
  images: Record<"hero_image_1" | "hero_image_2" | "hero_image_3", HeroImageInput | undefined>,
  useMultipart: boolean
) {
  if (useMultipart) {
    const form = buildShowFormData(fields, images);
    return apiFetch<Show>("/api/admin/shows", { method: "POST", body: form, isFormData: true });
  }
  const body: Record<string, unknown> = { ...fields };
  (Object.keys(images) as (keyof typeof images)[]).forEach((key) => {
    const input = images[key];
    if (input && input.mode === "url") body[key] = input.value;
  });
  return apiFetch<Show>("/api/admin/shows", { method: "POST", body });
}

export function updateShow(
  id: string,
  fields: Partial<ShowFormFields>,
  images: Partial<Record<"hero_image_1" | "hero_image_2" | "hero_image_3", HeroImageInput | undefined>>,
  useMultipart: boolean
) {
  if (useMultipart) {
    const form = buildShowFormData(fields as ShowFormFields, images);
    return apiFetch<Show>(`/api/admin/shows/${id}`, { method: "PATCH", body: form, isFormData: true });
  }
  const body: Record<string, unknown> = { ...fields };
  (Object.keys(images) as (keyof typeof images)[]).forEach((key) => {
    const input = images[key];
    if (input && input.mode === "url") body[key] = input.value;
  });
  return apiFetch<Show>(`/api/admin/shows/${id}`, { method: "PATCH", body });
}

export function deleteShow(id: string) {
  return apiFetch<void>(`/api/admin/shows/${id}`, { method: "DELETE" });
}

export function publishShow(id: string) {
  return apiFetch<Show>(`/api/admin/shows/${id}/publish`, { method: "POST" });
}

export function unpublishShow(id: string) {
  return apiFetch<Show>(`/api/admin/shows/${id}/unpublish`, { method: "POST" });
}

// Tour stops

export function createTourStop(
  showId: string,
  data: Omit<TourStop, "id" | "show_id" | "created_at" | "updated_at" | "is_on_sale" | "tickets_sold">
) {
  return apiFetch<TourStop>(`/api/admin/shows/${showId}/tour-stops`, { method: "POST", body: data });
}

export function updateTourStop(
  showId: string,
  stopId: string,
  data: Partial<Omit<TourStop, "id" | "show_id" | "created_at" | "updated_at">>
) {
  return apiFetch<TourStop>(`/api/admin/shows/${showId}/tour-stops/${stopId}`, { method: "PATCH", body: data });
}

export function deleteTourStop(showId: string, stopId: string) {
  return apiFetch<void>(`/api/admin/shows/${showId}/tour-stops/${stopId}`, { method: "DELETE" });
}

// Ticket settings

export function getTicketSettings(showId: string) {
  return apiFetch<TicketSettings>(`/api/admin/shows/${showId}/ticket-settings`, { method: "GET" });
}

export interface TicketSettingsInput {
  currency: string;
  price_pence: number;
  fee_pence: number;
  max_per_order: number;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
}

export function upsertTicketSettings(showId: string, data: TicketSettingsInput) {
  return apiFetch<TicketSettings>(`/api/admin/shows/${showId}/ticket-settings`, { method: "PUT", body: data });
}

// Registrations

export async function getShowRegistrations(showId: string): Promise<ShowRegistrationsResponse> {
  const data = await apiFetch<ShowRegistrationsResponse>(`/api/admin/shows/${showId}/registrations`, {
    method: "GET",
  });
  return {
    registrations: data.registrations ?? [],
    city_breakdown: data.city_breakdown ?? [],
  };
}

export function deleteShowRegistration(showId: string, registrationId: string) {
  return apiFetch<void>(`/api/admin/shows/${showId}/registrations/${registrationId}`, { method: "DELETE" });
}

// Per-show orders (read-only on the ticketing tab)
import type { Order } from "./orders";
export async function getShowOrders(showId: string): Promise<Order[]> {
  const data = await apiFetch<Order[] | null>(`/api/admin/shows/${showId}/orders`, { method: "GET" });
  return data ?? [];
}

// Ticket sales summary

export interface TierSummary {
  name: string;
  price_pence: number;
  tickets_sold: number;
  quantity: number;
}

export interface StopTicketSummary {
  tour_stop_id: string;
  city_name: string;
  is_on_sale: boolean;
  tickets_sold: number;
  capacity?: number | null;
  tiers: TierSummary[];
}

export interface ShowTicketSummary {
  show_id: string;
  total_sold: number;
  total_capacity?: number | null;
  stops: StopTicketSummary[];
}

export function getShowTicketSummary(showId: string) {
  return apiFetch<ShowTicketSummary>(`/api/admin/shows/${showId}/ticket-summary`, { method: "GET" });
}
