/**
 * Turns the backend's ticket HTML (the ticket email template, with tickets
 * separated by `break-after: page` divs) into a PDF, one ticket per page.
 *
 * Rendering happens in the browser rather than on the server so the PDF looks
 * exactly like the email without shipping a headless browser in the API
 * image. The template's remote images (logo, social icons) are served with
 * `Access-Control-Allow-Origin: *`, which is what lets `useCORS` draw them;
 * the QR code is already inlined as a data: URI.
 */
export async function htmlToPdf(html: string): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${FRAME_WIDTH}px;height:1400px;border:0;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Could not prepare the ticket for PDF.");
    doc.open();
    doc.write(html);
    doc.close();
    const fontCss = loadTemplateFonts(doc);
    fixVerticalText(doc);
    await waitForAssets(doc, fontCss);

    // Split the body into one container per ticket at the page-break divs.
    const body = doc.body;
    const bg = doc.defaultView?.getComputedStyle(body).backgroundColor || "#0a0704";
    const pages: HTMLElement[] = [];
    let current = doc.createElement("div");
    for (const node of Array.from(body.childNodes)) {
      const isBreak =
        node.nodeType === Node.ELEMENT_NODE && /break-after/.test((node as HTMLElement).getAttribute("style") || "");
      if (isBreak) {
        pages.push(current);
        current = doc.createElement("div");
        node.parentNode?.removeChild(node);
        continue;
      }
      current.appendChild(node);
    }
    pages.push(current);
    for (const p of pages) {
      p.style.background = bg;
      body.appendChild(p);
    }

    let pdf: InstanceType<typeof jsPDF> | null = null;
    for (const page of pages) {
      // The ticket (726px + padding) is wider than the 600px email column it
      // sits in and overflows it, so capture the full scroll area rather than
      // the element's own box — otherwise the QR side gets cut off.
      const canvas = await html2canvas(page, {
        useCORS: true,
        backgroundColor: bg,
        scale: 2,
        width: page.scrollWidth,
        height: page.scrollHeight,
        windowWidth: FRAME_WIDTH,
        logging: false,
      });
      // Page size follows the rendered ticket, at 96dpi-equivalent px.
      const w = canvas.width / 2;
      const h = canvas.height / 2;
      const orientation = w > h ? "landscape" : "portrait";
      if (!pdf) {
        pdf = new jsPDF({ unit: "px", format: [w, h], orientation, hotfixes: ["px_scaling"] });
      } else {
        pdf.addPage([w, h], orientation);
      }
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);
    }
    if (!pdf) throw new Error("Nothing to render.");
    return pdf.output("blob");
  } finally {
    iframe.remove();
  }
}

const FRAME_WIDTH = 1000;

/**
 * The template's Google Fonts `@import` sits after other CSS rules, where
 * browsers ignore it (an @import must come first) — email clients that
 * honour it are lenient. Load the same fonts with a <link> so the PDF uses
 * JetBrains Mono / Playfair Display instead of falling back to Times.
 */
function loadTemplateFonts(doc: Document): Promise<void> {
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700&display=swap";
  const loaded = new Promise<void>((resolve) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });
  doc.head.appendChild(link);
  return loaded;
}

/**
 * html2canvas can't draw `writing-mode: vertical-*` (the "TICKET TYPE" spine
 * comes out as stacked, upside-down letters). Swap each such element for
 * horizontal text rotated -90deg, which reads the same (bottom to top) and
 * which html2canvas does support.
 */
function fixVerticalText(doc: Document) {
  const view = doc.defaultView;
  if (!view) return;
  for (const el of Array.from(doc.body.querySelectorAll<HTMLElement>("*"))) {
    if (!view.getComputedStyle(el).writingMode.startsWith("vertical")) continue;
    el.style.writingMode = "horizontal-tb";
    el.style.transform = "rotate(-90deg)";
    el.style.whiteSpace = "nowrap";
    el.style.display = "inline-block";
  }
}

async function waitForAssets(doc: Document, fontCss: Promise<void>) {
  const images = Array.from(doc.images).map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
  );
  const fontSet = (doc as Document & { fonts?: FontFaceSet }).fonts;
  // Wait for the font stylesheet first — until it's parsed there are no
  // @font-face rules for load() to match — then request each face used.
  const fonts = fontSet
    ? fontCss.then(() => Promise.all([
        fontSet.load('400 16px "JetBrains Mono"'),
        fontSet.load('700 16px "JetBrains Mono"'),
        fontSet.load('700 22px "Playfair Display"'),
      ]))
        .catch(() => undefined)
        .then(() => fontSet.ready)
    : Promise.resolve();
  // Never hang the download on a slow image — cap the wait.
  await Promise.race([Promise.all([...images, fonts]), new Promise((r) => setTimeout(r, 8000))]);
}
