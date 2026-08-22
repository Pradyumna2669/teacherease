"""Build COPYRIGHT_SQPG.pdf — the source-code enclosure for a software
copyright application (Copyright Office, India — Literary Work / Computer
Programme).

The Copyright Office asks for the first 10 and the last 10 pages of the source
code (or the whole listing if it runs to 20 pages or fewer). This script
renders the project's source as a numbered listing, then emits the front
matter plus exactly those pages, with the omitted middle stated openly.

Run:  python make_copyright_pdf.py
"""

import fitz
import hashlib
import os
from datetime import date

OUT = "COPYRIGHT_SQPG.pdf"

WORK_TITLE = ("SMART QUESTION PAPER GENERATOR — AUTOMATED QUESTION PAPER "
              "GENERATION SYSTEM WITH CYCLE-AWARE NON-REPETITION")
WORK_SHORT = "Smart Question Paper Generator"

# Order matters: entry point first, then logic, then presentation, then schema.
FILES = [
    "src/index.js",
    "src/App.js",
    "src/supabaseClient.js",
    "src/lib/useProfile.js",
    "src/lib/questionImages.js",
    "src/components/RequireRole.jsx",
    "src/components/Nav.jsx",
    "src/components/DeleteSubjectDialog.jsx",
    "src/pages/Login.jsx",
    "src/pages/Home.jsx",
    "src/pages/Dashboard.jsx",
    "src/pages/TeacherHome.jsx",
    "src/pages/QuestionBank.jsx",
    "src/pages/GeneratePaper.jsx",
    "src/pages/DownloadPaper.jsx",
    "src/pages/AdminHome.jsx",
    "src/pages/AllPapers.jsx",
    "src/pages/AuditLog.jsx",
    "src/pages/Profile.jsx",
    "src/pages/Settings.jsx",
    "src/App.css",
    "src/pages.css",
    "public/index.html",
    "admin_audit.sql",
    "question_images.sql",
    "seed_appmath2.sql",
]

# Author (first entry) and co-authors, exactly as entered in the online form.
AUTHORS = [
    ("PRADYUMNA GIRISH KULKARNI",
     "VIMACO ENCLAVE, OPP. IG BUNGALOW, CAMP, AMRAVATI, MAHARASHTRA - 444602"),
    ("SATCHIT ANIL DHAWALE",
     "V.M.V ROAD, NEAR LILAI PHOTO STUDIO, KHARAYA NAGAR, MAHENDRA COLONY, "
     "VIDHARBH MAHAVIDYALA, AMRAVATI, MAHARASHTRA - 444604"),
    ("YASHWANT VIJAYRAO KIRAKTE",
     "NANDURA BU, NANDURA BK, AMRAVATI, MAHARASHTRA - 444801"),
    ("AARYA SANJAY KUKADE",
     "SWAROOP PLAZA APARTMENT, BEHIND CHAWLA BEKARY, ZADE LAY-OUT, RAMNAGAR, "
     "CHANDRAPUR, MAHARASHTRA - 442401"),
    ("VISHESH SANDEEPRAO PACHGHARE",
     "WARD NO. 6, BHAVANI NAGAR KANDALI, PARATWADA, ACHALPUR, AMRAVATI, "
     "MAHARASHTRA - 444805"),
    ("AYUSH RUPESH DONGRE",
     "BABULGAON, AKOLA, MAHARASHTRA - 444104"),
    ("NISHANT SUDHIR THAKARE",
     "PLOT NO 10B, JAIGAURI NAGAR, NEAR ANUSAYAMATA MANDIR, DATTAWADI, "
     "AMRAVATI, MAHARASHTRA - 444603"),
    ("JANHAVI GOPAL HIRE",
     "GANESHPUR, POGHAT, WASHIM, MAHARASHTRA - 444403"),
    ("VAISHNAVI RAMESH BAND",
     "WARD NO. 01, TEACHERS COLONY PINJAR, AKOLA, MAHARASHTRA - 444407"),
    ("MAYUR S BHURANGE",
     "FLAT NO. G002, VARAD RESIDENCY, GAJANAN NAGAR, BEHIND HIRWAL LAWN, "
     "KATHORA ROAD, AMRAVATI, MAHARASHTRA - 444604"),
]

# ---- page geometry -----------------------------------------------------------
W, H = fitz.paper_size("a4")            # 595 x 842 pt
ML, MR, MT, MB = 56, 45, 62, 52
CODE_SIZE, LEAD = 8.0, 10.4
GUTTER = 30                              # line-number column
WRAP = 94                                # characters per code line before wrap
LINES_PER_PAGE = int((H - MT - MB) // LEAD)

BODY = "helv"
BOLD = "hebo"
MONO = "cour"
INK = (0.09, 0.14, 0.24)
MUTED = (0.36, 0.40, 0.48)
SEAL = (0.56, 0.11, 0.18)


# Base-14 PDF fonts render only WinAnsi; anything outside it comes out as "?".
# Fold the typographic characters down to ASCII before drawing.
_FOLD = {
    "—": "-", "–": "-", "‘": "'", "’": "'",
    "“": '"', "”": '"', "↪": ">>", "→": "->",
    "≤": "<=", "≥": ">=", "…": "...", "·": "-",
}


def ascii_safe(s):
    for bad, good in _FOLD.items():
        s = s.replace(bad, good)
    return s.encode("latin-1", "replace").decode("latin-1")


# ---- front matter helpers ----------------------------------------------------
class Sheet:
    """A simple top-down text cursor on one page."""

    def __init__(self, doc):
        self.p = doc.new_page(width=W, height=H)
        self.y = MT

    def text(self, s, *, size=10.5, font=BODY, color=INK, gap=5, indent=0,
             align=fitz.TEXT_ALIGN_LEFT):
        box = fitz.Rect(ML + indent, self.y, W - MR, self.y + 1000)
        used = self.p.insert_textbox(box, ascii_safe(s), fontname=font, fontsize=size,
                                     color=color, align=align, lineheight=1.35)
        # insert_textbox returns remaining space; compute consumed height
        h = (box.height - used) if used >= 0 else box.height
        self.y += h + gap
        return self

    def rule(self, gap=10, color=SEAL, width=1.1):
        self.p.draw_line(fitz.Point(ML, self.y), fitz.Point(W - MR, self.y),
                         color=color, width=width)
        self.y += gap

    def label(self, s):
        return self.text(s.upper(), size=7.5, font=BOLD, color=MUTED, gap=3)

    def field(self, name, value):
        self.label(name)
        self.text(value, size=10.5, gap=9)
        return self

    def space(self, n=10):
        self.y += n
        return self


def read(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read().replace("\t", "    ").rstrip("\n").split("\n")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        h.update(fh.read())
    return h.hexdigest()


# ---- build the full code listing as a list of pages --------------------------
def build_listing():
    """Return [[ (lineno|None, text), ... ] per page ]."""
    stream = []
    for path in FILES:
        if not os.path.exists(path):
            print(f"  ! missing, skipped: {path}")
            continue
        lines = read(path)
        stream.append((None, ""))
        stream.append((None, "=" * 88))
        stream.append((None, f"FILE: {path}   ({len(lines)} lines)"))
        stream.append((None, "=" * 88))
        for i, ln in enumerate(lines, 1):
            if len(ln) <= WRAP:
                stream.append((i, ln))
            else:                                   # wrap, mark continuations
                stream.append((i, ln[:WRAP]))
                rest = ln[WRAP:]
                while rest:
                    stream.append((None, "        >> " + rest[:WRAP - 10]))
                    rest = rest[WRAP - 10:]
    pages = [stream[i:i + LINES_PER_PAGE]
             for i in range(0, len(stream), LINES_PER_PAGE)]
    return pages


def draw_code_page(doc, rows, page_no, total):
    p = doc.new_page(width=W, height=H)
    p.insert_text(fitz.Point(ML, MT - 24), WORK_SHORT + " - source code",
                  fontname=BODY, fontsize=7.5, color=MUTED)
    tag = f"Source code page {page_no} of {total}"
    tw = fitz.get_text_length(tag, fontname=BODY, fontsize=7.5)
    p.insert_text(fitz.Point(W - MR - tw, MT - 24), tag,
                  fontname=BODY, fontsize=7.5, color=MUTED)
    p.draw_line(fitz.Point(ML, MT - 18), fitz.Point(W - MR, MT - 18),
                color=SEAL, width=0.7)

    y = MT
    for num, text in rows:
        if num is not None:
            p.insert_text(fitz.Point(ML, y), f"{num:>4}", fontname=MONO,
                          fontsize=CODE_SIZE, color=(0.55, 0.58, 0.65))
        p.insert_text(fitz.Point(ML + GUTTER, y), ascii_safe(text), fontname=MONO,
                      fontsize=CODE_SIZE, color=(0, 0, 0))
        y += LEAD
    return p


def notice_page(doc, shown_first, shown_last, total):
    s = Sheet(doc)
    s.space(150)
    s.text("PAGES OMITTED", size=13, font=BOLD, gap=10,
           align=fitz.TEXT_ALIGN_CENTER)
    s.rule(gap=14)
    s.text(
        f"The complete source code listing of this work runs to {total} pages. "
        f"In accordance with the practice of the Copyright Office for computer "
        f"programmes, only the first {shown_first} pages and the last "
        f"{shown_last} pages of the listing are enclosed.\n\n"
        f"Source code pages {shown_first + 1} to {total - shown_last} are "
        f"omitted here. No portion of the enclosed pages has been blanked out, "
        f"redacted or altered. The complete source code will be produced before "
        f"the Registrar of Copyrights on demand.",
        size=10.5, align=fitz.TEXT_ALIGN_JUSTIFY, gap=0)


# ---- front matter ------------------------------------------------------------
def front_matter(doc, files_present, total_lines, total_pages):
    today = date.today().strftime("%d %B %Y")

    # --- 1. title page
    s = Sheet(doc)
    s.space(40)
    s.text("APPLICATION FOR REGISTRATION OF COPYRIGHT", size=11, font=BOLD,
           color=SEAL, align=fitz.TEXT_ALIGN_CENTER, gap=4)
    s.text("Literary Work — Computer Programme (Software)", size=10,
           color=MUTED, align=fitz.TEXT_ALIGN_CENTER, gap=16)
    s.rule(gap=4)
    s.rule(gap=26, width=0.6)
    s.text("TITLE OF THE WORK", size=8, font=BOLD, color=MUTED,
           align=fitz.TEXT_ALIGN_CENTER, gap=8)
    s.text(WORK_TITLE, size=15, font=BOLD, align=fitz.TEXT_ALIGN_CENTER, gap=26)
    s.rule(gap=4, width=0.6)
    s.rule(gap=30)

    s.field("Class of Work", "Literary Work (Computer Programme / Software) — "
                             "Section 2(o), Copyright Act, 1957")
    s.field("Programming languages", "JavaScript (React), SQL / PL-pgSQL, "
                                     "CSS, HTML")
    s.field("Nature of applicant's interest", "Author and owner of the work")
    s.field("Whether published", "____________________  (Published / Unpublished)")
    s.field("Year of first publication", "____________________")
    s.field("Year of creation", "2026")
    s.field("Country of first publication", "India")

    s.space(6)
    s.label("Author / Applicant")
    s.text(AUTHORS[0][0], size=11, font=BOLD, gap=3)
    s.text(AUTHORS[0][1], size=10, gap=3)
    s.text("Nationality: Indian", size=10, gap=8)
    s.text(f"Co-authors: {len(AUTHORS) - 1} joint authors. Particulars of all "
           f"{len(AUTHORS)} authors are set out on the following page.",
           size=10, gap=14)

    s.text(f"Date of this enclosure: {today}", size=9, color=MUTED, gap=0)

    # --- 1a. particulars of authors
    s = Sheet(doc)
    s.text("PARTICULARS OF THE AUTHORS", size=13, font=BOLD, gap=8)
    s.rule(gap=12)
    s.text(f"The work is the joint work of the {len(AUTHORS)} authors named "
           f"below. Entry 1 is the applicant; entries 2 to {len(AUTHORS)} are "
           f"joint authors. All authors are citizens of India.",
           size=10, color=MUTED, align=fitz.TEXT_ALIGN_JUSTIFY, gap=14)

    for i, (name, address) in enumerate(AUTHORS, 1):
        # An entry needs ~95pt; start a fresh sheet rather than run off the page.
        if s.y > H - MB - 95:
            s = Sheet(doc)
            s.text("PARTICULARS OF THE AUTHORS (continued)", size=13,
                   font=BOLD, gap=8)
            s.rule(gap=14)
        role = "APPLICANT / AUTHOR" if i == 1 else "CO-AUTHOR"
        s.text(f"{i}.   {name}", size=10.5, font=BOLD, gap=2)
        s.text(role, size=7, font=BOLD, color=SEAL, gap=3, indent=17)
        s.text(address, size=9.5, color=MUTED, gap=2, indent=17)
        s.text("Nationality: Indian", size=9.5, color=MUTED, gap=11, indent=17)

    # --- 2. description of the work
    s = Sheet(doc)
    s.text("DESCRIPTION OF THE WORK", size=13, font=BOLD, gap=8)
    s.rule(gap=14)
    for para in [
        f"{WORK_SHORT} is a web-based software system that automates the "
        "preparation of examination question papers in an educational "
        "institution. The software maintains a unit-wise question bank, applies "
        "a reusable examination blueprint, selects questions under that "
        "blueprint, and produces a formatted question paper for download.",

        "The distinguishing feature of the work is cycle-aware non-repetition. "
        "Every question issued in a generated paper is recorded against its "
        "examination cycle. When a further paper is generated in the same cycle "
        "— typically the backlog paper — the questions already issued are "
        "excluded at the database query level, so an overlap between the "
        "regular and the backlog paper cannot occur.",

        "Question selection, non-repetition, sufficiency validation and audit "
        "logging are implemented as server-side database routines and triggers "
        "executing within a single transaction. If any requirement of the "
        "blueprint cannot be met, the operation is aborted in full and no "
        "partial paper is stored. The client application never performs the "
        "selection and never receives the pool of candidate questions.",
    ]:
        s.text(para, size=10.5, align=fitz.TEXT_ALIGN_JUSTIFY, gap=9)

    s.space(4)
    s.label("Principal modules of the software")
    for line in [
        "1.  Authentication and role-based access (administrator / teacher).",
        "2.  Question bank management — unit, marks, difficulty, Bloom's level, "
        "course outcome.",
        "3.  Paper format and blueprint management (reusable JSON blueprints).",
        "4.  Paper generation with cycle-aware non-repetition and sufficiency "
        "validation.",
        "5.  Document export — Word, PDF and image from a single representation.",
        "6.  Administration — subjects, teacher allotment, confirmed deletion.",
        "7.  Append-only audit log with timestamp, actor and action record.",
    ]:
        s.text(line, size=10, gap=4, indent=10)

    s.space(8)
    s.label("Technology used")
    s.text("React (Create React App) for the client; PostgreSQL for storage, "
           "with server-side routines, triggers and row-level security "
           "policies; JSON Web Token based authentication.",
           size=10, gap=0)

    # --- 3. inventory
    s = Sheet(doc)
    s.text("INDEX OF SOURCE FILES ENCLOSED", size=13, font=BOLD, gap=8)
    s.rule(gap=12)
    s.text(f"{len(files_present)} files · {total_lines:,} lines of source code · "
           f"{total_pages} pages of listing. The SHA-256 digest of each file is "
           f"given so that the enclosed listing can be verified against the "
           f"submitted work.", size=9.5, color=MUTED,
           align=fitz.TEXT_ALIGN_JUSTIFY, gap=12)

    y = s.y
    s.p.insert_text(fitz.Point(ML, y), "FILE", fontname=BOLD, fontsize=7.5,
                    color=MUTED)
    s.p.insert_text(fitz.Point(ML + 250, y), "LINES", fontname=BOLD,
                    fontsize=7.5, color=MUTED)
    s.p.insert_text(fitz.Point(ML + 292, y), "SHA-256 (first 32 hex digits)",
                    fontname=BOLD, fontsize=7.5, color=MUTED)
    y += 6
    s.p.draw_line(fitz.Point(ML, y), fitz.Point(W - MR, y),
                  color=(0.8, 0.8, 0.8), width=0.5)
    y += 11
    for path, n, digest in files_present:
        s.p.insert_text(fitz.Point(ML, y), ascii_safe(path), fontname=MONO,
                        fontsize=7.6)
        s.p.insert_text(fitz.Point(ML + 250, y), f"{n:>5}", fontname=MONO,
                        fontsize=7.6)
        s.p.insert_text(fitz.Point(ML + 292, y), digest[:32], fontname=MONO,
                        fontsize=7.6, color=(0.3, 0.3, 0.35))
        y += 11.5

    # --- 4. declaration
    s = Sheet(doc)
    s.text("DECLARATION", size=13, font=BOLD, gap=8)
    s.rule(gap=16)
    s.text(
        "I declare that the source code enclosed with this application is the "
        "original work of the authors named in this enclosure; that it has been "
        "written by them and has not been copied from any other work; and that no "
        "portion of the enclosed listing has been blanked out, redacted or "
        "otherwise altered.",
        size=10.5, align=fitz.TEXT_ALIGN_JUSTIFY, gap=12)
    s.text(
        "I further declare that the particulars stated in this enclosure are "
        "true to the best of my knowledge and belief, and that the complete "
        "source code of the work will be produced before the Registrar of "
        "Copyrights as and when required.",
        size=10.5, align=fitz.TEXT_ALIGN_JUSTIFY, gap=40)

    s.text("Place : ____________________", size=10.5, gap=14)
    s.text("Date  : ____________________", size=10.5, gap=52)
    s.text("____________________________", size=10.5, gap=4)
    s.text("Signature of the applicant (for self and on behalf of the "
           "joint authors)", size=9, color=MUTED, gap=2)
    s.text(AUTHORS[0][0], size=10, font=BOLD, gap=0)


# ---- main --------------------------------------------------------------------
def main():
    present = []
    total_lines = 0
    for path in FILES:
        if os.path.exists(path):
            n = len(read(path))
            present.append((path, n, sha256(path)))
            total_lines += n

    pages = build_listing()
    total = len(pages)

    doc = fitz.open()
    front_matter(doc, present, total_lines, total)

    if total <= 20:
        chosen = list(enumerate(pages, 1))
        for no, rows in chosen:
            draw_code_page(doc, rows, no, total)
        print(f"  listing is {total} pages (<= 20) — enclosed in full")
    else:
        for no in range(1, 11):
            draw_code_page(doc, pages[no - 1], no, total)
        notice_page(doc, 10, 10, total)
        for no in range(total - 9, total + 1):
            draw_code_page(doc, pages[no - 1], no, total)
        print(f"  listing is {total} pages — enclosed pages 1-10 and "
              f"{total - 9}-{total}")

    doc.set_metadata({
        "title": WORK_TITLE,
        "author": "; ".join(a[0] for a in AUTHORS),
        "subject": "Copyright application enclosure — computer programme",
    })
    doc.save(OUT, deflate=True)
    print(f"wrote {OUT}: {doc.page_count} pages, {len(present)} files, "
          f"{total_lines:,} lines")


if __name__ == "__main__":
    main()
