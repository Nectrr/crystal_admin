"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { createProject, deleteProject, type Project, type ProjectInput } from "@/lib/api/artists";

const emptyDraft: ProjectInput = { title: "", subtitle: "", image_url: "", sort_order: 0 };

export function ProjectsSection({ artistId, projects }: { artistId: string; projects: Project[] }) {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState(projects);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ProjectInput>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      const created = await createProject(artistId, draft);
      setItems((prev) => [...prev, created]);
      setAdding(false);
      setDraft(emptyDraft);
      showSuccess("Project added.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to add project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(artistId, deleteTarget.id);
      setItems((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showSuccess("Project removed.");
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete project.");
    } finally {
      setDeleting(false);
    }
  }

  const projectColumns: DataTableColumn<Project>[] = [
    { key: "title", header: "Title", accessor: (p) => p.title, sortable: true, searchable: true, className: "font-medium" },
    {
      key: "subtitle",
      header: "Subtitle",
      accessor: (p) => p.subtitle ?? "",
      sortable: true,
      searchable: true,
      render: (p) => <span className="text-[#8C8C78]">{p.subtitle || "-"}</span>,
    },
    { key: "sort_order", header: "Order", accessor: (p) => p.sort_order, sortable: true },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <button onClick={() => setDeleteTarget(p)} className="text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#4A4A3C]">Projects</h3>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add project
        </Button>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add project" maxWidth="max-w-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          <Input label="Subtitle" value={draft.subtitle ?? ""} onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))} />
          <Input label="Image URL" value={draft.image_url ?? ""} onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))} />
          <Input
            label="Sort order"
            type="number"
            value={draft.sort_order}
            onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
          />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleCreate}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {items.length === 0 && !adding ? (
        <EmptyState message="No projects yet." />
      ) : items.length > 0 ? (
        <DataTable
          columns={projectColumns}
          rows={items}
          rowKey={(p) => p.id}
          searchPlaceholder="Search projects..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete project"
        message={`Delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
