"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProductForm } from "@/components/merch/ProductForm";
import { VariantsSection } from "@/components/merch/VariantsSection";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  listMerchProducts,
  deleteMerchProduct,
  listMerchVariants,
  type MerchProductWithVariants,
} from "@/lib/api/merch";

export default function MerchProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [product, setProduct] = useState<MerchProductWithVariants | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // No single-product-by-id admin endpoint exists — list + find is the
        // simplest correct fetch here since admin product lists are small,
        // and it comes back with variants + artist name already joined.
        const all = await listMerchProducts();
        const found = all.find((p) => p.id === params.id) ?? null;
        if (found) {
          found.variants = await listMerchVariants(found.id);
        }
        setProduct(found);
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load product.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleDelete() {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteMerchProduct(product.id);
      showSuccess("Product deleted.");
      router.push("/merch/products");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete product.");
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
  if (!product) return null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={product.name}
        description={product.slug}
        actions={
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        }
      />
      <ProductForm initial={product} />
      <div className="border-t border-[#EDEAE0] pt-8">
        <VariantsSection productId={product.id} variants={product.variants} />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete product"
        message={`Delete "${product.name}"? This is a soft delete.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
