# Play Store listing assets

Generated from the brand pipeline in `promo/`. Re-render either with:

```bash
cd promo && npx remotion still src/store-index.ts FeatureGraphic out/store/feature-graphic.png --frame=0
cd promo && npx remotion still src/logo-index.ts MarkSheet out/logo/icon-512.png --frame=0 --scale=0.5
```

## In this folder

| File | Play field | Size |
|---|---|---|
| `play-icon-512.png` | App icon | 512×512 |
| `feature-graphic.png` | Feature graphic | 1024×500 |

Both are the exact dimensions Play requires; it rejects anything else.

## Screenshots — you have to take these

Play requires **at least two** phone screenshots, and its policy is that they
show the real app. Mocked-up ones are a rejection risk and, more to the point,
they set a teacher up to feel misled on first open. Take them on a real phone
once the TWA is installed.

Worth capturing, in this order — the first two are what a browsing teacher
actually sees:

1. **The scan flow** — a handwritten paper in frame, mid-scan. This is the one
   thing no competitor does; lead with it.
2. **The builder with a real paper** — questions on the left, A4 preview on the
   right, so the output is visible.
3. **Language picker** open, showing the Indic scripts.
4. **A finished PDF** on screen.

Portrait, 1080×1920 or similar. Android's screenshot button is fine — no need
for a device frame; Play adds its own presentation.

## Listing copy

**Short description** (80 chars max):

> Make school exam papers in minutes. Scan a handwritten paper or type any language.

**Full description** — first two lines matter most, the rest is collapsed
behind "read more":

> Set a question paper in minutes instead of an evening.
>
> Photograph a handwritten paper and TeacherEase types it up for you — questions,
> marks, ruled answer space and all. Or build one from scratch with 23 question
> types: fill in the blanks, MCQ, match the following, vertical sums, reading
> comprehension, picture composition and more.
>
> Works in 22 Indian languages. Type in ordinary English letters and the script
> appears as you go, so you do not need a Hindi, Marathi or Tamil keyboard.
>
> Every paper exports as a clean A4 PDF that prints and photocopies exactly as
> you saw it on screen.
>
> Free to start — 3 free papers on signup, no card needed.

**Category:** Education
**Content rating:** answer the questionnaire honestly; this lands at Everyone.
**Tags:** education, teachers, exam, question paper, worksheet

## Data safety form

Play will ask what you collect. Be accurate — a wrong answer here is a
suspension risk:

- **Email address** — collected, for account creation, required, not shared.
- **Photos** — collected when a teacher scans a paper. Sent to the AI provider
  for text extraction. Say so plainly.
- **App activity** — papers the teacher creates, stored in their account.
- Data is encrypted in transit; teachers can delete their account.

Link the privacy policy at <https://papergen.online/privacy>.
