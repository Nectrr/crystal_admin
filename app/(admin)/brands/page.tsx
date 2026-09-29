"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, Badge } from "@/components/ui/Table";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { listBrands, createBrand, updateBrand, deleteBrand, type Brand, type BrandInput } from "@/lib/api/brands";

const emptyDraft: BrandInput = {
  name: "",
  logo_url: "",
  link_url: "",
  sort_order: 0,
  is_active: true,
};

function isValidLink(url: string) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function BrandsPage() {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState<Brand[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [draft, setDraft] = useState<BrandInput>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setItems(await listBrands());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load logos.");
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    const nextOrder = (items ?? []).reduce((max, b) => Math.max(max, b.sort_order), 0) + 1;
    setDraft({ ...emptyDraft, sort_order: nextOrder });
    setModalOpen(true);
  }

  function openEdit(item: Brand) {
    setEditing(item);
    setDraft({
      name: item.name,
      logo_url: item.logo_url,
      link_url: item.link_url ?? "",
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: BrandInput = { ...draft, link_url: draft.link_url?.trim() ?? "" };
      if (editing) {
        const updated = await updateBrand(editing.id, payload);
        setItems((prev) => prev?.map((i) => (i.id === updated.id ? updated : i)) ?? prev);
        showSuccess("Logo updated.");
      } else {
        const created = await createBrand(payload);
        setItems((prev) => [...(prev ?? []), created]);
        showSuccess("Logo added.");
      }
      setModalOpen(false);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save logo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBrand(deleteTarget.id);
      setItems((prev) => prev?.filter((i) => i.id !== deleteTarget.id) ?? prev);
      showSuccess("Logo deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete logo.");
    } finally {
      setDeleting(false);
    }
  }

  const sorted = [...(items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const linkInvalid = !isValidLink(draft.link_url?.trim() ?? "");

  return (
    <div>
      <PageHeader
        title="Our Universe"
        description="Brand logos shown in the Our Universe strip on the public site"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add logo
          </Button>
        }
      />

      {items === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState message="No logos yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((item) => (
            <div key={item.id} className="rounded-lg border border-[#EDEAE0] bg-white overflow-hidden flex flex-col">
              <div className="aspect-[3/2] bg-[#1a140a] flex items-center justify-center p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.logo_url} alt={item.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#4A4A3C] truncate">{item.name}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-[#8C8C78]">#{item.sort_order}</span>
                    {!item.is_active && <Badge color="gray">Hidden</Badge>}
                  </div>
                </div>
                {item.link_url ? (
                  <a
                    href={item.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#B8952F] inline-flex items-center gap-1 min-w-0 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.link_url}</span>
                  </a>
                ) : (
                  <p className="text-xs text-[#8C8C78]">No link</p>
                )}
                <div className="flex gap-3 mt-1">
                  <button onClick={() => openEdit(item)} className="text-[#B8952F]" aria-label="Edit logo">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(item)} className="text-red-500" aria-label="Delete logo">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit logo" : "Add logo"} maxWidth="max-w-lg">
        <div className="flex flex-col gap-3">
          <Input label="Brand name" required value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          <MediaUploadField label="Logo" value={draft.logo_url} onChange={(url) => setDraft((d) => ({ ...d, logo_url: url }))} />
          <Input
            label="Link URL"
            type="url"
            placeholder="https://"
            hint="Where the logo takes visitors when clicked. Leave empty for no link."
            error={linkInvalid ? "Enter a full URL starting with http:// or https://" : undefined}
            value={draft.link_url ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, link_url: e.target.value }))}
          />
          <Input
            label="Sort order"
            type="number"
            hint="Lower numbers show first."
            value={draft.sort_order}
            onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
          />
          <label className="flex items-center gap-2 text-sm text-[#4A4A3C]">
            <input type="checkbox" checked={draft.is_active ?? true} onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))} />
            Visible on site
          </label>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} disabled={!draft.name || !draft.logo_url || linkInvalid} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete logo"
        message={`Delete the "${deleteTarget?.name}" logo?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
