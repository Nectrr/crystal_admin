import { Node, mergeAttributes } from "@tiptap/core";

// Custom block nodes for the rich text editor's Video/Audio/Button/Callout
// toolbar actions. Each renders as plain semantic HTML with inline styles
// (not classes) so the saved `body` HTML looks right wherever it's
// rendered on the public site, independent of that site's stylesheet.
// Attrs are the source of truth — renderHTML always regenerates the inner
// markup fresh from them, so parseHTML only needs to read attrs back off
// the wrapper element for a clean round trip through the same HTML string.

function youtubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([\w-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function vimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

export type VideoKind = "youtube" | "vimeo" | "file";

// detectVideoKind picks how a pasted URL should be embedded: a recognized
// YouTube/Vimeo link becomes an iframe embed, anything else is assumed to
// be a direct link to a video file (e.g. one just uploaded via
// uploadVideo) and rendered with a native <video> tag.
export function detectVideoKind(url: string): VideoKind {
  if (youtubeEmbedUrl(url)) return "youtube";
  if (vimeoEmbedUrl(url)) return "vimeo";
  return "file";
}

const EMBED_WRAP_STYLE =
  "position:relative;padding-top:56.25%;height:0;overflow:hidden;border-radius:8px;background:#000;margin:12px 0";
const EMBED_FRAME_STYLE = "position:absolute;top:0;left:0;width:100%;height:100%;border:0";

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      kind: { default: "file" },
    };
  },

  parseHTML() {
    return [
      { tag: "video[data-video-embed]", getAttrs: (el) => ({ src: (el as HTMLElement).getAttribute("src"), kind: "file" }) },
      {
        tag: "div[data-video-embed]",
        getAttrs: (el) => ({
          src: (el as HTMLElement).getAttribute("data-src"),
          kind: (el as HTMLElement).getAttribute("data-video-embed"),
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const { src, kind } = node.attrs as { src: string; kind: VideoKind };
    if (kind === "file") {
      return ["video", mergeAttributes({ controls: "", src, "data-video-embed": "file", style: "width:100%;border-radius:8px;margin:12px 0" })];
    }
    const embedSrc = (kind === "youtube" ? youtubeEmbedUrl(src) : vimeoEmbedUrl(src)) ?? src;
    return [
      "div",
      { "data-video-embed": kind, "data-src": src, style: EMBED_WRAP_STYLE },
      [
        "iframe",
        {
          src: embedSrc,
          style: EMBED_FRAME_STYLE,
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
        },
      ],
    ];
  },
});

export const AudioEmbed = Node.create({
  name: "audioEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return { src: { default: "" } };
  },

  parseHTML() {
    return [{ tag: "audio[data-audio-embed]", getAttrs: (el) => ({ src: (el as HTMLElement).getAttribute("src") }) }];
  },

  renderHTML({ node }) {
    return ["audio", mergeAttributes({ controls: "", src: node.attrs.src, "data-audio-embed": "true", style: "width:100%;margin:12px 0" })];
  },
});

// GenericEmbed is the catch-all "embed a widget" block (Substack's
// speech-bubble icon) — always wraps in the same responsive iframe frame as
// VideoEmbed, but with no URL transformation, since the source can be
// anything embeddable (a tweet, a CodePen, a Substack post, etc.).
export const GenericEmbed = Node.create({
  name: "genericEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return { src: { default: "" } };
  },

  parseHTML() {
    return [{ tag: "div[data-generic-embed]", getAttrs: (el) => ({ src: (el as HTMLElement).getAttribute("data-src") }) }];
  },

  renderHTML({ node }) {
    return [
      "div",
      { "data-generic-embed": "true", "data-src": node.attrs.src, style: EMBED_WRAP_STYLE },
      ["iframe", { src: node.attrs.src, style: EMBED_FRAME_STYLE, allowfullscreen: "true" }],
    ];
  },
});

const BUTTON_STYLE =
  "display:inline-block;padding:10px 20px;background:#B8952F;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0";

export const ButtonBlock = Node.create({
  name: "buttonBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      text: { default: "Click here" },
      href: { default: "https://" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-rte-button]",
        getAttrs: (el) => ({ href: (el as HTMLElement).getAttribute("href"), text: (el as HTMLElement).textContent }),
      },
    ];
  },

  renderHTML({ node }) {
    return ["a", mergeAttributes({ href: node.attrs.href, "data-rte-button": "true", target: "_blank", rel: "noopener noreferrer", style: BUTTON_STYLE }), node.attrs.text];
  },
});

const CALLOUT_STYLE = "background:#FBFAF6;border-left:4px solid #B8952F;padding:12px 16px;border-radius:6px;margin:12px 0";

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML() {
    return ["div", { "data-callout": "true", style: CALLOUT_STYLE }, 0];
  },
});
