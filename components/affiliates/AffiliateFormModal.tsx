"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { createAffiliate, updateAffiliate, type Affiliate, type AffiliateWithSummary } from "@/lib/api/affiliates";

interface AffiliateFormModalProps {
  open: boolean;
  // When set, the modal edits this affiliate; otherwise it creates a new one.
  affiliate?: Affiliate | null;
  onClose: () => void;
  onSaved: (saved: AffiliateWithSummary) => void;
}

export function AffiliateFormModal({ open, affiliate, onClose, onSaved }: AffiliateFormModalProps) {
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(affiliate?.name ?? "");
    setEmail(affiliate?.email ?? "");
    setPhone(affiliate?.phone ?? "");
    setNotes(affiliate?.notes ?? "");
  }, [open, affiliate]);

  async function handleSave() {
    if (!name.trim()) {
      showError("Enter the affiliate's name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const saved = affiliate ? await updateAffiliate(affiliate.id, payload) : await createAffiliate(payload);
      showSuccess(affiliate ? "Affiliate updated." : "Affiliate created — now generate their first link.");
      onSaved(saved);
      onClose();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save affiliate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={affiliate ? "Edit affiliate" : "New affiliate"} maxWidth="max-w-lg">
      <div className="flex flex-col gap-3">
        <Input id="affiliate-name" label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            id="affiliate-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input id="affiliate-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Textarea
          id="affiliate-notes"
          label="Notes"
          hint="Internal only — e.g. where they promote, how you'll pay them."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={saving} onClick={handleSave}>
            {affiliate ? "Save" : "Create affiliate"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
