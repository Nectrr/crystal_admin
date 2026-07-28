import { apiFetch } from "./client";

export interface MediaUploadResponse {
  url: string;
}

export function uploadMedia(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<MediaUploadResponse>("/api/admin/media/upload", {
    method: "POST",
    body: form,
    isFormData: true,
  });
}
