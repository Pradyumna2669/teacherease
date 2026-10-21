import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { S1Hook, S2Brand, S3Scan, S4Language, S5Features, S6Pricing, S7CTA } from "./scenes";

const FPS = 30;
const DUR = 1330; // ~44.3s

// Scene layout (frames), paced around the measured voiceover line lengths.
// starts: s1 0 · s2 205 · s3 315 · s4 545 · s5 780 · s6 1005 · s7 1155
const SCENES = [
  { comp: S1Hook, from: 0, len: 205 },
  { comp: S2Brand, from: 205, len: 110 },
  { comp: S3Scan, from: 315, len: 230 },
  { comp: S4Language, from: 545, len: 235 },
  { comp: S5Features, from: 780, len: 225 },
  { comp: S6Pricing, from: 1005, len: 150 },
  { comp: S7CTA, from: 1155, len: 175 },
];

// Voiceover: one line per scene, starting a beat after the scene opens.
const VO: Array<{ src: string; at: number }> = [
  { src: "vo1.mp3", at: 8 }, // 6.1s — every week, a new paper…
  { src: "vo2.mp3", at: 213 }, // 2.4s — then I found TeacherEase
  { src: "vo3.mp3", at: 325 }, // 6.5s — I photograph my handwritten paper…
  { src: "vo4.mp3", at: 553 }, // 7.0s — Hindi, Marathi, Tamil, Telugu…
  { src: "vo5.mp3", at: 788 }, // 6.8s — 15+ types, live preview, PDF
  { src: "vo6.mp3", at: 1013 }, // 4.2s — started free, 60 credits
  { src: "vo7.mp3", at: 1161 }, // 4.7s — papergen dot online
];

// One-shot sound effects on the global timeline.
const SFX: Array<{ src: string; at: number[]; volume?: number }> = [
  { src: "tick.wav", at: [15, 55, 103], volume: 0.4 },
  { src: "whoosh.wav", at: [205, 315, 545, 780, 1005, 1155], volume: 0.38 },
  { src: "chime.wav", at: [235, 1100, 1195], volume: 0.45 },
  { src: "shutter.wav", at: [370], volume: 0.5 },
  {
    src: "pop.wav",
    at: [430, 440, 455, 470, 485, 500, 515, 660, 680, 693, 706, 719, 732, 795, 840, 885],
    volume: 0.4,
  },
  // Counter ticks while "60" counts up, then the landing pop.
  {
    src: "tick.wav",
    at: [1020, 1026, 1032, 1038, 1044, 1050, 1056, 1062, 1068, 1074],
    volume: 0.3,
  },
  { src: "pop.wav", at: [1095], volume: 0.5 },
];

const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  // Bed ducks under the near-continuous voiceover, fades out at the end.
  const bedVolume = interpolate(frame, [0, 30, DUR - 80, DUR - 5], [0, 0.3, 0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "#faf6ef" }}>
      {SCENES.map(({ comp: Comp, from, len }) => (
        <Sequence key={from} from={from} durationInFrames={len}>
          <Comp />
        </Sequence>
      ))}
      <Audio loop src={staticFile("bed.wav")} volume={bedVolume} />
      {VO.map(({ src, at }) => (
        <Sequence key={src} from={at}>
          <Audio src={staticFile(src)} volume={0.95} />
        </Sequence>
      ))}
      {SFX.flatMap(({ src, at, volume }) =>
        at.map((f) => (
          <Sequence key={`${src}-${f}`} from={f}>
            <Audio src={staticFile(src)} volume={volume ?? 0.5} />
          </Sequence>
        ))
      )}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition
    id="TeacherEasePromo"
    component={Promo}
    durationInFrames={DUR}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
