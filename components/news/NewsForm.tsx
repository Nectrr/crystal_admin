"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
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
  const [slugError, setSlugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSlugError(null);
    setLoading(true);
    try {
      if (isEdit && initial) {
        await updateArticle(initial.id, form);
        showSuccess("Article updated.");
      } else {
        await createArticle(form);
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
      <Textarea
        label="Body"
        hint="Plain text / markdown"
        className="min-h-[240px]"
        value={form.body ?? ""}
        onChange={(e) => update("body", e.target.value)}
      />

      <MediaUploadField label="Featured image" value={form.featured_image} onChange={(url) => update("featured_image", url)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Meta title" value={form.meta_title ?? ""} onChange={(e) => update("meta_title", e.target.value)} />
        <Input label="Meta description" value={form.meta_description ?? ""} onChange={(e) => update("meta_description", e.target.value)} />
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
