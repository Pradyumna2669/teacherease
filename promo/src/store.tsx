import React from "react";
import { AbsoluteFill, Composition } from "remotion";

// Play Store artwork.
//
// The feature graphic is 1024x500 and Play crops it differently across
// surfaces — on some it sits behind the icon and title. So everything that
// carries meaning stays inside a generous inset, and nothing important goes
// near an edge.

const INK = "#16243b";
const PEN = "#e0392b";
const PAPER = "#faf6ef";
const RULE = "rgba(22,36,59,0.13)";
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Segoe UI", Arial, sans-serif';

const W = 1024;
const H = 500;
// Play overlays UI near the edges on some placements.
const INSET = 56;

// Deterministic squiggle so the "before" sheet reads as handwriting rather
// than as the same blank page twice.
const wave = (row: number, width: number) => {
  const seg = 16;
  let d = "M 0 5";
  for (let x = seg; x <= width; x += seg) {
    const cy = 5 + Math.sin(row * 5.1 + x * 0.16) * 3.4;
    const y = 5 + Math.sin(row * 3.7 + x * 0.26) * 2;
    d += ` Q ${x - seg / 2} ${cy}, ${x} ${y}`;
  }
  return d;
};

const Sheet: React.FC<{
  w: number;
  h: number;
  variant: "handwritten" | "typed";
  scanline?: boolean;
}> = ({ w, h, variant, scanline }) => (
  <div style={{ position: "relative" }}>
    <div
      style={{
        width: w,
        height: h,
        background: PAPER,
        borderRadius: 10,
        boxShadow: "0 18px 44px rgba(0,0,0,0.38)",
        position: "relative",
        overflow: "hidden",
        padding: "18px 16px",
      }}
    >
      {variant === "handwritten" ? (
        // Uneven pen strokes, no structure.
        Array.from({ length: 9 }).map((_, r) => {
          const lw = w * 0.62 + ((r * 23) % Math.round(w * 0.24));
          return (
            <svg
              key={r}
              width={lw}
              height={11}
              style={{ display: "block", marginBottom: 12 }}
            >
              <path
                d={wave(r, lw)}
                stroke="#6b7280"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                opacity={0.85}
              />
            </svg>
          );
        })
      ) : (
        // Typeset: a header rule, then even printed lines with a marks column.
        <>
          <div
            style={{
              height: 7,
              background: INK,
              borderRadius: 2,
              width: "62%",
              margin: "0 auto 6px",
            }}
          />
          <div style={{ height: 2, background: INK, marginBottom: 12 }} />
          {Array.from({ length: 7 }).map((_, r) => (
            <div
              key={r}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  border: `1.5px solid ${INK}`,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: "rgba(22,36,59,0.32)",
                  width: `${52 + ((r * 17) % 32)}%`,
                }}
              />
              <div
                style={{
                  marginLeft: "auto",
                  width: 12,
                  height: 5,
                  borderRadius: 2,
                  background: "rgba(224,57,43,0.5)",
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
    {scanline && (
      <div
        style={{
          position: "absolute",
          left: -14,
          right: -14,
          top: "46%",
          height: 6,
          borderRadius: 4,
          background: PEN,
          boxShadow: "0 0 30px 9px rgba(224,57,43,0.5)",
        }}
      />
    )}
  </div>
);

export const FeatureGraphic: React.FC = () => (
  <AbsoluteFill style={{ background: INK }}>
    {/* faint ruled motif, well outside the text block */}
    {[110, 180, 320, 390].map((y, i) => (
      <div
        key={y}
        style={{
          position: "absolute",
          top: y,
          left: W * 0.52,
          right: 0,
          height: 1,
          background: "rgba(255,255,255,0.07)",
          transform: `rotate(${i % 2 ? -1 : 1}deg)`,
        }}
      />
    ))}

    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: INSET,
      }}
    >
      {/* Text block */}
      <div style={{ flex: 1, paddingRight: 24 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 76,
            letterSpacing: -2,
            color: PAPER,
            lineHeight: 1,
          }}
        >
          Paper<span style={{ color: PEN }}>Gen</span>
        </div>
        <div
          style={{
            width: 190,
            height: 4,
            background: PEN,
            borderRadius: 3,
            marginTop: 16,
          }}
        />
        <div
          style={{
            marginTop: 22,
            fontFamily: SERIF,
            fontSize: 34,
            color: "rgba(255,255,255,0.94)",
            lineHeight: 1.25,
          }}
        >
          Question papers in minutes
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: SANS,
            fontSize: 21,
            color: "rgba(255,255,255,0.62)",
            lineHeight: 1.4,
          }}
        >
          Photograph a handwritten paper — or type in
          <br />
          22 Indian languages. Print-ready PDF.
        </div>
      </div>

      {/* Paper + scan motif */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          paddingRight: 10,
        }}
      >
        <div style={{ transform: "rotate(-6deg)" }}>
          <Sheet w={168} h={228} variant="handwritten" scanline />
        </div>
        <div style={{ color: PEN, fontSize: 40, fontFamily: SANS }}>→</div>
        <div style={{ transform: "rotate(3deg)" }}>
          <Sheet w={168} h={228} variant="typed" />
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const StoreRoot: React.FC = () => (
  <Composition
    id="FeatureGraphic"
    component={FeatureGraphic}
    durationInFrames={1}
    fps={1}
    width={W}
    height={H}
  />
);
