// Generates the promo's audio as WAV files in promo/public/.
// Everything is synthesized — no samples, no licensing. Swap public/bed.wav
// for a licensed music track any time; the video re-renders around it.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

function writeWav(name, samples) {
  // Normalize-safe: soft-clip, convert to 16-bit PCM mono.
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  writeFileSync(join(OUT, name), buf);
  console.log(`wrote ${name} (${(n / SR).toFixed(2)}s)`);
}

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------- music bed
// 40s: warm pad chords, soft kick, offbeat hats, quiet arpeggio. 96bpm.
{
  const DUR = 40;
  const N = SR * DUR;
  const out = new Float32Array(N);
  const beat = 60 / 96;

  // Cmaj7 → Am7 → Fmaj7 → G, 5s per chord, looped twice.
  const chords = [
    [48, 64, 67, 71],
    [45, 64, 69, 72],
    [41, 60, 65, 69],
    [43, 62, 67, 71],
  ];
  const chordLen = 5;

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const ci = Math.floor(t / chordLen) % chords.length;
    const ct = t % chordLen; // time within chord
    // Pad: slow attack/release inside each chord block.
    const env =
      Math.min(1, ct / 1.2) * Math.min(1, (chordLen - ct) / 1.2 + 0.0001);
    let pad = 0;
    for (const m of chords[ci]) {
      const f = midi(m);
      pad +=
        Math.sin(2 * Math.PI * f * t) +
        0.4 * Math.sin(4 * Math.PI * f * t) +
        0.15 * Math.sin(6 * Math.PI * f * t);
    }
    out[i] += pad * env * 0.045;

    // Kick on every beat.
    const bt = t % beat;
    if (bt < 0.25) {
      const f = 95 * Math.pow(0.45, bt / 0.09);
      out[i] += Math.sin(2 * Math.PI * f * bt) * Math.exp(-bt / 0.07) * 0.3;
    }

    // Hat on offbeats (short bright tick).
    const ht = (t + beat / 2) % beat;
    if (ht < 0.03) {
      out[i] += (Math.random() * 2 - 1) * Math.exp(-ht / 0.008) * 0.05;
    }

    // Pluck arpeggio: eighth notes cycling the chord an octave up.
    const eighth = beat / 2;
    const step = Math.floor(t / eighth);
    const pt = t % eighth;
    const pm = chords[ci][step % 4] + 12;
    const pf = midi(pm);
    out[i] +=
      (Math.sin(2 * Math.PI * pf * pt) + 0.3 * Math.sin(4 * Math.PI * pf * pt)) *
      Math.exp(-pt / 0.12) *
      0.055;
  }

  // Gentle one-pole lowpass to take the digital edge off, then soft clip.
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += 0.35 * (out[i] - lp);
    out[i] = Math.tanh(lp * 1.6) * 0.85;
  }
  // Fade in 1s, fade out last 2.5s.
  for (let i = 0; i < SR; i++) out[i] *= i / SR;
  const fo = SR * 2.5;
  for (let i = 0; i < fo; i++) out[N - 1 - i] *= i / fo;

  writeWav("bed.wav", out);
}

// ------------------------------------------------------------------- whoosh
{
  const DUR = 0.55;
  const N = (SR * DUR) | 0;
  const out = new Float32Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N; // 0..1
    // Filter opens then closes; amplitude swells to 45% then decays.
    const alpha = 0.03 + 0.5 * Math.sin(Math.PI * Math.min(1, t / 0.9)) ** 2;
    lp += alpha * ((Math.random() * 2 - 1) - lp);
    const env =
      t < 0.45 ? Math.sin((Math.PI / 2) * (t / 0.45)) ** 2 : Math.exp(-(t - 0.45) / 0.18);
    const sweep = 180 + 620 * Math.sin(Math.PI * t);
    out[i] =
      (lp * 0.9 + 0.12 * Math.sin(2 * Math.PI * sweep * (i / SR))) * env * 0.8;
  }
  writeWav("whoosh.wav", out);
}

// ------------------------------------------------------------------ shutter
{
  const DUR = 0.2;
  const N = (SR * DUR) | 0;
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let v = 0;
    if (t < 0.05) v += (Math.random() * 2 - 1) * Math.exp(-t / 0.006) * 0.9;
    if (t < 0.012) v += Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t / 0.004) * 0.5;
    const t2 = t - 0.07;
    if (t2 > 0) v += (Math.random() * 2 - 1) * Math.exp(-t2 / 0.005) * 0.55;
    out[i] = v * 0.8;
  }
  writeWav("shutter.wav", out);
}

// ---------------------------------------------------------------------- pop
{
  const DUR = 0.14;
  const N = (SR * DUR) | 0;
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const f = 560 * Math.pow(2, -t * 6);
    let v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.045) * 0.8;
    if (t < 0.004) v += (Math.random() * 2 - 1) * 0.25;
    out[i] = v;
  }
  writeWav("pop.wav", out);
}

// --------------------------------------------------------------------- tick
{
  const DUR = 0.04;
  const N = (SR * DUR) | 0;
  const out = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const n = Math.random() * 2 - 1;
    out[i] = (n - prev) * Math.exp(-t / 0.005) * 0.6; // crude highpass click
    prev = n;
  }
  writeWav("tick.wav", out);
}

// -------------------------------------------------------------------- chime
{
  const DUR = 0.9;
  const N = (SR * DUR) | 0;
  const out = new Float32Array(N);
  const note = (f, start, amp) => {
    for (let i = (start * SR) | 0; i < N; i++) {
      const t = i / SR - start;
      out[i] +=
        (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(6 * Math.PI * f * t)) *
        Math.exp(-t / 0.28) *
        amp;
    }
  };
  note(880, 0, 0.4); // A5
  note(1318.51, 0.14, 0.34); // E6
  writeWav("chime.wav", out);
}

console.log("done");
