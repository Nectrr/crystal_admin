import { apiFetch } from "./client";

export interface Artist {
  id: string;
  slug: string;
  name: string;
  genres: string[];
  location?: string | null;
  tour_count?: number | null;
  card_image?: string | null;
  hero_image?: string | null;
  profile_image?: string | null;
  bio?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  twitter_url?: string | null;
  spotify_url?: string | null;
  booking_email?: string | null;
  sort_order: number;
  is_active: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type ArtistInput = Omit<Artist, "id" | "created_at" | "updated_at" | "deleted_at">;

export interface TourDate {
  id: string;
  artist_id: string;
  title: string;
  venue: string;
  city: string;
  event_date: string;
  display_time?: string | null;
  price?: string | null;
  price_amount?: number | null;
  currency: string;
  image_url?: string | null;
  ticket_status: "on-sale" | "register-interest" | "sold-out";
  ticket_href?: string | null;
  sort_order: number;
}

export type TourDateInput = Omit<TourDate, "id" | "artist_id">;

export interface Project {
  id: string;
  artist_id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  sort_order: number;
}

export type ProjectInput = Omit<Project, "id" | "artist_id">;

export interface ArtistProfile extends Artist {
  tour_dates: TourDate[];
  projects: Project[];
}

export async function listArtists(): Promise<Artist[]> {
  const data = await apiFetch<Artist[] | null>("/api/admin/artists", { method: "GET" });
  return data ?? [];
}

export async function getArtist(id: string): Promise<ArtistProfile> {
  const data = await apiFetch<ArtistProfile>(`/api/admin/artists/${id}`, { method: "GET" });
  return { ...data, tour_dates: data.tour_dates ?? [], projects: data.projects ?? [] };
}

export function createArtist(data: Partial<ArtistInput>) {
  return apiFetch<Artist>("/api/admin/artists", { method: "POST", body: data });
}

export function updateArtist(id: string, data: Partial<ArtistInput>) {
  return apiFetch<Artist>(`/api/admin/artists/${id}`, { method: "PATCH", body: data });
}

export function deleteArtist(id: string) {
  return apiFetch<void>(`/api/admin/artists/${id}`, { method: "DELETE" });
}

export function createTourDate(artistId: string, data: TourDateInput) {
  return apiFetch<TourDate>(`/api/admin/artists/${artistId}/tour-dates`, { method: "POST", body: data });
}

export function deleteTourDate(artistId: string, dateId: string) {
  return apiFetch<void>(`/api/admin/artists/${artistId}/tour-dates/${dateId}`, { method: "DELETE" });
}

export function createProject(artistId: string, data: ProjectInput) {
  return apiFetch<Project>(`/api/admin/artists/${artistId}/projects`, { method: "POST", body: data });
}

export function deleteProject(artistId: string, projectId: string) {
  return apiFetch<void>(`/api/admin/artists/${artistId}/projects/${projectId}`, { method: "DELETE" });
}
