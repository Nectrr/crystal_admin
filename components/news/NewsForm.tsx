"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { createArticle, updateArticle, type Article, type ArticleInput } from "@/lib/api/news";

export function NewsForm({ initial }: { initial?: Article }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const isEdit = !!initial;

  const [form, setForm] = useState<Partial<ArticleInput>>({
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    category: initial?.category ?? "",
    excerpt: initial?.excerpt ?? "",
    body: initial?.body ?? "",
    featured_image: initial?.featured_image ?? "",
    author_name: initial?.author_name ?? "",
    is_featured: initial?.is_featured ?? false,
    is_active: initial?.is_active ?? true,
    sort_order: initial?.sort_order ?? 0,
    meta_title: initial?.meta_title ?? "",
    meta_description: initial?.meta_description ?? "",
  });
  // datetime-local input value, separate from form.published_at (an ISO
  // string) since <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm".
  // Blank means "publish now" — the backend defaults published_at to now()
  // when it's omitted.
  const [publishedAtLocal, setPublishedAtLocal] = useState(initial?.published_at ? initial.published_at.slice(0, 16) : "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSlugError(null);
    setLoading(true);
    const payload: Partial<ArticleInput> = {
      ...form,
      published_at: publishedAtLocal ? new Date(publishedAtLocal).toISOString() : undefined,
    };
    try {
      if (isEdit && initial) {
        await updateArticle(initial.id, payload);
        showSuccess("Article updated.");
      } else {
        await createArticle(payload);
        showSuccess("Article created.");
      }
      router.push("/news");
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
        <Input label="Title" required value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} />
        <Input label="Slug" required error={slugError ?? undefined} value={form.slug ?? ""} onChange={(e) => update("slug", e.target.value)} />
        <Input label="Category" value={form.category ?? ""} onChange={(e) => update("category", e.target.value)} />
        <Input label="Author" value={form.author_name ?? ""} onChange={(e) => update("author_name", e.target.value)} />
        <Input label="Sort order" type="number" value={form.sort_order ?? 0} onChange={(e) => update("sort_order", Number(e.target.value))} />
      </div>

      <Textarea label="Excerpt" value={form.excerpt ?? ""} onChange={(e) => update("excerpt", e.target.value)} />
      <RichTextEditor label="Body" value={form.body ?? ""} onChange={(html) => update("body", html)} />

      <MediaUploadField label="Featured image" value={form.featured_image} onChange={(url) => update("featured_image", url)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Meta title" value={form.meta_title ?? ""} onChange={(e) => update("meta_title", e.target.value)} />
        <Input label="Meta description" value={form.meta_description ?? ""} onChange={(e) => update("meta_description", e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <Input
          label="Publish date"
          type="datetime-local"
          hint="Leave blank to publish now. A past date backdates the article; a future date schedules it — it goes live on its own once that time passes, no further action needed."
          value={publishedAtLocal}
          onChange={(e) => setPublishedAtLocal(e.target.value)}
        />
        <p className="text-sm text-[#8C8C78] pb-2">
          {!(form.is_active ?? true)
            ? "Status: Draft (hidden regardless of publish date)"
            : publishedAtLocal && new Date(publishedAtLocal) > new Date()
              ? `Status: Scheduled for ${new Date(publishedAtLocal).toLocaleString()}`
              : "Status: Published"}
        </p>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-[#4A4A3C]">
          <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => update("is_active", e.target.checked)} />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-[#4A4A3C]">
          <input type="checkbox" checked={form.is_featured ?? false} onChange={(e) => update("is_featured", e.target.checked)} />
          Featured
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? "Save changes" : "Create article"}
        </Button>
      </div>
    </form>
  );
}
