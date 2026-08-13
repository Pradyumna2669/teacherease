# TeacherEase — Project Diary

**Project:** TeacherEase — Automated Question Paper Generator
**Institute:** P. R. Pote Patil College of Engineering and Management, Amravati
**Pilot subject:** Applied Mathematics-II (CS/AI/ML201BSC03), Semester II
**Stack:** React (Create React App) + Supabase (PostgreSQL, Auth, Row Level Security)

---

## 1. Problem Statement

Setting an end-semester question paper is done by hand, and every step of it is slow, error-prone, or unsafe.

**The manual process today.** A teacher opens last year's paper in Word, edits it, and hopes nothing is left over from the previous version. Question selection happens from memory or from a printed list. There is no single place where the department's questions live.

**Problems we set out to fix:**

1. **No central question bank.** Questions live in personal Word files, notebooks, and old papers. Nothing is searchable. When a teacher leaves, their questions leave with them.

2. **Questions repeat.** The biggest failure is the Normal / Backlog pair. Both papers are set for the same exam cycle, often days apart, sometimes by different people. Overlap between them is common — and when a backlog student gets a question they already saw in the regular paper, the exam is compromised.

3. **Manual formatting eats hours.** Fixed university header, instruction block, and a Marks / BTL / CO table that must be filled correctly for every single question. Doing it by hand for every subject, every semester, is pure repetition.

4. **Syllabus coverage is not enforced.** A paper is supposed to draw from all six units in a fixed pattern. Nothing checks this. A unit can be over-weighted or skipped entirely and nobody notices until the paper is printed.

5. **Confidentiality risk.** Papers are drafted on a laptop, mailed as attachments, and copied to pen drives. Every copy is a leak point. The question set is visible on screen for as long as the teacher is working on it.

6. **Silent failures.** If the bank does not have enough questions for a unit, the teacher discovers it halfway through and pads the paper with whatever is available.

---

## 2. Solution Overview

A web app where the teacher maintains a question bank once, then generates a formatted paper in one click. Question selection happens **inside the database**, not in the browser — the teacher never sees the questions on screen, only downloads the finished file.

Core idea: **separate the pool from the recipe.**

- The **question bank** is the pool — every question tagged with unit, marks, difficulty, Bloom's level, and course outcome.
- The **blueprint** is the recipe — a JSON structure stored per paper format that says how many questions to draw from which unit at which mark value.

The generator combines the two. Change the recipe, get a different paper shape. Change the pool, get different content. Neither requires touching code.

---

## 3. How It Works

### Data model

| Table | Holds |
|---|---|
| `subjects` | Course code, name, semester |
| `questions` | The bank — text, `unit_no`, `marks`, `difficulty`, `bt_level`, `co_no`, `is_active` |
| `paper_formats` | Named formats with a `blueprint` (JSON) and `total_marks`. `subject_id NULL` means the format is global and reusable across subjects |
| `exam_cycles` | A named exam sitting, e.g. "End Sem May 2026" |
| `papers` | One generated paper — title, variant (normal / backlog), links to subject and cycle |
| `paper_questions` | Which question landed in which paper, at which `q_no`, `part` (A/B) and `position` |

### The flow

```
Question Bank  →  Generate Paper  →  generate_paper()  →  Download
 (fill pool)      (pick format,       (DB selects and      (PDF / Word
                   cycle, variant)     stamps questions)     / Image)
```

1. **Build the bank.** Teacher adds questions unit-wise. Questions are never hard-deleted in normal use — `is_active` toggles them out of circulation while keeping the history intact.

2. **Choose format, cycle, variant.** Three inputs. The exam cycle is the important one — it is the boundary inside which no question may repeat.

3. **Generate.** The app calls a single PostgreSQL function, `generate_paper()`, passing the subject, cycle, variant, title, and blueprint. All selection logic runs server-side. The browser receives back only a paper ID.

4. **Download.** The download page fetches the stored paper and offers PDF, Word, or image.

### How questions are picked

For each slot in the blueprint (e.g. *"3 questions, Unit 1, 1 mark"*), the function filters the bank down:

1. Same subject
2. Same unit
3. Same mark value
4. `is_active = true`
5. **Not already used by any paper in this exam cycle**
6. Count check — if fewer candidates than required, raise an error
7. Shuffle the survivors, take the required number
8. Write each into `paper_questions` with its question number, part, and position

Step 8 is what makes step 5 work on the next run. Picking and blocking read the same table.

### How repetition is prevented

**Within an exam cycle — guaranteed.** When the Normal paper is generated, its questions are stamped into `paper_questions` under that cycle. Generating the Backlog paper **in the same cycle** makes those questions invisible to the filter. Overlap becomes impossible, not merely unlikely. This is why the UI insists that Normal and Backlog share one cycle.

**Across cycles — by pool size and randomisation.** A new cycle starts with a clean slate, so the full bank is back in play. Repetition is avoided by keeping the bank several times larger than the paper. Our seeded bank holds 20 questions per unit against roughly 6 consumed per paper — about 3× headroom, which makes an identical draw vanishingly unlikely.

### Fail-loud, not fail-quiet

If any blueprint slot cannot be filled, the whole operation aborts inside a transaction with a specific message:

```
Unit 1 (2 marks): need 3, only 1 available
```

No partial paper is written. The teacher is told exactly which bucket is starved and by how much, before any work is wasted.

---

## 4. Document Generation

One HTML string is the single source of truth for all three export formats, built by `buildPaperHtml()` in `src/pages/DownloadPaper.jsx`. It contains the college header, affiliation, course details, the instruction block, and the question table with Marks / BTL / CO columns. All styling is inline, because both Word and the canvas renderer ignore external stylesheets.

| Format | Method | Result |
|---|---|---|
| **Word (.doc)** | HTML wrapped in Microsoft Office XML namespaces, saved as `application/msword` | Fully editable text |
| **Image (.png)** | `html2canvas` rasterises an off-screen render node at 2× scale | Flat image |
| **PDF** | Same canvas, placed into an A4 page by `jsPDF` and sliced across pages | Print-ready file |

Because all three come from the same markup, the Word file and the PDF are guaranteed to match. Export libraries are lazy-loaded on click, so they stay out of the initial bundle.

**Confidentiality by design.** The download page renders the paper into a node positioned off-screen and marked `aria-hidden`. The browser lays it out fully — which is what the rasteriser needs — but it is never visible to anyone looking at the screen. Question text exists in the tab's memory only long enough to build the file.

---

## 5. What We Achieved

- **Time.** Paper setting drops from hours of formatting to selecting three dropdowns and clicking once.
- **Zero repetition inside an exam cycle.** Enforced by the database, not by the teacher's memory or diligence.
- **Syllabus coverage guaranteed.** The blueprint mandates the unit-wise distribution. A paper that violates it cannot be produced.
- **Institutional memory.** The question bank outlives any individual teacher.
- **Consistent formatting.** Header, instructions, and the BTL/CO table are identical on every paper, every time.
- **Reduced exposure.** Questions are never displayed on screen; the file is generated and handed over directly.
- **Reusable formats.** A format with `subject_id NULL` is shared by every subject — define the 70-mark pattern once, use it department-wide.

---

## 6. Limitations and Future Work

Recorded honestly, for the next iteration:

1. **PDF is an image, not text.** The PDF is a screenshot placed inside a page, so its text cannot be selected or searched, and page breaks are blind pixel arithmetic — a question can be cut across two pages. Rendering the PDF from text primitives would fix both, at the cost of maintaining a second layout.

2. **Difficulty is stored but unused.** `difficulty` is captured for every question but no blueprint field consumes it. There is currently no way to demand "one hard question per unit". `bt_level` and `co_no` are printed on the paper but likewise do not influence selection.

3. **Header is hardcoded.** College name, session, and time sit in a constant in `DownloadPaper.jsx`. These belong in a settings table or on the exam cycle record.

4. **Cross-cycle rotation is probabilistic.** Freshness across cycles rests on randomisation plus a large bank. Ordering candidates by least-recently-used would make rotation deterministic — a question could not reappear until the bank had cycled through.

5. **Database logic is not in version control.** `generate_paper()` exists only in the live Supabase project. It should be committed as a migration file alongside `seed_appmath2.sql` so it can be reviewed and restored.

6. **Single seeded subject.** Only Applied Mathematics-II has a populated bank. Scaling to a full department needs bulk import rather than one-at-a-time entry.

---

## 7. Key Takeaway

The design decision that carried the project: **push the rules into the database, not the interface.**

Question selection, the no-repeat guarantee, and the sufficiency check all live in one PostgreSQL function running inside a transaction. The React app only asks and displays. A future mobile app, a bulk script, or an admin tool would inherit every guarantee for free — and no client can accidentally bypass them, because the client never had the power in the first place.
