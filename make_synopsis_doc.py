"""Build SYNOPSIS_TeacherEase.doc — an HTML file that Word opens natively.

Same trick the app itself uses for paper export: wrap styled HTML in the
Microsoft Office namespaces and save with a .doc extension. Word applies the
inline styles, the @page rules give it the running header/footer with live
page-number fields, and the whole document stays fully editable.

Run:  python make_synopsis_doc.py
"""

OUT = "SYNOPSIS_TeacherEase.doc"

TITLE = ("TeacherEase: Automated Question Paper Generation System "
         "with Cycle-Aware Non-Repetition")

# ---------------------------------------------------------------- styles ----
CSS = """
@page {
  size: 21cm 29.7cm;
  margin: 2.5cm 2.2cm 2.2cm 2.8cm;
  mso-header-margin: 1.2cm;
  mso-footer-margin: 1.2cm;
  mso-header: h1;
  mso-footer: f1;
}
div.Section1 { page: Section1; }
body   { font-family: 'Times New Roman', serif; font-size: 12.0pt; }
p      { text-align: justify; margin: 0 0 8pt 0; line-height: 1.4; }
h1     { font-size: 14.0pt; margin: 14pt 0 8pt 0; }
h2     { font-size: 12.5pt; margin: 12pt 0 6pt 0; }
li     { text-align: justify; margin-bottom: 4pt; line-height: 1.35; }
table.lit { border-collapse: collapse; width: 100%; font-size: 9.0pt; }
table.lit th, table.lit td {
  border: 1px solid #000; padding: 3pt 4pt; vertical-align: top; text-align: left;
}
table.toc { border-collapse: collapse; width: 100%; font-size: 12pt; }
table.toc td { padding: 3pt 4pt; }
table.grp { border-collapse: collapse; width: 100%; font-size: 10.5pt; }
table.grp th, table.grp td { border: 1px solid #000; padding: 4pt 5pt; }
/* Blank drop-zones. Delete the box, paste the logo in its place. */
.logobox {
  border: 1pt dashed #9ca3af; height: 3.6cm; width: 3.6cm;
  margin: 10pt auto; text-align: center; color: #9ca3af; font-size: 9pt;
}
.fill { color: #9ca3af; }          /* grey guide text — overwrite it */
tr.tall td { height: 30pt; }        /* room to sign by hand */
.brk   { page-break-before: always; }
.ctr   { text-align: center; }
.rule  { border-top: 1.5pt solid #7f1d1d; margin: 4pt 0 10pt 0; }
"""

HEADER_FOOTER = """
<div style='mso-element:header' id=h1>
  <p class=MsoHeader style='text-align:right;font-weight:bold;font-size:10pt;'>
    TeacherEase</p>
</div>
<div style='mso-element:footer' id=f1>
  <p class=MsoFooter style='font-size:9pt;'>PRPCEM, CSE 2026-27
    <span style='mso-tab-count:1 dotted'></span>
    <span style='float:right;'>Page |
      <span style='mso-field-code:PAGE'></span>
    </span>
  </p>
</div>
"""


def p(text):
    return f"<p>{text}</p>"


def ul(items):
    return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def ol(items):
    return "<ol>" + "".join(f"<li>{i}</li>" for i in items) + "</ol>"


# ------------------------------------------------------------- content ------
COVER = f"""
<div class=ctr>
  <p style='font-size:26pt;font-weight:bold;color:#c00000;margin-bottom:6pt;'>
     Project Synopsis</p>
  <p style='font-size:11pt;margin:0;'>on</p>
  <p style='font-size:13pt;font-weight:bold;text-align:center;'>{TITLE}</p>
  <div class=logobox><p style='margin-top:1.5cm;'>college logo</p></div>
</div>
<div style='font-size:14pt;line-height:2.0;margin-left:36pt;'>
  <p style='color:#c00000;font-weight:bold;text-align:left;'>Session:
     <span style='color:#000;'>2026-27</span></p>
  <p style='color:#c00000;font-weight:bold;text-align:left;'>Year/Semester:
     <span style='color:#000;'>III<sup>rd</sup></span></p>
  <p style='color:#c00000;font-weight:bold;text-align:left;'>Project Group No.:
     <span style='color:#000;'>GC</span><span class=fill>________</span></p>
  <p style='color:#c00000;font-weight:bold;text-align:left;'>Project Guide Name:
     <span style='color:#000;'>Prof. Mayur. S. Burange</span></p>
  <p style='color:#c00000;font-weight:bold;text-align:left;'>Project Leader Name:
     <span style='color:#000;'>Mr. Pradyumna. G. Kulkarni</span></p>
</div>
<div class=ctr style='margin-top:30pt;font-weight:bold;color:#c00000;'>
  <p class=ctr>Department of Computer Science &amp; Engineering</p>
  <p class=ctr>P. R. Pote Patil College of Engineering &amp; Management,</p>
  <p class=ctr>Amravati-444602 (M.S.)</p>
</div>
"""

TITLEPAGE = f"""
<div class='brk ctr'>
  <p style='font-size:20pt;font-weight:bold;'>Project</p>
  <p style='font-size:13pt;'>Synopsis</p>
  <p style='font-size:11pt;'>on</p>
  <p style='font-size:13pt;font-weight:bold;text-align:center;'>{TITLE}</p>
</div>
<table style='width:100%;margin-top:18pt;font-size:12pt;line-height:2.2;'>
  <tr><td>1. Pradyumna G. Kulkarni</td>
      <td>2. <span class=fill>____________________</span></td></tr>
  <tr><td>3. <span class=fill>____________________</span></td>
      <td>4. <span class=fill>____________________</span></td></tr>
  <tr><td>5. <span class=fill>____________________</span></td>
      <td>6. <span class=fill>____________________</span></td></tr>
</table>
<table style='width:100%;margin-top:18pt;font-size:12pt;'>
  <tr><td><b>Guide</b></td><td class=ctr><b>HOD, CSE</b></td></tr>
  <tr><td>Prof. Mayur. S. Burange</td><td class=ctr>Dr. V. B. Gadicha</td></tr>
</table>
<div class=ctr style='margin-top:24pt;'>
  <div class=logobox><p style='margin-top:1.5cm;'>college logo</p></div>
  <p class=ctr style='font-weight:bold;'>Department of Computer Science &amp; Engineering</p>
  <p class=ctr style='font-weight:bold;'>P. R. Pote Patil College of Engineering &amp; Management,</p>
  <p class=ctr style='font-weight:bold;'>Amravati-444602 (M.S.)</p>
  <p class=ctr style='font-size:10pt;'>(An Autonomous Institute)</p>
  <p class=ctr style='font-weight:bold;'>2026-2027</p>
</div>
"""

# Page numbers deliberately blank — fill them in after Word repaginates the
# finished document (logo and member names change the layout).
_PG = "<span class=fill>____</span>"
TOC_ROWS = [
    ("", "Abstract", _PG), ("1", "Introduction", _PG), ("2", "Motivation", _PG),
    ("3", "Problem Statement", _PG), ("4", "Objectives", _PG),
    ("5", "Literature Review", _PG), ("6", "Proposed Methodology", _PG),
    ("7", "Challenges / Limitations", _PG),
    ("8", "Expected Outcomes (Implications)", _PG),
    ("9", "Innovation / Social Relevance", _PG),
    ("", "References", _PG), ("", "Guide's Remarks", _PG),
]

TOC = ("<div class=brk><p class=ctr style='font-size:14pt;font-weight:bold;"
       "text-decoration:underline;'>Table of content</p>"
       "<table class=toc><tr><td style='width:12%;'><b>Sr. No.</b></td>"
       "<td><b>Contents</b></td><td style='width:18%;text-align:right;'>"
       "<b>Page No.</b></td></tr>"
       + "".join(f"<tr><td>{a}</td><td>{b}</td>"
                 f"<td style='text-align:right;'>{c}</td></tr>"
                 for a, b, c in TOC_ROWS)
       + "</table></div>")

ABSTRACT = "<div class=brk><h1>Abstract</h1>" + "".join(p(t) for t in [
    f"<b>{TITLE}</b> is a web-based academic solution designed to automate the "
    "preparation of examination question papers in autonomous engineering "
    "institutes. Question paper setting is presently a manual, repetitive and "
    "confidentiality-sensitive activity in which a teacher selects questions from "
    "personal records, arranges them according to a prescribed pattern, and formats "
    "the document by hand. This practice results in unbalanced syllabus coverage, "
    "accidental repetition of questions between the regular and backlog papers of the "
    "same examination, avoidable clerical effort, and multiple points of exposure for "
    "confidential content.",

    "The proposed system separates the question pool from the paper recipe. A "
    "unit-wise question bank stores each question with its unit number, mark value, "
    "difficulty, Bloom's Taxonomy level and Course Outcome mapping, while a reusable "
    "JSON blueprint defines how many questions must be drawn from each unit at each "
    "mark value. A server-side PostgreSQL routine combines the two, selects the "
    "questions, and records the outcome &mdash; the client application never performs "
    "the selection.",

    "The system is developed using React for the frontend and Supabase (PostgreSQL) "
    "for the database, authentication and Row Level Security. Selection logic, "
    "non-repetition enforcement, sufficiency validation and audit logging are "
    "implemented as SECURITY DEFINER database functions and triggers executing inside "
    "a single transaction, so the guarantees cannot be bypassed by any client. Random "
    "selection is performed inside the database using an ORDER BY random() bounded "
    "top-N selection over the filtered candidate set, which ensures that only the "
    "questions actually printed are ever transmitted to the browser.",

    "The defining feature of the proposed system is cycle-aware non-repetition. Every "
    "question issued in a paper is recorded against its examination cycle; a "
    "subsequent paper generated in the same cycle &mdash; typically the backlog paper "
    "&mdash; excludes those questions at the query level, making overlap between the "
    "regular and backlog papers impossible rather than merely unlikely. The generated "
    "paper is exported in Word, PDF and image formats from a single HTML "
    "representation, ensuring that all three downloads are identical, and question "
    "text is never displayed on screen at any stage.",

    "<b>Keywords:</b> Question Paper Generation, Question Bank, Bloom's Taxonomy, "
    "Course Outcome, Non-Repetition, React, Supabase, PostgreSQL, Row Level Security, "
    "Audit Log.",
]) + "</div>"

INTRO = "<div class=brk><h1>1. Introduction</h1>" + "".join(p(t) for t in [
    f"<b>{TITLE}</b> is a complete software solution developed to digitize and "
    "standardize the preparation of examination question papers in an autonomous "
    "engineering institute. The system integrates the essential functions of the "
    "examination workflow &mdash; maintenance of a unit-wise question bank, definition "
    "of reusable paper formats, controlled generation of regular and backlog papers, "
    "export of the paper in printable formats, administrative supervision of subjects "
    "and teachers, and a tamper-evident audit trail &mdash; into a single centralized "
    "platform.",

    "At present most departments still prepare question papers using word processors, "
    "printed question lists and personal collections maintained by individual "
    "teachers. This leads to inconsistent formatting, unbalanced coverage of the "
    "syllabus, accidental repetition of questions between the regular and backlog "
    "papers of the same examination, loss of institutional knowledge when a teacher is "
    "transferred, and repeated exposure of confidential content across e-mail "
    "attachments and removable media. TeacherEase addresses these problems by "
    "providing a secure, role-based and rule-driven system in which the academic "
    "constraints of a question paper are enforced by the database itself rather than "
    "by the diligence of the person setting the paper.",
]) + "<h1>2. Motivation</h1>" + p(
    "Departments continue to depend on manual question selection, personal question "
    "collections and word-processor formatting, which results in repeated questions, "
    "uneven unit-wise weightage, considerable clerical effort before every "
    "examination, and weak confidentiality of the paper during preparation. The most "
    "serious of these is repetition between the regular and backlog papers of the same "
    "examination cycle, which directly affects the fairness of the examination. "
    "TeacherEase is motivated by the need for a centralized platform that automates "
    "question selection under a fixed blueprint, guarantees non-repetition within an "
    "examination cycle, preserves the departmental question bank as an institutional "
    "asset, and produces a print-ready paper without ever displaying its contents on "
    "screen.") + "</div>"

PROBLEM = "<div class=brk><h1>3. Problem Statement</h1>" + p(
    "The existing question paper preparation process faces several academic and "
    "operational challenges, including:") + ul([
        "Manual and disconnected maintenance of questions in personal files, printed "
        "lists and previous papers, with no searchable departmental repository.",
        "Accidental repetition of questions between the regular and backlog papers of "
        "the same examination cycle, since no mechanism records what has already been "
        "issued.",
        "Considerable clerical effort in reproducing the fixed institute header, "
        "instruction block and the Marks/BTL/CO table for every paper of every subject.",
        "Absence of enforcement of the prescribed unit-wise and mark-wise "
        "distribution, allowing a unit to be over-weighted or omitted without detection.",
        "Confidentiality risk arising from drafting papers on personal machines and "
        "circulating them through e-mail attachments and removable storage.",
        "Late discovery of an insufficient question bank, forcing the paper setter to "
        "compromise on the prescribed pattern.",
        "Loss of institutional knowledge when the questions prepared by an individual "
        "teacher leave with that teacher.",
    ]) + "<h1>4. Objectives</h1>" + "".join(p(t) for t in [
        "i. Develop a role-based web application for maintaining a unit-wise question "
        "bank tagged with marks, difficulty, Bloom's Taxonomy level and Course Outcome.",
        "ii. Implement reusable JSON paper blueprints so that a paper pattern is "
        "defined once and applied across subjects and semesters.",
        "iii. Design and implement a server-side generation routine that selects "
        "questions randomly from the eligible pool while strictly honouring the "
        "prescribed unit-wise and mark-wise distribution.",
        "iv. Guarantee non-repetition of questions between the regular and backlog "
        "papers of the same examination cycle at the database level.",
        "v. Validate sufficiency of the question bank before generation and abort the "
        "entire operation with a precise diagnostic message when any requirement "
        "cannot be met.",
        "vi. Export the generated paper in Word, PDF and image formats from a single "
        "source representation, without ever rendering the questions on the visible "
        "screen.",
        "vii. Provide an administrative module for managing subjects and teacher "
        "allotments, viewing every generated paper, and reviewing a timestamped, "
        "append-only audit log of all significant actions.",
    ]) + "</div>"

LIT_ROWS = [
    ("[R1]", "Naik et al. (2014)",
     "Randomization algorithm over a stored question bank",
     "Departmental examination question paper generation",
     "Demonstrated that automated random selection removes paper-setter bias and "
     "reduces preparation time substantially compared with manual setting.",
     "Selection is stateless &mdash; no record of previously issued questions is "
     "maintained, so repetition across successive papers is possible; no outcome "
     "mapping.",
     "Absence of any cycle-level memory that would prevent a question from reappearing "
     "in the backlog paper of the same examination."),
    ("[R2]", "Bloom's Taxonomy-based AQPGS (2019)",
     "Keyword matching of question verbs to Bloom's Taxonomy levels, with random "
     "selection within each level",
     "Institutional examination papers aligned to learning outcomes",
     "Successfully produced papers with a controlled cognitive-level distribution, "
     "aligning generated papers with outcome-based education requirements.",
     "Classification depends on verb keyword matching and is error-prone; no unit-wise "
     "or mark-wise blueprint abstraction; selection executed in application code.",
     "Need for a declarative, reusable blueprint that fixes unit-wise and mark-wise "
     "distribution and is enforced independently of client logic."),
    ("[R3]", "Han (2023)",
     "Sparrow Search Algorithm combined with Genetic Algorithm (SSA-GA)",
     "Test for English Majors Band 8 examination paper generation",
     "Jointly optimized quantity, type, difficulty, discrimination, score, exposure "
     "and answering time, producing well-balanced papers.",
     "Requires a large, statistically calibrated item bank and significant "
     "computation; impractical for a departmental bank of a few hundred questions.",
     "Requirement of a lightweight, deterministic selection method that is dependable "
     "on small institutional banks without calibration data."),
    ("[R4]", "Multi-objective RL-guided generation (2023)",
     "Reinforcement learning guided multi-objective exam paper generation",
     "Large-scale online examination item banks",
     "Treated paper generation as a multi-objective optimization task and improved "
     "balance across difficulty and discrimination objectives simultaneously.",
     "Optimizes a single paper in isolation; provides no notion of examination cycles, "
     "confidentiality of the generated set, or auditability of the generation event.",
     "Lack of an end-to-end system that couples constrained selection with "
     "non-repetition, access control and an auditable record of every generated paper."),
]

LIT_TABLE = (
    "<table class=lit><tr>"
    "<th>Ref. No.</th><th>Author(s) &amp; Year</th><th>Method / Technique</th>"
    "<th>Dataset / Application</th><th>Key Findings</th><th>Limitations</th>"
    "<th>Research Gap</th></tr>"
    + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>"
              for row in LIT_ROWS)
    + "</table>")

LIT = ("<div class=brk><h1>5. Literature Review</h1>"
       "<h2>5.1 Introduction to Existing Research</h2>"
       + "".join(p(t) for t in [
           "Automation of examination paper preparation has been an active area of "
           "research in educational technology for more than a decade. Early work "
           "concentrated on replacing manual selection with simple randomization over "
           "a stored question bank, demonstrating substantial savings in preparation "
           "time. Subsequent research introduced academic quality constraints into the "
           "selection process, most prominently the mapping of questions to Bloom's "
           "Taxonomy levels and Course Outcomes, so that a generated paper satisfies "
           "outcome-based education requirements rather than merely filling the "
           "required number of questions.",

           "A parallel line of research treats paper generation as a constrained "
           "optimization problem and applies genetic algorithms, fuzzy logic, hybrid "
           "metaheuristics and, more recently, reinforcement learning and generative "
           "models to balance difficulty, discrimination, coverage and answering time "
           "simultaneously. These methods produce well-balanced papers but assume a "
           "large, richly annotated and statistically calibrated item bank, and are "
           "computationally heavy for a departmental deployment.",

           "However, the existing body of work remains fragmented with respect to the "
           "practical needs of an autonomous institute. Most studies optimize a single "
           "paper in isolation and do not model the examination cycle, in which a "
           "regular and a backlog paper must be produced from the same bank without "
           "overlapping. Similarly, the confidentiality of the question set during "
           "preparation, the enforcement of selection rules at the data layer rather "
           "than in application code, and the maintenance of an auditable record of "
           "who generated or deleted what are rarely addressed, although these are the "
           "concerns that actually govern adoption in an examination section.",
       ])
       + "<h2>5.2 Comparative Analysis of Contemporary Methodologies and Frameworks</h2>"
       + LIT_TABLE
       + "<h2>5.3 Summary of Literature Review</h2>"
       + "".join(p(t) for t in [
           "[1] Randomization-based generators successfully eliminate paper-setter "
           "bias and reduce preparation effort, but they are stateless and therefore "
           "cannot prevent a question from reappearing in a later paper of the same "
           "examination.",
           "[2] Bloom's Taxonomy and Course Outcome mapping improves the academic "
           "quality of generated papers, but the mapping is usually derived by keyword "
           "matching and the distribution rules remain embedded in application code "
           "rather than expressed as reusable data.",
           "[3] Genetic, fuzzy and hybrid metaheuristic approaches produce "
           "well-balanced papers across several competing objectives, but they "
           "presuppose a large, calibrated item bank and computational resources that "
           "a department does not typically possess.",
           "[4] Recent reinforcement-learning and generative approaches advance "
           "multi-objective balance further, yet they treat paper generation as an "
           "isolated optimization problem and address neither the confidentiality of "
           "the generated set nor the accountability of the person who generated it.",
       ])
       + "<h2>5.4 Research Gap Identification</h2>"
       + p("Existing systems fail to provide a single platform that combines "
           "blueprint-driven selection, guaranteed non-repetition within an "
           "examination cycle, database-level enforcement of academic rules, "
           "confidentiality of the generated question set, and a tamper-evident audit "
           "trail. Most solutions address the selection problem alone and leave the "
           "surrounding institutional requirements &mdash; regular and backlog "
           "pairing, role-based access, administrative oversight and accountability "
           "&mdash; entirely unaddressed.")
       + "<h2>5.5 Need for Proposed Work</h2>"
       + p("There is a need for a question paper generation system that is dependable "
           "on the modest question banks actually maintained by departments, that "
           "treats the examination cycle rather than the individual paper as the unit "
           "of correctness, and that enforces its rules where they cannot be "
           "circumvented. The proposed system addresses this need by expressing the "
           "paper pattern as reusable data, executing selection and non-repetition "
           "inside the database within a single transaction, restricting visibility of "
           "the generated questions to the exported file alone, and recording every "
           "significant action in an append-only audit log.")
       + "</div>")

METHOD = ("<div class=brk><h1>6. Proposed Methodology</h1>"
    + "".join(p(t) for t in [
        "The system is built as a role-based web application in which all academic "
        "rules are enforced at the data layer. The frontend is developed using React "
        "and communicates with a Supabase-hosted PostgreSQL database over an "
        "auto-generated REST interface secured by JSON Web Tokens. Authentication, "
        "role resolution and Row Level Security policies govern every request, so a "
        "teacher can operate only on the subjects alloted to that teacher while an "
        "administrator retains institute-wide visibility.",

        "The core generation logic is implemented as a PostgreSQL routine, "
        "<i>generate_paper()</i>, which receives the subject, the examination cycle, "
        "the variant (regular or backlog), the paper title and the blueprint. For each "
        "slot of the blueprint the routine filters the question bank by subject, unit "
        "number, mark value and active status, then excludes every question already "
        "issued in the same examination cycle. If the surviving candidate set is "
        "smaller than the number required, the routine raises a diagnostic exception "
        "identifying the deficient unit and mark value, and the enclosing transaction "
        "is rolled back so that no partially formed paper is ever stored. Otherwise "
        "the candidates are randomized and the required number is selected and "
        "recorded against the paper. Because the selection executes inside the "
        "database, the browser receives only the identifier of the generated paper and "
        "never the candidate pool.",
    ])
    + "<h2>6.1 System Modules</h2>" + ol([
        "<b>Question Bank Module:</b> Provides unit-wise creation, listing, activation "
        "and removal of questions. Each question carries its unit number, mark value, "
        "difficulty, Bloom's Taxonomy level and Course Outcome number. Deactivation is "
        "preferred over deletion so that a question can be withdrawn from circulation "
        "without losing its history.",
        "<b>Paper Format and Blueprint Module:</b> Stores reusable paper patterns as "
        "JSON blueprints specifying, for each question number and part, the source "
        "unit, the mark value and the required count. A blueprint may be attached to a "
        "specific subject or defined globally for use across the department.",
        "<b>Generation Module:</b> Implements blueprint-driven selection, cycle-aware "
        "exclusion of previously issued questions, sufficiency validation and "
        "transactional recording of the generated paper, entirely within the database.",
        "<b>Export Module:</b> Assembles the institute header, instruction block and "
        "the question table with Marks, BTL and CO columns into a single HTML "
        "representation, from which Word, PDF and image files are produced so that all "
        "three exports are identical. The representation is rendered in an off-screen "
        "region so that the questions are never visible on the user's screen.",
        "<b>Administration Module:</b> Supports creation of subjects, allotment of "
        "subjects to teachers, confirmed deletion of a subject together with its "
        "dependent records, and institute-wide listing of every generated paper.",
        "<b>Audit Module:</b> Records subject creation and deletion, paper generation, "
        "question deletion and allotment changes with a timestamp, the identity and "
        "role of the actor, a human-readable summary and a JSON snapshot. Entries are "
        "written exclusively by database triggers and privileged routines and can be "
        "neither modified nor deleted through the application.",
    ])
    + "<h2>6.2 Tools, Software, and Technologies to Be Used</h2>"
    + p("The proposed system uses a modern and maintainable technology stack chosen "
        "for reliability and low operational overhead.")
    + ul([
        "<b>Frontend:</b> React (Create React App) with React Router for a "
        "single-page role-based interface.",
        "<b>Backend / Database:</b> Supabase (PostgreSQL) providing an auto-generated "
        "REST API, managed authentication and Row Level Security.",
        "<b>Business Logic:</b> PostgreSQL PL/pgSQL routines and triggers, executed as "
        "SECURITY DEFINER functions inside transactions.",
        "<b>Authentication:</b> Supabase Auth with JSON Web Tokens and role resolution "
        "through a profiles table.",
        "<b>Access Control:</b> Row Level Security policies for teacher-scoped and "
        "administrator-scoped visibility.",
        "<b>Blueprint Representation:</b> JSONB columns for storing reusable paper "
        "patterns.",
        "<b>Document Export:</b> html2canvas for rasterization, jsPDF for PDF assembly "
        "and FileSaver.js for delivering Word, PDF and image files.",
        "<b>Version Control:</b> Git and GitHub for source management and "
        "collaborative development.",
    ])
    + "<h2>6.3 Experimental Setup</h2>"
    + p("The experimental environment is designed to evaluate the correctness, "
        "reliability and usability of the system under realistic departmental "
        "conditions. The frontend is developed in React and the database is hosted on "
        "Supabase (PostgreSQL). The system is exercised in two environments:")
    + ul([
        "<b>Local Development Environment:</b> The React development server operates "
        "against a Supabase project with a seeded question bank, used to verify "
        "application logic, access control and export correctness.",
        "<b>Hosted Environment:</b> The production build is deployed and operated "
        "against the hosted Supabase project to evaluate real-world responsiveness and "
        "multi-user behaviour.",
    ])
    + p("The generation logic is validated against a seeded question bank for Applied "
        "Mathematics-II (CS/AI/ML201BSC03) containing twenty questions per unit across "
        "six units, comprising ten one-mark and ten four-mark questions in each unit. "
        "Regular and backlog papers are generated repeatedly under the same and under "
        "different examination cycles to verify the non-repetition guarantee, and the "
        "bank is deliberately reduced below the blueprint requirement to confirm that "
        "generation fails safely with a precise diagnostic message.")
    + "<h2>6.4 Performance Evaluation Metrics</h2>"
    + p("The performance of the proposed system is evaluated using the following "
        "metrics:")
    + ul([
        "<b>Paper Generation Time:</b> Measures the time from the generation request "
        "to the availability of the paper, targeting completion within one second for "
        "a standard blueprint.",
        "<b>Repetition Rate Within a Cycle:</b> Measures the number of questions "
        "common to the regular and backlog papers of the same cycle, with a target of "
        "exactly zero.",
        "<b>Blueprint Conformance:</b> Verifies that the unit-wise and mark-wise "
        "distribution of every generated paper matches the blueprint exactly.",
        "<b>Selection Uniformity:</b> Evaluates, over repeated generations, whether "
        "each eligible question is selected with approximately equal frequency, "
        "confirming absence of positional or insertion-order bias.",
        "<b>Bank Utilization and Exhaustion Point:</b> Determines the number of "
        "successive papers that a given bank can support before a blueprint slot "
        "becomes deficient.",
        "<b>Export Fidelity:</b> Confirms that the Word, PDF and image exports of the "
        "same paper are mutually consistent in content and layout.",
    ])
    + "<h2>6.5 Validation / Testing Approach</h2>"
    + p("The system follows a feature-level testing strategy in which complete "
        "workflows are validated end-to-end rather than validating individual "
        "components in isolation. The testing process includes:")
    + ul([
        "<b>End-to-End Generation Testing:</b> Validates the complete workflow from "
        "question entry through blueprint selection to the downloaded document.",
        "<b>Non-Repetition Testing:</b> Generates a regular paper followed by a "
        "backlog paper in the same examination cycle and verifies that the "
        "intersection of their question sets is empty; the test is repeated across "
        "different cycles to confirm that the pool is correctly released.",
        "<b>Sufficiency and Failure Testing:</b> Deliberately understocks a unit and "
        "confirms that generation aborts with the diagnostic message and that no "
        "partial paper is written to the database.",
        "<b>Access Control Testing:</b> Verifies that a teacher cannot read or "
        "generate papers for unalloted subjects and that administrative routines "
        "reject non-administrative callers even when invoked directly through the REST "
        "interface.",
        "<b>Audit Integrity Testing:</b> Confirms that every significant action "
        "produces exactly one audit entry with the correct timestamp and actor, and "
        "that audit entries survive deletion of the entity they describe and cannot be "
        "altered from the client.",
        "<b>Export Testing:</b> Compares the Word, PDF and image outputs of the same "
        "paper for content and layout consistency, and confirms that question text is "
        "never rendered in the visible interface.",
    ])
    + "</div>")

CHALLENGES = ("<div class=brk><h1>7. Challenges / Limitations</h1>"
    + p("The development of TeacherEase may encounter several technical and "
        "project-level challenges.")
    + "<p><b>Technical Challenges:</b></p>"
    + ul([
        "Designing a blueprint representation that is expressive enough for varied "
        "paper patterns while remaining simple enough to be authored without "
        "programming.",
        "Implementing selection, exclusion and validation inside PL/pgSQL within a "
        "single transaction while keeping the diagnostic messages meaningful to a "
        "teacher.",
        "Formulating correct Row Level Security policies for teacher-scoped and "
        "administrator-scoped access without introducing recursive policy evaluation.",
        "Preserving audit entries for entities that are subsequently deleted, which "
        "prevents the use of foreign keys in the audit table.",
        "Producing Word, PDF and image exports that agree with one another while "
        "keeping the question text out of the visible interface.",
    ])
    + "<p><b>Project-Level Challenges:</b></p>"
    + ul([
        "Limited development time on account of academic commitments.",
        "Coordination among team members working on separate modules.",
        "Dependence on a seeded question bank for a single subject rather than a fully "
        "populated departmental bank.",
        "Absence of bulk import facilities and of mathematical and diagrammatic "
        "content support in the current scope.",
    ])
    + "<h1>8. Expected Outcomes (Implications)</h1>"
    + p("The proposed system aims to digitize question paper preparation by replacing "
        "manual selection and formatting with a rule-driven and auditable process.")
    + "<p><b>Operational Outcomes</b></p>"
    + ol([
        "Centralized, unit-wise question bank preserved as a departmental asset.",
        "Reusable paper blueprints applicable across subjects and semesters.",
        "Generation of a complete, correctly formatted paper within seconds of the "
        "request.",
        "Guaranteed absence of repeated questions between the regular and backlog "
        "papers of the same examination cycle.",
        "Enforced unit-wise and mark-wise syllabus coverage in every generated paper.",
        "Early and precise detection of an insufficient question bank before any paper "
        "is produced.",
        "Consistent institute-standard formatting, including the Marks, BTL and CO "
        "table, on every paper.",
        "Word, PDF and image exports generated from a single source representation.",
        "Reduced exposure of confidential content, as the questions are never "
        "displayed on screen.",
        "Institute-wide administrative visibility of every generated paper.",
        "Timestamped, append-only audit trail of paper generation, subject deletion, "
        "question deletion and allotment changes.",
    ])
    + "<p><b>Learning Outcomes</b></p>"
    + ol([
        "Hands-on experience with React, Supabase, PostgreSQL and PL/pgSQL.",
        "Practical understanding of Row Level Security, JWT-based authentication, "
        "role-based access control and transactional integrity.",
        "Experience in designing systems in which correctness guarantees are enforced "
        "at the data layer, and a foundation extensible to bulk import, mathematical "
        "content and multi-department deployment.",
    ])
    + "<h1>9. Innovation / Social Relevance</h1>"
    + p(f"The proposed <i>{TITLE}</i> introduces a unified platform that consolidates "
        "the question bank, the paper pattern, the generation process, the exported "
        "document and the accountability record into a single interface suited to a "
        "departmental examination section. Its novelty lies in treating the "
        "examination cycle, rather than the individual paper, as the unit of "
        "correctness, so that non-repetition between the regular and backlog papers "
        "becomes a structural guarantee rather than a matter of the paper setter's "
        "memory. By executing selection within the database and restricting visibility "
        "of the generated set to the exported file, the system strengthens the "
        "confidentiality of the examination process. By reducing the clerical effort "
        "of paper preparation, it returns teaching time to teachers, improves fairness "
        "for backlog students, and aligns with the Digital India initiative and "
        "Sustainable Development Goal 4 through improved quality and integrity in "
        "higher education assessment.")
    + "</div>")

REFS = ["M. Naik, S. Sule, S. Jadhav, and S. Pandey, &quot;Automatic Question Paper "
        "Generation System using Randomization Algorithm,&quot; <i>International "
        "Journal of Engineering and Technical Research (IJETR)</i>, vol. 2, no. 12, "
        "pp. 192&ndash;194, December 2014.",

        "N. A. Omar, S. Haris, R. Hassan, H. Arshad, M. Rahmat, N. F. A. Zainal, and "
        "R. Zulkifli, &quot;Automated Analysis of Exam Questions According to Bloom's "
        "Taxonomy,&quot; <i>Procedia &mdash; Social and Behavioral Sciences</i>, vol. "
        "59, pp. 297&ndash;303, 2012.",

        "Y. Han, &quot;Modelling and Simulation of Intelligent English Paper "
        "Generating Based on SSA-GA,&quot; <i>Mathematical Problems in Engineering</i>, "
        "vol. 2023, Article ID 2277185, 2023, doi: 10.1155/2023/2277185.",

        "Z. Liu, L. Zhang, and C. Yang, &quot;Reinforcement Learning Guided "
        "Multi-Objective Exam Paper Generation,&quot; in <i>Proceedings of the SIAM "
        "International Conference on Data Mining (SDM)</i>, 2023, arXiv:2303.01042.",

        "Z. Zhang, C. Liu, and W. Zhang, &quot;ExamGAN and Twin-ExamGAN for Exam "
        "Script Generation,&quot; arXiv preprint arXiv:2108.09656, 2021.",

        "X. Li and Y. Chen, &quot;A Test Paper Generation Algorithm Based on Diseased "
        "Enhanced Genetic Algorithm,&quot; <i>Heliyon</i>, vol. 9, no. 6, 2023, doi: "
        "10.1016/j.heliyon.2023.e17285.",

        "R. Kumar and S. Sharma, &quot;Fuzzy Logic Based Intelligent Question Paper "
        "Generator,&quot; in <i>Proceedings of the IEEE International Advance Computing "
        "Conference (IACC)</i>, pp. 1179&ndash;1183, 2014.",

        "S. Patil, A. Deshmukh, and P. Kale, &quot;AI-Based Question Paper Analysis and "
        "Generator with Authentication,&quot; in <i>Lecture Notes in Networks and "
        "Systems</i>, Springer, 2024, doi: 10.1007/978-981-97-5231-7_22.",

        "A. Sharma, N. Verma, and R. Joshi, &quot;Automated Question Paper Generator "
        "System,&quot; in <i>Lecture Notes in Networks and Systems</i>, Springer, 2025, "
        "doi: 10.1007/978-981-96-7253-0_2."]

REFERENCES = ("<div class=brk><h1>References</h1>"
              + "".join(p(f"[{i}] {r}") for i, r in enumerate(REFS, 1))
              + "</div>")

LINE = "_" * 60

GUIDE = ("<div class=brk><h1>Guide's Remarks</h1>"
    + "".join(p(t) for t in [
        f"&ndash; Comments on problem statement : {LINE}",
        f"&ndash; {LINE}{LINE[:12]}",
        f"&ndash; Suggestions for methodology improvement : {LINE[:40]}",
        f"&ndash; {LINE}{LINE[:12]}",
        "&ndash; Approval status : ______________________ (Approved / Not Approved)",
        "&ndash; Guide's signature : __________________",
        "&ndash; Date : __________",
    ])
    + "<p style='margin-top:24pt;font-size:13pt;'><b>Group Name: GC"
      "<span class=fill>______</span></b></p>"
    + "<table class=grp><tr><th>Sr. No.</th><th>Name of group member</th>"
      "<th>Role in Project</th><th>Email id</th><th>Contact No.</th><th>Sign</th></tr>"
    + "".join(f"<tr class=tall><td>{i}</td><td>{name}</td><td>{role}</td>"
              "<td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>"
              for i, (name, role) in enumerate([
                  ("Pradyumna G. Kulkarni", "Leader"), ("&nbsp;", "&nbsp;"),
                  ("&nbsp;", "&nbsp;"), ("&nbsp;", "&nbsp;"),
                  ("&nbsp;", "&nbsp;"), ("&nbsp;", "&nbsp;"),
              ], 1))
    + "</table></div>")

BODY = (COVER + TITLEPAGE + TOC + ABSTRACT + INTRO + PROBLEM + LIT + METHOD
        + CHALLENGES + REFERENCES + GUIDE)

HTML = f"""<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<title>Project Synopsis - TeacherEase</title>
<style>{CSS}</style>
</head>
<body><div class=Section1>{HEADER_FOOTER}{BODY}</div></body></html>"""

with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("﻿")          # BOM so Word reads it as UTF-8
    fh.write(HTML)

print(f"wrote {OUT} ({len(HTML):,} bytes)")
