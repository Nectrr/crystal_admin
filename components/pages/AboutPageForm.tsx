"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { updatePage, type AboutPageContent, type ValuePillar, type ServiceItem, type StatItem } from "@/lib/api/pages";

function RepeatableSection<T>({
  title,
  items,
  onChange,
  newItem,
  renderItem,
  itemLabel,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  newItem: T;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  itemLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#4A4A3C]">{title}</h3>
        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => onChange([...items, newItem])}>
          <Plus className="h-3.5 w-3.5" /> Add {itemLabel}
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-[#EDEAE0] p-3 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 flex flex-col gap-3">
                {renderItem(item, (patch) => {
                  const next = items.slice();
                  next[i] = { ...items[i], ...patch };
                  onChange(next);
                })}
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-red-500 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-[#8C8C78]">None yet.</p>}
      </div>
    </div>
  );
}

export function AboutPageForm({ initial }: { initial: AboutPageContent }) {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<AboutPageContent>({
    values: [],
    services: [],
    stats: [],
    ...initial,
  });
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AboutPageContent>(key: K, value: AboutPageContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updatePage("about", form);
      showSuccess("About page content updated.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-3">Hero</h3>
        <div className="flex flex-col gap-3">
          <Input
            label="Eyebrow label"
            hint='e.g. "ABOUT CRYSTALCITY"'
            value={form.hero_eyebrow ?? ""}
            onChange={(e) => update("hero_eyebrow", e.target.value)}
          />
          <Textarea
            label="Headline"
            hint='e.g. "Discovering talent. Building careers. Reaching the world."'
            value={form.hero_headline ?? ""}
            onChange={(e) => update("hero_headline", e.target.value)}
          />
          <Textarea
            label="Body"
            hint="The paragraph below the headline"
            value={form.hero_body ?? ""}
            onChange={(e) => update("hero_body", e.target.value)}
          />
          <MediaUploadField
            label="Background image"
            value={form.hero_background_image}
            onChange={(url) => update("hero_background_image", url)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-3">Vision</h3>
        <div className="flex flex-col gap-3">
          <Input
            label="Heading"
            hint={'e.g. "Africa\'s stage. The world\'s audience."'}
            value={form.vision_heading ?? ""}
            onChange={(e) => update("vision_heading", e.target.value)}
          />
          <Textarea label="Body" value={form.vision_body ?? ""} onChange={(e) => update("vision_body", e.target.value)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-3">Mission</h3>
        <div className="flex flex-col gap-3">
          <Input
            label="Eyebrow label"
            hint='e.g. "-OUR MISSION"'
            value={form.mission_eyebrow ?? ""}
            onChange={(e) => update("mission_eyebrow", e.target.value)}
          />
          <Input
            label="Heading"
            hint='e.g. "Platforms for talent. Opportunities without borders."'
            value={form.mission_heading ?? ""}
            onChange={(e) => update("mission_heading", e.target.value)}
          />
          <Textarea label="Body" value={form.mission_body ?? ""} onChange={(e) => update("mission_body", e.target.value)} />

          <div>
            <p className="text-sm font-medium text-[#4A4A3C] mb-2">Photos</p>
            <div className="flex flex-col gap-3">
              {(form.mission_images ?? []).map((url, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <MediaUploadField
                      value={url}
                      onChange={(newUrl) => {
                        const next = (form.mission_images ?? []).slice();
                        next[i] = newUrl;
                        update("mission_images", next);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => update("mission_images", (form.mission_images ?? []).filter((_, idx) => idx !== i))}
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
                onClick={() => update("mission_images", [...(form.mission_images ?? []), ""])}
              >
                <Plus className="h-3.5 w-3.5" /> Add photo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Input
          label="Values eyebrow label"
          hint='e.g. "-WHAT WE STAND FOR"'
          value={form.values_eyebrow ?? ""}
          onChange={(e) => update("values_eyebrow", e.target.value)}
        />
        <div className="mt-3">
          <Input
            label="Values heading"
            hint='e.g. "The values behind every show."'
            value={form.values_heading ?? ""}
            onChange={(e) => update("values_heading", e.target.value)}
          />
        </div>
      </div>

      <RepeatableSection<ValuePillar>
        title="Values"
        items={form.values ?? []}
        onChange={(v) => update("values", v)}
        newItem={{ image: "", title: "", description: "" }}
        itemLabel="value"
        renderItem={(item, patch) => (
          <>
            <Input label="Title" value={item.title} onChange={(e) => patch({ title: e.target.value })} />
            <MediaUploadField label="Photo" value={item.image} onChange={(url) => patch({ image: url })} />
            <Textarea label="Description" value={item.description} onChange={(e) => patch({ description: e.target.value })} />
          </>
        )}
      />

      <div>
        <Input
          label="Services eyebrow label"
          hint='e.g. "-WHAT WE DO"'
          value={form.services_eyebrow ?? ""}
          onChange={(e) => update("services_eyebrow", e.target.value)}
        />
        <div className="mt-3">
          <Input
            label="Services heading"
            hint='e.g. "From first idea to final encore."'
            value={form.services_heading ?? ""}
            onChange={(e) => update("services_heading", e.target.value)}
          />
        </div>
      </div>

      <RepeatableSection<ServiceItem>
        title="Services"
        items={form.services ?? []}
        onChange={(v) => update("services", v)}
        newItem={{ title: "", description: "" }}
        itemLabel="service"
        renderItem={(item, patch) => (
          <>
            <Input label="Title" value={item.title} onChange={(e) => patch({ title: e.target.value })} />
            <Textarea label="Description" value={item.description} onChange={(e) => patch({ description: e.target.value })} />
          </>
        )}
      />

      <RepeatableSection<StatItem>
        title="Stats"
        items={form.stats ?? []}
        onChange={(v) => update("stats", v)}
        newItem={{ label: "", value: "" }}
        itemLabel="stat"
        renderItem={(item, patch) => (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Value" hint='e.g. "6+"' value={item.value} onChange={(e) => patch({ value: e.target.value })} />
            <Input label="Label" hint='e.g. "Artists"' value={item.label} onChange={(e) => patch({ label: e.target.value })} />
          </div>
        )}
      />

      <div className="flex justify-end">
        <Button loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
