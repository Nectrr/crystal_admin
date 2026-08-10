import { apiFetch } from "./client";

// The content shape is defined by the public frontend's contract, not this
// backend (which stores/returns it as opaque JSON) — these types are our
// best-effort match of what www.crystalcity.uk currently renders on Home
// and About. If the frontend needs different field names, only this file
// and the two page forms need to change; the backend is unaffected either
// way since it just stores whatever object it's given.

export interface ValuePillar {
  icon: string;
  title: string;
  description: string;
}

export interface StatItem {
  label: string;
  value: string;
}

export interface ServiceItem {
  title: string;
  description: string;
}

export interface HomePageContent {
  hero_tagline?: string;
  hero_description?: string;
  hero_cta_primary_label?: string;
  // Path or URL the button links to, e.g. "/events" or "https://...". A CTA
  // with a label but no destination isn't a CTA — both fields travel
  // together for each button.
  hero_cta_primary_url?: string;
  hero_cta_secondary_label?: string;
  hero_cta_secondary_url?: string;
  hero_image?: string;
}

export interface AboutPageContent {
  hero_tagline?: string;
  vision_heading?: string;
  vision_body?: string;
  mission_heading?: string;
  mission_body?: string;
  values?: ValuePillar[];
  services?: ServiceItem[];
  stats?: StatItem[];
  images?: string[];
}

export interface Page<T> {
  page_key: string;
  content: T;
  updated_at: string;
}

export async function getPage<T>(key: string): Promise<Page<T>> {
  return apiFetch<Page<T>>(`/api/pages/${key}`, { method: "GET" });
}

export async function updatePage<T>(key: string, content: T): Promise<Page<T>> {
  return apiFetch<Page<T>>(`/api/admin/pages/${key}`, { method: "PUT", body: { content } });
}
