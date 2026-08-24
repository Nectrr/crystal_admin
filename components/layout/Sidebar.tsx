"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Ticket,
  Receipt,
  Users,
  Newspaper,
  MapPin,
  Settings,
  LogOut,
  QrCode,
  Image as ImageIcon,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/shows", label: "Shows", icon: Ticket },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/orders/scan", label: "Door Scanner", icon: QrCode },
  { href: "/artists", label: "Artists", icon: Users },
  { href: "/merch/products", label: "Merch", icon: ShoppingBag },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/pages", label: "Site Pages", icon: FileText },
  { href: "/tour-registrations", label: "Tour Registrations", icon: MapPin },
  { href: "/settings", label: "Settings", icon: Settings },
];

const SCANNER_NAV_HREFS = new Set(["/orders/scan", "/settings"]);

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navItems = user?.role === "scanner" ? NAV_ITEMS.filter((item) => SCANNER_NAV_HREFS.has(item.href)) : NAV_ITEMS;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#EDEAE0] bg-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <Image src="/crystalcity-logo.png" alt="CrystalCity" width={36} height={36} className="shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#4A4A3C] leading-none">CrystalCity</p>
          <p className="text-xs text-[#8C8C78] mt-0.5">{user?.role === "scanner" ? "Door Staff" : "Admin"}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/orders"
                ? pathname === "/orders"
                : item.href === "/merch/products"
                  ? (pathname?.startsWith("/merch") ?? false)
                  : pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[#F5E9CE] text-[#4A4A3C] font-medium"
                      : "text-[#8C8C78] hover:bg-[#F5E9CE]/40 hover:text-[#4A4A3C]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-[#B8952F]" : "text-[#8C8C78]"}`} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[#EDEAE0] px-4 py-4">
        <p className="text-xs text-[#8C8C78] mb-2 truncate">{user?.email}</p>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#8C8C78] hover:bg-[#F5E9CE]/40 hover:text-[#4A4A3C]"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
