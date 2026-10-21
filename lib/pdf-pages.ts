export const MAX_SOURCE_PDF_PAGES = 3;
export const PDF_RENDER_SCALE = 1.25;
export const PDF_PREVIEW_SCALE = 0.28;
export const MAX_PDF_PREVIEW_PAGES = 60;

export interface RenderedPdfPage {
  dataUrl: string;
  bytes: number;
}

export interface PdfPagePreview {
  pageNumber: number;
  dataUrl: string;
}

async function openPdf(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs.getDocument({
    data: await file.arrayBuffer(),
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;
}

export async function previewPdfPages(file: File, startPage = 1, count = MAX_PDF_PREVIEW_PAGES) {
  const pdfDocument = await openPdf(file);
  const totalPages = pdfDocument.numPages;
  const start = Math.max(1, Math.min(startPage, totalPages));
  const end = Math.min(totalPages, start + count - 1);
  const previews: PdfPagePreview[] = [];

  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_PREVIEW_SCALE });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare a PDF preview.");
    await page.render({ canvasContext: context, viewport }).promise;
    previews.push({ pageNumber, dataUrl: canvas.toDataURL("image/jpeg", 0.55) });
    page.cleanup();
  }

  await pdfDocument.cleanup();
  return { previews, totalPages, startPage: start, endPage: end };
}

export function parsePageInput(
  input: string,
  maxPages = MAX_SOURCE_PDF_PAGES,
  totalPages = 9999
): number[] {
  const set = new Set<number>();
  const parts = input.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Number(startStr);
      const end = Number(endStr);
      if (Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start) {
        for (let p = start; p <= end; p++) {
          if (p <= totalPages) set.add(p);
          if (set.size >= maxPages) break;
        }
      }
    } else {
      const p = Number(part);
      if (Number.isInteger(p) && p > 0 && p <= totalPages) {
        set.add(p);
      }
    }
    if (set.size >= maxPages) break;
  }

  return Array.from(set).sort((a, b) => a - b).slice(0, maxPages);
}

export async function renderSelectedPdfPages(file: File, selectedPages: number[]) {
  const pdfDocument = await openPdf(file);
  const pages = selectedPages.slice(0, MAX_SOURCE_PDF_PAGES);
  const results: RenderedPdfPage[] = [];

  for (const pageNumber of pages) {
    if (pageNumber < 1 || pageNumber > pdfDocument.numPages) continue;
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare a PDF page.");
    await page.render({ canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.62);
    results.push({ dataUrl, bytes: Math.ceil((dataUrl.length * 3) / 4) });
    page.cleanup();
  }

  const totalPages = pdfDocument.numPages;
  await pdfDocument.cleanup();
  return { results, totalPages };
}

export async function renderPdfPages(file: File, maxPages = MAX_SOURCE_PDF_PAGES) {
  return renderSelectedPdfPages(file, Array.from({ length: maxPages }, (_, i) => i + 1));
}
