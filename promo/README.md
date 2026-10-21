# PaperGen promo video

Programmatic 1080p promo built with [Remotion](https://remotion.dev). Everything
— visuals, music, sound effects and voiceover — is generated from this folder,
so any line of copy can be changed and the video re-rendered in a few minutes.

## Build it

```bash
npm install
npm run assets   # music + SFX (Node) and voiceover (needs: pip install edge-tts)
npm run render   # -> out/papergen-promo.mp4
```

`npm run preview` opens Remotion Studio for live scrubbing while you edit.

Audio lives in `public/` and is gitignored — it is all reproducible from the two
scripts, which keeps ~4MB of binaries out of the repo.

## What's where

| File | Contains |
| --- | --- |
| `src/Root.tsx` | Scene timeline, voiceover placement, SFX schedule, audio ducking |
| `src/scenes.tsx` | The seven scenes |
| `src/ui.tsx` | Brand palette, fonts, shared animation helpers |
| `scripts/gen-audio.mjs` | Synthesised music bed + whoosh / shutter / pop / tick / chime |
| `scripts/gen-vo.mjs` | Voiceover lines via Edge neural TTS |

## Scenes

| # | Time | Beat |
| --- | --- | --- |
| 1 | 0–6.8s | The problem: a new paper every week |
| 2 | 6.8–10.5s | Brand reveal |
| 3 | 10.5–18.2s | Scan a handwritten paper → typed, formatted |
| 4 | 18.2–26s | Type in English letters, get the script |
| 5 | 26–33.5s | Question types, live A4 preview, one-click PDF |
| 6 | 33.5–38.5s | 60 free credits |
| 7 | 38.5–44.3s | Call to action |

## Changing things

**Copy** — edit the strings in `src/scenes.tsx`, and the matching line in
`scripts/gen-vo.mjs` if it is spoken. Re-run `npm run vo` then `npm run render`.

**Voice** — `VO_VOICE=en-IN-PrabhatNeural npm run vo` for a male read. List all
options with `python -m edge_tts --list-voices`. A markedly longer or shorter
read may need the scene lengths in `src/Root.tsx` nudged.

**Music** — `scripts/gen-audio.mjs` synthesises the bed. To use a licensed track
instead, drop it in as `public/bed.wav` and skip `npm run audio`.

**Aspect ratio** — the `Composition` in `src/Root.tsx` is 1920×1080. A 9:16 cut
for WhatsApp Status and Reels needs a second composition plus per-scene layout
work; the scenes are currently laid out for landscape.
