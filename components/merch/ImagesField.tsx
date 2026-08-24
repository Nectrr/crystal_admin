"use client";

import { X } from "lucide-react";
import { MediaUploadField } from "@/components/ui/MediaUploadField";

interface ImagesFieldProps {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
}

export function ImagesField({ label, value, onChange }: ImagesFieldProps) {
  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addImage(url: string) {
    if (!url) return;
    onChange([...value, url]);
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-[#4A4A3C]">{label}</span>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((url, i) => (
            <div key={`${url}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-[#EDEAE0]" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -top-2 -right-2 rounded-full bg-white border border-[#EDEAE0] p-1 shadow"
              >
                <X className="h-3 w-3 text-[#4A4A3C]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-xs">
        <MediaUploadField value={undefined} onChange={addImage} />
      </div>
    </div>
  );
}
