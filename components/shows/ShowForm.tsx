"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { HeroImageField } from "@/components/ui/HeroImageField";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  createShow,
  updateShow,
  upsertTicketSettings,
  type Show,
  type ShowFormFields,
  type HeroImageInput,
} from "@/lib/api/shows";
import { toDatetimeLocalValue } from "@/lib/datetime";

// PricePence/FeePence are no longer admin-facing — pricing lives per tour
// stop now (tiers + TourStop.fee_pence). The backend still requires a
// show_ticket_settings row with a positive price to unlock ticketing at
// all, so this is a fixed placeholder value that's never actually charged
// (a stop with no tiers falls back to it, but every stop should have
// either tiers or its own price configured before going on sale).
const PLACEHOLDER_PRICE_PENCE = 1;

interface ShowFormProps {
  initial?: Show;
}

type HeroKey = "hero_image_1" | "hero_image_2" | "hero_image_3";

export function ShowForm({ initial }: ShowFormProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const isEdit = !!initial;

  const [fields, setFields] = useState<ShowFormFields>({
    slug: initial?.slug ?? "",
    artist_name: initial?.artist_name ?? "",
    tour_name: initial?.tour_name ?? "",
    description: initial?.description ?? "",
    fan_goal: initial?.fan_goal ?? undefined,
    subtitle: initial?.subtitle ?? "",
    overview: initial?.overview ?? "",
    things_to_know: initial?.things_to_know ?? "",
    display_time: initial?.display_time ?? "",
    meta_title: initial?.meta_title ?? "",
    meta_description: initial?.meta_description ?? "",
  });
  const [images, setImages] = useState<Partial<Record<HeroKey, HeroImageInput | undefined>>>({});
  // datetime-local value; blank = publish now (backend defaults to now()).
  const [publishedAtLocal, setPublishedAtLocal] = useState(initial?.published_at ? toDatetimeLocalValue(initial.published_at) : "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [currency, setCurrency] = useState(initial?.ticketing?.currency ?? "GBP");
  const [maxPerOrder, setMaxPerOrder] = useState(String(initial?.ticketing?.max_per_order ?? 10));

  function update<K extends keyof ShowFormFields>(key: K, value: ShowFormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  // Multipart is required if any image slot is set to "file"
  const anyFileMode = Object.values(images).some((v) => v?.mode === "file");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSlugError(null);
    setLoading(true);
    const submitFields: ShowFormFields = {
      ...fields,
      published_at: publishedAtLocal ? new Date(publishedAtLocal).toISOString() : undefined,
    };
    try {
      const multipart = anyFileMode;
      let showId: string;
      if (isEdit && initial) {
        const updated = await updateShow(initial.id, submitFields, images, multipart);
        showId = updated.id;
      } else {
        const created = await createShow(
          submitFields,
          images as Record<HeroKey, HeroImageInput | undefined>,
          multipart
        );
        showId = created.id;
      }
      await upsertTicketSettings(showId, {
        currency: currency.toUpperCase(),
        price_pence: initial?.ticketing?.price_pence ?? PLACEHOLDER_PRICE_PENCE,
        fee_pence: initial?.ticketing?.fee_pence ?? 0,
        max_per_order: Number(maxPerOrder),
      });
      showSuccess(isEdit ? "Show updated." : "Show created.");
      router.push("/shows");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === "SLUG_TAKEN") {
        setSlugError("This slug is already in use.");
      } else if (err instanceof ApiError) {
        showError(err.message);
      } else {
        showError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Artist name"
          required
          value={fields.artist_name}
          onChange={(e) => update("artist_name", e.target.value)}
        />
        <Input
          label="Tour name"
          required
          value={fields.tour_name}
          onChange={(e) => update("tour_name", e.target.value)}
        />
        <Input
          label="Slug"
          required
          error={slugError ?? undefined}
          value={fields.slug}
          onChange={(e) => update("slug", e.target.value)}
        />
        <Input
          label="Fan goal"
          type="number"
          value={fields.fan_goal ?? ""}
          onChange={(e) => update("fan_goal", e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <RichTextEditor
        label="Description"
        hint="Required. Renders as HTML on the public show page."
        value={fields.description}
        onChange={(html) => update("description", html)}
      />
      <Input label="Subtitle" value={fields.subtitle ?? ""} onChange={(e) => update("subtitle", e.target.value)} />
      <RichTextEditor label="Overview" value={fields.overview ?? ""} onChange={(html) => update("overview", html)} />
      <RichTextEditor
        label="Things to know"
        value={fields.things_to_know ?? ""}
        onChange={(html) => update("things_to_know", html)}
      />
      <Input
        label="Display time"
        placeholder="e.g. Doors 7pm"
        value={fields.display_time ?? ""}
        onChange={(e) => update("display_time", e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Meta title" value={fields.meta_title ?? ""} onChange={(e) => update("meta_title", e.target.value)} />
        <Input
          label="Meta description"
          value={fields.meta_description ?? ""}
          onChange={(e) => update("meta_description", e.target.value)}
        />
      </div>

      <Input
        label="Publish date"
        type="datetime-local"
        hint="Leave blank to publish now once you hit Publish. A past date backdates the show; a future date schedules it — once published (via the Publish button), it stays hidden until this date passes on its own."
        value={publishedAtLocal}
        onChange={(e) => setPublishedAtLocal(e.target.value)}
      />

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-2">Ticketing</h3>
        <p className="text-xs text-[#8C8C78] mb-3">
          Price, transaction fee, and sales windows are set per tour stop — see the Tour Stops tab once this show exists.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Currency (3-letter)" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <Input
            label="Max per order"
            type="number"
            min={1}
            max={50}
            value={maxPerOrder}
            onChange={(e) => setMaxPerOrder(e.target.value)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#4A4A3C] mb-2">Hero images</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["hero_image_1", "hero_image_2", "hero_image_3"] as HeroKey[]).map((key, i) => (
            <HeroImageField
              key={key}
              label={`Hero image ${i + 1}`}
              currentUrl={initial?.[key]}
              value={images[key]}
              onChange={(v) => setImages((prev) => ({ ...prev, [key]: v }))}
            />
          ))}
        </div>
        <p className="text-xs text-[#8C8C78] mt-2">
          Choose &quot;Paste URL&quot; to reference an already-uploaded image, or &quot;Upload file&quot; to attach a
          new file directly. Leaving a slot &quot;Unchanged&quot; keeps the existing image on edit.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? "Save changes" : "Create show"}
        </Button>
      </div>
    </form>
  );
}
