import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#EDEAE0] overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-[#EDEAE0] text-sm">{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-[#F5E9CE]/40 sticky top-0 z-10 backdrop-blur-sm">{children}</thead>;
}

export function TH({ children }: { children?: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8C8C78] whitespace-nowrap">
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[#EDEAE0] bg-white">{children}</tbody>;
}

export function TR({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`transition-colors even:bg-[#FBFAF6] hover:bg-[#F5E9CE]/30 ${className}`}>{children}</tr>;
}

export function TD({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-[#4A4A3C] align-middle ${className}`}>{children}</td>;
}

export function EmptyState({ message, title }: { message: string; title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5E9CE]">
        <Inbox className="h-5 w-5 text-[#B8952F]" />
      </div>
      {title && <p className="text-sm font-medium text-[#4A4A3C]">{title}</p>}
      <p className="text-sm text-[#8C8C78] max-w-xs">{message}</p>
    </div>
  );
}

export function Badge({ children, color = "gold" }: { children: ReactNode; color?: "gold" | "green" | "red" | "gray" }) {
  const classes = {
    gold: "bg-[#F5E9CE] text-[#B8952F]",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
  }[color];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>{children}</span>;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-[#EDEAE0] overflow-hidden">
      <div className="divide-y divide-[#EDEAE0]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 flex-1 rounded bg-[#EDEAE0] animate-skeleton"
                style={{ animationDelay: `${(r * cols + c) * 40}ms`, maxWidth: c === 0 ? "10rem" : undefined }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
