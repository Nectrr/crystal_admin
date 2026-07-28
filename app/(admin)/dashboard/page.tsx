"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Users, Newspaper, Ticket, MapPin, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardStats, type DashboardStats } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";

const TILES: { key: keyof DashboardStats; label: string; icon: typeof LayoutGrid }[] = [
  { key: "active_shows", label: "Active Shows", icon: Ticket },
  { key: "active_artists", label: "Active Artists", icon: Users },
  { key: "published_articles", label: "Published Articles", icon: Newspaper },
  { key: "show_registrations", label: "Show Registrations", icon: LayoutGrid },
  { key: "tour_registrations", label: "Tour Registrations", icon: MapPin },
  { key: "newsletter_subscribers", label: "Newsletter Subscribers", icon: Mail },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setStats(await getDashboardStats());
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of CrystalCity activity" />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.map((tile) => (
            <div key={tile.key} className="rounded-xl border border-[#EDEAE0] bg-white p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-lg bg-[#EDEAE0] animate-skeleton shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-6 w-16 rounded bg-[#EDEAE0] animate-skeleton" />
                <div className="h-3 w-24 rounded bg-[#EDEAE0] animate-skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.key}
                className="group rounded-xl border border-[#EDEAE0] bg-white p-5 flex items-center gap-4 shadow-sm transition-shadow hover:shadow-md hover:border-[#B8952F]/30"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F5E9CE] shrink-0 transition-transform group-hover:scale-105">
                  <Icon className="h-5 w-5 text-[#B8952F]" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold text-[#4A4A3C] tabular-nums">{stats?.[tile.key] ?? "-"}</p>
                  <p className="text-sm text-[#8C8C78] truncate">{tile.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
