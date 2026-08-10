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
    images: [],
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
        <Input
          label="Tagline"
          hint='e.g. "Discovering talent. Building careers. Reaching the world."'
          value={form.hero_tagline ?? ""}
          onChange={(e) => update("hero_tagline", e.target.value)}
        />
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
            label="Heading"
            hint='e.g. "Platforms for talent. Opportunities without borders."'
            value={form.mission_heading ?? ""}
            onChange={(e) => update("mission_heading", e.target.value)}
          />
          <Textarea label="Body" value={form.mission_body ?? ""} onChange={(e) => update("mission_body", e.target.value)} />
        </div>
      </div>

      <RepeatableSection<ValuePillar>
        title="Values"
        items={form.values ?? []}
        onChange={(v) => update("values", v)}
        newItem={{ icon: "", title: "", description: "" }}
        itemLabel="value"
        renderItem={(item, patch) => (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Title" value={item.title} onChange={(e) => patch({ title: e.target.value })} />
              <Input
                label="Icon name"
                hint="lucide-react icon name, e.g. Heart"
                value={item.icon}
                onChange={(e) => patch({ icon: e.target.value })}
              />
            </div>
            <Textarea label="Description" value={item.description} onChange={(e) => patch({ description: e.target.value })} />
          </>
        )}
      />

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

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-3">Images</h3>
        <div className="flex flex-col gap-3">
          {(form.images ?? []).map((url, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <MediaUploadField
                  value={url}
                  onChange={(newUrl) => {
                    const next = (form.images ?? []).slice();
                    next[i] = newUrl;
                    update("images", next);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => update("images", (form.images ?? []).filter((_, idx) => idx !== i))}
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
            onClick={() => update("images", [...(form.images ?? []), ""])}
          >
            <Plus className="h-3.5 w-3.5" /> Add image
          </Button>
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
