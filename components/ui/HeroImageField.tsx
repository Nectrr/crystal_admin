"use client";

import { useState } from "react";
import type { HeroImageInput } from "@/lib/api/shows";

interface HeroImageFieldProps {
  label: string;
  currentUrl?: string | null;
  value: HeroImageInput | undefined;
  onChange: (input: HeroImageInput | undefined) => void;
}

/**
 * Lets the admin pick between pasting a URL or attaching a file for a hero image slot,
 * used when the show form is submitted as multipart/form-data. Leaving it untouched
 * (mode "none") means "don't change the existing image" on PATCH.
 */
export function HeroImageField({ label, currentUrl, value, onChange }: HeroImageFieldProps) {
  const [mode, setMode] = useState<"none" | "url" | "file">(value?.mode ?? "none");

  function setMode2(next: "none" | "url" | "file") {
    setMode(next);
    if (next === "none") onChange(undefined);
    else if (next === "url") onChange({ mode: "url", value: "" });
    else onChange({ mode: "file", value: undefined as unknown as File });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[#EDEAE0] p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#4A4A3C]">{label}</span>
        <div className="flex rounded-md border border-[#EDEAE0] overflow-hidden text-xs">
          {(["none", "url", "file"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode2(m)}
              className={`px-2 py-1 ${mode === m ? "bg-[#F5E9CE] text-[#4A4A3C]" : "bg-white text-[#8C8C78]"}`}
            >
              {m === "none" ? "Unchanged" : m === "url" ? "Paste URL" : "Upload file"}
            </button>
          ))}
        </div>
      </div>
      {currentUrl && mode === "none" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt={label} className="h-24 rounded-md object-cover" />
      )}
      {mode === "url" && (
        <input
          type="url"
          placeholder="https://..."
          value={value?.mode === "url" ? value.value : ""}
          onChange={(e) => onChange({ mode: "url", value: e.target.value })}
          className="w-full rounded-lg border border-[#EDEAE0] bg-white px-3 py-2 text-sm text-[#4A4A3C] focus:outline-none focus:ring-2 focus:ring-[#B8952F]/40"
        />
      )}
      {mode === "file" && (
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange({ mode: "file", value: f });
          }}
          className="text-sm text-[#4A4A3C]"
        />
      )}
    </div>
  );
}
