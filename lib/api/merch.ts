import { apiFetch, buildQuery } from "./client";

export interface MerchVariant {
  id: string;
  product_id: string;
  label: string;
  stock_quantity?: number | null;
  quantity_sold: number;
  sort_order: number;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export type MerchVariantInput = {
  label: string;
  stock_quantity?: number | null;
  sort_order: number;
};

export interface MerchProduct {
  id: string;
  artist_id: string;
  slug: string;
  name: string;
  description: string;
  images: string[];
  category: string;
  price_pence: number;
  currency: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MerchProductWithVariants extends MerchProduct {
  artist_slug: string;
  artist_name: string;
  variants: MerchVariant[];
}

export type MerchProductInput = {
  artist_id: string;
  slug: string;
  name: string;
  description: string;
  images: string[];
  category: string;
  price_pence: number;
  currency: string;
  sort_order: number;
  is_active: boolean;
};

export async function listMerchProducts(): Promise<MerchProductWithVariants[]> {
  const data = await apiFetch<MerchProductWithVariants[] | null>("/api/admin/merch/products", { method: "GET" });
  return data ?? [];
}

export function createMerchProduct(data: Partial<MerchProductInput>) {
  return apiFetch<MerchProduct>("/api/admin/merch/products", { method: "POST", body: data });
}

export function updateMerchProduct(id: string, data: Partial<MerchProductInput>) {
  return apiFetch<MerchProduct>(`/api/admin/merch/products/${id}`, { method: "PATCH", body: data });
}

export function deleteMerchProduct(id: string) {
  return apiFetch<void>(`/api/admin/merch/products/${id}`, { method: "DELETE" });
}

export async function listMerchVariants(productId: string): Promise<MerchVariant[]> {
  const data = await apiFetch<MerchVariant[] | null>(`/api/admin/merch/products/${productId}/variants`, { method: "GET" });
  return data ?? [];
}

export function createMerchVariant(productId: string, data: MerchVariantInput) {
  return apiFetch<MerchVariant>(`/api/admin/merch/products/${productId}/variants`, { method: "POST", body: data });
}

// stock_quantity: undefined leaves it unchanged, null explicitly clears it back to unlimited.
export function updateMerchVariant(productId: string, variantId: string, data: Partial<MerchVariantInput>) {
  return apiFetch<MerchVariant>(`/api/admin/merch/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteMerchVariant(productId: string, variantId: string) {
  return apiFetch<void>(`/api/admin/merch/products/${productId}/variants/${variantId}`, { method: "DELETE" });
}

export type MerchOrderStatus = "pending" | "paid" | "failed" | "sold_out" | "refunded";

export interface MerchOrder {
  id: string;
  full_name: string;
  email: string;
  address_line1: string;
  city: string;
  postcode: string;
  subtotal_pence: number;
  currency: string;
  status: MerchOrderStatus;
  stripe_payment_intent_id?: string | null;
  failure_reason?: string | null;
  paid_at?: string | null;
  refunded_at?: string | null;
  refunded_pence?: number | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface MerchOrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  variant_id?: string | null;
  product_name: string;
  variant_label: string;
  unit_price_pence: number;
  quantity: number;
  line_total_pence: number;
  created_at: string;
}

export interface MerchOrderWithItems extends MerchOrder {
  items: MerchOrderItem[];
}

export interface ListMerchOrdersParams {
  status?: MerchOrderStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface ListMerchOrdersResponse {
  orders: MerchOrder[];
  total: number;
  limit: number;
  offset: number;
}

export async function listMerchOrders(params: ListMerchOrdersParams): Promise<ListMerchOrdersResponse> {
  const data = await apiFetch<ListMerchOrdersResponse>(`/api/admin/merch/orders${buildQuery({ ...params })}`, {
    method: "GET",
  });
  return { ...data, orders: data.orders ?? [] };
}

export function getMerchOrder(id: string): Promise<MerchOrderWithItems> {
  return apiFetch<MerchOrderWithItems>(`/api/admin/merch/orders/${id}`, { method: "GET" });
}

// amountPence omitted refunds the full order total.
export function refundMerchOrder(id: string, amountPence?: number) {
  return apiFetch<void>(`/api/admin/merch/orders/${id}/refund`, {
    method: "POST",
    body: amountPence != null ? { amount_pence: amountPence } : undefined,
  });
}

export function resendMerchOrderEmail(id: string) {
  return apiFetch<void>(`/api/admin/merch/orders/${id}/resend-email`, { method: "POST" });
}
