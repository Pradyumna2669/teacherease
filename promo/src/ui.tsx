import React from "react";
import { AbsoluteFill, interpolate, Easing } from "remotion";

// Brand palette — mirrors app/globals.css.
export const C = {
  paper: "#faf6ef",
  white: "#ffffff",
  ink: "#16243b",
  graphite: "#34425c",
  pen: "#e0392b",
  rule: "#e3dbcb",
  faint: "#9ca3af",
};

export const SERIF = 'Georgia, "Times New Roman", serif';
export const SANS = '"Segoe UI", Arial, sans-serif';
export const MONO = 'Consolas, "Courier New", monospace';
// Windows ships Nirmala UI, which covers all the Indic scripts we show.
export const NATIVE = `"Nirmala UI", ${SANS}`;

export const easeOut = Easing.out(Easing.cubic);

// Cream page with faint ruled lines and the red margin line — the site's
// "real paper" motif.
export const RuledBG: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: C.paper,
      backgroundImage: `repeating-linear-gradient(
        transparent, transparent 43px, rgba(22,36,59,0.055) 43px, rgba(22,36,59,0.055) 44px
      )`,
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 150,
        width: 2,
        background: "rgba(224,57,43,0.28)",
      }}
    />
  </AbsoluteFill>
);

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.10) 100%)",
      pointerEvents: "none",
    }}
  />
);

export const Watermark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 48,
      bottom: 36,
      fontFamily: MONO,
      fontSize: 24,
      color: "rgba(22,36,59,0.45)",
      letterSpacing: 1,
    }}
  >
    papergen.online
  </div>
);

// Small red mono eyebrow label.
export const Kicker: React.FC<{ children: React.ReactNode; light?: boolean }> = ({
  children,
  light,
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 26,
      letterSpacing: 6,
      textTransform: "uppercase",
      color: light ? "#ff8a7d" : C.pen,
    }}
  >
    {children}
  </div>
);

// Scene entrance: fade + drift up over the first 14 frames.
export const SceneIn: React.FC<{
  frame: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ frame, children, style }) => {
  const p = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return (
    <AbsoluteFill
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 26}px)`,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Fade+rise for an individual element, delayed.
export const Rise: React.FC<{
  frame: number;
  delay: number;
  children: React.ReactNode;
  dist?: number;
  style?: React.CSSProperties;
}> = ({ frame, delay, children, dist = 30, style }) => {
  const p = interpolate(frame - delay, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * dist}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
