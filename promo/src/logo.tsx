import React from "react";
import { AbsoluteFill, Composition } from "remotion";

// Brand marks, rendered at 1024x1024 for use as avatars (WhatsApp group DP,
// social profiles). WhatsApp crops to a circle and shows it at ~48px in the
// chat list, so every variant keeps its content inside a centre-safe circle and
// stays legible when shrunk.

const INK = "#16243b";
const PEN = "#e0392b";
const PAPER = "#faf6ef";
const RULE = "rgba(22,36,59,0.13)";
const SERIF = 'Georgia, "Times New Roman", serif';

const S = 1024;
// Safe radius for a circular crop — keep everything meaningful inside this.
const SAFE = 0.72;

/* ---------------------------------------------------------- A: sheet + PG */

const RuledSheet: React.FC<{ w: number; h: number; children?: React.ReactNode }> = ({
  w,
  h,
  children,
}) => (
  <div
    style={{
      width: w,
      height: h,
      background: PAPER,
      borderRadius: 18,
      boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* ruled lines */}
    {Array.from({ length: 9 }).map((_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: h * 0.16 + i * (h * 0.088),
          height: 3,
          background: RULE,
        }}
      />
    ))}
    {/* red margin line */}
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: w * 0.17,
        width: 4,
        background: "rgba(224,57,43,0.42)",
      }}
    />
    {children}
  </div>
);

export const MarkSheet: React.FC = () => (
  <AbsoluteFill
    style={{ background: INK, justifyContent: "center", alignItems: "center" }}
  >
    <div style={{ transform: "rotate(-5deg)" }}>
      <RuledSheet w={S * SAFE * 0.68} h={S * SAFE * 0.9}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: S * 0.25,
            letterSpacing: -6,
            color: INK,
          }}
        >
          P<span style={{ color: PEN }}>G</span>
        </div>
      </RuledSheet>
    </div>
  </AbsoluteFill>
);

/* -------------------------------------------------- B: stacked wordmark */

const Wordmark: React.FC<{ bg: string; paperColor: string }> = ({ bg, paperColor }) => (
  <AbsoluteFill
    style={{
      background: bg,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
    }}
  >
    <div
      style={{
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: S * 0.2,
        lineHeight: 0.98,
        color: paperColor,
        letterSpacing: -4,
      }}
    >
      Paper
    </div>
    <div
      style={{
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: S * 0.2,
        lineHeight: 1.02,
        color: PEN,
        letterSpacing: -4,
      }}
    >
      Gen
    </div>
    <div
      style={{
        width: S * 0.34,
        height: 7,
        background: PEN,
        borderRadius: 4,
        marginTop: S * 0.035,
      }}
    />
  </AbsoluteFill>
);

// Dark: cream on ink. Light: ink on white — "Paper" has to flip colour, since
// cream on white would vanish.
export const MarkWordmark: React.FC = () => <Wordmark bg={INK} paperColor={PAPER} />;
export const MarkWordmarkWhite: React.FC = () => <Wordmark bg="#ffffff" paperColor={INK} />;
export const MarkWordmarkCream: React.FC = () => <Wordmark bg={PAPER} paperColor={INK} />;

/* ------------------------------------------------- C: big P on paper bg */

export const MarkLetter: React.FC = () => (
  <AbsoluteFill style={{ background: PAPER, justifyContent: "center", alignItems: "center" }}>
    {/* ruled paper texture */}
    {Array.from({ length: 13 }).map((_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 60 + i * 72,
          height: 3,
          background: RULE,
        }}
      />
    ))}
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: S * 0.2,
        width: 6,
        background: "rgba(224,57,43,0.35)",
      }}
    />
    <div
      style={{
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: S * 0.62,
        color: INK,
        lineHeight: 1,
        marginTop: -S * 0.03,
      }}
    >
      P<span style={{ color: PEN }}>G</span>
    </div>
  </AbsoluteFill>
);

/* ------------------------------------------- D: scan mark (camera + page) */

export const MarkScan: React.FC = () => (
  <AbsoluteFill style={{ background: INK, justifyContent: "center", alignItems: "center" }}>
    <div style={{ position: "relative" }}>
      <div style={{ transform: "rotate(-4deg)" }}>
        <RuledSheet w={S * 0.42} h={S * 0.55} />
      </div>
      {/* red scan line sweeping the page */}
      <div
        style={{
          position: "absolute",
          left: -S * 0.05,
          right: -S * 0.05,
          top: "48%",
          height: 10,
          borderRadius: 6,
          background: PEN,
          boxShadow: `0 0 46px 14px rgba(224,57,43,0.55)`,
        }}
      />
      {/* corner brackets — the camera framing motif */}
      {[
        { top: -34, left: -34, borderWidth: "7px 0 0 7px" },
        { top: -34, right: -34, borderWidth: "7px 7px 0 0" },
        { bottom: -34, left: -34, borderWidth: "0 0 7px 7px" },
        { bottom: -34, right: -34, borderWidth: "0 7px 7px 0" },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 78,
            height: 78,
            borderStyle: "solid",
            borderColor: PAPER,
            borderRadius: 10,
            ...pos,
          }}
        />
      ))}
    </div>
  </AbsoluteFill>
);

/* --------------------------------------------- E: maskable app icon */

// Android masks an adaptive icon to a circle, squircle or rounded square, and
// only the middle 80% is guaranteed to survive. The mark is scaled down so it
// sits comfortably inside that safe zone whatever shape the launcher applies.
export const MarkMaskable: React.FC = () => (
  <AbsoluteFill style={{ background: INK, justifyContent: "center", alignItems: "center" }}>
    <div style={{ transform: "rotate(-5deg) scale(0.62)" }}>
      <RuledSheet w={S * SAFE * 0.68} h={S * SAFE * 0.9}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: S * 0.25,
            letterSpacing: -6,
            color: INK,
          }}
        >
          P<span style={{ color: PEN }}>G</span>
        </div>
      </RuledSheet>
    </div>
  </AbsoluteFill>
);

export const LogoRoot: React.FC = () => (
  <>
    <Composition id="MarkSheet" component={MarkSheet} durationInFrames={1} fps={1} width={S} height={S} />
    <Composition id="MarkWordmark" component={MarkWordmark} durationInFrames={1} fps={1} width={S} height={S} />
    <Composition id="MarkWordmarkWhite" component={MarkWordmarkWhite} durationInFrames={1} fps={1} width={S} height={S} />
    <Composition id="MarkWordmarkCream" component={MarkWordmarkCream} durationInFrames={1} fps={1} width={S} height={S} />
    <Composition id="MarkLetter" component={MarkLetter} durationInFrames={1} fps={1} width={S} height={S} />
    <Composition id="MarkScan" component={MarkScan} durationInFrames={1} fps={1} width={S} height={S} />
    <Composition id="MarkMaskable" component={MarkMaskable} durationInFrames={1} fps={1} width={S} height={S} />
  </>
);
