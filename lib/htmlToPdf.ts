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
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:680px;height:1200px;border:0;";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Could not prepare the ticket for PDF.");
    doc.open();
    doc.write(html);
    doc.close();
    await waitForAssets(doc);

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
      const canvas = await html2canvas(page, {
        useCORS: true,
        backgroundColor: bg,
        scale: 2,
        windowWidth: 680,
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

async function waitForAssets(doc: Document) {
  const images = Array.from(doc.images).map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
  );
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve();
  // Never hang the download on a slow image — cap the wait.
  await Promise.race([Promise.all([...images, fonts]), new Promise((r) => setTimeout(r, 8000))]);
}
