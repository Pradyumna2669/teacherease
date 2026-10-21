import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import {
  C,
  SERIF,
  SANS,
  MONO,
  NATIVE,
  easeOut,
  RuledBG,
  Vignette,
  Watermark,
  Kicker,
  SceneIn,
  Rise,
} from "./ui";

const pop = (frame: number, delay: number, fps: number) =>
  spring({ frame: frame - delay, fps, config: { damping: 13, mass: 0.6 } });

// Slow push-in that keeps a scene alive under a long voiceover line.
const Zoom: React.FC<{ frame: number; len: number; children: React.ReactNode }> = ({
  frame,
  len,
  children,
}) => (
  <AbsoluteFill
    style={{
      transform: `scale(${1 + 0.06 * Math.min(1, frame / len)})`,
      transformOrigin: "50% 42%",
    }}
  >
    {children}
  </AbsoluteFill>
);

/* ---------------------------------------------------------------- S1 Hook */

const KineticLine: React.FC<{
  frame: number;
  delay: number;
  words: string[];
  strike?: { from: number; text: string; at: number };
}> = ({ frame, delay, words, strike }) => {
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        fontFamily: SERIF,
        fontSize: 92,
        fontWeight: 600,
        color: C.ink,
        lineHeight: 1.25,
        display: "flex",
        gap: 26,
        flexWrap: "wrap",
      }}
    >
      {words.map((w, i) => {
        const s = pop(frame, delay + i * 5, fps);
        const struck = strike && i >= strike.from;
        const sp = strike
          ? interpolate(frame, [strike.at, strike.at + 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOut,
            })
          : 0;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: frame >= delay + i * 5 ? Math.min(1, s) : 0,
              transform: `translateY(${(1 - Math.min(1, s)) * 46}px) rotate(${
                (1 - Math.min(1, s)) * (i % 2 ? 3 : -3)
              }deg)`,
              position: "relative",
            }}
          >
            {w}
            {struck && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "54%",
                  height: 7,
                  width: `${sp * 100}%`,
                  background: C.pen,
                  borderRadius: 4,
                }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
};

export const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <RuledBG />
      <Zoom frame={f} len={205}>
        <SceneIn frame={f}>
          <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 220 }}>
            <Rise frame={f} delay={4}>
              <Kicker>A teacher's week</Kicker>
            </Rise>
            <div style={{ height: 34 }} />
            <KineticLine frame={f} delay={12} words={["Every", "week,", "a", "new", "paper."]} />
            <div style={{ height: 12 }} />
            <KineticLine frame={f} delay={52} words={["Every", "week,", "the", "same", "struggle."]} />
            <div style={{ height: 12 }} />
            <KineticLine
              frame={f}
              delay={100}
              words={["Retyping.", "Formatting.", "The", "typist."]}
              strike={{ from: 2, text: "typist", at: 155 }}
            />
          </AbsoluteFill>
        </SceneIn>
      </Zoom>
      <Vignette />
    </AbsoluteFill>
  );
};

/* --------------------------------------------------------------- S2 Brand */

export const S2Brand: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: f - 8, fps, config: { damping: 9, mass: 0.7 } });
  const glow = interpolate(f, [8, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const rule = interpolate(f, [26, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      {/* expanding glow ring behind logo */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 900 * glow,
            height: 900 * glow,
            borderRadius: "50%",
            border: "2px solid rgba(224,57,43,0.35)",
            opacity: 1 - glow,
            position: "absolute",
          }}
        />
        <div
          style={{
            width: 620 * glow,
            height: 620 * glow,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(224,57,43,0.18) 0%, transparent 70%)",
            position: "absolute",
          }}
        />
      </AbsoluteFill>
      {[260, 330, 750, 820].map((y, i) => (
        <div
          key={y}
          style={{
            position: "absolute",
            top: y,
            left: "50%",
            transform: "translateX(-50%)",
            height: 1,
            width: interpolate(f, [10 + i * 4, 40 + i * 4], [0, 1150], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOut,
            }),
            background: "rgba(255,255,255,0.14)",
          }}
        />
      ))}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            transform: `scale(${0.7 + 0.3 * logo})`,
            opacity: Math.min(1, logo),
            fontFamily: SERIF,
            fontSize: 170,
            fontWeight: 600,
            color: C.white,
            letterSpacing: -3,
          }}
        >
          Paper<span style={{ color: C.pen }}>Gen</span>
        </div>
        <div
          style={{
            height: 5,
            width: rule * 560,
            background: C.pen,
            borderRadius: 3,
            marginTop: 10,
          }}
        />
        <Rise frame={f} delay={34}>
          <div
            style={{
              marginTop: 34,
              fontFamily: SERIF,
              fontSize: 52,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            Question papers. In minutes.
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- S3 Scan */

const wavePath = (row: number, width: number) => {
  const seg = 26;
  let d = "M 0 6";
  for (let x = seg; x <= width; x += seg) {
    const cy = 6 + Math.sin(row * 5.1 + x * 0.13) * 4.5;
    const y = 6 + Math.sin(row * 3.7 + x * 0.21) * 2.5;
    d += ` Q ${x - seg / 2} ${cy}, ${x} ${y}`;
  }
  return d;
};

const HandwrittenPaper: React.FC = () => (
  <div
    style={{
      width: 470,
      height: 620,
      background: "#fdfcf8",
      borderRadius: 6,
      boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
      transform: "rotate(-4deg)",
      padding: "44px 36px",
      border: `1px solid ${C.rule}`,
    }}
  >
    <div
      style={{
        fontFamily: SERIF,
        fontSize: 26,
        color: "#4b5563",
        textAlign: "center",
        marginBottom: 26,
        fontStyle: "italic",
      }}
    >
      Unit Test — Maths
    </div>
    {Array.from({ length: 12 }).map((_, r) => {
      const w = 240 + ((r * 83) % 140);
      return (
        <svg key={r} width={w} height={13} style={{ display: "block", marginBottom: 24 }}>
          <path
            d={wavePath(r, w)}
            stroke="#6b7280"
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
            opacity={0.8}
          />
        </svg>
      );
    })}
  </div>
);

const CleanRow: React.FC<{ n: number; scale: number; barW: number }> = ({
  n,
  scale,
  barW,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginBottom: 26,
      transform: `scale(${scale})`,
      transformOrigin: "left center",
      opacity: Math.min(1, scale),
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        border: `2px solid ${C.ink}`,
        color: C.ink,
        fontFamily: MONO,
        fontSize: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {n}
    </div>
    <div style={{ height: 12, borderRadius: 6, background: "#cbd5e1", width: barW }} />
    <div style={{ fontFamily: MONO, fontSize: 20, color: C.graphite, marginLeft: "auto" }}>
      [2]
    </div>
  </div>
);

export const S3Scan: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phone = pop(f, 30, fps);
  const flash = interpolate(f, [54, 56, 61], [0, 0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scan = interpolate(f, [62, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const rightIn = interpolate(f, [80, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const rows = [125, 140, 155, 170, 185];
  const badge = pop(f, 200, fps);
  return (
    <AbsoluteFill>
      <RuledBG />
      <Zoom frame={f} len={230}>
        <SceneIn frame={f}>
          <AbsoluteFill
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 130,
              paddingBottom: 60,
            }}
          >
            <div style={{ position: "relative" }}>
              <HandwrittenPaper />
              <div
                style={{
                  position: "absolute",
                  inset: -46,
                  border: "5px solid rgba(22,36,59,0.85)",
                  borderRadius: 40,
                  opacity: phone,
                  transform: `scale(${1.15 - 0.15 * phone})`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 110,
                    height: 10,
                    borderRadius: 5,
                    background: "rgba(22,36,59,0.85)",
                  }}
                />
              </div>
              {scan > 0 && scan < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: -20,
                    right: -20,
                    top: `${scan * 100}%`,
                    height: 5,
                    borderRadius: 3,
                    background: C.pen,
                    boxShadow: `0 0 26px 6px rgba(224,57,43,0.5)`,
                  }}
                />
              )}
            </div>

            <div
              style={{
                width: 520,
                height: 680,
                background: C.white,
                borderRadius: 6,
                boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
                padding: "40px 44px",
                opacity: rightIn,
                transform: `translateX(${(1 - rightIn) * 70}px)`,
                border: `1px solid ${C.rule}`,
                position: "relative",
              }}
            >
              <div
                style={{
                  transform: `scale(${Math.min(1, pop(f, 115, fps))})`,
                  transformOrigin: "top left",
                  opacity: f >= 115 ? 1 : 0,
                }}
              >
                <div
                  style={{
                    fontFamily: SERIF,
                    fontSize: 30,
                    fontWeight: 600,
                    color: C.ink,
                    textAlign: "center",
                  }}
                >
                  Unit Test — Maths
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 17,
                    color: C.graphite,
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  Class 4 · Time: 1 hr · Marks: 40
                </div>
                <div style={{ borderBottom: `2px solid ${C.ink}`, margin: "20px 0 30px" }} />
              </div>
              {rows.map((d, i) => (
                <CleanRow
                  key={d}
                  n={i + 1}
                  scale={f >= d ? pop(f, d, fps) : 0}
                  barW={230 + ((i * 67) % 120)}
                />
              ))}
              {/* success badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: 34,
                  left: "50%",
                  transform: `translateX(-50%) scale(${Math.min(1, badge)})`,
                  opacity: f >= 200 ? 1 : 0,
                  background: "#0d9459",
                  color: C.white,
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: 24,
                  padding: "12px 28px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  boxShadow: "0 10px 26px rgba(13,148,89,0.35)",
                }}
              >
                ✓ 5 questions read
              </div>
            </div>
          </AbsoluteFill>

          <Rise
            frame={f}
            delay={16}
            style={{ position: "absolute", left: 0, right: 0, bottom: 74, textAlign: "center" }}
          >
            <span style={{ fontFamily: SERIF, fontSize: 48, color: C.ink }}>
              Photograph it. <span style={{ color: C.pen }}>TeacherEase types it.</span>
            </span>
          </Rise>
        </SceneIn>
      </Zoom>
      <AbsoluteFill style={{ background: C.white, opacity: flash, pointerEvents: "none" }} />
      <Watermark />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------ S4 Language */

const CHIPS: Array<[string, string]> = [
  ["हिंदी", "Hindi"],
  ["मराठी", "Marathi"],
  ["தமிழ்", "Tamil"],
  ["తెలుగు", "Telugu"],
  ["বাংলা", "Bengali"],
];

export const S4Language: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const TYPED = "bharat ki rajdhani ___ hai";
  const chars = Math.max(0, Math.min(TYPED.length, Math.floor((f - 15) / 3.5)));
  const converted = f >= 115;
  const swap = pop(f, 115, fps);
  const caret = f % 20 < 11;
  return (
    <AbsoluteFill>
      <RuledBG />
      <Zoom frame={f} len={235}>
        <SceneIn frame={f}>
          <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
            <Rise frame={f} delay={2}>
              <Kicker>No script keyboard needed</Kicker>
            </Rise>
            <Rise frame={f} delay={8}>
              <div style={{ fontFamily: SERIF, fontSize: 66, color: C.ink, marginTop: 22 }}>
                Type in English letters. Get the script.
              </div>
            </Rise>

            <div
              style={{
                marginTop: 60,
                width: 1240,
                minHeight: 210,
                background: C.white,
                border: `1px solid ${C.rule}`,
                borderRadius: 10,
                boxShadow: "0 16px 44px rgba(0,0,0,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "30px 60px",
              }}
            >
              {!converted ? (
                <div style={{ fontFamily: MONO, fontSize: 58, color: C.graphite }}>
                  {TYPED.slice(0, chars)}
                  <span style={{ opacity: caret ? 1 : 0, color: C.pen }}>▌</span>
                </div>
              ) : (
                <div
                  style={{
                    fontFamily: NATIVE,
                    fontSize: 72,
                    color: C.ink,
                    transform: `scale(${0.9 + 0.1 * swap})`,
                    opacity: swap,
                  }}
                >
                  भारत की राजधानी ___ है।
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 22, marginTop: 58 }}>
              {CHIPS.map(([nat, en], i) => {
                const s = pop(f, 135 + i * 13, fps);
                return (
                  <div
                    key={en}
                    style={{
                      transform: `scale(${Math.min(1, s)}) rotate(${
                        (1 - Math.min(1, s)) * (i % 2 ? 4 : -4)
                      }deg)`,
                      opacity: f >= 135 + i * 13 ? 1 : 0,
                      background: C.white,
                      border: `1px solid ${C.rule}`,
                      borderRadius: 999,
                      padding: "16px 34px",
                      fontFamily: NATIVE,
                      fontSize: 34,
                      color: C.ink,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                    }}
                  >
                    {nat}{" "}
                    <span style={{ color: C.faint, fontFamily: SANS, fontSize: 26 }}>{en}</span>
                  </div>
                );
              })}
            </div>
            <Rise frame={f} delay={200}>
              <div
                style={{
                  marginTop: 38,
                  fontFamily: MONO,
                  fontSize: 30,
                  letterSpacing: 3,
                  color: C.pen,
                }}
              >
                22 INDIAN LANGUAGES
              </div>
            </Rise>
          </AbsoluteFill>
        </SceneIn>
      </Zoom>
      <Watermark />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------ S5 Features */

const FeatureCard: React.FC<{
  s: number;
  visible: boolean;
  glyph: React.ReactNode;
  title: string;
  sub: string;
  tilt: number;
}> = ({ s, visible, glyph, title, sub, tilt }) => (
  <div
    style={{
      width: 470,
      height: 410,
      background: C.white,
      border: `1px solid ${C.rule}`,
      borderRadius: 12,
      boxShadow: "0 16px 44px rgba(0,0,0,0.10)",
      padding: "44px 42px",
      transform: `translateY(${(1 - Math.min(1, s)) * 80}px) rotate(${
        (1 - Math.min(1, s)) * tilt
      }deg)`,
      opacity: visible ? Math.min(1, s) : 0,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div style={{ fontFamily: SERIF, fontSize: 82, color: C.pen, lineHeight: 1 }}>{glyph}</div>
    <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 600, color: C.ink, marginTop: 26 }}>
      {title}
    </div>
    <div style={{ fontFamily: SANS, fontSize: 27, color: C.graphite, marginTop: 14, lineHeight: 1.45 }}>
      {sub}
    </div>
  </div>
);

export const S5Features: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <RuledBG />
      <Zoom frame={f} len={225}>
        <SceneIn frame={f}>
          <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
            <Rise frame={f} delay={2}>
              <div style={{ fontFamily: SERIF, fontSize: 64, color: C.ink }}>
                Everything a paper needs. Nothing to fight.
              </div>
            </Rise>
            <div style={{ display: "flex", gap: 44, marginTop: 76 }}>
              <FeatureCard
                s={pop(f, 15, fps)}
                visible={f >= 15}
                glyph="15+"
                title="Question types"
                sub="Fill in the blanks, MCQ, match, comprehension, word problems, vertical maths."
                tilt={-5}
              />
              <FeatureCard
                s={pop(f, 60, fps)}
                visible={f >= 60}
                glyph="A4"
                title="Live preview"
                sub="The preview is the printed page — headers, marks column, ruled answer space."
                tilt={4}
              />
              <FeatureCard
                s={pop(f, 105, fps)}
                visible={f >= 105}
                glyph="⭳"
                title="One-click PDF"
                sub="Clean A4 export that prints and photocopies exactly as you saw it."
                tilt={-4}
              />
            </div>
          </AbsoluteFill>
        </SceneIn>
      </Zoom>
      <Watermark />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------- S6 Pricing */

export const S6Pricing: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(
    interpolate(f, [15, 90], [0, 60], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );
  const landed = f >= 90;
  const bump = landed ? 1 + 0.12 * Math.exp(-(f - 90) / 8) : 1;
  const ring = interpolate(f, [90, 112], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return (
    <AbsoluteFill>
      <RuledBG />
      <SceneIn frame={f}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
          <Kicker>Start free</Kicker>
          <div style={{ position: "relative" }}>
            {landed && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 620 * ring,
                  height: 620 * ring,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `4px solid rgba(224,57,43,${0.55 * (1 - ring)})`,
                }}
              />
            )}
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 300,
                fontWeight: 600,
                color: C.ink,
                lineHeight: 1,
                marginTop: 10,
                transform: `scale(${bump})`,
              }}
            >
              {count}
            </div>
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 58, color: C.ink, marginTop: 6 }}>
            free credits on signup
          </div>
          <Rise frame={f} delay={95}>
            <div
              style={{
                marginTop: 40,
                fontFamily: MONO,
                fontSize: 30,
                color: C.graphite,
                letterSpacing: 1,
              }}
            >
              No card to start · Pay only per paper · Editing saved papers is free
            </div>
          </Rise>
        </AbsoluteFill>
      </SceneIn>
      <Watermark />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------- S7 CTA */

const CONFETTI_COLORS = ["#e0392b", "#f4b942", "#ffffff", "#5b8def"];

const Confetti: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    {Array.from({ length: 36 }).map((_, i) => {
      const delay = 40 + ((i * 7) % 46);
      const t = frame - delay;
      if (t < 0) return null;
      const x = ((i * 53.7) % 100) * 19.2;
      const y = interpolate(t, [0, 110], [-60, 1180]);
      if (y > 1140) return null;
      const rot = t * (((i % 5) - 2) * 4);
      const size = 13 + ((i * 31) % 16);
      const drift = Math.sin((t + i * 9) / 14) * 34;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x + drift,
            top: y,
            width: size,
            height: size * (i % 3 === 0 ? 1 : 0.55),
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: i % 4 === 0 ? "50%" : 2,
            transform: `rotate(${rot}deg)`,
            opacity: 0.9,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

export const S7CTA: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = pop(f, 6, fps);
  const pulse = 1 + 0.02 * Math.sin(f / 7);
  const btn = pop(f, 36, fps);
  // Shine sweep across the button.
  const shine = interpolate((f - 40 + 550) % 55, [0, 55], [-320, 320]);
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            opacity: Math.min(1, logo),
            transform: `scale(${0.85 + 0.15 * logo})`,
            fontFamily: SERIF,
            fontSize: 120,
            fontWeight: 600,
            color: C.white,
            letterSpacing: -2,
          }}
        >
          Paper<span style={{ color: C.pen }}>Gen</span>
        </div>
        <Rise frame={f} delay={20}>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 54,
              color: "rgba(255,255,255,0.92)",
              marginTop: 26,
            }}
          >
            Make your first paper today — free.
          </div>
        </Rise>
        <div
          style={{
            marginTop: 54,
            opacity: Math.min(1, btn),
            transform: `scale(${(0.8 + 0.2 * Math.min(1, btn)) * pulse})`,
            background: C.pen,
            color: C.white,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 44,
            padding: "26px 74px",
            borderRadius: 14,
            boxShadow: "0 14px 44px rgba(224,57,43,0.4)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          papergen.online
          <div
            style={{
              position: "absolute",
              top: -20,
              bottom: -20,
              left: "50%",
              width: 90,
              transform: `translateX(${shine}px) rotate(18deg)`,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
            }}
          />
        </div>
        <Rise frame={f} delay={56}>
          <div
            style={{
              marginTop: 46,
              fontFamily: MONO,
              fontSize: 26,
              letterSpacing: 3,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            BUILT FOR INDIAN TEACHERS
          </div>
        </Rise>
      </AbsoluteFill>
      <Confetti frame={f} />
    </AbsoluteFill>
  );
};
