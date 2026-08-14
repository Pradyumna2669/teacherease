"""Build SYNOPSIS_TeacherEase.docx — a real Word document (not HTML renamed).

python-docx writes genuine OOXML, so Word opens it without Protected View
complaints and every heading, table and page break is a native Word object.

Run:  python build_synopsis_docx.py
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT = "SYNOPSIS_TeacherEase.docx"
TITLE = ("Smart Question Paper Generator: Automated Question Paper Generation "
         "System with Cycle-Aware Non-Repetition")
SHORT = "Smart Question Paper Generator"   # running header, in-body references
GREY = RGBColor(0x9C, 0xA3, 0xAF)     # placeholder text — overwrite in Word
MAROON = RGBColor(0xC0, 0x00, 0x00)   # cover labels, as in the sample synopsis

doc = Document()

# ------------------------------------------------------------- page setup ---
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.top_margin, sec.bottom_margin = Cm(2.5), Cm(2.2)
sec.left_margin, sec.right_margin = Cm(2.8), Cm(2.2)
sec.header_distance, sec.footer_distance = Cm(1.2), Cm(1.2)

style = doc.styles["Normal"]
style.font.name = "Times New Roman"
style.font.size = Pt(12)
style.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
style.paragraph_format.space_after = Pt(8)
style.paragraph_format.line_spacing = 1.4


# ---------------------------------------------------------------- helpers ---
def para(text="", *, size=12, bold=False, italic=False, align="justify",
         color=None, space_after=8, line=1.4, indent=None):
    p = doc.add_paragraph()
    p.alignment = {
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
    }[align]
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line
    if indent:
        p.paragraph_format.left_indent = Cm(indent)
    if text:
        r = p.add_run(text)
        r.font.size, r.bold, r.italic = Pt(size), bold, italic
        if color:
            r.font.color.rgb = color
    return p


def rich(parts, *, size=12, align="justify", space_after=8, line=1.4):
    """parts = [(text, {'bold':True}), ...] — one paragraph, mixed formatting."""
    p = doc.add_paragraph()
    p.alignment = {"justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
                   "center": WD_ALIGN_PARAGRAPH.CENTER,
                   "left": WD_ALIGN_PARAGRAPH.LEFT}[align]
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line
    for text, fmt in parts:
        r = p.add_run(text)
        r.font.size = Pt(fmt.get("size", size))
        r.bold = fmt.get("bold", False)
        r.italic = fmt.get("italic", False)
        if fmt.get("grey"):
            r.font.color.rgb = GREY
        if fmt.get("maroon"):
            r.font.color.rgb = MAROON
    return p


def heading(text, *, size=14, before=14, after=8):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    r = p.add_run(text)
    r.bold, r.font.size = True, Pt(size)
    return p


def sub(text):
    return heading(text, size=12.5, before=12, after=6)


def bullets(items, *, numbered=False, size=12):
    st = "List Number" if numbered else "List Bullet"
    for it in items:
        p = doc.add_paragraph(style=st)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.35
        if isinstance(it, tuple):          # (bold lead-in, rest)
            r = p.add_run(it[0]); r.bold = True; r.font.size = Pt(size)
            r2 = p.add_run(" " + it[1]); r2.font.size = Pt(size)
        else:
            p.add_run(it).font.size = Pt(size)


def page_break():
    doc.add_page_break()


def figure(path, caption, width_cm=15.6):
    """Centred figure with a caption line below it."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(4)
    p.add_run().add_picture(path, width=Cm(width_cm))
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(12)
    r = cap.add_run(caption)
    r.bold, r.font.size = True, Pt(10)


def field(paragraph, code):
    """Insert a Word field (used for the live PAGE number)."""
    r = paragraph.add_run()
    f1 = OxmlElement("w:fldChar"); f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve")
    it.text = f" {code} "
    f2 = OxmlElement("w:fldChar"); f2.set(qn("w:fldCharType"), "end")
    r._r.append(f1); r._r.append(it); r._r.append(f2)
    r.font.size = Pt(9)


def logo_box():
    """Empty bordered square — delete it and paste the logo in its place."""
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = t.rows[0].cells[0]
    t.rows[0].height = Cm(3.6)
    cell.width = Cm(3.6)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("\ncollege logo\n(delete this box,\npaste logo here)")
    r.font.size, r.font.color.rgb = Pt(8), GREY
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "dashed"); el.set(qn("w:sz"), "6")
        el.set(qn("w:color"), "9CA3AF")
        tcPr = cell._tc.get_or_add_tcPr()
        borders = tcPr.find(qn("w:tcBorders"))
        if borders is None:
            borders = OxmlElement("w:tcBorders"); tcPr.append(borders)
        borders.append(el)
    doc.add_paragraph()


def table(headers, rows, *, size=8, widths=None, tall=False):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    for i, h in enumerate(headers):
        c = t.rows[0].cells[i]
        c.text = ""
        r = c.paragraphs[0].add_run(h)
        r.bold, r.font.size = True, Pt(size)
    for row in rows:
        cells = t.add_row().cells
        if tall:
            t.rows[-1].height = Cm(1.0)
        for i, val in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(val)
            run.font.size = Pt(size)
            if val.startswith("____"):
                run.font.color.rgb = GREY
    if widths:
        for r_ in t.rows:
            for i, w in enumerate(widths):
                r_.cells[i].width = Cm(w)
    return t


# ------------------------------------------------------- header & footer ----
hdr = sec.header.paragraphs[0]
hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
hr = hdr.add_run(SHORT)
hr.bold, hr.font.size = True, Pt(10)

ftr = sec.footer.paragraphs[0]
ftr.alignment = WD_ALIGN_PARAGRAPH.LEFT
ftr.paragraph_format.tab_stops.add_tab_stop(Cm(16), WD_TAB_ALIGNMENT.RIGHT)
fr = ftr.add_run("PRPCEM, CSE 2026-27\t")
fr.font.size = Pt(9)
fr2 = ftr.add_run("Page | ")
fr2.font.size = Pt(9)
field(ftr, "PAGE")

# ============================================================== COVER =======
para("Project Synopsis", size=26, bold=True, align="center", color=MAROON,
     space_after=6)
para("on", size=11, align="center", space_after=4)
para(TITLE, size=13, bold=True, align="center", space_after=10)
logo_box()

for label, value in [
    ("Session:", "2026-27"),
    ("Year/Semester:", "IIIrd"),
    ("Project Group No.:", None),
    ("Project Guide Name:", "Prof. Mayur. S. Burange"),
    ("Project Leader Name:", "Mr. Pradyumna. G. Kulkarni"),
]:
    parts = [(label + " ", {"bold": True, "maroon": True, "size": 14})]
    if value is None:
        parts += [("GC", {"size": 14}), ("________", {"grey": True, "size": 14})]
    else:
        parts += [(value, {"size": 14})]
    p = rich(parts, align="left", space_after=6, line=1.6)
    p.paragraph_format.left_indent = Cm(1.2)

para(space_after=18)
for line in ["Department of Computer Science & Engineering",
             "P. R. Pote Patil College of Engineering & Management,",
             "Amravati-444602 (M.S.)"]:
    para(line, size=12, bold=True, align="center", color=MAROON, space_after=2)

# ========================================================== TITLE PAGE =====
page_break()
para("Project", size=20, bold=True, align="center", space_after=2)
para("Synopsis", size=13, align="center", space_after=2)
para("on", size=11, align="center", space_after=4)
para(TITLE, size=13, bold=True, align="center", space_after=16)

blank = "____________________"
mt = doc.add_table(rows=3, cols=2)
members_grid = [("1. Pradyumna G. Kulkarni", "2. " + blank),
                ("3. " + blank, "4. " + blank),
                ("5. " + blank, "6. " + blank)]
for ri, (a, b) in enumerate(members_grid):
    for ci, val in enumerate((a, b)):
        cell = mt.rows[ri].cells[ci]
        cell.text = ""
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(10)
        r = p.add_run(val)
        r.font.size = Pt(12)
        if blank in val:
            head, tail = val.split(blank)
            p.clear() if hasattr(p, "clear") else None
            cell.paragraphs[0].text = ""
            p2 = cell.paragraphs[0]
            r1 = p2.add_run(head); r1.font.size = Pt(12)
            r2 = p2.add_run(blank); r2.font.size = Pt(12); r2.font.color.rgb = GREY

para(space_after=14)
gt = doc.add_table(rows=2, cols=2)
for ri, (a, b) in enumerate([("Guide", "HOD, CSE"),
                             ("Prof. Mayur. S. Burange", "Dr. V. B. Gadicha")]):
    for ci, val in enumerate((a, b)):
        cell = gt.rows[ri].cells[ci]
        cell.text = ""
        p = cell.paragraphs[0]
        p.alignment = (WD_ALIGN_PARAGRAPH.LEFT if ci == 0
                       else WD_ALIGN_PARAGRAPH.CENTER)
        r = p.add_run(val)
        r.font.size, r.bold = Pt(12), (ri == 0)

para(space_after=12)
logo_box()
for line, bold in [("Department of Computer Science & Engineering", True),
                   ("P. R. Pote Patil College of Engineering & Management,", True),
                   ("Amravati-444602 (M.S.)", True),
                   ("(An Autonomous Institute)", False),
                   ("2026-2027", True)]:
    para(line, size=(10 if not bold else 12), bold=bold, align="center",
         space_after=2)

# ======================================================== TABLE OF CONTENT ==
page_break()
para("Table of content", size=14, bold=True, align="center", space_after=12)
toc_rows = [("", "Abstract"), ("1", "Introduction"), ("2", "Motivation"),
            ("3", "Problem Statement"), ("4", "Objectives"),
            ("5", "Literature Review"), ("6", "Proposed Methodology"),
            ("7", "Challenges / Limitations"),
            ("8", "Expected Outcomes (Implications)"),
            ("9", "Innovation / Social Relevance"),
            ("", "References"), ("", "Guide's Remarks")]
table(["Sr. No.", "Contents", "Page No."],
      [(a, b, "______") for a, b in toc_rows],
      size=12, widths=[2.2, 10.5, 3.0])
para("Fill the page numbers after the logo and member names are added — the "
     "document repaginates once those are in place.", size=9, italic=True,
     color=GREY, align="left")

# ================================================================ ABSTRACT ==
page_break()
heading("Abstract")
rich([(TITLE, {"bold": True}),
      (" is a web-based academic solution that automates the preparation of "
       "examination question papers in autonomous engineering institutes. At present "
       "the task is manual, repetitive and confidentiality-sensitive: a teacher "
       "selects questions from personal records, arranges them according to a "
       "prescribed pattern and formats the document by hand, which results in "
       "unbalanced syllabus coverage, accidental repetition of questions between the "
       "regular and backlog papers of the same examination, avoidable clerical effort "
       "and repeated exposure of confidential content. The proposed system separates "
       "the question pool from the paper recipe: a unit-wise question bank stores each "
       "question with its unit number, mark value, difficulty, Bloom's Taxonomy level "
       "and Course Outcome mapping, while a reusable JSON blueprint fixes how many "
       "questions must be drawn from each unit at each mark value.", {})])

para("The system is developed using React for the frontend and Supabase "
     "(PostgreSQL) for the database, authentication and Row Level Security. Selection "
     "logic, non-repetition enforcement, sufficiency validation and audit logging are "
     "implemented as SECURITY DEFINER database functions and triggers executing inside "
     "a single transaction, so the guarantees cannot be bypassed by any client and the "
     "browser never receives the candidate pool. The defining feature of the system is "
     "cycle-aware non-repetition: every question issued in a paper is recorded against "
     "its examination cycle, and a subsequent paper generated in the same cycle — "
     "typically the backlog paper — excludes those questions at the query level, "
     "making overlap between the regular and backlog papers impossible rather than "
     "merely unlikely. The generated paper is exported in Word, PDF and image formats "
     "from a single HTML representation, and question text is never displayed on "
     "screen at any stage.")

rich([("Keywords: ", {"bold": True}),
      ("Question Paper Generation, Question Bank, Bloom's Taxonomy, Course Outcome, "
       "Non-Repetition, React, Supabase, PostgreSQL, Row Level Security, Audit Log.",
       {})])

# ============================================================ INTRODUCTION ==
page_break()
heading("1. Introduction")
rich([(TITLE, {"bold": True}),
      (" is a complete software solution developed to digitize and standardize the "
       "preparation of examination question papers in an autonomous engineering "
       "institute. The system integrates the essential functions of the examination "
       "workflow — maintenance of a unit-wise question bank, definition of reusable "
       "paper formats, controlled generation of regular and backlog papers, export of "
       "the paper in printable formats, administrative supervision of subjects and "
       "teachers, and a tamper-evident audit trail — into a single centralized "
       "platform.", {})])
para("At present most departments still prepare question papers using word "
     "processors, printed question lists and personal collections maintained by "
     "individual teachers. This leads to inconsistent formatting, unbalanced coverage "
     "of the syllabus, accidental repetition of questions between the regular and "
     "backlog papers of the same examination, loss of institutional knowledge when a "
     "teacher is transferred, and repeated exposure of confidential content across "
     "e-mail attachments and removable media. The proposed system addresses these "
     "problems by "
     "providing a secure, role-based and rule-driven system in which the academic "
     "constraints of a question paper are enforced by the database itself rather than "
     "by the diligence of the person setting the paper.")

heading("2. Motivation")
para("Departments continue to depend on manual question selection, personal question "
     "collections and word-processor formatting, which results in repeated questions, "
     "uneven unit-wise weightage, considerable clerical effort before every "
     "examination, and weak confidentiality of the paper during preparation. The most "
     "serious of these is repetition between the regular and backlog papers of the "
     "same examination cycle, which directly affects the fairness of the examination. "
     "The proposed system is motivated by the need for a centralized platform that automates "
     "question selection under a fixed blueprint, guarantees non-repetition within an "
     "examination cycle, preserves the departmental question bank as an institutional "
     "asset, and produces a print-ready paper without ever displaying its contents on "
     "screen.")

# ================================================= PROBLEM & OBJECTIVES =====
page_break()
heading("3. Problem Statement")
para("The existing question paper preparation process faces several academic and "
     "operational challenges, including:")
bullets([
    "Manual and disconnected maintenance of questions in personal files, printed "
    "lists and previous papers, with no searchable departmental repository.",
    "Accidental repetition of questions between the regular and backlog papers of the "
    "same examination cycle, since no mechanism records what has already been issued.",
    "Considerable clerical effort in reproducing the fixed institute header, "
    "instruction block and the Marks/BTL/CO table for every paper of every subject.",
    "Absence of enforcement of the prescribed unit-wise and mark-wise distribution, "
    "allowing a unit to be over-weighted or omitted without detection.",
    "Confidentiality risk arising from drafting papers on personal machines and "
    "circulating them through e-mail attachments and removable storage.",
    "Late discovery of an insufficient question bank, forcing the paper setter to "
    "compromise on the prescribed pattern.",
    "Loss of institutional knowledge when the questions prepared by an individual "
    "teacher leave with that teacher.",
])

heading("4. Objectives")
for t in [
    "i. Develop a role-based web application for maintaining a unit-wise question bank "
    "tagged with marks, difficulty, Bloom's Taxonomy level and Course Outcome.",
    "ii. Implement reusable JSON paper blueprints so that a paper pattern is defined "
    "once and applied across subjects and semesters.",
    "iii. Design and implement a server-side generation routine that selects questions "
    "randomly from the eligible pool while strictly honouring the prescribed unit-wise "
    "and mark-wise distribution.",
    "iv. Guarantee non-repetition of questions between the regular and backlog papers "
    "of the same examination cycle at the database level.",
    "v. Validate sufficiency of the question bank before generation and abort the "
    "entire operation with a precise diagnostic message when any requirement cannot be "
    "met.",
    "vi. Export the generated paper in Word, PDF and image formats from a single "
    "source representation, without ever rendering the questions on the visible screen.",
    "vii. Provide an administrative module for managing subjects and teacher "
    "allotments, viewing every generated paper, and reviewing a timestamped, "
    "append-only audit log of all significant actions.",
]:
    para(t)

# ======================================================= LITERATURE REVIEW ==
page_break()
heading("5. Literature Review")
sub("5.1 Introduction to Existing Research")
for t in [
    "Automation of examination paper preparation has been an active area of research "
    "in educational technology for more than a decade. Early work concentrated on "
    "replacing manual selection with simple randomization over a stored question bank, "
    "demonstrating substantial savings in preparation time. Subsequent research "
    "introduced academic quality constraints into the selection process, most "
    "prominently the mapping of questions to Bloom's Taxonomy levels and Course "
    "Outcomes, so that a generated paper satisfies outcome-based education "
    "requirements rather than merely filling the required number of questions.",

    "A parallel line of research treats paper generation as a constrained optimization "
    "problem and applies genetic algorithms, fuzzy logic, hybrid metaheuristics and, "
    "more recently, reinforcement learning and generative models to balance "
    "difficulty, discrimination, coverage and answering time simultaneously. These "
    "methods produce well-balanced papers but assume a large, richly annotated and "
    "statistically calibrated item bank, and are computationally heavy for a "
    "departmental deployment.",

    "However, the existing body of work remains fragmented with respect to the "
    "practical needs of an autonomous institute. Most studies optimize a single paper "
    "in isolation and do not model the examination cycle, in which a regular and a "
    "backlog paper must be produced from the same bank without overlapping. Similarly, "
    "the confidentiality of the question set during preparation, the enforcement of "
    "selection rules at the data layer rather than in application code, and the "
    "maintenance of an auditable record of who generated or deleted what are rarely "
    "addressed, although these are the concerns that actually govern adoption in an "
    "examination section.",
]:
    para(t)

sub("5.2 Comparative Analysis of Contemporary Methodologies and Frameworks")
table(
    ["Ref. No.", "Author(s) & Year", "Method / Technique", "Dataset / Application",
     "Key Findings", "Limitations", "Research Gap"],
    [
        ("[R1]", "Naik et al. (2014)",
         "Randomization algorithm over a stored question bank",
         "Departmental examination question paper generation",
         "Demonstrated that automated random selection removes paper-setter bias and "
         "reduces preparation time substantially compared with manual setting.",
         "Selection is stateless — no record of previously issued questions is "
         "maintained, so repetition across successive papers is possible; no outcome "
         "mapping.",
         "Absence of any cycle-level memory that would prevent a question from "
         "reappearing in the backlog paper of the same examination."),
        ("[R2]", "Bloom's Taxonomy-based AQPGS (2019)",
         "Keyword matching of question verbs to Bloom's Taxonomy levels, with random "
         "selection within each level",
         "Institutional examination papers aligned to learning outcomes",
         "Successfully produced papers with a controlled cognitive-level distribution, "
         "aligning generated papers with outcome-based education requirements.",
         "Classification depends on verb keyword matching and is error-prone; no "
         "unit-wise or mark-wise blueprint abstraction; selection executed in "
         "application code.",
         "Need for a declarative, reusable blueprint that fixes unit-wise and mark-wise "
         "distribution and is enforced independently of client logic."),
        ("[R3]", "Han (2023)",
         "Sparrow Search Algorithm combined with Genetic Algorithm (SSA-GA)",
         "Test for English Majors Band 8 examination paper generation",
         "Jointly optimized quantity, type, difficulty, discrimination, score, "
         "exposure and answering time, producing well-balanced papers.",
         "Requires a large, statistically calibrated item bank and significant "
         "computation; impractical for a departmental bank of a few hundred questions.",
         "Requirement of a lightweight, deterministic selection method that is "
         "dependable on small institutional banks without calibration data."),
        ("[R4]", "Multi-objective RL-guided generation (2023)",
         "Reinforcement learning guided multi-objective exam paper generation",
         "Large-scale online examination item banks",
         "Treated paper generation as a multi-objective optimization task and improved "
         "balance across difficulty and discrimination objectives simultaneously.",
         "Optimizes a single paper in isolation; provides no notion of examination "
         "cycles, confidentiality of the generated set, or auditability of the "
         "generation event.",
         "Lack of an end-to-end system that couples constrained selection with "
         "non-repetition, access control and an auditable record of every generated "
         "paper."),
    ],
    size=8, widths=[1.2, 2.0, 2.4, 2.2, 2.8, 2.6, 2.6])

sub("5.3 Summary of Literature Review")
for t in [
    "[1] Randomization-based generators successfully eliminate paper-setter bias and "
    "reduce preparation effort, but they are stateless and therefore cannot prevent a "
    "question from reappearing in a later paper of the same examination.",
    "[2] Bloom's Taxonomy and Course Outcome mapping improves the academic quality of "
    "generated papers, but the mapping is usually derived by keyword matching and the "
    "distribution rules remain embedded in application code rather than expressed as "
    "reusable data.",
    "[3] Genetic, fuzzy and hybrid metaheuristic approaches produce well-balanced "
    "papers across several competing objectives, but they presuppose a large, "
    "calibrated item bank and computational resources that a department does not "
    "typically possess.",
    "[4] Recent reinforcement-learning and generative approaches advance "
    "multi-objective balance further, yet they treat paper generation as an isolated "
    "optimization problem and address neither the confidentiality of the generated set "
    "nor the accountability of the person who generated it.",
]:
    para(t)

sub("5.4 Research Gap Identification")
para("Existing systems fail to provide a single platform that combines "
     "blueprint-driven selection, guaranteed non-repetition within an examination "
     "cycle, database-level enforcement of academic rules, confidentiality of the "
     "generated question set, and a tamper-evident audit trail. Most solutions address "
     "the selection problem alone and leave the surrounding institutional requirements "
     "— regular and backlog pairing, role-based access, administrative oversight and "
     "accountability — entirely unaddressed.")

sub("5.5 Need for Proposed Work")
para("There is a need for a question paper generation system that is dependable on "
     "the modest question banks actually maintained by departments, that treats the "
     "examination cycle rather than the individual paper as the unit of correctness, "
     "and that enforces its rules where they cannot be circumvented. The proposed "
     "system addresses this need by expressing the paper pattern as reusable data, "
     "executing selection and non-repetition inside the database within a single "
     "transaction, restricting visibility of the generated questions to the exported "
     "file alone, and recording every significant action in an append-only audit log.")

# ==================================================== PROPOSED METHODOLOGY ==
page_break()
heading("6. Proposed Methodology")
para("The system is built as a role-based web application in which all academic rules "
     "are enforced at the data layer. The frontend is developed using React and "
     "communicates with a Supabase-hosted PostgreSQL database over an auto-generated "
     "REST interface secured by JSON Web Tokens. Authentication, role resolution and "
     "Row Level Security policies govern every request, so a teacher can operate only "
     "on the subjects alloted to that teacher while an administrator retains "
     "institute-wide visibility.")
para("The core generation logic is implemented as a PostgreSQL routine, "
     "generate_paper(), which receives the subject, the examination cycle, the variant "
     "(regular or backlog), the paper title and the blueprint. For each slot of the "
     "blueprint the routine filters the question bank by subject, unit number, mark "
     "value and active status, then excludes every question already issued in the same "
     "examination cycle. If the surviving candidate set is smaller than the number "
     "required, the routine raises a diagnostic exception identifying the deficient "
     "unit and mark value, and the enclosing transaction is rolled back so that no "
     "partially formed paper is ever stored. Otherwise the candidates are randomized "
     "and the required number is selected and recorded against the paper. Because the "
     "selection executes inside the database, the browser receives only the identifier "
     "of the generated paper and never the candidate pool.")

sub("6.1 System Modules")
bullets([
    ("Question Bank Module:", "Provides unit-wise creation, listing, activation and "
     "removal of questions. Each question carries its unit number, mark value, "
     "difficulty, Bloom's Taxonomy level and Course Outcome number. Deactivation is "
     "preferred over deletion so that a question can be withdrawn from circulation "
     "without losing its history."),
    ("Paper Format and Blueprint Module:", "Stores reusable paper patterns as JSON "
     "blueprints specifying, for each question number and part, the source unit, the "
     "mark value and the required count. A blueprint may be attached to a specific "
     "subject or defined globally for use across the department."),
    ("Generation Module:", "Implements blueprint-driven selection, cycle-aware "
     "exclusion of previously issued questions, sufficiency validation and "
     "transactional recording of the generated paper, entirely within the database."),
    ("Export Module:", "Assembles the institute header, instruction block and the "
     "question table with Marks, BTL and CO columns into a single HTML representation, "
     "from which Word, PDF and image files are produced so that all three exports are "
     "identical. The representation is rendered in an off-screen region so that the "
     "questions are never visible on the user's screen."),
    ("Administration Module:", "Supports creation of subjects, allotment of subjects "
     "to teachers, confirmed deletion of a subject together with its dependent "
     "records, and institute-wide listing of every generated paper."),
    ("Audit Module:", "Records subject creation and deletion, paper generation, "
     "question deletion and allotment changes with a timestamp, the identity and role "
     "of the actor, a human-readable summary and a JSON snapshot. Entries are written "
     "exclusively by database triggers and privileged routines and can be neither "
     "modified nor deleted through the application."),
], numbered=True)

sub("6.2 System Architecture")
para("The system follows a four-layer architecture. The presentation layer is a "
     "React single page application providing the administration, question bank, "
     "generation and download modules. The security layer resolves the user's "
     "identity through Supabase Auth, attaches the role claim to every request and "
     "applies Row Level Security policies at the database boundary. The application "
     "logic layer holds the SECURITY DEFINER routines and audit triggers in which all "
     "academic rules are implemented. The data layer stores the subjects, questions, "
     "blueprints, examination cycles, generated papers and the append-only audit log. "
     "Requests descend through the layers as REST or remote procedure calls, while the "
     "response returned to the browser carries only the identifier of the generated "
     "paper and the stored rows required to render it, never the candidate pool.")
figure("fig1_architecture.png",
       "Fig. 1  Layered system architecture of the proposed system")

sub("6.3 System Workflow")
para("The generation workflow begins when an authenticated teacher selects a paper "
     "format, an examination cycle and the variant. The routine then iterates over "
     "the slots of the blueprint. For each slot the candidate pool is filtered by "
     "subject, unit number, mark value and active status, and every question already "
     "issued in the same examination cycle is removed from consideration. If the "
     "remaining candidates are fewer than the slot requires, an exception naming the "
     "deficient unit and mark value is raised and the transaction is rolled back "
     "without storing any part of the paper. Otherwise the surviving candidates are "
     "randomized, the required number is selected and recorded, and the loop proceeds "
     "to the next slot. On commit an audit trigger records the generation event, and "
     "the download page assembles the stored rows into the exported document.")
figure("fig2_workflow.png",
       "Fig. 2  Workflow of blueprint-driven paper generation with cycle-aware "
       "non-repetition", width_cm=13.5)

sub("6.4 Tools, Software, and Technologies to Be Used")
para("The proposed system uses a modern and maintainable technology stack chosen for "
     "reliability and low operational overhead.")
bullets([
    ("Frontend:", "React (Create React App) with React Router for building a "
     "multi-page role-based web application. The interface includes modules such as "
     "Home Page, Login/Signup Page, User Dashboard, Question Bank Management, Question "
     "Paper Generation, Audit Log Viewer, User Profile Management, Settings Page, and "
     "an Administrator Control Panel with complete system access and monitoring "
     "capabilities."),
    ("Backend / Database:", "Supabase (PostgreSQL) providing an auto-generated REST "
     "API, managed authentication and Row Level Security."),
    ("Business Logic:", "PostgreSQL PL/pgSQL routines and triggers, executed as "
     "SECURITY DEFINER functions inside transactions."),
    ("Authentication:", "Supabase Auth with JSON Web Tokens and role resolution "
     "through a profiles table."),
    ("Access Control:", "Row Level Security policies for teacher-scoped and "
     "administrator-scoped visibility."),
    ("Blueprint Representation:", "JSONB columns for storing reusable paper patterns."),
    ("Document Export:", "html2canvas for rasterization, jsPDF for PDF assembly and "
     "FileSaver.js for delivering Word, PDF and image files."),
    ("Version Control:", "Git and GitHub for source management and collaborative "
     "development."),
])

sub("6.5 Experimental Setup")
para("The experimental environment is designed to evaluate the correctness, "
     "reliability and usability of the system under realistic departmental conditions. "
     "The frontend is developed in React and the database is hosted on Supabase "
     "(PostgreSQL). The system is exercised in two environments:")
bullets([
    ("Local Development Environment:", "The React development server operates against "
     "a Supabase project with a seeded question bank, used to verify application "
     "logic, access control and export correctness."),
    ("Hosted Environment:", "The production build is deployed and operated against the "
     "hosted Supabase project to evaluate real-world responsiveness and multi-user "
     "behaviour."),
])
para("The generation logic is validated against a seeded question bank for Applied "
     "Mathematics-II (CS/AI/ML201BSC03) containing twenty questions per unit across "
     "six units, comprising ten one-mark and ten four-mark questions in each unit. "
     "Regular and backlog papers are generated repeatedly under the same and under "
     "different examination cycles to verify the non-repetition guarantee, and the "
     "bank is deliberately reduced below the blueprint requirement to confirm that "
     "generation fails safely with a precise diagnostic message.")

sub("6.6 Performance Evaluation Metrics")
para("The performance of the proposed system is evaluated using the following metrics:")
bullets([
    ("Paper Generation Time:", "Measures the time from the generation request to the "
     "availability of the paper, targeting completion within one second for a standard "
     "blueprint."),
    ("Repetition Rate Within a Cycle:", "Measures the number of questions common to "
     "the regular and backlog papers of the same cycle, with a target of exactly "
     "zero."),
    ("Blueprint Conformance:", "Verifies that the unit-wise and mark-wise distribution "
     "of every generated paper matches the blueprint exactly."),
    ("Selection Uniformity:", "Evaluates, over repeated generations, whether each "
     "eligible question is selected with approximately equal frequency, confirming "
     "absence of positional or insertion-order bias."),
    ("Bank Utilization and Exhaustion Point:", "Determines the number of successive "
     "papers that a given bank can support before a blueprint slot becomes deficient."),
    ("Export Fidelity:", "Confirms that the Word, PDF and image exports of the same "
     "paper are mutually consistent in content and layout."),
])

sub("6.7 Validation / Testing Approach")
para("The system follows a feature-level testing strategy in which complete workflows "
     "are validated end-to-end rather than validating individual components in "
     "isolation. The testing process includes:")
bullets([
    ("End-to-End Generation Testing:", "Validates the complete workflow from question "
     "entry through blueprint selection to the downloaded document."),
    ("Non-Repetition Testing:", "Generates a regular paper followed by a backlog paper "
     "in the same examination cycle and verifies that the intersection of their "
     "question sets is empty; the test is repeated across different cycles to confirm "
     "that the pool is correctly released."),
    ("Sufficiency and Failure Testing:", "Deliberately understocks a unit and confirms "
     "that generation aborts with the diagnostic message and that no partial paper is "
     "written to the database."),
    ("Access Control Testing:", "Verifies that a teacher cannot read or generate "
     "papers for unalloted subjects and that administrative routines reject "
     "non-administrative callers even when invoked directly through the REST "
     "interface."),
    ("Audit Integrity Testing:", "Confirms that every significant action produces "
     "exactly one audit entry with the correct timestamp and actor, and that audit "
     "entries survive deletion of the entity they describe and cannot be altered from "
     "the client."),
    ("Export Testing:", "Compares the Word, PDF and image outputs of the same paper "
     "for content and layout consistency, and confirms that question text is never "
     "rendered in the visible interface."),
])

# ================================== CHALLENGES / OUTCOMES / INNOVATION ======
page_break()
heading("7. Challenges / Limitations")
para("The development of the proposed system may encounter several technical and "
     "project-level challenges.")
para("Technical Challenges:", bold=True, space_after=4)
bullets([
    "Designing a blueprint representation that is expressive enough for varied paper "
    "patterns while remaining simple enough to be authored without programming.",
    "Implementing selection, exclusion and validation inside PL/pgSQL within a single "
    "transaction while keeping the diagnostic messages meaningful to a teacher.",
    "Formulating correct Row Level Security policies for teacher-scoped and "
    "administrator-scoped access without introducing recursive policy evaluation.",
    "Preserving audit entries for entities that are subsequently deleted, which "
    "prevents the use of foreign keys in the audit table.",
    "Producing Word, PDF and image exports that agree with one another while keeping "
    "the question text out of the visible interface.",
])
para("Project-Level Challenges:", bold=True, space_after=4)
bullets([
    "Limited development time on account of academic commitments.",
    "Coordination among team members working on separate modules.",
    "Dependence on a seeded question bank for a single subject rather than a fully "
    "populated departmental bank.",
    "Absence of bulk import facilities and of mathematical and diagrammatic content "
    "support in the current scope.",
])

heading("8. Expected Outcomes (Implications)")
para("The proposed system aims to digitize question paper preparation by replacing "
     "manual selection and formatting with a rule-driven and auditable process.")
para("Operational Outcomes", bold=True, space_after=4)
bullets([
    "Centralized, unit-wise question bank preserved as a departmental asset.",
    "Reusable paper blueprints applicable across subjects and semesters.",
    "Generation of a complete, correctly formatted paper within seconds of the request.",
    "Guaranteed absence of repeated questions between the regular and backlog papers "
    "of the same examination cycle.",
    "Enforced unit-wise and mark-wise syllabus coverage in every generated paper.",
    "Early and precise detection of an insufficient question bank before any paper is "
    "produced.",
    "Consistent institute-standard formatting, including the Marks, BTL and CO table, "
    "on every paper.",
    "Word, PDF and image exports generated from a single source representation.",
    "Reduced exposure of confidential content, as the questions are never displayed on "
    "screen.",
    "Institute-wide administrative visibility of every generated paper.",
    "Timestamped, append-only audit trail of paper generation, subject deletion, "
    "question deletion and allotment changes.",
], numbered=True)
para("Learning Outcomes", bold=True, space_after=4)
bullets([
    "Hands-on experience with React, Supabase, PostgreSQL and PL/pgSQL.",
    "Practical understanding of Row Level Security, JWT-based authentication, "
    "role-based access control and transactional integrity.",
    "Experience in designing systems in which correctness guarantees are enforced at "
    "the data layer, and a foundation extensible to bulk import, mathematical content "
    "and multi-department deployment.",
], numbered=True)

heading("9. Innovation / Social Relevance")
rich([("The proposed ", {}), (TITLE, {"italic": True}),
      (" introduces a unified platform that consolidates the question bank, the paper "
       "pattern, the generation process, the exported document and the accountability "
       "record into a single interface suited to a departmental examination section. "
       "Its novelty lies in treating the examination cycle, rather than the individual "
       "paper, as the unit of correctness, so that non-repetition between the regular "
       "and backlog papers becomes a structural guarantee rather than a matter of the "
       "paper setter's memory. By executing selection within the database and "
       "restricting visibility of the generated set to the exported file, the system "
       "strengthens the confidentiality of the examination process. By reducing the "
       "clerical effort of paper preparation, it returns teaching time to teachers, "
       "improves fairness for backlog students, and aligns with the Digital India "
       "initiative and Sustainable Development Goal 4 through improved quality and "
       "integrity in higher education assessment.", {})])

# =============================================================== REFERENCES =
page_break()
heading("References")
for i, ref in enumerate([
    "M. Naik, S. Sule, S. Jadhav, and S. Pandey, “Automatic Question Paper "
    "Generation System using Randomization Algorithm,” International Journal of "
    "Engineering and Technical Research (IJETR), vol. 2, no. 12, pp. 192–194, "
    "December 2014.",
    "N. A. Omar, S. Haris, R. Hassan, H. Arshad, M. Rahmat, N. F. A. Zainal, and R. "
    "Zulkifli, “Automated Analysis of Exam Questions According to Bloom's "
    "Taxonomy,” Procedia — Social and Behavioral Sciences, vol. 59, pp. 297–303, "
    "2012.",
    "Y. Han, “Modelling and Simulation of Intelligent English Paper Generating "
    "Based on SSA-GA,” Mathematical Problems in Engineering, vol. 2023, Article "
    "ID 2277185, 2023, doi: 10.1155/2023/2277185.",
    "Z. Liu, L. Zhang, and C. Yang, “Reinforcement Learning Guided "
    "Multi-Objective Exam Paper Generation,” in Proceedings of the SIAM "
    "International Conference on Data Mining (SDM), 2023, arXiv:2303.01042.",
    "Z. Zhang, C. Liu, and W. Zhang, “ExamGAN and Twin-ExamGAN for Exam Script "
    "Generation,” arXiv preprint arXiv:2108.09656, 2021.",
    "X. Li and Y. Chen, “A Test Paper Generation Algorithm Based on Diseased "
    "Enhanced Genetic Algorithm,” Heliyon, vol. 9, no. 6, 2023, doi: "
    "10.1016/j.heliyon.2023.e17285.",
    "R. Kumar and S. Sharma, “Fuzzy Logic Based Intelligent Question Paper "
    "Generator,” in Proceedings of the IEEE International Advance Computing "
    "Conference (IACC), pp. 1179–1183, 2014.",
    "S. Patil, A. Deshmukh, and P. Kale, “AI-Based Question Paper Analysis and "
    "Generator with Authentication,” in Lecture Notes in Networks and Systems, "
    "Springer, 2024, doi: 10.1007/978-981-97-5231-7_22.",
    "A. Sharma, N. Verma, and R. Joshi, “Automated Question Paper Generator "
    "System,” in Lecture Notes in Networks and Systems, Springer, 2025, doi: "
    "10.1007/978-981-96-7253-0_2.",
], 1):
    para(f"[{i}] {ref}")

# =========================================================== GUIDE'S REMARKS
page_break()
heading("Guide's Remarks")
L = "_" * 58
for t in [f"–  Comments on problem statement :  {'_' * 34}",
          f"–  {L}",
          f"–  Suggestions for methodology improvement :  {'_' * 22}",
          f"–  {L}",
          "–  Approval status : ____________________  (Approved / Not Approved)",
          "–  Guide's signature : __________________",
          "–  Date : __________"]:
    para(t, align="left", space_after=14, line=1.5)

para(space_after=10)
rich([("Group Name: GC", {"bold": True, "size": 13}),
      ("______", {"bold": True, "size": 13, "grey": True})], align="left")

table(["Sr. No.", "Name of group member", "Role in Project", "Email id",
       "Contact No.", "Sign"],
      [("1", "Pradyumna G. Kulkarni", "Leader", "", "", ""),
       ("2", "", "", "", "", ""), ("3", "", "", "", "", ""),
       ("4", "", "", "", "", ""), ("5", "", "", "", "", ""),
       ("6", "", "", "", "", "")],
      size=10.5, widths=[1.4, 4.0, 2.6, 4.6, 2.6, 2.4], tall=True)

try:
    doc.save(OUT)
    print(f"wrote {OUT}")
except PermissionError:
    # Word holds a lock on the open file — write beside it instead of failing.
    alt = OUT.replace(".docx", "_new.docx")
    doc.save(alt)
    print(f"{OUT} is open in Word — wrote {alt} instead. "
          f"Close Word and rename it over the original.")
