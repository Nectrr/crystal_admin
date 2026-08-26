"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { updatePage, type TermsPageContent } from "@/lib/api/pages";

export function TermsPageForm({ initial }: { initial: TermsPageContent }) {
  const { showSuccess, showError } = useToast();
  const [bodyHtml, setBodyHtml] = useState(initial.body_html ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePage<TermsPageContent>("terms", { body_html: bodyHtml });
      showSuccess("Terms & Conditions updated.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <RichTextEditor label="Terms & Conditions" value={bodyHtml} onChange={setBodyHtml} />
      <div className="flex justify-end">
        <Button loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
