"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface DropdownProps {
  trigger: ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
  children: (close: () => void) => ReactNode;
  panelClassName?: string;
  align?: "left" | "right";
}

// Small trigger-button + floating-panel dropdown shared by the rich text
// toolbar (style/align/templates/more menus, color swatches) — closes on
// outside click or Escape. Not a generic app-wide menu component; kept
// deliberately minimal for that one use case.
export function Dropdown({
  trigger,
  triggerClassName = "",
  triggerTitle,
  children,
  panelClassName = "",
  align = "left",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        title={triggerTitle}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={`absolute z-20 mt-1 min-w-[9rem] rounded-lg border border-[#EDEAE0] bg-white py-1 shadow-lg ${align === "right" ? "right-0" : "left-0"} ${panelClassName}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#F5E9CE]/60 ${active ? "text-[#B8952F] font-medium" : "text-[#4A4A3C]"}`}
    >
      {children}
    </button>
  );
}
