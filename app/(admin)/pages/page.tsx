import Link from "next/link";
import { Home, Info, FileText, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

const PAGES = [
  { key: "home", label: "Homepage", description: "Hero tagline, description, and call-to-action buttons", icon: Home },
  { key: "about", label: "About page", description: "Hero, vision/mission, values, services, and stats", icon: Info },
  { key: "terms", label: "Terms & Conditions", description: "The legal terms shown on the public /terms page", icon: FileText },
];

export default function PagesListPage() {
  return (
    <div>
      <PageHeader title="Site Pages" description="Edit the otherwise-hardcoded content on the public homepage and About page" />
      <div className="flex flex-col gap-3 max-w-2xl">
        {PAGES.map((p) => {
          const Icon = p.icon;
          return (
            <Link
              key={p.key}
              href={`/pages/${p.key}`}
              className="flex items-center gap-4 rounded-lg border border-[#EDEAE0] bg-white p-4 hover:border-[#B8952F]/40 hover:bg-[#F5E9CE]/20 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5E9CE] shrink-0">
                <Icon className="h-5 w-5 text-[#B8952F]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#4A4A3C]">{p.label}</p>
                <p className="text-xs text-[#8C8C78]">{p.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8C8C78]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
