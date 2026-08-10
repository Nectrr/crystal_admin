"use client";

import { useState } from "react";
import { Input, Textarea } from "@/components/ui/Field";
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
          <Input
            label="Tagline"
            hint='e.g. "Where the culture comes alive"'
            value={form.hero_tagline ?? ""}
            onChange={(e) => update("hero_tagline", e.target.value)}
          />
          <Textarea
            label="Description"
            value={form.hero_description ?? ""}
            onChange={(e) => update("hero_description", e.target.value)}
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
          <MediaUploadField label="Hero image" value={form.hero_image} onChange={(url) => update("hero_image", url)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
