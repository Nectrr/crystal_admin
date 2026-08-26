"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { updatePage, type TermsPageContent, type TermsSection, type TermsSubsection } from "@/lib/api/pages";

function StringListEditor({
  items,
  onChange,
  itemLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  itemLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="flex-1 rounded-lg border border-[#EDEAE0] bg-white px-3 py-1.5 text-sm text-[#4A4A3C] focus:outline-none focus:ring-2 focus:ring-[#B8952F]/40 focus:border-[#B8952F]"
            value={item}
            onChange={(e) => {
              const next = items.slice();
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-500 shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs self-start" onClick={() => onChange([...items, ""])}>
        <Plus className="h-3.5 w-3.5" /> Add {itemLabel}
      </Button>
    </div>
  );
}

function SubsectionsEditor({
  subsections,
  onChange,
}: {
  subsections: TermsSubsection[];
  onChange: (s: TermsSubsection[]) => void;
}) {
  function updateAt(i: number, patch: Partial<TermsSubsection>) {
    const next = subsections.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  return (
    <div className="flex flex-col gap-3">
      {subsections.map((sub, i) => (
        <div key={i} className="rounded-lg border border-[#EDEAE0] p-3 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <Input label="Subsection title" value={sub.title} onChange={(e) => updateAt(i, { title: e.target.value })} className="flex-1" />
            <button
              type="button"
              onClick={() => onChange(subsections.filter((_, idx) => idx !== i))}
              className="text-red-500 mt-6 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <StringListEditor items={sub.list} onChange={(list) => updateAt(i, { list })} itemLabel="item" />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="!px-2 !py-1 text-xs self-start"
        onClick={() => onChange([...subsections, { title: "", list: [] }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add subsection
      </Button>
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
  onRemove,
}: {
  section: TermsSection;
  onChange: (s: TermsSection) => void;
  onRemove: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  function update<K extends keyof TermsSection>(key: K, value: TermsSection[K]) {
    onChange({ ...section, [key]: value });
  }

  return (
    <div className="rounded-lg border border-[#EDEAE0] bg-white">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setCollapsed((c) => !c)}>
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronDown className="h-4 w-4 text-[#8C8C78]" /> : <ChevronUp className="h-4 w-4 text-[#8C8C78]" />}
          <span className="text-sm font-medium text-[#4A4A3C]">
            {section.numbered ? `${section.numbered} ` : ""}
            {section.title || "Untitled section"}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {!collapsed && (
        <div className="border-t border-[#EDEAE0] p-4 flex flex-col gap-3">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Input label="Number" value={section.numbered ?? ""} onChange={(e) => update("numbered", e.target.value)} placeholder="1." />
            <Input label="Title" value={section.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <Textarea
            label="Body"
            hint="Blank line between paragraphs."
            value={section.content ?? ""}
            onChange={(e) => update("content", e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-[#4A4A3C] mb-2">Bullet list</p>
            <StringListEditor items={section.list ?? []} onChange={(list) => update("list", list)} itemLabel="bullet" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#4A4A3C] mb-2">Subsections</p>
            <SubsectionsEditor subsections={section.subsections ?? []} onChange={(subsections) => update("subsections", subsections)} />
          </div>
          <Textarea
            label="Closing note"
            hint="Optional line shown after the list/subsections."
            value={section.outro ?? ""}
            onChange={(e) => update("outro", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function slugify(title: string) {
  return "tc-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
}

export function TermsPageForm({ initial }: { initial: TermsPageContent }) {
  const { showSuccess, showError } = useToast();
  const [sections, setSections] = useState<TermsSection[]>(initial.sections ?? []);
  const [saving, setSaving] = useState(false);

  function updateSection(i: number, section: TermsSection) {
    const next = sections.slice();
    next[i] = section;
    setSections(next);
  }

  function addSection() {
    setSections([...sections, { id: `tc-new-${Date.now()}`, title: "", numbered: `${sections.length + 1}.` }]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const withIds = sections.map((s) => ({ ...s, id: s.id || slugify(s.title) || `tc-${Date.now()}` }));
      await updatePage<TermsPageContent>("terms", { sections: withIds });
      showSuccess("Terms & Conditions updated.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {sections.map((section, i) => (
        <SectionEditor
          key={section.id || i}
          section={section}
          onChange={(s) => updateSection(i, s)}
          onRemove={() => setSections(sections.filter((_, idx) => idx !== i))}
        />
      ))}
      <Button type="button" variant="secondary" onClick={addSection} className="self-start">
        <Plus className="h-4 w-4" /> Add section
      </Button>
      <div className="flex justify-end">
        <Button loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
