"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { pageContentHeightPx } from "@/lib/paper-geometry";
import type { PageMargin } from "@/lib/types";

/**
 * Draws where the PDF will actually cut the paper into pages.
 *
 * The preview is one long A4-wide column and html2pdf slices it up; those cut
 * points were invisible, so a teacher only discovered a split question after
 * downloading.
 *
 * The naive version — a rule every pageContentHeightPx — is wrong, because the
 * export runs with pagebreak mode "avoid-all" and every question carries
 * break-inside: avoid. A question straddling a boundary is not sliced; the whole
 * block moves to the next page, and everything after it shifts down. Drawing the
 * raw boundary would point at a cut that never happens and hide the real one.
 *
 * So this measures each question block and flows them the same way the exporter
 * does. A block taller than a whole page is the one case that genuinely cannot
 * avoid a split.
 *
 * Purely an overlay: it never affects layout, so it cannot change where the
 * breaks land.
 */
export default function PageGuides({
  margin,
  children,
  contentKey,
}: {
  margin: PageMargin;
  children: ReactNode;
  /** Changes when content changes, to trigger a re-measure. */
  contentKey?: string | number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [breaks, setBreaks] = useState<number[]>([]);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const pageH = pageContentHeightPx(margin);
    const rootTop = el.getBoundingClientRect().top;

    interface FlowUnit {
      top: number;
      bottom: number;
      height: number;
      forceBreakBefore?: boolean;
    }

    const questionEls = Array.from(el.querySelectorAll<HTMLElement>(".pp-question"));
    const units: FlowUnit[] = [];

    for (const qEl of questionEls) {
      const isKeep = qEl.classList.contains("pp-keep");
      const forceBreak =
        qEl.classList.contains("pp-break-before") ||
        qEl.classList.contains("html2pdf__page-break-before");
      const r = qEl.getBoundingClientRect();
      const rows = Array.from(qEl.querySelectorAll<HTMLElement>(".pp-row"));

      if (isKeep && r.height <= pageH) {
        units.push({
          top: r.top - rootTop,
          bottom: r.bottom - rootTop,
          height: r.height,
          forceBreakBefore: forceBreak,
        });
      } else if (rows.length > 0) {
        const titleEl = qEl.querySelector<HTMLElement>(".question-title");
        if (titleEl) {
          const tRect = titleEl.getBoundingClientRect();
          const firstRowRect = rows[0].getBoundingClientRect();
          // The title and first item must stay together to avoid orphan titles
          units.push({
            top: tRect.top - rootTop,
            bottom: firstRowRect.bottom - rootTop,
            height: firstRowRect.bottom - tRect.top,
            forceBreakBefore: forceBreak,
          });
          for (let i = 1; i < rows.length; i++) {
            const rowRect = rows[i].getBoundingClientRect();
            units.push({
              top: rowRect.top - rootTop,
              bottom: rowRect.bottom - rootTop,
              height: rowRect.height,
            });
          }
        } else {
          rows.forEach((row, i) => {
            const rowRect = row.getBoundingClientRect();
            units.push({
              top: rowRect.top - rootTop,
              bottom: rowRect.bottom - rootTop,
              height: rowRect.height,
              forceBreakBefore: i === 0 ? forceBreak : false,
            });
          });
        }
      } else {
        units.push({
          top: r.top - rootTop,
          bottom: r.bottom - rootTop,
          height: r.height,
          forceBreakBefore: forceBreak,
        });
      }
    }

    const cuts: number[] = [];
    let pageStart = 0;

    for (const unit of units) {
      if (unit.forceBreakBefore && unit.top > pageStart + 5) {
        cuts.push(unit.top);
        pageStart = unit.top;
      }

      // Fits on the current page — nothing to do.
      if (unit.bottom - pageStart <= pageH) continue;

      // Taller than a whole page: it has to split wherever the page ends, and
      // it may span several pages.
      if (unit.height > pageH) {
        let cut = pageStart + pageH;
        while (cut < unit.bottom) {
          cuts.push(cut);
          cut += pageH;
        }
        pageStart = cuts.length ? cuts[cuts.length - 1] : pageStart;
        continue;
      }

      // Normal case: the whole unit moves to the next page, so the break lands
      // at its top edge.
      cuts.push(unit.top);
      pageStart = unit.top;
    }

    setBreaks((prev) =>
      prev.length === cuts.length && prev.every((v, i) => Math.abs(v - cuts[i]) < 1)
        ? prev
        : cuts
    );
  }, [margin]);

  useEffect(() => {
    measure();
    const raf = requestAnimationFrame(() => {
      measure();
    });
    const el = ref.current;
    if (!el) return () => cancelAnimationFrame(raf);

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    const paper = el.querySelector<HTMLElement>(".paper-preview");
    if (paper) ro.observe(paper);
    el.querySelectorAll(".pp-question").forEach((b) => ro.observe(b));

    const mo = new MutationObserver(() => measure());
    mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [measure, contentKey]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={ref}>{children}</div>

      {breaks.map((top, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <div style={{ borderTop: "2px dashed #e0392b", opacity: 0.7 }} />
          <div
            style={{
              position: "absolute",
              left: 6,
              top: -17,
              color: "#e0392b",
              fontFamily: "system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 600,
              opacity: 0.85,
              whiteSpace: "nowrap",
            }}
          >
            ─ end of page {i + 1}
          </div>
          <div
            style={{
              position: "absolute",
              right: 6,
              top: 4,
              background: "#e0392b",
              color: "#fff",
              fontFamily: "system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.3,
              padding: "2px 7px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            Page {i + 2}
          </div>
        </div>
      ))}
    </div>
  );
}
