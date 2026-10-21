import { MARGIN_VALUES, type PageMargin } from "@/lib/types";

// A4 geometry, shared by the on-screen preview and the PDF export so the two
// cannot drift apart.
//
// The preview lays the paper out at true A4 width and expresses margins as CSS
// padding *inside* the sheet. html2pdf applies its margin *around* the captured
// element. Both were being applied, so a "normal" paper ended up with roughly
// 20mm of margin in the PDF against 10mm on screen — the content column was
// narrower and every line wrapped somewhere different.
//
// The export now strips the padding before capture and lets the PDF margin do
// the job, which is also what makes per-page margins work: CSS padding only
// applies at the very top and bottom of a long element, never on pages 2+.

export const MM_TO_PX = 96 / 25.4;
export const A4_WIDTH_PX = 794; // 210mm at 96dpi
export const A4_HEIGHT_PX = 1123; // 297mm at 96dpi

/**
 * Height of the printable area on one page, in CSS pixels — A4 height minus the
 * top and bottom PDF margins. This is exactly how much content html2pdf fits on
 * a page, so it is where the preview draws its page dividers.
 */
export function pageContentHeightPx(margin: PageMargin): number {
  const [top, , bottom] = MARGIN_VALUES[margin].pdf;
  return (297 - top - bottom) * MM_TO_PX;
}

/** Width of the printable area on one page, in CSS pixels. */
export function pageContentWidthPx(margin: PageMargin): number {
  const [, right, , left] = MARGIN_VALUES[margin].pdf;
  return (210 - left - right) * MM_TO_PX;
}
