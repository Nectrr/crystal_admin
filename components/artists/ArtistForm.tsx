"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { createArtist, updateArtist, type Artist, type ArtistInput } from "@/lib/api/artists";

export function ArtistForm({ initial }: { initial?: Artist }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const isEdit = !!initial;

  const [form, setForm] = useState<Partial<ArtistInput>>({
    slug: initial?.slug ?? "",
    name: initial?.name ?? "",
    genres: initial?.genres ?? [],
    location: initial?.location ?? "",
    bio: initial?.bio ?? "",
    card_image: initial?.card_image ?? "",
    hero_image: initial?.hero_image ?? "",
    profile_image: initial?.profile_image ?? "",
    facebook_url: initial?.facebook_url ?? "",
    instagram_url: initial?.instagram_url ?? "",
    youtube_url: initial?.youtube_url ?? "",
    twitter_url: initial?.twitter_url ?? "",
    spotify_url: initial?.spotify_url ?? "",
    booking_email: initial?.booking_email ?? "",
    sort_order: initial?.sort_order ?? 0,
    is_active: initial?.is_active ?? true,
    meta_title: initial?.meta_title ?? "",
    meta_description: initial?.meta_description ?? "",
  });
  const [genresText, setGenresText] = useState((initial?.genres ?? []).join(", "));
  const [slugError, setSlugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof ArtistInput>(key: K, value: ArtistInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSlugError(null);
    setLoading(true);
    const payload = { ...form, genres: genresText.split(",").map((g) => g.trim()).filter(Boolean) };
    try {
      if (isEdit && initial) {
        await updateArtist(initial.id, payload);
        showSuccess("Artist updated.");
      } else {
        await createArtist(payload);
        showSuccess("Artist created.");
      }
      router.push("/artists");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === "SLUG_TAKEN") {
        setSlugError("This slug is already in use.");
      } else {
        showError(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Name" required value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} />
        <Input label="Slug" required error={slugError ?? undefined} value={form.slug ?? ""} onChange={(e) => update("slug", e.target.value)} />
        <Input label="Location" value={form.location ?? ""} onChange={(e) => update("location", e.target.value)} />
        <Input label="Genres (comma-separated)" value={genresText} onChange={(e) => setGenresText(e.target.value)} />
        <Input label="Booking email" type="email" value={form.booking_email ?? ""} onChange={(e) => update("booking_email", e.target.value)} />
        <Input label="Sort order" type="number" value={form.sort_order ?? 0} onChange={(e) => update("sort_order", Number(e.target.value))} />
      </div>

      <Textarea label="Bio" value={form.bio ?? ""} onChange={(e) => update("bio", e.target.value)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Facebook URL" value={form.facebook_url ?? ""} onChange={(e) => update("facebook_url", e.target.value)} />
        <Input label="Instagram URL" value={form.instagram_url ?? ""} onChange={(e) => update("instagram_url", e.target.value)} />
        <Input label="YouTube URL" value={form.youtube_url ?? ""} onChange={(e) => update("youtube_url", e.target.value)} />
        <Input label="Twitter URL" value={form.twitter_url ?? ""} onChange={(e) => update("twitter_url", e.target.value)} />
        <Input label="Spotify URL" value={form.spotify_url ?? ""} onChange={(e) => update("spotify_url", e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MediaUploadField label="Card image" value={form.card_image} onChange={(url) => update("card_image", url)} />
        <MediaUploadField label="Hero image" value={form.hero_image} onChange={(url) => update("hero_image", url)} />
        <MediaUploadField label="Profile image" value={form.profile_image} onChange={(url) => update("profile_image", url)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Meta title" value={form.meta_title ?? ""} onChange={(e) => update("meta_title", e.target.value)} />
        <Input label="Meta description" value={form.meta_description ?? ""} onChange={(e) => update("meta_description", e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm text-[#4A4A3C]">
        <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => update("is_active", e.target.checked)} />
        Active
      </label>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? "Save changes" : "Create artist"}
        </Button>
      </div>
    </form>
  );
}
