"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NewsForm } from "@/components/news/NewsForm";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { getArticle, deleteArticle, type Article } from "@/lib/api/news";

export default function ArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setArticle(await getArticle(params.id));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load article.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleDelete() {
    if (!article) return;
    setDeleting(true);
    try {
      await deleteArticle(article.id);
      showSuccess("Article deleted.");
      router.push("/news");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete article.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
      </div>
    );
  }
  if (!article) return null;

  return (
    <div>
      <PageHeader
        title={article.title}
        description={article.slug}
        actions={
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        }
      />
      <NewsForm initial={article} />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete article"
        message={`Delete "${article.title}"? This is a soft delete.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
