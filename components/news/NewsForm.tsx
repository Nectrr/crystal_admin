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

  // Which button triggered the in-flight save — lets "Save as draft" and
  // "Publish" each show their own loading state instead of both spinning.
  const [savingAs, setSavingAs] = useState<"draft" | "published" | null>(null);

  async function handleSave(e: React.SyntheticEvent, isActive: boolean) {
    e.preventDefault();
    setSlugError(null);
    setSavingAs(isActive ? "published" : "draft");
    const payload: Partial<ArticleInput> = {
      ...form,
      is_active: isActive,
      published_at: publishedAtLocal ? new Date(publishedAtLocal).toISOString() : undefined,
    };
    try {
      if (isEdit && initial) {
        await updateArticle(initial.id, payload);
        showSuccess(isActive ? "Article published." : "Article saved as draft.");
      } else {
        await createArticle(payload);
        showSuccess(isActive ? "Article published." : "Article saved as draft.");
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
      setSavingAs(null);
    }
  }

  return (
    <form onSubmit={(e) => handleSave(e, form.is_active ?? true)} className="flex flex-col gap-6 max-w-3xl">
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
          {isEdit
            ? !(initial?.is_active ?? true)
              ? "Current status: Draft"
              : publishedAtLocal && new Date(publishedAtLocal) > new Date()
                ? `Current status: Scheduled for ${new Date(publishedAtLocal).toLocaleString()}`
                : "Current status: Published"
            : "Choose “Save as draft” to come back and publish later, or “Publish” to make it live now."}
        </p>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-[#4A4A3C]">
          <input type="checkbox" checked={form.is_featured ?? false} onChange={(e) => update("is_featured", e.target.checked)} />
          Featured
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={savingAs === "draft"}
          disabled={savingAs !== null && savingAs !== "draft"}
          onClick={(e) => handleSave(e, false)}
        >
          Save as draft
        </Button>
        <Button
          type="button"
          loading={savingAs === "published"}
          disabled={savingAs !== null && savingAs !== "published"}
          onClick={(e) => handleSave(e, true)}
        >
          {isEdit && initial?.is_active ? "Save changes" : "Publish"}
        </Button>
      </div>
    </form>
  );
}
