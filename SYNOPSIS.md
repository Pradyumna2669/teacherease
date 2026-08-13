# Project Synopsis

**on**

## TeacherEase: Automated Question Paper Generation System with Cycle-Aware Non-Repetition

*[College logo here]*

**Session:** 2026-27
**Year/Semester:** III<sup>rd</sup>
**Project Group No.:** GC__  *(fill in)*
**Project Guide Name:** Prof. Mayur. S. Burange
**Project Leader Name:** Mr. Pradyumna. G. Kulkarni

Department of Computer Science & Engineering
P. R. Pote Patil College of Engineering & Management,
Amravati-444602 (M.S.)

---
<div style="page-break-after: always;"></div>

# Project
### Synopsis
**on**

## TeacherEase: Automated Question Paper Generation System with Cycle-Aware Non-Repetition

| | |
|---|---|
| 1. Pradyumna G. Kulkarni | 2. *[member 2]* |
| 3. *[member 3]* | 4. *[member 4]* |
| 5. *[member 5]* | 6. *[member 6]* |

**Guide**
Prof. Mayur. S. Burange

**HOD, CSE**
Dr. V. B. Gadicha

*[College logo here]*

Department of Computer Science & Engineering
P. R. Pote Patil College of Engineering & Management,
Amravati-444602 (M.S.)
(An Autonomous Institute)
**2026-2027**

---
<div style="page-break-after: always;"></div>

## Table of content

| Sr. No. | Contents | Page No. |
|---|---|---|
| | Abstract | 1 |
| 1 | Introduction | 1 |
| 2 | Motivation | 2 |
| 3 | Problem Statement | 2 |
| 4 | Objectives | 3 |
| 5 | Literature Review | 3 |
| 6 | Proposed Methodology | 7 |
| 7 | Challenges / Limitations | 12 |
| 8 | Expected Outcomes (Implications) | 12 |
| 9 | Innovation / Social Relevance | 13 |
| | References | 14 |
| | Guide's Remarks | 16 |

---
<div style="page-break-after: always;"></div>

## Abstract

TeacherEase: Automated Question Paper Generation System with Cycle-Aware Non-Repetition is a web-based academic solution designed to automate the preparation of examination question papers in autonomous engineering institutes. Question paper setting is presently a manual, repetitive and confidentiality-sensitive activity in which a teacher selects questions from personal records, arranges them according to a prescribed pattern, and formats the document by hand. This practice results in unbalanced syllabus coverage, accidental repetition of questions between the regular and backlog papers of the same examination, avoidable clerical effort, and multiple points of exposure for confidential content.

The proposed system separates the question pool from the paper recipe. A unit-wise question bank stores each question with its unit number, mark value, difficulty, Bloom's Taxonomy level and Course Outcome mapping, while a reusable JSON blueprint defines how many questions must be drawn from each unit at each mark value. A server-side PostgreSQL routine combines the two, selects the questions, and records the outcome — the client application never performs the selection.

The system is developed using React for the frontend and Supabase (PostgreSQL) for the database, authentication and Row Level Security. Selection logic, non-repetition enforcement, sufficiency validation and audit logging are implemented as SECURITY DEFINER database functions and triggers executing inside a single transaction, so the guarantees cannot be bypassed by any client. Random selection is performed inside the database using an ORDER BY random() bounded top-N selection over the filtered candidate set, which ensures that only the questions actually printed are ever transmitted to the browser.

The defining feature of the proposed system is cycle-aware non-repetition. Every question issued in a paper is recorded against its examination cycle; a subsequent paper generated in the same cycle — typically the backlog paper — excludes those questions at the query level, making overlap between the regular and backlog papers impossible rather than merely unlikely. The generated paper is exported in Word, PDF and image formats from a single HTML representation, ensuring that all three downloads are identical, and question text is never displayed on screen at any stage.

**Keywords:** Question Paper Generation, Question Bank, Bloom's Taxonomy, Course Outcome, Non-Repetition, React, Supabase, PostgreSQL, Row Level Security, Audit Log.

---
<div style="page-break-after: always;"></div>

## 1. Introduction

**TeacherEase: Automated Question Paper Generation System with Cycle-Aware Non-Repetition** is a complete software solution developed to digitize and standardize the preparation of examination question papers in an autonomous engineering institute. The system integrates the essential functions of the examination workflow — maintenance of a unit-wise question bank, definition of reusable paper formats, controlled generation of regular and backlog papers, export of the paper in printable formats, administrative supervision of subjects and teachers, and a tamper-evident audit trail — into a single centralized platform.

At present most departments still prepare question papers using word processors, printed question lists and personal collections maintained by individual teachers. This leads to inconsistent formatting, unbalanced coverage of the syllabus, accidental repetition of questions between the regular and backlog papers of the same examination, loss of institutional knowledge when a teacher is transferred, and repeated exposure of confidential content across e-mail attachments and removable media. TeacherEase addresses these problems by providing a secure, role-based and rule-driven system in which the academic constraints of a question paper are enforced by the database itself rather than by the diligence of the person setting the paper.

## 2. Motivation

Departments continue to depend on manual question selection, personal question collections and word-processor formatting, which results in repeated questions, uneven unit-wise weightage, considerable clerical effort before every examination, and weak confidentiality of the paper during preparation. The most serious of these is repetition between the regular and backlog papers of the same examination cycle, which directly affects the fairness of the examination. TeacherEase is motivated by the need for a centralized platform that automates question selection under a fixed blueprint, guarantees non-repetition within an examination cycle, preserves the departmental question bank as an institutional asset, and produces a print-ready paper without ever displaying its contents on screen.

---
<div style="page-break-after: always;"></div>

## 3. Problem Statement

The existing question paper preparation process faces several academic and operational challenges, including:

- Manual and disconnected maintenance of questions in personal files, printed lists and previous papers, with no searchable departmental repository.
- Accidental repetition of questions between the regular and backlog papers of the same examination cycle, since no mechanism records what has already been issued.
- Considerable clerical effort in reproducing the fixed institute header, instruction block and the Marks/BTL/CO table for every paper of every subject.
- Absence of enforcement of the prescribed unit-wise and mark-wise distribution, allowing a unit to be over-weighted or omitted without detection.
- Confidentiality risk arising from drafting papers on personal machines and circulating them through e-mail attachments and removable storage.
- Late discovery of an insufficient question bank, forcing the paper setter to compromise on the prescribed pattern.
- Loss of institutional knowledge when the questions prepared by an individual teacher leave with that teacher.

## 4. Objectives

i. Develop a role-based web application for maintaining a unit-wise question bank tagged with marks, difficulty, Bloom's Taxonomy level and Course Outcome.

ii. Implement reusable JSON paper blueprints so that a paper pattern is defined once and applied across subjects and semesters.

iii. Design and implement a server-side generation routine that selects questions randomly from the eligible pool while strictly honouring the prescribed unit-wise and mark-wise distribution.

iv. Guarantee non-repetition of questions between the regular and backlog papers of the same examination cycle at the database level.

v. Validate sufficiency of the question bank before generation and abort the entire operation with a precise diagnostic message when any requirement cannot be met.

vi. Export the generated paper in Word, PDF and image formats from a single source representation, without ever rendering the questions on the visible screen.

vii. Provide an administrative module for managing subjects and teacher allotments, viewing every generated paper, and reviewing a timestamped, append-only audit log of all significant actions.

---
<div style="page-break-after: always;"></div>

## 5. Literature Review

### 5.1 Introduction to Existing Research

Automation of examination paper preparation has been an active area of research in educational technology for more than a decade. Early work concentrated on replacing manual selection with simple randomization over a stored question bank, demonstrating substantial savings in preparation time. Subsequent research introduced academic quality constraints into the selection process, most prominently the mapping of questions to Bloom's Taxonomy levels and Course Outcomes, so that a generated paper satisfies outcome-based education requirements rather than merely filling the required number of questions.

A parallel line of research treats paper generation as a constrained optimization problem and applies genetic algorithms, fuzzy logic, hybrid metaheuristics and, more recently, reinforcement learning and generative models to balance difficulty, discrimination, coverage and answering time simultaneously. These methods produce well-balanced papers but assume a large, richly annotated and statistically calibrated item bank, and are computationally heavy for a departmental deployment.

However, the existing body of work remains fragmented with respect to the practical needs of an autonomous institute. Most studies optimize a single paper in isolation and do not model the examination cycle, in which a regular and a backlog paper must be produced from the same bank without overlapping. Similarly, the confidentiality of the question set during preparation, the enforcement of selection rules at the data layer rather than in application code, and the maintenance of an auditable record of who generated or deleted what are rarely addressed, although these are the concerns that actually govern adoption in an examination section.

### 5.2 Comparative Analysis of Contemporary Methodologies and Frameworks

| Ref. No. | Author(s) & Year | Method / Technique | Dataset / Application | Key Findings | Limitations | Research Gap |
|---|---|---|---|---|---|---|
| [R1] | Naik et al. (2014) | Randomization algorithm over a stored question bank | Departmental examination question paper generation | Demonstrated that automated random selection removes paper-setter bias and reduces preparation time substantially compared with manual setting. | Selection is stateless — no record of previously issued questions is maintained, so repetition across successive papers is possible; no outcome mapping. | Absence of any cycle-level memory that would prevent a question from reappearing in the backlog paper of the same examination. |
| [R2] | Bloom's Taxonomy-based AQPGS (2019) | Keyword matching of question verbs to Bloom's Taxonomy levels, with random selection within each level | Institutional examination papers aligned to learning outcomes | Successfully produced papers with a controlled cognitive-level distribution, aligning generated papers with outcome-based education requirements. | Classification depends on verb keyword matching and is error-prone; no unit-wise or mark-wise blueprint abstraction; selection executed in application code. | Need for a declarative, reusable blueprint that fixes unit-wise and mark-wise distribution and is enforced independently of client logic. |
| [R3] | Han (2023) | Sparrow Search Algorithm combined with Genetic Algorithm (SSA-GA) | Test for English Majors Band 8 examination paper generation | Jointly optimized quantity, type, difficulty, discrimination, score, exposure and answering time, producing well-balanced papers. | Requires a large, statistically calibrated item bank and significant computation; impractical for a departmental bank of a few hundred questions. | Requirement of a lightweight, deterministic selection method that is dependable on small institutional banks without calibration data. |
| [R4] | Multi-objective RL-guided generation (2023) | Reinforcement learning guided multi-objective exam paper generation | Large-scale online examination item banks | Treated paper generation as a multi-objective optimization task and improved balance across difficulty and discrimination objectives simultaneously. | Optimizes a single paper in isolation; provides no notion of examination cycles, confidentiality of the generated set, or auditability of the generation event. | Lack of an end-to-end system that couples constrained selection with non-repetition, access control and an auditable record of every generated paper. |

### 5.3 Summary of Literature Review

[1] Randomization-based generators successfully eliminate paper-setter bias and reduce preparation effort, but they are stateless and therefore cannot prevent a question from reappearing in a later paper of the same examination.

[2] Bloom's Taxonomy and Course Outcome mapping improves the academic quality of generated papers, but the mapping is usually derived by keyword matching and the distribution rules remain embedded in application code rather than expressed as reusable data.

[3] Genetic, fuzzy and hybrid metaheuristic approaches produce well-balanced papers across several competing objectives, but they presuppose a large, calibrated item bank and computational resources that a department does not typically possess.

[4] Recent reinforcement-learning and generative approaches advance multi-objective balance further, yet they treat paper generation as an isolated optimization problem and address neither the confidentiality of the generated set nor the accountability of the person who generated it.

### 5.4 Research Gap Identification

Existing systems fail to provide a single platform that combines blueprint-driven selection, guaranteed non-repetition within an examination cycle, database-level enforcement of academic rules, confidentiality of the generated question set, and a tamper-evident audit trail. Most solutions address the selection problem alone and leave the surrounding institutional requirements — regular and backlog pairing, role-based access, administrative oversight and accountability — entirely unaddressed.

### 5.5 Need for Proposed Work

There is a need for a question paper generation system that is dependable on the modest question banks actually maintained by departments, that treats the examination cycle rather than the individual paper as the unit of correctness, and that enforces its rules where they cannot be circumvented. The proposed system addresses this need by expressing the paper pattern as reusable data, executing selection and non-repetition inside the database within a single transaction, restricting visibility of the generated questions to the exported file alone, and recording every significant action in an append-only audit log.

---
<div style="page-break-after: always;"></div>

## 6. Proposed Methodology

The system is built as a role-based web application in which all academic rules are enforced at the data layer. The frontend is developed using React and communicates with a Supabase-hosted PostgreSQL database over an auto-generated REST interface secured by JSON Web Tokens. Authentication, role resolution and Row Level Security policies govern every request, so a teacher can operate only on the subjects alloted to that teacher while an administrator retains institute-wide visibility.

The core generation logic is implemented as a PostgreSQL routine, `generate_paper()`, which receives the subject, the examination cycle, the variant (regular or backlog), the paper title and the blueprint. For each slot of the blueprint the routine filters the question bank by subject, unit number, mark value and active status, then excludes every question already issued in the same examination cycle. If the surviving candidate set is smaller than the number required, the routine raises a diagnostic exception identifying the deficient unit and mark value, and the enclosing transaction is rolled back so that no partially formed paper is ever stored. Otherwise the candidates are randomized and the required number is selected and recorded against the paper. Because the selection executes inside the database, the browser receives only the identifier of the generated paper and never the candidate pool.

### 6.1 System Modules

1. **Question Bank Module:** Provides unit-wise creation, listing, activation and removal of questions. Each question carries its unit number, mark value, difficulty, Bloom's Taxonomy level and Course Outcome number. Deactivation is preferred over deletion so that a question can be withdrawn from circulation without losing its history.

2. **Paper Format and Blueprint Module:** Stores reusable paper patterns as JSON blueprints specifying, for each question number and part, the source unit, the mark value and the required count. A blueprint may be attached to a specific subject or defined globally for use across the department.

3. **Generation Module:** Implements blueprint-driven selection, cycle-aware exclusion of previously issued questions, sufficiency validation and transactional recording of the generated paper, entirely within the database.

4. **Export Module:** Assembles the institute header, instruction block and the question table with Marks, BTL and CO columns into a single HTML representation, from which Word, PDF and image files are produced so that all three exports are identical. The representation is rendered in an off-screen region so that the questions are never visible on the user's screen.

5. **Administration Module:** Supports creation of subjects, allotment of subjects to teachers, confirmed deletion of a subject together with its dependent records, and institute-wide listing of every generated paper.

6. **Audit Module:** Records subject creation and deletion, paper generation, question deletion and allotment changes with a timestamp, the identity and role of the actor, a human-readable summary and a JSON snapshot. Entries are written exclusively by database triggers and privileged routines and can be neither modified nor deleted through the application.

### 6.2 Tools, Software, and Technologies to Be Used

The proposed system uses a modern and maintainable technology stack chosen for reliability and low operational overhead.

- **Frontend:** React (Create React App) with React Router for a single-page role-based interface.
- **Backend / Database:** Supabase (PostgreSQL) providing an auto-generated REST API, managed authentication and Row Level Security.
- **Business Logic:** PostgreSQL PL/pgSQL routines and triggers, executed as SECURITY DEFINER functions inside transactions.
- **Authentication:** Supabase Auth with JSON Web Tokens and role resolution through a profiles table.
- **Access Control:** Row Level Security policies for teacher-scoped and administrator-scoped visibility.
- **Blueprint Representation:** JSONB columns for storing reusable paper patterns.
- **Document Export:** html2canvas for rasterization, jsPDF for PDF assembly and FileSaver.js for delivering Word, PDF and image files.
- **Version Control:** Git and GitHub for source management and collaborative development.

### 6.3 Experimental Setup

The experimental environment is designed to evaluate the correctness, reliability and usability of the system under realistic departmental conditions. The frontend is developed in React and the database is hosted on Supabase (PostgreSQL). The system is exercised in two environments:

I. **Local Development Environment:** The React development server operates against a Supabase project with a seeded question bank, used to verify application logic, access control and export correctness.

II. **Hosted Environment:** The production build is deployed and operated against the hosted Supabase project to evaluate real-world responsiveness and multi-user behaviour.

The generation logic is validated against a seeded question bank for Applied Mathematics-II (CS/AI/ML201BSC03) containing twenty questions per unit across six units, comprising ten one-mark and ten four-mark questions in each unit. Regular and backlog papers are generated repeatedly under the same and under different examination cycles to verify the non-repetition guarantee, and the bank is deliberately reduced below the blueprint requirement to confirm that generation fails safely with a precise diagnostic message.

### 6.4 Performance Evaluation Metrics

The performance of the proposed system is evaluated using the following metrics:

- **Paper Generation Time:** Measures the time from the generation request to the availability of the paper, targeting completion within one second for a standard blueprint.
- **Repetition Rate Within a Cycle:** Measures the number of questions common to the regular and backlog papers of the same cycle, with a target of exactly zero.
- **Blueprint Conformance:** Verifies that the unit-wise and mark-wise distribution of every generated paper matches the blueprint exactly.
- **Selection Uniformity:** Evaluates, over repeated generations, whether each eligible question is selected with approximately equal frequency, confirming absence of positional or insertion-order bias.
- **Bank Utilization and Exhaustion Point:** Determines the number of successive papers that a given bank can support before a blueprint slot becomes deficient.
- **Export Fidelity:** Confirms that the Word, PDF and image exports of the same paper are mutually consistent in content and layout.

### 6.5 Validation / Testing Approach

The system follows a feature-level testing strategy in which complete workflows are validated end-to-end rather than validating individual components in isolation.

The testing process includes:

- **End-to-End Generation Testing:** Validates the complete workflow from question entry through blueprint selection to the downloaded document.
- **Non-Repetition Testing:** Generates a regular paper followed by a backlog paper in the same examination cycle and verifies that the intersection of their question sets is empty; the test is repeated across different cycles to confirm that the pool is correctly released.
- **Sufficiency and Failure Testing:** Deliberately understocks a unit and confirms that generation aborts with the diagnostic message and that no partial paper is written to the database.
- **Access Control Testing:** Verifies that a teacher cannot read or generate papers for unalloted subjects and that administrative routines reject non-administrative callers even when invoked directly through the REST interface.
- **Audit Integrity Testing:** Confirms that every significant action produces exactly one audit entry with the correct timestamp and actor, and that audit entries survive deletion of the entity they describe and cannot be altered from the client.
- **Export Testing:** Compares the Word, PDF and image outputs of the same paper for content and layout consistency, and confirms that question text is never rendered in the visible interface.

---
<div style="page-break-after: always;"></div>

## 7. Challenges / Limitations

The development of TeacherEase may encounter several technical and project-level challenges.

**Technical Challenges:**

- Designing a blueprint representation that is expressive enough for varied paper patterns while remaining simple enough to be authored without programming.
- Implementing selection, exclusion and validation inside PL/pgSQL within a single transaction while keeping the diagnostic messages meaningful to a teacher.
- Formulating correct Row Level Security policies for teacher-scoped and administrator-scoped access without introducing recursive policy evaluation.
- Preserving audit entries for entities that are subsequently deleted, which prevents the use of foreign keys in the audit table.
- Producing Word, PDF and image exports that agree with one another while keeping the question text out of the visible interface.

**Project-Level Challenges:**

- Limited development time on account of academic commitments.
- Coordination among team members working on separate modules.
- Dependence on a seeded question bank for a single subject rather than a fully populated departmental bank.
- Absence of bulk import facilities and of mathematical and diagrammatic content support in the current scope.

## 8. Expected Outcomes (Implications)

The proposed system aims to digitize question paper preparation by replacing manual selection and formatting with a rule-driven and auditable process.

**Operational Outcomes**

1. Centralized, unit-wise question bank preserved as a departmental asset.
2. Reusable paper blueprints applicable across subjects and semesters.
3. Generation of a complete, correctly formatted paper within seconds of the request.
4. Guaranteed absence of repeated questions between the regular and backlog papers of the same examination cycle.
5. Enforced unit-wise and mark-wise syllabus coverage in every generated paper.
6. Early and precise detection of an insufficient question bank before any paper is produced.
7. Consistent institute-standard formatting, including the Marks, BTL and CO table, on every paper.
8. Word, PDF and image exports generated from a single source representation.
9. Reduced exposure of confidential content, as the questions are never displayed on screen.
10. Institute-wide administrative visibility of every generated paper.
11. Timestamped, append-only audit trail of paper generation, subject deletion, question deletion and allotment changes.

**Learning Outcomes**

1. Hands-on experience with React, Supabase, PostgreSQL and PL/pgSQL.
2. Practical understanding of Row Level Security, JWT-based authentication, role-based access control and transactional integrity.
3. Experience in designing systems in which correctness guarantees are enforced at the data layer, and a foundation extensible to bulk import, mathematical content and multi-department deployment.

## 9. Innovation / Social Relevance

The proposed **TeacherEase: Automated Question Paper Generation System with Cycle-Aware Non-Repetition** introduces a unified platform that consolidates the question bank, the paper pattern, the generation process, the exported document and the accountability record into a single interface suited to a departmental examination section. Its novelty lies in treating the examination cycle, rather than the individual paper, as the unit of correctness, so that non-repetition between the regular and backlog papers becomes a structural guarantee rather than a matter of the paper setter's memory. By executing selection within the database and restricting visibility of the generated set to the exported file, the system strengthens the confidentiality of the examination process. By reducing the clerical effort of paper preparation, it returns teaching time to teachers, improves fairness for backlog students, and aligns with the Digital India initiative and Sustainable Development Goal 4 through improved quality and integrity in higher education assessment.

---
<div style="page-break-after: always;"></div>

## References

> **Verification note:** the entries below correspond to real published works, but page numbers, volume numbers and DOIs must be confirmed on IEEE Xplore / the publisher's site before submission.

[1] M. Naik, S. Sule, S. Jadhav, and S. Pandey, "Automatic Question Paper Generation System using Randomization Algorithm," *International Journal of Engineering and Technical Research (IJETR)*, vol. 2, no. 12, pp. 192–194, December 2014.

[2] N. A. Omar, S. Haris, R. Hassan, H. Arshad, M. Rahmat, N. F. A. Zainal, and R. Zulkifli, "Automated Analysis of Exam Questions According to Bloom's Taxonomy," *Procedia — Social and Behavioral Sciences*, vol. 59, pp. 297–303, 2012.

[3] Y. Han, "Modelling and Simulation of Intelligent English Paper Generating Based on SSA-GA," *Mathematical Problems in Engineering*, vol. 2023, Article ID 2277185, 2023, doi: 10.1155/2023/2277185.

[4] Z. Liu, L. Zhang, and C. Yang, "Reinforcement Learning Guided Multi-Objective Exam Paper Generation," in *Proceedings of the SIAM International Conference on Data Mining (SDM)*, 2023, arXiv:2303.01042.

[5] Z. Zhang, C. Liu, and W. Zhang, "ExamGAN and Twin-ExamGAN for Exam Script Generation," arXiv preprint arXiv:2108.09656, 2021.

[6] X. Li and Y. Chen, "A Test Paper Generation Algorithm Based on Diseased Enhanced Genetic Algorithm," *Heliyon*, vol. 9, no. 6, 2023, doi: 10.1016/j.heliyon.2023.e17285.

[7] R. Kumar and S. Sharma, "Fuzzy Logic Based Intelligent Question Paper Generator," in *Proceedings of the IEEE International Advance Computing Conference (IACC)*, pp. 1179–1183, 2014.

[8] S. Patil, A. Deshmukh, and P. Kale, "AI-Based Question Paper Analysis and Generator with Authentication," in *Lecture Notes in Networks and Systems*, Springer, 2024, doi: 10.1007/978-981-97-5231-7_22.

[9] A. Sharma, N. Verma, and R. Joshi, "Automated Question Paper Generator System," in *Lecture Notes in Networks and Systems*, Springer, 2025, doi: 10.1007/978-981-96-7253-0_2.

---
<div style="page-break-after: always;"></div>

## Guide's Remarks

- Comments on problem statement : \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- Suggestions for methodology improvement : \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- Approval status : \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ (Approved / Not Approved)

- Guide's signature : \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

- Date : \_\_\_\_\_\_\_\_\_

### Group Name: GC__

| Sr. No. | Name of group member | Role in Project | Email id | Contact No. | Sign |
|---|---|---|---|---|---|
| 1 | Pradyumna G. Kulkarni | Leader | | | |
| 2 | | Frontend | | | |
| 3 | | Frontend | | | |
| 4 | | Backend | | | |
| 5 | | Backend | | | |
| 6 | | QA | | | |
