"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2, X } from "lucide-react";
import { uploadMedia } from "@/lib/api/media";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface MediaUploadFieldProps {
  label?: string;
  value?: string | null;
  onChange: (url: string) => void;
}

export function MediaUploadField({ label, value, onChange }: MediaUploadFieldProps) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showError } = useToast();

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showError("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    setLoading(true);
    try {
      const res = await uploadMedia(file);
      onChange(res.url);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 413) showError("File is too large.");
        else if (err.status === 415) showError("Unsupported file type.");
        else showError(err.message);
      } else {
        showError("Upload failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-[#4A4A3C]">{label}</span>}
      <div
        className="relative flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#EDEAE0] bg-white p-4 text-center cursor-pointer hover:border-[#B8952F] transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {value ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="preview" className="max-h-40 mx-auto rounded-md object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="absolute -top-2 -right-2 rounded-full bg-white border border-[#EDEAE0] p-1 shadow"
            >
              <X className="h-3 w-3 text-[#4A4A3C]" />
            </button>
          </div>
        ) : loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-[#8C8C78]" />
            <span className="text-xs text-[#8C8C78]">Click or drag an image to upload</span>
          </>
        )}
      </div>
    </div>
  );
}
