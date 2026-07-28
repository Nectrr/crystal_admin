import { apiFetch } from "./client";

export interface Article {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt?: string | null;
  body: string;
  featured_image?: string | null;
  author_name?: string | null;
  is_featured: boolean;
  is_active: boolean;
  published_at?: string | null;
  sort_order: number;
  meta_title?: string | null;
  meta_description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type ArticleInput = Omit<Article, "id" | "created_at" | "updated_at" | "deleted_at">;

export async function listNews(): Promise<Article[]> {
  const data = await apiFetch<Article[] | null>("/api/admin/news", { method: "GET" });
  return data ?? [];
}

export function getArticle(id: string) {
  return apiFetch<Article>(`/api/admin/news/${id}`, { method: "GET" });
}

export function createArticle(data: Partial<ArticleInput>) {
  return apiFetch<Article>("/api/admin/news", { method: "POST", body: data });
}

export function updateArticle(id: string, data: Partial<ArticleInput>) {
  return apiFetch<Article>(`/api/admin/news/${id}`, { method: "PATCH", body: data });
}

export function deleteArticle(id: string) {
  return apiFetch<void>(`/api/admin/news/${id}`, { method: "DELETE" });
}
