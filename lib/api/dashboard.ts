import { apiFetch } from "./client";
import type { OrderStatus } from "./orders";

export interface RevenueByShow {
  show_id: string;
  artist_name: string;
  currency: string;
  total_pence: number;
}

export interface RecentTransaction {
  id: string;
  show_id: string;
  artist_name: string;
  full_name: string;
  email: string;
  quantity: number;
  total_pence: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
}

export interface PaymentsOverview {
  total_revenue_pence: number;
  revenue_by_show: RevenueByShow[];
  orders_by_status: Partial<Record<OrderStatus, number>>;
  refunds: {
    count: number;
    total_pence: number;
  };
  recent_transactions: RecentTransaction[];
}

export interface DashboardStats {
  active_shows: number;
  active_artists: number;
  published_articles: number;
  show_registrations: number;
  tour_registrations: number;
  newsletter_subscribers: number;
  payments?: PaymentsOverview;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const data = await apiFetch<DashboardStats>("/api/admin/dashboard/stats", { method: "GET" });
  if (!data.payments) return data;
  return {
    ...data,
    payments: {
      total_revenue_pence: data.payments.total_revenue_pence ?? 0,
      revenue_by_show: data.payments.revenue_by_show ?? [],
      orders_by_status: data.payments.orders_by_status ?? {},
      refunds: data.payments.refunds ?? { count: 0, total_pence: 0 },
      recent_transactions: data.payments.recent_transactions ?? [],
    },
  };
}
