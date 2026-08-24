"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/merch/products", label: "Products" },
  { href: "/merch/orders", label: "Orders" },
];

export default function MerchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="flex gap-1 border-b border-[#EDEAE0] mb-6">
        {TABS.map((tab) => {
          const isActive = pathname?.startsWith(tab.href) ?? false;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-[#B8952F] text-[#4A4A3C]"
                  : "border-transparent text-[#8C8C78] hover:text-[#4A4A3C]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
