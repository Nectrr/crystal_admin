"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/app/providers/AuthProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-screen">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80vw] shadow-xl animate-[slideInLeft_0.18s_ease-out]">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col h-screen overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-[#EDEAE0] bg-white px-4 py-3 lg:hidden shrink-0">
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            className="rounded-lg p-2 text-[#4A4A3C] hover:bg-[#F5E9CE]/50"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B8952F] text-white text-sm font-semibold">
            C
          </div>
          <p className="text-sm font-semibold text-[#4A4A3C]">CrystalCity Admin</p>
        </header>

        <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
