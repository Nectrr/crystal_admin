"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[#B8952F] text-white shadow-sm hover:bg-[#a3831f] hover:shadow disabled:opacity-60 disabled:shadow-none",
  secondary: "bg-white text-[#4A4A3C] border border-[#EDEAE0] hover:bg-[#F5E9CE]/40 hover:border-[#B8952F]/30 disabled:opacity-60",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-60",
  ghost: "bg-transparent text-[#4A4A3C] hover:bg-[#F5E9CE]/50 disabled:opacity-60",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading, className = "", children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8952F]/50 focus-visible:ring-offset-1 active:scale-[0.98] ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
