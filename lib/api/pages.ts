import { apiFetch } from "./client";

// The content shape is defined by the public frontend's contract, not this
// backend (which stores/returns it as opaque JSON) — these types are our
// best-effort match of what www.crystalcity.uk currently renders on Home
// and About. If the frontend needs different field names, only this file
// and the two page forms need to change; the backend is unaffected either
// way since it just stores whatever object it's given.

export interface ValuePillar {
  // A real photo per card (see the Values section screenshot), not an
  // icon — despite the field being named "icon" in earlier drafts.
  image: string;
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
  // Small label above the tagline, e.g. "WELCOME TO CRYSTALCITY".
  hero_eyebrow?: string;
  hero_tagline?: string;
  hero_description?: string;
  hero_cta_primary_label?: string;
  // Path or URL the button links to, e.g. "/events" or "https://...". A CTA
  // with a label but no destination isn't a CTA — both fields travel
  // together for each button.
  hero_cta_primary_url?: string;
  hero_cta_secondary_label?: string;
  hero_cta_secondary_url?: string;
  // The hero is a slider (3 dots visible on the live site), not a single
  // static image — an ordered list of image URLs, cycled by the frontend.
  hero_images?: string[];
}

export interface AboutPageContent {
  // Hero section — small label above the headline, e.g. "ABOUT CRYSTALCITY".
  hero_eyebrow?: string;
  // The big 3-line headline, e.g. "Discovering talent. Building careers.
  // Reaching the world." — one string; the frontend wraps/breaks it.
  hero_headline?: string;
  hero_body?: string;
  // Single full-bleed background image behind the hero text (not a
  // slider — see Home's hero_images for that pattern instead).
  hero_background_image?: string;

  vision_heading?: string;
  vision_body?: string;

  // Mission section — eyebrow label (e.g. "-OUR MISSION"), heading/body,
  // plus the 3 stacked polaroid-style photos shown beside the text.
  mission_eyebrow?: string;
  mission_heading?: string;
  mission_body?: string;
  mission_images?: string[];

  // Values section — eyebrow (e.g. "-WHAT WE STAND FOR"), heading (e.g.
  // "The values behind every show."), then the 4 photo+title+description
  // cards themselves.
  values_eyebrow?: string;
  values_heading?: string;
  values?: ValuePillar[];

  // Services section — eyebrow (e.g. "-WHAT WE DO"), heading (e.g. "From
  // first idea to final encore."), then the 3 title+description cards.
  // Each card's icon is fixed on the frontend, not admin-editable — no
  // icon/image field on ServiceItem, unlike ValuePillar.
  services_eyebrow?: string;
  services_heading?: string;
  services?: ServiceItem[];
  stats?: StatItem[];
}

// Mirrors the public frontend's BulletSection type exactly — the terms page
// is a fixed 17-section numbered legal document (lists/subsections/outro
// per section), not free-flowing rich text, so the editor has to expose
// these same structured fields rather than one text blob.
export interface TermsSubsection {
  title: string;
  list: string[];
}

export interface TermsSection {
  id: string;
  title: string;
  numbered?: string;
  content?: string;
  list?: string[];
  subsections?: TermsSubsection[];
  outro?: string;
}

export interface TermsPageContent {
  sections: TermsSection[];
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
