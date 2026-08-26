"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, Badge } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listMerchProducts, deleteMerchProduct, type MerchProductWithVariants } from "@/lib/api/merch";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { formatMoney } from "@/lib/currency";

export default function MerchProductsPage() {
  const [products, setProducts] = useState<MerchProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<MerchProductWithVariants | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setProducts(await listMerchProducts());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load products.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMerchProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showSuccess("Product deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<MerchProductWithVariants>[] = [
    {
      key: "image",
      header: "",
      render: (p) =>
        p.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded object-cover border border-[#EDEAE0]" />
        ) : (
          <div className="h-10 w-10 rounded bg-[#F5E9CE]/40 border border-[#EDEAE0]" />
        ),
    },
    {
      key: "name",
      header: "Product",
      accessor: (p) => p.name,
      sortable: true,
      searchable: true,
      render: (p) => (
        <div>
          <p className="font-medium text-[#4A4A3C]">{p.name}</p>
          <p className="text-xs text-[#8C8C78]">{p.slug}</p>
        </div>
      ),
    },
    {
      key: "artist",
      header: "Artist",
      accessor: (p) => p.artist_name,
      sortable: true,
      searchable: true,
      render: (p) => <span className="text-[#8C8C78]">{p.artist_name}</span>,
    },
    {
      key: "category",
      header: "Category",
      accessor: (p) => p.category,
      sortable: true,
      searchable: true,
      render: (p) => <span className="text-[#8C8C78]">{p.category}</span>,
    },
    {
      key: "price",
      header: "Price",
      accessor: (p) => p.price_pence,
      sortable: true,
      render: (p) => formatMoney(p.price_pence, p.currency),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => {
        const outOfStock = p.variants.filter((v) => !v.in_stock).length;
        return (
          <span className="flex items-center gap-2 text-[#8C8C78]">
            {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}
            {outOfStock > 0 && <Badge color="red">{outOfStock} out</Badge>}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (p.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex items-center gap-3">
          <Link href={`/merch/products/${p.id}`} className="text-[#B8952F] hover:underline">
            Edit
          </Link>
          <button onClick={() => setDeleteTarget(p)} className="text-red-500" aria-label={`Delete ${p.name}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage merch products and their variants"
        actions={
          <Link href="/merch/products/new">
            <Button>
              <Plus className="h-4 w-4" /> New product
            </Button>
          </Link>
        }
      />
      {!loading && products.length === 0 ? (
        <EmptyState title="No products yet" message="Add a product to get started." />
      ) : (
        <DataTable
          columns={columns}
          rows={products}
          rowKey={(p) => p.id}
          loading={loading}
          skeletonCols={7}
          searchPlaceholder="Search products..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product"
        message={`Delete "${deleteTarget?.name}"? This is a soft delete — its order history is kept.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
