"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Field";
// import { Select } from "@/components/ui/Field";
// import { GalleryMediaField } from "@/components/gallery/GalleryMediaField";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Button } from "@/components/ui/Button";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { updatePage, type HomePageContent } from "@/lib/api/pages";

export function HomePageForm({ initial }: { initial: HomePageContent }) {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<HomePageContent>(initial);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof HomePageContent>(key: K, value: HomePageContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updatePage("home", form);
      showSuccess("Homepage content updated.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-3">Hero section</h3>
        <div className="flex flex-col gap-4">
          <RichTextEditor
            label="Eyebrow label"
            hint='Small label above the tagline, e.g. "WELCOME TO CRYSTALCITY"'
            value={form.hero_eyebrow ?? ""}
            onChange={(html) => update("hero_eyebrow", html)}
          />
          <RichTextEditor
            label="Tagline"
            hint='e.g. "Where the culture comes alive"'
            value={form.hero_tagline ?? ""}
            onChange={(html) => update("hero_tagline", html)}
          />
          <RichTextEditor
            label="Description"
            value={form.hero_description ?? ""}
            onChange={(html) => update("hero_description", html)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary button label"
              hint='e.g. "Browse Events"'
              value={form.hero_cta_primary_label ?? ""}
              onChange={(e) => update("hero_cta_primary_label", e.target.value)}
            />
            <Input
              label="Primary button link"
              hint='Where it goes, e.g. "/events" or a full URL'
              value={form.hero_cta_primary_url ?? ""}
              onChange={(e) => update("hero_cta_primary_url", e.target.value)}
            />
            <Input
              label="Secondary button label"
              hint='e.g. "Get Early Access"'
              value={form.hero_cta_secondary_label ?? ""}
              onChange={(e) => update("hero_cta_secondary_label", e.target.value)}
            />
            <Input
              label="Secondary button link"
              hint='Where it goes, e.g. "/register" or a full URL'
              value={form.hero_cta_secondary_url ?? ""}
              onChange={(e) => update("hero_cta_secondary_url", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-1">Hero slider images</h3>
        <p className="text-xs text-[#8C8C78] mb-3">Cycles through in order on the public site — add as many as you want.</p>
        <div className="flex flex-col gap-3">
          {(form.hero_images ?? []).map((url, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <MediaUploadField
                  value={url}
                  onChange={(newUrl) => {
                    const next = (form.hero_images ?? []).slice();
                    next[i] = newUrl;
                    update("hero_images", next);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => update("hero_images", (form.hero_images ?? []).filter((_, idx) => idx !== i))}
                className="text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="!px-2 !py-1 text-xs self-start"
            onClick={() => update("hero_images", [...(form.hero_images ?? []), ""])}
          >
            <Plus className="h-3.5 w-3.5" /> Add slide
          </Button>
        </div>
      </div>

      {/* Banner image/video upload — hidden for now.
      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-1">Banner</h3>
        <p className="text-xs text-[#8C8C78] mb-3">The banner section on the homepage — upload an image or a video.</p>
        <div className="flex flex-col gap-3">
          <Select
            label="Media type"
            value={form.banner_media_type ?? "image"}
            onChange={(e) => {
              // Switching type invalidates the uploaded file (an image URL can't play as a video).
              update("banner_media_type", e.target.value as "image" | "video");
              update("banner_media_url", "");
            }}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </Select>
          <GalleryMediaField
            mediaType={form.banner_media_type ?? "image"}
            value={form.banner_media_url ?? ""}
            onChange={(url) => update("banner_media_url", url)}
            // Videos capped at 1MB so the homepage stays fast to load.
            maxBytes={(form.banner_media_type ?? "image") === "video" ? 1024 * 1024 : undefined}
          />
        </div>
      </div>
      */}

      <div className="flex justify-end">
        <Button loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
