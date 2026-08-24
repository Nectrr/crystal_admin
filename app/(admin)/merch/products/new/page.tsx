import { PageHeader } from "@/components/layout/PageHeader";
import { ProductForm } from "@/components/merch/ProductForm";

export default function NewMerchProductPage() {
  return (
    <div>
      <PageHeader title="New product" description="Add a new merch product" />
      <ProductForm />
    </div>
  );
}
