"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ImagesField } from "@/components/merch/ImagesField";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { listArtists, type Artist } from "@/lib/api/artists";
import { createMerchProduct, updateMerchProduct, type MerchProduct, type MerchProductInput } from "@/lib/api/merch";

// Mirrors the currency-amount sanitizer used on the orders refund modal —
// keeps the price field from ever holding something like "12.5.6" or "-5"
// regardless of what was typed or pasted in.
function sanitizeAmountChars(raw: string): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    const [intPart, decPart] = cleaned.split(".");
    cleaned = decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : `${intPart}.`;
  }
  return cleaned;
}

export function ProductForm({ initial }: { initial?: MerchProduct }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const isEdit = !!initial;

  const [artists, setArtists] = useState<Artist[]>([]);
  const [form, setForm] = useState<Partial<MerchProductInput>>({
    artist_id: initial?.artist_id ?? "",
    slug: initial?.slug ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    images: initial?.images ?? [],
    category: initial?.category ?? "",
    currency: initial?.currency ?? "gbp",
    sort_order: initial?.sort_order ?? 0,
    is_active: initial?.is_active ?? true,
  });
  const [priceInput, setPriceInput] = useState(initial ? (initial.price_pence / 100).toFixed(2) : "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setArtists(await listArtists());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load artists.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof MerchProductInput>(key: K, value: MerchProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    setSlugError(null);

    const pricePence = Math.round(parseFloat(priceInput || "0") * 100);
    if (!Number.isFinite(pricePence) || pricePence <= 0) {
      showError("Enter a price greater than 0.");
      return;
    }

    setSaving(true);
    const payload = { ...form, price_pence: pricePence };
    try {
      if (isEdit && initial) {
        await updateMerchProduct(initial.id, payload);
        showSuccess("Product updated.");
      } else {
        await createMerchProduct(payload);
        showSuccess("Product created.");
      }
      router.push("/merch/products");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSlugError("This slug is already in use.");
      } else {
        showError(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Artist"
          required
          value={form.artist_id ?? ""}
          onChange={(e) => update("artist_id", e.target.value)}
        >
          <option value="" disabled>
            Select an artist
          </option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Input label="Category" required value={form.category ?? ""} onChange={(e) => update("category", e.target.value)} placeholder="Apparel, Accessories, Music..." />

        <Input label="Name" required value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} />
        <Input
          label="Slug"
          required
          error={slugError ?? undefined}
          value={form.slug ?? ""}
          onChange={(e) => update("slug", e.target.value)}
        />

        <Input
          label={`Price (${(form.currency ?? "gbp").toUpperCase()})`}
          required
          type="text"
          inputMode="decimal"
          value={priceInput}
          onChange={(e) => setPriceInput(sanitizeAmountChars(e.target.value))}
        />
        <Input label="Sort order" type="number" value={form.sort_order ?? 0} onChange={(e) => update("sort_order", Number(e.target.value))} />
      </div>

      <Textarea
        label="Description"
        value={form.description ?? ""}
        onChange={(e) => update("description", e.target.value)}
      />

      <ImagesField label="Images" value={form.images ?? []} onChange={(images) => update("images", images)} />

      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={form.is_active ?? true}
          onChange={(e) => update("is_active", e.target.checked)}
          className="h-4 w-4 rounded border-[#EDEAE0] text-[#B8952F] focus:ring-[#B8952F]/40"
        />
        <span className="text-sm text-[#4A4A3C]">Active — visible in the public storefront</span>
      </label>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
