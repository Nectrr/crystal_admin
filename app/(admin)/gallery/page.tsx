"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, Badge } from "@/components/ui/Table";
import { GalleryMediaField } from "@/components/gallery/GalleryMediaField";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import {
  listGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  type GalleryItem,
  type GalleryItemInput,
  type GalleryMediaType,
} from "@/lib/api/gallery";

type Tab = GalleryMediaType;

const emptyDraft: GalleryItemInput = {
  media_type: "image",
  title: "",
  event_date: "",
  city_name: "",
  media_url: "",
  sort_order: 0,
  is_active: true,
};

export default function GalleryPage() {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [tab, setTab] = useState<Tab>("image");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [draft, setDraft] = useState<GalleryItemInput>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setItems(await listGalleryItems());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load gallery.");
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setDraft({ ...emptyDraft, media_type: tab });
    setModalOpen(true);
  }

  function openEdit(item: GalleryItem) {
    setEditing(item);
    setDraft({
      media_type: item.media_type,
      title: item.title,
      event_date: item.event_date ?? "",
      city_name: item.city_name ?? "",
      media_url: item.media_url,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: GalleryItemInput = {
        ...draft,
        event_date: draft.event_date || undefined,
        city_name: draft.city_name || undefined,
      };
      if (editing) {
        const updated = await updateGalleryItem(editing.id, payload);
        setItems((prev) => prev?.map((i) => (i.id === updated.id ? updated : i)) ?? prev);
        showSuccess("Gallery item updated.");
      } else {
        const created = await createGalleryItem(payload);
        setItems((prev) => [...(prev ?? []), created]);
        showSuccess("Gallery item added.");
      }
      setModalOpen(false);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save gallery item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGalleryItem(deleteTarget.id);
      setItems((prev) => prev?.filter((i) => i.id !== deleteTarget.id) ?? prev);
      showSuccess("Gallery item deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete gallery item.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = (items ?? []).filter((i) => i.media_type === tab).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <PageHeader
        title="Gallery"
        description="Past event pictures and videos shown on the public site"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add {tab === "video" ? "video" : "picture"}
          </Button>
        }
      />

      <div className="flex gap-1 border-b border-[#EDEAE0] mb-6">
        {(["image", "video"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? "border-[#B8952F] text-[#4A4A3C]" : "border-transparent text-[#8C8C78] hover:text-[#4A4A3C]"
            }`}
          >
            {t === "image" ? "Pictures" : "Videos"}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={`No ${tab === "video" ? "videos" : "pictures"} yet.`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-lg border border-[#EDEAE0] bg-white overflow-hidden flex flex-col">
              <div className="aspect-square bg-[#120d08] flex items-center justify-center">
                {item.media_type === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={item.media_url} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#4A4A3C] truncate">{item.title}</p>
                  {!item.is_active && <Badge color="gray">Hidden</Badge>}
                </div>
                <p className="text-xs text-[#8C8C78]">
                  {[item.event_date, item.city_name].filter(Boolean).join(" · ") || "-"}
                </p>
                <div className="flex gap-3 mt-1">
                  <button onClick={() => openEdit(item)} className="text-[#B8952F]">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(item)} className="text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit gallery item" : "Add gallery item"} maxWidth="max-w-lg">
        <div className="flex flex-col gap-3">
          <Select
            label="Type"
            value={draft.media_type}
            onChange={(e) => setDraft((d) => ({ ...d, media_type: e.target.value as GalleryMediaType, media_url: "" }))}
          >
            <option value="image">Picture</option>
            <option value="video">Video</option>
          </Select>
          <Input label="Title" required value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={draft.event_date ?? ""} onChange={(e) => setDraft((d) => ({ ...d, event_date: e.target.value }))} />
            <Input label="City" value={draft.city_name ?? ""} onChange={(e) => setDraft((d) => ({ ...d, city_name: e.target.value }))} />
          </div>
          <GalleryMediaField mediaType={draft.media_type} value={draft.media_url} onChange={(url) => setDraft((d) => ({ ...d, media_url: url }))} />
          <Input
            label="Sort order"
            type="number"
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
            <Button type="button" loading={saving} disabled={!draft.title || !draft.media_url} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete gallery item"
        message={`Delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
