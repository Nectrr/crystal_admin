"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Code,
  SquareCode,
  List,
  ListOrdered,
  Quote,
  LinkIcon,
  ImageIcon,
  Video,
  Music,
  MessageSquare,
  MousePointerClick,
  LayoutTemplate,
  MoreHorizontal,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Minus,
  Eraser,
  Undo2,
  Redo2,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { uploadMedia } from "@/lib/api/media";
import { uploadVideo } from "@/lib/api/media";
import { uploadAudio } from "@/lib/api/media";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { VideoEmbed, AudioEmbed, GenericEmbed, ButtonBlock, Callout, detectVideoKind } from "@/components/ui/tiptap-embed-nodes";

interface RichTextEditorProps {
  label?: string;
  hint?: string;
  value: string;
  onChange: (html: string) => void;
}

const TEXT_COLORS = ["#4A4A3C", "#B8952F", "#C0392B", "#1E6B3C", "#1F4E8C", "#7A3B9E"];
const HIGHLIGHT_COLORS = ["#F5E9CE", "#FDE9C8", "#D8F0DA", "#DCEAFB", "#F6DDE9"];

// Stores/loads raw HTML in the same `body`/`description`-style string field
// the backend already has — no schema change. Every node here (including
// the custom Video/Audio/Button/Callout blocks) renders to plain semantic
// HTML with inline styles, so it round-trips through that string field
// unchanged and looks right wherever it's displayed, independent of the
// consuming page's stylesheet.
export function RichTextEditor({ label, hint, value, onChange }: RichTextEditorProps) {
  const { showError } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      VideoEmbed,
      AudioEmbed,
      GenericEmbed,
      ButtonBlock,
      Callout,
      Placeholder.configure({ placeholder: "Start writing..." }),
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

  async function handleVideoFile(file: File | null | undefined) {
    if (!file || !editor) return;
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) {
      showError("Please choose an MP4, MOV, or WEBM video.");
      return;
    }
    try {
      const res = await uploadVideo(file);
      editor.chain().focus().insertContent({ type: "videoEmbed", attrs: { src: res.url, kind: "file" } }).run();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Video upload failed.");
    }
  }

  async function handleAudioFile(file: File | null | undefined) {
    if (!file || !editor) return;
    if (!["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"].includes(file.type)) {
      showError("Please choose an MP3, WAV, OGG, or M4A audio file.");
      return;
    }
    try {
      const res = await uploadAudio(file);
      editor.chain().focus().insertContent({ type: "audioEmbed", attrs: { src: res.url } }).run();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Audio upload failed.");
    }
  }

  function insertVideoFromUrl() {
    if (!editor) return;
    const url = window.prompt("Video URL (YouTube, Vimeo, or a direct video file link)");
    if (!url) return;
    editor.chain().focus().insertContent({ type: "videoEmbed", attrs: { src: url, kind: detectVideoKind(url) } }).run();
  }

  function insertAudioFromUrl() {
    if (!editor) return;
    const url = window.prompt("Audio file URL");
    if (!url) return;
    editor.chain().focus().insertContent({ type: "audioEmbed", attrs: { src: url } }).run();
  }

  function insertEmbed() {
    if (!editor) return;
    const url = window.prompt("Embed URL (e.g. a tweet, a Substack post, or any embeddable widget link)");
    if (!url) return;
    editor.chain().focus().insertContent({ type: "genericEmbed", attrs: { src: url } }).run();
  }

  function insertButton() {
    if (!editor) return;
    const text = window.prompt("Button text", "Get tickets");
    if (!text) return;
    const href = window.prompt("Button link URL", "https://");
    if (!href) return;
    editor.chain().focus().insertContent({ type: "buttonBlock", attrs: { text, href } }).run();
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

  // Blockquote/Callout hold nested block content, so after inserting one the
  // cursor is left *inside* it — any insertContent() called next (another
  // template, a button, etc.) would land inside that container instead of
  // after it. Appending an empty paragraph at the document's true end
  // (always a top-level position, never inside a container) and moving the
  // cursor there guarantees the next action lands outside it.
  function escapeContainer() {
    if (!editor) return;
    const end = editor.state.doc.content.size;
    editor.chain().insertContentAt(end, { type: "paragraph" }).setTextSelection(end + 1).run();
  }

  function insertTemplate(key: "divider" | "quote" | "callout" | "cta", close: () => void) {
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (key) {
      case "divider":
        chain.setHorizontalRule().run();
        break;
      case "quote":
        chain.insertContent("<blockquote><p>Add your quote here.</p></blockquote>").run();
        escapeContainer();
        break;
      case "callout":
        chain.insertContent({ type: "callout", content: [{ type: "paragraph", content: [{ type: "text", text: "Add a note here." }] }] }).run();
        escapeContainer();
        break;
      case "cta":
        chain
          .insertContent([
            { type: "paragraph", content: [{ type: "text", text: "Add a short call-to-action line here." }] },
            { type: "buttonBlock", attrs: { text: "Get tickets", href: "https://" } },
          ])
          .run();
        break;
    }
    close();
  }

  if (!editor) return null;

  const barBtn = (active: boolean) =>
    `rounded p-1.5 hover:bg-[#F5E9CE]/60 ${active ? "bg-[#F5E9CE] text-[#B8952F]" : "text-[#4A4A3C]"}`;
  const menuTrigger =
    "flex items-center gap-1 rounded px-2 py-1.5 text-sm text-[#4A4A3C] hover:bg-[#F5E9CE]/60";

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[#4A4A3C]">{label}</label>}
      <div className="rounded-lg border border-[#EDEAE0] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#B8952F]/40 focus-within:border-[#B8952F]">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#EDEAE0] bg-[#FBFAF6] px-2 py-1.5">
          {/* Style (paragraph / heading level) */}
          <Dropdown
            triggerClassName={menuTrigger}
            triggerTitle="Style"
            trigger={
              <>
                Style <ChevronDown className="h-3.5 w-3.5" />
              </>
            }
          >
            {(close) => (
              <>
                <DropdownItem
                  active={editor.isActive("paragraph")}
                  onClick={() => {
                    editor.chain().focus().setParagraph().run();
                    close();
                  }}
                >
                  Paragraph
                </DropdownItem>
                {[2, 3, 4].map((level) => (
                  <DropdownItem
                    key={level}
                    active={editor.isActive("heading", { level })}
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run();
                      close();
                    }}
                  >
                    Heading {level}
                  </DropdownItem>
                ))}
              </>
            )}
          </Dropdown>

          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />

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
          <button
            type="button"
            className={barBtn(editor.isActive("code"))}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            <Code className="h-4 w-4" />
          </button>

          {/* Text color */}
          <Dropdown
            triggerClassName={barBtn(false)}
            triggerTitle="Text color"
            trigger={<Palette className="h-4 w-4" />}
          >
            {(close) => (
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    className="h-5 w-5 rounded-full border border-[#EDEAE0]"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      editor.chain().focus().setColor(c).run();
                      close();
                    }}
                  />
                ))}
                <button
                  type="button"
                  title="Reset color"
                  className="ml-1 text-xs text-[#8C8C78] hover:text-[#4A4A3C]"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    close();
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </Dropdown>

          {/* Highlight */}
          <Dropdown
            triggerClassName={barBtn(editor.isActive("highlight"))}
            triggerTitle="Highlight"
            trigger={<Highlighter className="h-4 w-4" />}
          >
            {(close) => (
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    className="h-5 w-5 rounded-full border border-[#EDEAE0]"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: c }).run();
                      close();
                    }}
                  />
                ))}
                <button
                  type="button"
                  title="Remove highlight"
                  className="ml-1 text-xs text-[#8C8C78] hover:text-[#4A4A3C]"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    close();
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </Dropdown>

          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />

          <button type="button" className={barBtn(editor.isActive("link"))} onClick={setLink} title="Link">
            <LinkIcon className="h-4 w-4" />
          </button>
          <button type="button" className={barBtn(false)} onClick={() => imageInputRef.current?.click()} title="Insert image">
            <ImageIcon className="h-4 w-4" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              handleImageFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4"
            className="hidden"
            onChange={(e) => {
              handleAudioFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => {
              handleVideoFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {/* Video */}
          <Dropdown triggerClassName={barBtn(false)} triggerTitle="Video" trigger={<Video className="h-4 w-4" />}>
            {(close) => (
              <>
                <DropdownItem
                  onClick={() => {
                    videoInputRef.current?.click();
                    close();
                  }}
                >
                  Upload a video file
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    insertVideoFromUrl();
                    close();
                  }}
                >
                  Embed from URL (YouTube, Vimeo...)
                </DropdownItem>
              </>
            )}
          </Dropdown>

          {/* Audio */}
          <Dropdown triggerClassName={barBtn(false)} triggerTitle="Audio" trigger={<Music className="h-4 w-4" />}>
            {(close) => (
              <>
                <DropdownItem
                  onClick={() => {
                    audioInputRef.current?.click();
                    close();
                  }}
                >
                  Upload an audio file
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    insertAudioFromUrl();
                    close();
                  }}
                >
                  Embed from URL
                </DropdownItem>
              </>
            )}
          </Dropdown>

          <button type="button" className={barBtn(false)} onClick={insertEmbed} title="Embed a widget (tweet, Substack post, etc.)">
            <MessageSquare className="h-4 w-4" />
          </button>

          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />

          <button type="button" className={barBtn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            <List className="h-4 w-4" />
          </button>
          <button type="button" className={barBtn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </button>

          {/* Alignment */}
          <Dropdown
            triggerClassName={menuTrigger}
            triggerTitle="Alignment"
            trigger={
              <>
                <AlignLeft className="h-4 w-4" /> <ChevronDown className="h-3.5 w-3.5" />
              </>
            }
          >
            {(close) => (
              <>
                {[
                  { key: "left", label: "Align left", Icon: AlignLeft },
                  { key: "center", label: "Align center", Icon: AlignCenter },
                  { key: "right", label: "Align right", Icon: AlignRight },
                  { key: "justify", label: "Justify", Icon: AlignJustify },
                ].map(({ key, label: l, Icon }) => (
                  <DropdownItem
                    key={key}
                    active={editor.isActive({ textAlign: key })}
                    onClick={() => {
                      editor.chain().focus().setTextAlign(key).run();
                      close();
                    }}
                  >
                    <Icon className="h-4 w-4" /> {l}
                  </DropdownItem>
                ))}
              </>
            )}
          </Dropdown>

          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />

          <button type="button" className={barBtn(false)} onClick={insertButton} title="Insert button">
            <MousePointerClick className="h-4 w-4" />
          </button>

          {/* Templates */}
          <Dropdown
            triggerClassName={menuTrigger}
            triggerTitle="Insert a template block"
            trigger={
              <>
                <LayoutTemplate className="h-4 w-4" /> Template <ChevronDown className="h-3.5 w-3.5" />
              </>
            }
          >
            {(close) => (
              <>
                <DropdownItem onClick={() => insertTemplate("divider", close)}>Divider</DropdownItem>
                <DropdownItem onClick={() => insertTemplate("quote", close)}>Pull quote</DropdownItem>
                <DropdownItem onClick={() => insertTemplate("callout", close)}>Callout box</DropdownItem>
                <DropdownItem onClick={() => insertTemplate("cta", close)}>Call-to-action</DropdownItem>
              </>
            )}
          </Dropdown>

          {/* More */}
          <Dropdown
            triggerClassName={menuTrigger}
            triggerTitle="More"
            trigger={<MoreHorizontal className="h-4 w-4" />}
            align="right"
          >
            {(close) => (
              <>
                <DropdownItem
                  active={editor.isActive("underline")}
                  onClick={() => {
                    editor.chain().focus().toggleUnderline().run();
                    close();
                  }}
                >
                  <UnderlineIcon className="h-4 w-4" /> Underline
                </DropdownItem>
                <DropdownItem
                  active={editor.isActive("blockquote")}
                  onClick={() => {
                    editor.chain().focus().toggleBlockquote().run();
                    close();
                  }}
                >
                  <Quote className="h-4 w-4" /> Quote
                </DropdownItem>
                <DropdownItem
                  active={editor.isActive("codeBlock")}
                  onClick={() => {
                    editor.chain().focus().toggleCodeBlock().run();
                    close();
                  }}
                >
                  <SquareCode className="h-4 w-4" /> Code block
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    editor.chain().focus().setHorizontalRule().run();
                    close();
                  }}
                >
                  <Minus className="h-4 w-4" /> Horizontal rule
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    editor.chain().focus().unsetAllMarks().clearNodes().run();
                    close();
                  }}
                >
                  <Eraser className="h-4 w-4" /> Clear formatting
                </DropdownItem>
              </>
            )}
          </Dropdown>

          <span className="mx-1 h-4 w-px bg-[#EDEAE0]" />

          <button type="button" className={barBtn(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" className={barBtn(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <EditorContent editor={editor} />
      </div>
      {hint && <p className="text-xs text-[#8C8C78]">{hint}</p>}
    </div>
  );
}

// Re-exported so callers that only need the type (none currently) can reach
// it without importing tiptap directly.
export type { Editor };
