from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'TeacherEase_Presentation.pptx'
ARCH = ROOT / 'fig1_architecture.png'
FLOW = ROOT / 'fig2_workflow.png'

NAVY = RGBColor(20, 33, 61)
RED = RGBColor(166, 25, 38)
RED_LIGHT = RGBColor(247, 233, 235)
NAVY_LIGHT = RGBColor(231, 236, 245)
TEXT = RGBColor(36, 41, 52)
MUTED = RGBColor(96, 107, 120)
WHITE = RGBColor(255, 255, 255)
GREEN = RGBColor(28, 107, 77)
GOLD = RGBColor(215, 173, 80)

TEAM = [
    'Pradyumna G. Kulkarni',
    'Satchit Anil Dhawale',
    'Yashwant Vijayrao Kirakte',
    'Aarya Sanjay Kukade',
    'Vishesh Sandeeprao Pachghare',
    'Ayush Rupesh Dongre',
    'Nishant Sudhir Thakare',
    'Janhavi Gopal Hire',
    'Vaishnavi Ramesh Band',
]
GUIDE = 'Prof. Mayur S. Bhurange'


def set_bg(slide):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(247, 248, 251)


def add_title(slide, title, subtitle=None, accent=RED):
    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.2), Inches(0.7))
    tf = title_box.text_frame
    p = tf.paragraphs[0]
    p.text = title
    p.alignment = PP_ALIGN.LEFT
    run = p.runs[0]
    run.font.name = 'Georgia'
    run.font.size = Pt(24)
    run.bold = True
    run.font.color.rgb = NAVY

    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.5), Inches(0.95), Inches(12.1), Inches(0.08))
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent
    bar.line.fill.background()

    if subtitle:
        sub_box = slide.shapes.add_textbox(Inches(0.6), Inches(1.12), Inches(12.0), Inches(0.45))
        tf2 = sub_box.text_frame
        p2 = tf2.paragraphs[0]
        p2.text = subtitle
        p2.alignment = PP_ALIGN.LEFT
        run2 = p2.runs[0]
        run2.font.name = 'Segoe UI'
        run2.font.size = Pt(11)
        run2.font.color.rgb = MUTED


def add_footer(slide, number):
    footer = slide.shapes.add_textbox(Inches(12.8), Inches(7.15), Inches(0.4), Inches(0.2))
    tf = footer.text_frame
    p = tf.paragraphs[0]
    p.text = str(number)
    p.alignment = PP_ALIGN.RIGHT
    run = p.runs[0]
    run.font.name = 'Segoe UI'
    run.font.size = Pt(9)
    run.font.color.rgb = MUTED


def add_card(slide, left, top, width, height, title, body_lines, accent=RED):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = WHITE
    shape.line.color.rgb = accent
    shape.line.width = Pt(1.2)

    tb = slide.shapes.add_textbox(left + Inches(0.15), top + Inches(0.12), width - Inches(0.3), height - Inches(0.2))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0

    p = tf.paragraphs[0]
    p.text = title
    p.level = 0
    run = p.runs[0]
    run.font.name = 'Georgia'
    run.font.size = Pt(18)
    run.bold = True
    run.font.color.rgb = NAVY

    for line in body_lines:
        p = tf.add_paragraph()
        p.text = line
        p.level = 0
        p.space_after = Pt(4)
        run = p.runs[0]
        run.font.name = 'Segoe UI'
        run.font.size = Pt(10.5)
        run.font.color.rgb = TEXT


def add_bullets(slide, left, top, width, height, items, title=None, title_size=18, color=TEXT):
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    box.fill.solid()
    box.fill.fore_color.rgb = WHITE
    box.line.color.rgb = NAVY
    box.line.width = Pt(1.1)

    tb = slide.shapes.add_textbox(left + Inches(0.18), top + Inches(0.14), width - Inches(0.3), height - Inches(0.2))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0

    if title:
        p = tf.paragraphs[0]
        p.text = title
        run = p.runs[0]
        run.font.name = 'Georgia'
        run.font.size = Pt(title_size)
        run.bold = True
        run.font.color.rgb = NAVY
        p.space_after = Pt(6)

    for idx, item in enumerate(items):
        p = tf.add_paragraph()
        p.text = item
        p.level = 0
        p.bullet = True
        p.text_level = 0
        p.space_after = Pt(3)
        run = p.runs[0]
        run.font.name = 'Segoe UI'
        run.font.size = Pt(12)
        run.font.color.rgb = color


def add_two_column_table(slide, left, top, width, height, cols, rows):
    shape = slide.shapes.add_table(len(rows) + 1, len(cols), left, top, width, height)
    table = shape.table
    for i, c in enumerate(cols):
        table.cell(0, i).text = c
        cell = table.cell(0, i)
        for p in cell.text_frame.paragraphs:
            p.alignment = PP_ALIGN.CENTER
            r = p.runs[0]
            r.font.name = 'Segoe UI'
            r.font.size = Pt(11)
            r.bold = True
            r.font.color.rgb = WHITE
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY
    for r_idx, row in enumerate(rows, start=1):
        for c_idx, value in enumerate(row):
            cell = table.cell(r_idx, c_idx)
            cell.text = value
            for p in cell.text_frame.paragraphs:
                p.alignment = PP_ALIGN.LEFT if c_idx != 0 else PP_ALIGN.CENTER
                r = p.runs[0]
                r.font.name = 'Segoe UI'
                r.font.size = Pt(10)
                r.font.color.rgb = TEXT
            cell.fill.solid()
            cell.fill.fore_color.rgb = WHITE


def add_metric(slide, left, top, width, height, value, label, color=RED):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = WHITE
    shape.line.color.rgb = color
    shape.line.width = Pt(1.5)

    tb = slide.shapes.add_textbox(left + Inches(0.12), top + Inches(0.12), width - Inches(0.2), height - Inches(0.2))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = value
    run = p.runs[0]
    run.font.name = 'Georgia'
    run.font.size = Pt(22)
    run.bold = True
    run.font.color.rgb = color
    p.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = label
    run2 = p2.runs[0]
    run2.font.name = 'Segoe UI'
    run2.font.size = Pt(10)
    run2.font.color.rgb = MUTED
    p2.alignment = PP_ALIGN.CENTER


prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# 1 title slide
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide)
# Decorative top bar
bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.18))
bar.fill.solid(); bar.fill.fore_color.rgb = RED; bar.line.fill.background()

title_box = slide.shapes.add_textbox(Inches(0.65), Inches(1.2), Inches(12.0), Inches(1.0))
text_frame = title_box.text_frame
text_frame.word_wrap = True
p = text_frame.paragraphs[0]
p.text = 'TeacherEase'
p.alignment = PP_ALIGN.LEFT
run = p.runs[0]
run.font.name = 'Georgia'
run.font.size = Pt(28)
run.bold = True
run.font.color.rgb = NAVY

p2 = text_frame.add_paragraph()
p2.text = 'Automated Question Paper Generation System with Cycle-Aware Non-Repetition'
p2.alignment = PP_ALIGN.LEFT
run2 = p2.runs[0]
run2.font.name = 'Segoe UI'
run2.font.size = Pt(17)
run2.bold = False
run2.font.color.rgb = TEXT

sub = slide.shapes.add_textbox(Inches(0.7), Inches(2.7), Inches(5.2), Inches(0.7))
sub_tf = sub.text_frame
sub_tf.text = 'Department of Computer Science & Engineering\nP. R. Pote Patil College of Engineering & Management'
for p in sub_tf.paragraphs:
    for r in p.runs:
        r.font.name = 'Segoe UI'
        r.font.size = Pt(12)
        r.font.color.rgb = MUTED

card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.8), Inches(2.15), Inches(3.5), Inches(2.4))
card.fill.solid(); card.fill.fore_color.rgb = NAVY_LIGHT; card.line.color.rgb = NAVY; card.line.width = Pt(1.2)
ct = slide.shapes.add_textbox(Inches(9.0), Inches(2.45), Inches(3.1), Inches(1.7))
ctf = ct.text_frame
for idx, txt in enumerate(['Project Guide', GUIDE, 'Academic Year 2026-27']):
    p = ctf.paragraphs[0] if idx == 0 else ctf.add_paragraph()
    p.text = txt
    run = p.runs[0]
    run.font.name = 'Georgia' if idx == 0 or idx == 1 else 'Segoe UI'
    run.font.size = Pt(14 if idx in (0,1) else 11)
    run.bold = idx in (0, 1)
    run.font.color.rgb = NAVY if idx != 2 else MUTED
    p.alignment = PP_ALIGN.CENTER

# slide 2 problem
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '1. The Problem We Solved', 'Manual paper setting is slow, repetitive, and risky.')
add_bullets(slide, Inches(0.7), Inches(1.6), Inches(5.8), Inches(4.4), [
    'Teachers rely on personal notes, printed lists, and scattered drafts.',
    'Repeated questions often appear between regular and backlog papers in the same cycle.',
    'Syllabus coverage becomes uneven and difficult to audit.',
    'Confidential papers circulate through email and removable media.',
    'Late detection of insufficient bank questions creates exam stress.'
], title='Why the current process fails')
add_bullets(slide, Inches(6.7), Inches(1.6), Inches(5.8), Inches(4.4), [
    'Wasted faculty time in formatting, duplication, and correction.',
    'Higher risk of unfair examination due to repeated questions.',
    'Loss of institutional knowledge when faculty or records change.',
    'No tamper-evident record of who generated or changed what.',
    'Difficulty in maintaining a consistent, standard paper format.'
], title='Impact on departments and examinations')
add_footer(slide, 2)

# slide 3 cost of manual process
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '2. Cost of Manual Question Paper Preparation', 'The real cost is not only time—it is quality, fairness, and confidentiality.')
add_metric(slide, Inches(0.7), Inches(1.7), Inches(2.5), Inches(1.7), 'Hours', 'per paper', color=RED)
add_metric(slide, Inches(3.6), Inches(1.7), Inches(2.5), Inches(1.7), '0%', 'cycle-safe repetition', color=RED)
add_metric(slide, Inches(6.5), Inches(1.7), Inches(2.5), Inches(1.7), 'High', 'manual error risk', color=RED)
add_metric(slide, Inches(9.4), Inches(1.7), Inches(2.5), Inches(1.7), 'Risk', 'confidentiality exposure', color=RED)

add_bullets(slide, Inches(0.8), Inches(3.8), Inches(12.0), Inches(2.6), [
    'Manual drafting requires repeated selection, review, formatting, and final proofing before every exam.',
    'Without a central question bank, departmental memory is fragmented across faculty and files.',
    'Repeated questions in the same cycle undermine exam fairness for normal, backlog, and repeat candidates.',
    'Paper setters must spend significant effort re-creating a standard header, instructions, and marks table each time.'
])
add_footer(slide, 3)

# slide 4 solution overview
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '3. TeacherEase Solution Overview', 'A secure, role-based platform for standardised and fair paper generation.')
add_card(slide, Inches(0.7), Inches(1.7), Inches(3.8), Inches(2.4), 'Central Question Bank', ['Unit-wise storage', 'Marks, BTL, CO tags', 'Active/inactive status'])
add_card(slide, Inches(4.8), Inches(1.7), Inches(3.8), Inches(2.4), 'Reusable Blueprints', ['JSON-based pattern', 'Mark-wise and unit-wise rules', 'Reusable across subjects'])
add_card(slide, Inches(8.9), Inches(1.7), Inches(3.8), Inches(2.4), 'Secure Generation', ['Cycle-aware exclusion', 'Transaction safety', 'Audit logging'])

add_bullets(slide, Inches(1.0), Inches(4.5), Inches(11.2), Inches(1.8), [
    'Teachers add and maintain questions in a controlled bank.',
    'The system applies a fixed blueprint and validates the bank before generation.',
    'The database enforces selection rules, so the browser never receives the full candidate pool.'
])
add_footer(slide, 4)

# slide 5 how system works
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '4. How the System Works', 'From question entry to final export in a single controlled process.')

def flow_step(x, y, w, h, text):
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    sh.fill.solid(); sh.fill.fore_color.rgb = WHITE; sh.line.color.rgb = NAVY; sh.line.width = Pt(1.1)
    tb = slide.shapes.add_textbox(x + Inches(0.12), y + Inches(0.12), w - Inches(0.24), h - Inches(0.2))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = text; p.alignment = PP_ALIGN.CENTER
    run = p.runs[0]; run.font.name = 'Segoe UI'; run.font.size = Pt(11); run.font.color.rgb = TEXT

flow_step(Inches(0.9), Inches(1.6), Inches(2.1), Inches(0.75), '1. Teacher logs in')
flow_step(Inches(3.4), Inches(2.25), Inches(2.4), Inches(0.75), '2. Maintain question bank')
flow_step(Inches(6.2), Inches(2.9), Inches(2.5), Inches(0.8), '3. Select format, cycle, variant')
flow_step(Inches(9.0), Inches(3.6), Inches(2.4), Inches(0.8), '4. Generate paper securely')
flow_step(Inches(3.8), Inches(4.65), Inches(2.7), Inches(0.8), '5. Validate sufficiency')
flow_step(Inches(7.1), Inches(5.35), Inches(3.2), Inches(0.8), '6. Export as Word / PDF / Image')

for x1, y1, x2, y2 in [(Inches(2.95), Inches(1.96), Inches(3.4), Inches(2.25)), (Inches(5.8), Inches(2.6), Inches(6.2), Inches(2.9)), (Inches(8.7), Inches(3.48), Inches(9.0), Inches(3.6)), (Inches(6.5), Inches(5.05), Inches(7.1), Inches(5.35))]:
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x1, y1, x2 - x1, y2 - y1)
    line.fill.background()
    line.line.color.rgb = NAVY
    line.line.width = Pt(1.2)

# arrow effect by drawing simple lines; later not perfect but acceptable
add_footer(slide, 5)

# slide 6 non repetition logic
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '5. Cycle-Aware Non-Repetition', 'The strongest guarantee is enforced at the database layer.')
add_bullets(slide, Inches(0.9), Inches(1.7), Inches(5.8), Inches(4.2), [
    'Every generated question is recorded against an exam cycle.',
    'The next paper in the same cycle excludes those question IDs before selection.',
    'This prevents overlap between regular and backlog papers instead of depending on human memory.',
    'The safeguard is part of the query itself and holds even if the client is misused.',
    'This preserves fairness while keeping the selection process deterministic and auditable.'
], title='Core rule')
shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.2), Inches(2.0), Inches(4.8), Inches(2.6))
shape.fill.solid(); shape.fill.fore_color.rgb = RED_LIGHT; shape.line.color.rgb = RED; shape.line.width = Pt(1.4)
textbox = slide.shapes.add_textbox(Inches(7.5), Inches(2.5), Inches(4.0), Inches(1.3))
text = textbox.text_frame
p = text.paragraphs[0]; p.text = 'Regular paper\nQ1, Q7, Q18'; p.alignment = PP_ALIGN.CENTER
run = p.runs[0]; run.font.name = 'Georgia'; run.font.size = Pt(15); run.font.color.rgb = NAVY
p2 = text.add_paragraph(); p2.text = 'Backlog paper\nExcludes these IDs automatically'; p2.alignment = PP_ALIGN.CENTER
run2 = p2.runs[0]; run2.font.name = 'Segoe UI'; run2.font.size = Pt(11); run2.font.color.rgb = TEXT
add_footer(slide, 6)

# slide 7 selection algorithm filter chain
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '6. Selection Algorithm Filter Chain', 'The database filters candidates before any randomization occurs.')
for x, y, title, text in [
    (Inches(0.8), Inches(1.7), 'Subject filter', 'Restrict to the target subject and active questions.'),
    (Inches(3.6), Inches(1.7), 'Unit filter', 'Limit to the required unit or blueprint slot.'),
    (Inches(6.4), Inches(1.7), 'Mark filter', 'Match the required mark value and question type.'),
    (Inches(9.2), Inches(1.7), 'Cycle exclusion', 'Remove questions already issued in the same exam cycle.'),
    (Inches(2.5), Inches(3.8), 'Sufficiency check', 'Abort if required candidates are below the minimum threshold.'),
    (Inches(7.3), Inches(3.8), 'Random top-N', 'Order by random() and select exactly N questions for the slot.'),
]:
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(2.5), Inches(1.5))
    sh.fill.solid(); sh.fill.fore_color.rgb = WHITE; sh.line.color.rgb = NAVY; sh.line.width = Pt(1.1)
    tb = slide.shapes.add_textbox(x + Inches(0.12), y + Inches(0.08), Inches(2.26), Inches(1.2))
    tf = tb.text_frame
    p = tf.paragraphs[0]; p.text = title; run = p.runs[0]; run.font.name='Georgia'; run.font.size=Pt(13); run.bold=True; run.font.color.rgb=NAVY
    p2 = tf.add_paragraph(); p2.text = text; run2 = p2.runs[0]; run2.font.name='Segoe UI'; run2.font.size=Pt(9.5); run2.font.color.rgb=TEXT

add_bullets(slide, Inches(1.2), Inches(5.8), Inches(10.7), Inches(0.8), ['This chain ensures that the selection is valid, fair, and safe before inserting the paper.'])
add_footer(slide, 7)

# slide 8 validation approach
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '7. Validation and Quality Checks', 'The system validates before and after generation to prevent weak or invalid papers.')
add_bullets(slide, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.3), [
    'Question bank sufficiency is checked before writing the paper.',
    'Unit-wise and mark-wise counts are verified against the blueprint.',
    'Randomization is tested repeatedly to confirm even distribution across eligible questions.',
    'Regular and backlog papers are generated in the same cycle to confirm zero overlap.',
    'The system aborts and rolls back if any requirement fails, leaving no partial paper.'
], title='Validation rules')
add_bullets(slide, Inches(6.8), Inches(1.8), Inches(5.5), Inches(4.3), [
    'Teacher access is restricted to allotted subjects using role-scoped rules.',
    'Admins can review all papers, all subjects, and audit entries.',
    'Export files are compared for content consistency across Word, PDF, and image outputs.',
    'The app keeps question text out of the visible screen during generation.',
    'Audit logs ensure the generation record is append-only and traceable.'
], title='Governance and control')
add_footer(slide, 8)

# slide 9 architecture
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '8. System Architecture', 'Layered architecture with secure database enforcement at the core.');
img = slide.shapes.add_picture(str(ARCH), Inches(0.45), Inches(1.4), Inches(12.4), Inches(5.5));
add_footer(slide, 9)

# slide 10 workflow diagram
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '9. Paper Generation Workflow', 'The process is linear, validated, and protected by transaction-level checks.');
img = slide.shapes.add_picture(str(FLOW), Inches(0.4), Inches(1.5), Inches(12.5), Inches(5.4));
add_footer(slide, 10)

# slide 11 tech stack
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '10. Technology Stack', 'A light, dependable stack built for academic workflow and role control.')
stack = [
    ('Frontend', 'React + React Router + single-page role-based UI'),
    ('Authentication', 'Supabase Auth + JWT + profile-based role resolution'),
    ('Database', 'Supabase PostgreSQL + Row Level Security + JSONB blueprints'),
    ('Business Logic', 'PL/pgSQL SECURITY DEFINER functions and triggers'),
    ('Export', 'html2canvas + jsPDF + FileSaver for Word/PDF/image outputs'),
    ('DevOps', 'GitHub, collaboration, version control, reproducible deployment')
]
for i, (title, text) in enumerate(stack):
    x = Inches(0.8 + (i % 2) * 6.0)
    y = Inches(1.7 + (i // 2) * 1.8)
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.2), Inches(1.35))
    sh.fill.solid(); sh.fill.fore_color.rgb = WHITE; sh.line.color.rgb = NAVY; sh.line.width = Pt(1.1)
    tb = slide.shapes.add_textbox(x + Inches(0.18), y + Inches(0.12), Inches(4.8), Inches(0.8))
    tf = tb.text_frame
    p = tf.paragraphs[0]; p.text = title
    run = p.runs[0]; run.font.name='Georgia'; run.font.size=Pt(14); run.bold=True; run.font.color.rgb=NAVY
    p2 = tf.add_paragraph(); p2.text = text; run2 = p2.runs[0]; run2.font.name='Segoe UI'; run2.font.size=Pt(10); run2.font.color.rgb=TEXT
add_footer(slide, 11)

# slide 12 security
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '11. Security and Access Control', 'Trust is built into the data layer, not only the UI.')
add_bullets(slide, Inches(0.9), Inches(1.7), Inches(5.5), Inches(4.3), [
    'Supabase Auth validates identity and issues JWT-based sessions.',
    'Role resolution separates admin and teacher responsibilities.',
    'Row Level Security restricts teachers to their allotted subjects.',
    'Each paper generation runs inside one database transaction.',
    'Audit entries are append-only and survive deletion of related records.'
], title='Access control')
add_bullets(slide, Inches(6.7), Inches(1.7), Inches(5.6), Inches(4.3), [
    'The browser never receives the question pool used for generation.',
    'Question text remains in the export file, not in the visible interface.',
    'The server sovereignly decides what is valid and what should fail.',
    'This reduces attack surface and helps maintain integrity under misuse.',
    'The result is a stronger governance model for examination workflows.'
], title='Security guarantees')
add_footer(slide, 12)

# slide 13 traction and impact
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '12. Institutional Impact & Traction', 'The platform is designed to scale from a single department to a wider academic workflow.')
add_metric(slide, Inches(0.9), Inches(1.9), Inches(2.2), Inches(1.8), '1', 'department workflow', color=RED)
add_metric(slide, Inches(3.5), Inches(1.9), Inches(2.2), Inches(1.8), '2+', 'roles', color=RED)
add_metric(slide, Inches(6.1), Inches(1.9), Inches(2.2), Inches(1.8), '100%', 'audit trail', color=RED)
add_metric(slide, Inches(8.7), Inches(1.9), Inches(2.2), Inches(1.8), '3', 'export formats', color=RED)

add_bullets(slide, Inches(0.8), Inches(4.1), Inches(11.7), Inches(1.8), [
    'Reduces clerical effort for every paper generation cycle.',
    'Improves fairness by eliminating question repetition within an exam cycle.',
    'Strengthens confidentiality by keeping generated questions out of the visible interface.',
    'Creates institutional memory through preserved question banks and auditable actions.'
])
add_footer(slide, 13)

# slide 14 competitor comparison
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '13. Competitor Comparison', 'TeacherEase is designed for department-level practicality, not just isolated paper generation.')
rows = [
    ['Capability', 'Manual workflow', 'Generic random generators', 'TeacherEase'],
    ['Cycle-aware repetition control', 'No', 'No', 'Yes'],
    ['Role-based access control', 'Weak', 'Limited', 'Strong'],
    ['Syllabus rule enforcement', 'Manual', 'Partial', 'Database enforced'],
    ['Audit log', 'Absent', 'Limited', 'Append-only'],
    ['Export fidelity', 'Manual', 'Variable', 'Single source / identity'],
]
add_two_column_table(slide, Inches(0.9), Inches(1.7), Inches(11.6), Inches(4.3), ['Capability', 'Manual workflow', 'Generic random generators', 'TeacherEase'], rows)
add_footer(slide, 14)

# slide 15 limitations and future roadmap
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '14. Limitations and Future Scope', 'The current version is practical and secure; the roadmap extends it further.')
add_bullets(slide, Inches(0.9), Inches(1.8), Inches(5.5), Inches(4.0), [
    'The question bank is currently seeded for one subject rather than a full institute-wide repository.',
    'Bulk import of questions and data cleaning remains a next-step improvement.',
    'Math and diagrammatic question support needs stronger formatting and rendering rules.',
    'The process can extend to faculty dashboards, analytics, and institutional reporting.'
], title='Current limitations')
add_bullets(slide, Inches(6.7), Inches(1.8), Inches(5.6), Inches(4.0), [
    'Expand to multiple departments and semesters with shared taxonomy standards.',
    'Introduce bulk question uploads and CSV/Excel import features.',
    'Add analytics on difficulty, Bloom coverage, and question-bank utilization.',
    'Upgrade to deeper AI-assisted quality checks while preserving governance and auditability.'
], title='Roadmap')
add_footer(slide, 15)

# slide 16 team
slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); add_title(slide, '15. Team', 'Student authors and guide for TeacherEase')
# left side: guide card
shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.7), Inches(4.6), Inches(2.0))
shape.fill.solid(); shape.fill.fore_color.rgb = WHITE; shape.line.color.rgb = NAVY; shape.line.width = Pt(1.1)
textbox = slide.shapes.add_textbox(Inches(1.0), Inches(1.95), Inches(4.0), Inches(1.5))
text = textbox.text_frame
p = text.paragraphs[0]; p.text = 'Project Guide'; p.alignment = PP_ALIGN.CENTER
run = p.runs[0]; run.font.name='Georgia'; run.font.size=Pt(15); run.bold=True; run.font.color.rgb=NAVY
p2 = text.add_paragraph(); p2.text = GUIDE; p2.alignment = PP_ALIGN.CENTER
run2 = p2.runs[0]; run2.font.name='Segoe UI'; run2.font.size=Pt(13); run2.font.color.rgb=TEXT

# team list grid
team_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.8), Inches(1.7), Inches(6.7), Inches(4.4))
team_box.fill.solid(); team_box.fill.fore_color.rgb = WHITE; team_box.line.color.rgb = NAVY; team_box.line.width = Pt(1.1)
team_tb = slide.shapes.add_textbox(Inches(6.0), Inches(1.95), Inches(6.2), Inches(3.8))
team_tf = team_tb.text_frame
for idx, name in enumerate(TEAM):
    p = team_tf.paragraphs[0] if idx == 0 else team_tf.add_paragraph()
    p.text = f'{idx + 1}. {name}'
    if idx < 3:
        p.level = 0
    run = p.runs[0]
    run.font.name = 'Segoe UI'
    run.font.size = Pt(12)
    run.font.color.rgb = TEXT

# thank you final
thank = slide.shapes.add_textbox(Inches(0.8), Inches(6.2), Inches(11.7), Inches(0.5))
thank_tf = thank.text_frame
p = thank_tf.paragraphs[0]
p.text = 'Thank You'
p.alignment = PP_ALIGN.CENTER
run = p.runs[0]
run.font.name = 'Georgia'
run.font.size = Pt(20)
run.bold = True
run.font.color.rgb = RED
add_footer(slide, 16)

# Save
prs.save(OUT)
print(f'Created: {OUT}')
