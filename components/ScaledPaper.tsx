"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// A4 at 96dpi. The preview must be laid out at this width for line breaks,
// wrapping and page breaks to match the printed PDF.
const A4_WIDTH_PX = 794;

/**
 * Renders its children at true A4 width and scales the whole thing down to fit
 * the available space.
 *
 * Without this the preview simply reflows: on a 375px phone the paper laid out
 * at 346px, so text wrapped in places it never wraps on paper and the page
 * breaks were wrong. "The preview is the printed page" is the product's core
 * promise and it was only true on desktop — which is not where most teachers
 * are. Scaling keeps the geometry exact at any width.
 *
 * `fit` false renders at full size and lets the parent scroll horizontally, for
 * when a teacher wants to read the text rather than check the layout.
 */
export default function ScaledPaper({
  children,
  fit = true,
  remeasureKey,
}: {
  children: ReactNode;
  fit?: boolean;
  /**
   * Changes whenever the pane's visibility changes. A ResizeObserver does not
   * fire when an ancestor flips from display:none to visible, so the parent has
   * to say when to re-measure — otherwise the scale computed while hidden
   * (width 0, or a stale desktop width) sticks forever.
   */
  remeasureKey?: string | number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  // useLayoutEffect avoids a visible jump from unscaled to scaled on first paint.
  // Fall back to useEffect during SSR, where layout effects warn.
  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    let raf = 0;

    const measure = () => {
      if (!fit) {
        setScale(1);
        setHeight(undefined);
        return;
      }
      const available = outer.clientWidth;
      // The preview pane is display:none while another mobile tab is active, so
      // clientWidth is 0 on mount. Scaling by 0 collapses the paper to nothing,
      // and a ResizeObserver does not reliably fire when an element goes from
      // display:none to visible — so poll on animation frames until the pane
      // actually has width. This settles in one or two frames once shown.
      if (available <= 0) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(measure);
        return;
      }
      // Never scale up — a wide desktop pane shows the paper at 1:1.
      const next = Math.min(1, available / A4_WIDTH_PX);
      setScale(next);
      // The scaled element is out of flow for height purposes, so the wrapper
      // has to carry the reduced height or the scroll container collapses.
      setHeight(inner.offsetHeight * next);
    };

    measure();

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      ro.disconnect();
    };
  }, [fit, remeasureKey]);

  return (
    <div
      ref={outerRef}
      className={fit ? "w-full" : "w-full overflow-x-auto"}
      style={fit ? { height } : undefined}
    >
      <div
        ref={innerRef}
        style={{
          width: A4_WIDTH_PX,
          transformOrigin: "top left",
          transform: fit ? `scale(${scale})` : undefined,
          // Centre the paper when it is not being scaled to fill the space.
          margin: fit ? undefined : "0 auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
