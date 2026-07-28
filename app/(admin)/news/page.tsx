"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, Badge } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { listNews, type Article } from "@/lib/api/news";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setArticles(await listNews());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load articles.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: DataTableColumn<Article>[] = [
    { key: "title", header: "Title", accessor: (a) => a.title, sortable: true, searchable: true, className: "font-medium" },
    {
      key: "category",
      header: "Category",
      accessor: (a) => a.category,
      sortable: true,
      searchable: true,
      render: (a) => <span className="text-[#8C8C78]">{a.category}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <>
          {a.is_active ? <Badge color="green">Published</Badge> : <Badge color="gray">Draft</Badge>}
          {a.is_featured && (
            <span className="ml-1">
              <Badge color="gold">Featured</Badge>
            </span>
          )}
        </>
      ),
    },
    {
      key: "updated_at",
      header: "Updated",
      accessor: (a) => new Date(a.updated_at),
      sortable: true,
      render: (a) => <span className="text-[#8C8C78]">{new Date(a.updated_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <Link href={`/news/${a.id}`} className="text-[#B8952F] hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="News"
        description="Manage published articles"
        actions={
          <Link href="/news/new">
            <Button>
              <Plus className="h-4 w-4" /> New article
            </Button>
          </Link>
        }
      />
      {!loading && articles.length === 0 ? (
        <EmptyState title="No articles yet" message="Publish your first article to see it here." />
      ) : (
        <DataTable
          columns={columns}
          rows={articles}
          rowKey={(a) => a.id}
          loading={loading}
          skeletonCols={5}
          searchPlaceholder="Search articles..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
}
