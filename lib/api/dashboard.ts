import { apiFetch } from "./client";
import type { OrderStatus } from "./orders";

export interface RevenueByShow {
  show_id: string;
  artist_name: string;
  currency: string;
  total_pence: number;
}

export interface StopRevenue {
  show_id: string;
  artist_name: string;
  tour_name: string;
  tour_stop_id: string | null;
  city_name: string;
  event_start_at?: string | null;
  currency: string;
  gross_pence: number;
  refunded_pence: number;
  net_pence: number;
  paid_orders: number;
  tickets_sold: number;
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
  revenue_by_stop: StopRevenue[];
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
      revenue_by_stop: data.payments.revenue_by_stop ?? [],
      orders_by_status: data.payments.orders_by_status ?? {},
      refunds: data.payments.refunds ?? { count: 0, total_pence: 0 },
      recent_transactions: data.payments.recent_transactions ?? [],
    },
  };
}
