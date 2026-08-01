import { apiFetch } from "./client";

export type GalleryMediaType = "image" | "video";

export interface GalleryItem {
  id: string;
  media_type: GalleryMediaType;
  title: string;
  event_date?: string | null;
  city_name?: string | null;
  media_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GalleryItemInput = {
  media_type: GalleryMediaType;
  title: string;
  event_date?: string | null;
  city_name?: string | null;
  media_url: string;
  sort_order: number;
  is_active?: boolean;
};

export async function listGalleryItems(): Promise<GalleryItem[]> {
  const data = await apiFetch<GalleryItem[] | null>("/api/admin/gallery", { method: "GET" });
  return data ?? [];
}

export function createGalleryItem(data: GalleryItemInput) {
  return apiFetch<GalleryItem>("/api/admin/gallery", { method: "POST", body: data });
}

export function updateGalleryItem(id: string, data: Partial<GalleryItemInput>) {
  return apiFetch<GalleryItem>(`/api/admin/gallery/${id}`, { method: "PATCH", body: data });
}

export function deleteGalleryItem(id: string) {
  return apiFetch<void>(`/api/admin/gallery/${id}`, { method: "DELETE" });
}
