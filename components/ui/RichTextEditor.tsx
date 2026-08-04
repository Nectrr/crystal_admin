"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  LinkIcon,
  ImageIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { uploadMedia } from "@/lib/api/media";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";

interface RichTextEditorProps {
  label?: string;
  hint?: string;
  value: string;
  onChange: (html: string) => void;
}

// Stores/loads raw HTML in the same `body` string field the backend already
// has — no schema change. Tiptap's default HTML output (StarterKit's node
// set: paragraphs, headings, lists, blockquote, bold/italic/strike, plus
// Link/Image below) is plain semantic HTML, so anything already saved as
// HTML in `body` renders back into the editor unchanged.
export function RichTextEditor({ label, hint, value, onChange }: RichTextEditorProps) {
  const { showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder: "Write the article..." }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[240px] max-w-none px-3 py-2 text-sm text-[#4A4A3C] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  async function handleImageFile(file: File | null | undefined) {
    if (!file || !editor) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      showError("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    try {
      const res = await uploadMedia(file);
      editor.chain().focus().setImage({ src: res.url }).run();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Image upload failed.");
    }
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) return null;

  const barBtn = (active: boolean) =>
    `rounded p-1.5 hover:bg-[#F5E9CE]/60 ${active ? "bg-[#F5E9CE] text-[#B8952F]" : "text-[#4A4A3C]"}`;

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[#4A4A3C]">{label}</label>}
      <div className="rounded-lg border border-[#EDEAE0] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#B8952F]/40 focus-within:border-[#B8952F]">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#EDEAE0] bg-[#FBFAF6] px-2 py-1.5">
          <button type="button" className={barBtn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" className={barBtn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={barBtn(editor.isActive("strike"))}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />
          <button
            type="button"
            className={barBtn(editor.isActive("heading", { level: 2 }))}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={barBtn(editor.isActive("heading", { level: 3 }))}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Subheading"
          >
            <Heading3 className="h-4 w-4" />
          </button>
          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />
          <button
            type="button"
            className={barBtn(editor.isActive("bulletList"))}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={barBtn(editor.isActive("orderedList"))}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={barBtn(editor.isActive("blockquote"))}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </button>
          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />
          <button type="button" className={barBtn(editor.isActive("link"))} onClick={setLink} title="Link">
            <LinkIcon className="h-4 w-4" />
          </button>
          <button type="button" className={barBtn(false)} onClick={() => fileInputRef.current?.click()} title="Insert image">
            <ImageIcon className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              handleImageFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />
          <button
            type="button"
            className={barBtn(false)}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={barBtn(false)}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>
      {hint && <p className="text-xs text-[#8C8C78]">{hint}</p>}
    </div>
  );
}
