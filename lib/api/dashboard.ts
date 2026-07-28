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

export function getDashboardStats() {
  return apiFetch<DashboardStats>("/api/admin/dashboard/stats", { method: "GET" });
}
