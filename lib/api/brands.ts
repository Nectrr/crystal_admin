import { apiFetch } from "./client";

export interface Brand {
  id: string;
  name: string;
  logo_url: string;
  link_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BrandInput = {
  name: string;
  logo_url: string;
  // An empty string removes the link.
  link_url?: string;
  sort_order: number;
  is_active?: boolean;
};

export async function listBrands(): Promise<Brand[]> {
  const data = await apiFetch<Brand[] | null>("/api/admin/brands", { method: "GET" });
  return data ?? [];
}

export function createBrand(data: BrandInput) {
  return apiFetch<Brand>("/api/admin/brands", { method: "POST", body: data });
}

export function updateBrand(id: string, data: Partial<BrandInput>) {
  return apiFetch<Brand>(`/api/admin/brands/${id}`, { method: "PATCH", body: data });
}

export function deleteBrand(id: string) {
  return apiFetch<void>(`/api/admin/brands/${id}`, { method: "DELETE" });
}
