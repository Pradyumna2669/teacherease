"""Render Fig. 1 (system architecture) and Fig. 2 (paper generation workflow).

Drawn with Pillow at 3x and downsampled, so the edges and text stay crisp when
Word scales the PNG down to page width. No matplotlib/graphviz needed.

Run:  python make_diagrams.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

S = 3                                   # supersampling factor
FONTS = r"C:\Windows\Fonts"

def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(os.path.join(FONTS, name), size * S)
    except OSError:
        return ImageFont.load_default()

# palette — greys and one accent, prints cleanly in black and white
INK      = (17, 24, 39)
MUTED    = (107, 114, 128)
LINE     = (75, 85, 99)
BAND     = (243, 244, 246)
BAND_EDGE= (209, 213, 219)
BOX      = (255, 255, 255)
ACCENT   = (191, 30, 45)      # maroon, matches the synopsis headings
ACCENT_BG= (253, 242, 243)
BLUE_BG  = (239, 246, 255)
BLUE_ED  = (147, 197, 253)


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w * S, h * S), "white")
        self.d = ImageDraw.Draw(self.img)

    # ---------------------------------------------------------------- prims
    def band(self, x, y, w, h, label, fill=BAND, edge=BAND_EDGE):
        self.d.rounded_rectangle([x*S, y*S, (x+w)*S, (y+h)*S], radius=8*S,
                                 fill=fill, outline=edge, width=2*S)
        if label:
            self.d.text((x*S + 10*S, y*S + 8*S), label, font=font(11, True),
                        fill=MUTED)

    def box(self, x, y, w, h, title, lines=(), fill=BOX, edge=LINE,
            tsize=13, lsize=11, width=2):
        self.d.rounded_rectangle([x*S, y*S, (x+w)*S, (y+h)*S], radius=6*S,
                                 fill=fill, outline=edge, width=width*S)
        ft, fl = font(tsize, True), font(lsize)
        total = self._th(title, ft) + sum(self._th(l, fl) + 3 for l in lines)
        cy = y + (h - total) / 2
        self._ctext(x + w/2, cy, title, ft, INK)
        cy += self._th(title, ft) + 4
        for l in lines:
            self._ctext(x + w/2, cy, l, fl, MUTED)
            cy += self._th(l, fl) + 3
        return (x, y, w, h)

    def diamond(self, cx, cy, w, h, lines, fill=ACCENT_BG, edge=ACCENT):
        pts = [(cx*S, (cy-h/2)*S), ((cx+w/2)*S, cy*S),
               (cx*S, (cy+h/2)*S), ((cx-w/2)*S, cy*S)]
        self.d.polygon(pts, fill=fill, outline=edge)
        self.d.line(pts + [pts[0]], fill=edge, width=2*S)
        f = font(11, True)
        th = sum(self._th(l, f) + 2 for l in lines)
        y = cy - th/2
        for l in lines:
            self._ctext(cx, y, l, f, INK)
            y += self._th(l, f) + 2

    def arrow(self, p1, p2, label=None, dashed=False, color=LINE, lpos=0.5,
              lside="right"):
        x1, y1 = p1[0]*S, p1[1]*S
        x2, y2 = p2[0]*S, p2[1]*S
        if dashed:
            self._dashed(x1, y1, x2, y2, color)
        else:
            self.d.line([x1, y1, x2, y2], fill=color, width=2*S)
        self._head(x1, y1, x2, y2, color)
        if label:
            mx, my = p1[0] + (p2[0]-p1[0])*lpos, p1[1] + (p2[1]-p1[1])*lpos
            f = font(10)
            w = self.d.textlength(label, font=f) / S
            ox = 6 if lside == "right" else -(w + 6)
            self.d.rectangle([(mx+ox-2)*S, (my-7)*S, (mx+ox+w+2)*S, (my+7)*S],
                             fill="white")
            self.d.text(((mx+ox)*S, (my-6)*S), label, font=f, fill=MUTED)

    def elbow(self, p1, p2, label=None, color=LINE):
        """Right-angled connector: horizontal then vertical."""
        x1, y1 = p1
        x2, y2 = p2
        self.d.line([x1*S, y1*S, x2*S, y1*S], fill=color, width=2*S)
        self.d.line([x2*S, y1*S, x2*S, y2*S], fill=color, width=2*S)
        self._head(x2*S, (y1)*S, x2*S, y2*S, color)
        if label:
            f = font(10)
            self.d.text(((x1 + (x2-x1)/2)*S, (y1-16)*S), label, font=f, fill=MUTED)

    def caption(self, y, text):
        self._ctext(self.w/2, y, text, font(12, True), INK)

    # -------------------------------------------------------------- helpers
    def _th(self, text, f):
        bb = self.d.textbbox((0, 0), text, font=f)
        return (bb[3] - bb[1]) / S + 2

    def _ctext(self, cx, y, text, f, fill):
        w = self.d.textlength(text, font=f) / S
        self.d.text(((cx - w/2)*S, y*S), text, font=f, fill=fill)

    def _head(self, x1, y1, x2, y2, color):
        import math
        a = math.atan2(y2-y1, x2-x1)
        L = 9*S
        for s in (0.45, -0.45):
            self.d.line([x2, y2, x2 - L*math.cos(a-s), y2 - L*math.sin(a-s)],
                        fill=color, width=2*S)

    def _dashed(self, x1, y1, x2, y2, color, dash=8*S, gap=6*S):
        import math
        d = math.hypot(x2-x1, y2-y1)
        n = int(d // (dash+gap))
        for i in range(n+1):
            s = i*(dash+gap)
            e = min(s+dash, d)
            if s >= d:
                break
            self.d.line([x1 + (x2-x1)*s/d, y1 + (y2-y1)*s/d,
                         x1 + (x2-x1)*e/d, y1 + (y2-y1)*e/d],
                        fill=color, width=2*S)

    def save(self, path):
        self.img.resize((self.w, self.h), Image.LANCZOS).save(path, dpi=(200, 200))
        print("wrote", path)


# ============================================================== FIGURE 1 ====
def architecture():
    c = Canvas(1100, 760)
    c._ctext(550, 14, "System Architecture — TeacherEase", font(16, True), INK)

    # ---- Presentation layer
    c.band(40, 55, 1020, 150, "PRESENTATION LAYER  —  React Single Page Application")
    c.box(60, 90, 210, 95, "Admin Module",
          ["Subjects · Allotments", "All Papers · Audit Log"], fill=BLUE_BG, edge=BLUE_ED)
    c.box(290, 90, 210, 95, "Question Bank",
          ["Unit-wise entry", "Marks · BTL · CO"], fill=BLUE_BG, edge=BLUE_ED)
    c.box(520, 90, 210, 95, "Generate Paper",
          ["Format · Cycle", "Variant selection"], fill=BLUE_BG, edge=BLUE_ED)
    c.box(750, 90, 290, 95, "Download / Export",
          ["html2canvas · jsPDF · FileSaver", "off-screen render node"],
          fill=BLUE_BG, edge=BLUE_ED)

    # ---- Security layer
    c.band(40, 230, 1020, 90, "SECURITY LAYER")
    c.box(60, 258, 300, 52, "Supabase Auth (JWT)", ["session + role claim"])
    c.box(390, 258, 300, 52, "Row Level Security", ["teacher-scoped / admin-scoped"])
    c.box(720, 258, 320, 52, "RequireRole route guard", ["client-side UI gating"])

    # ---- Application logic layer
    c.band(40, 345, 1020, 175,
           "APPLICATION LOGIC LAYER  —  PostgreSQL functions (SECURITY DEFINER)")
    c.box(60, 382, 300, 120, "generate_paper()",
          ["filter by unit + marks", "exclude used-in-cycle", "sufficiency check",
           "randomize · insert"], fill=ACCENT_BG, edge=ACCENT)
    c.box(390, 382, 300, 120, "delete_subject()",
          ["admin check", "code confirmation", "cascade delete", "audit write"])
    c.box(720, 382, 320, 120, "Audit triggers",
          ["paper.generate", "subject.create / delete", "question.delete",
           "allotment.grant / revoke"])

    # ---- Data layer
    c.band(40, 545, 1020, 140, "DATA LAYER  —  Supabase PostgreSQL")
    for i, (t, sub) in enumerate([
            ("subjects", "code · name"), ("questions", "unit · marks · BTL · CO"),
            ("paper_formats", "blueprint JSONB"), ("exam_cycles", "cycle name"),
            ("papers", "variant · cycle"), ("paper_questions", "q_no · part · pos"),
            ("audit_logs", "append-only")]):
        x = 55 + i * 145
        c.box(x, 585, 135, 72, t, [sub], tsize=11, lsize=9, width=1)

    # ---- flows
    c.arrow((550, 205), (550, 230), "HTTPS + JWT")
    c.arrow((550, 320), (550, 345), "REST / RPC call")
    c.arrow((550, 520), (550, 545), "SQL inside one transaction")
    c.arrow((980, 545), (980, 205), color=MUTED, dashed=True)
    c._ctext(1000, 360, "", font(9), MUTED)
    c.d.text((905*S, 350*S), "paper id +", font=font(9), fill=MUTED)
    c.d.text((905*S, 362*S), "stored rows only", font=font(9), fill=MUTED)

    c.caption(710, "Fig. 1  Layered system architecture of TeacherEase")
    c.d.text((40*S, 732*S),
             "Question selection never leaves the data layer; the browser receives "
             "only the identifier of the generated paper.",
             font=font(10), fill=MUTED)
    c.save("fig1_architecture.png")


# ============================================================== FIGURE 2 ====
def workflow():
    c = Canvas(1100, 1180)
    c._ctext(550, 14, "Paper Generation Workflow", font(16, True), INK)

    L = 300      # left column centre
    R = 830      # right column centre

    # left column — the happy path
    c.box(L-150, 50, 300, 54, "Teacher logs in", ["JWT session + role"])
    c.box(L-150, 130, 300, 54, "Opens Question Bank", ["adds / activates questions"])
    c.box(L-150, 210, 300, 66, "Selects format, cycle, variant",
          ["blueprint JSON · exam cycle", "normal or backlog"])
    c.box(L-150, 302, 300, 54, "Calls generate_paper()", ["transaction begins"],
          fill=ACCENT_BG, edge=ACCENT)

    c.box(L-150, 382, 300, 66, "For each blueprint slot",
          ["e.g. 3 questions, Unit 1, 1 mark"])
    c.box(L-150, 474, 300, 84, "Filter candidate pool",
          ["subject · unit · marks", "is_active = true"])
    c.box(L-150, 584, 300, 84, "Exclude questions already",
          ["issued in this exam cycle", "→ no repeat with Normal paper"],
          fill=ACCENT_BG, edge=ACCENT)

    c.diamond(L, 730, 300, 100, ["Enough candidates", "for this slot?"])

    c.box(L-150, 812, 300, 66, "ORDER BY random() LIMIT n",
          ["bounded top-N selection"])
    c.box(L-150, 904, 300, 66, "Insert into paper_questions",
          ["q_no · part · position · marks"])
    c.box(L-150, 996, 300, 54, "COMMIT — paper stored", ["audit trigger fires"])

    # right column — failure path and outputs
    c.box(R-150, 700, 300, 84, "RAISE EXCEPTION",
          ["\"Unit 1 (2 marks): need 3,", "only 1 available\""],
          fill=ACCENT_BG, edge=ACCENT)
    c.box(R-150, 812, 300, 66, "ROLLBACK",
          ["no partial paper is written"])
    c.box(R-150, 904, 300, 54, "Teacher informed", ["add questions, retry"])

    c.box(R-150, 996, 300, 54, "Audit log entry", ["timestamp · actor · summary"])
    c.box(R-150, 1076, 300, 60, "Export: Word / PDF / Image",
          ["one HTML source, off-screen"])
    c.box(L-150, 1076, 300, 60, "Download page", ["renders stored paper"])

    # ---- arrows
    c.arrow((L, 104), (L, 130))
    c.arrow((L, 184), (L, 210))
    c.arrow((L, 276), (L, 302))
    c.arrow((L, 356), (L, 382))
    c.arrow((L, 448), (L, 474))
    c.arrow((L, 558), (L, 584))
    c.arrow((L, 668), (L, 680))
    c.arrow((L, 780), (L, 812), "Yes")
    c.arrow((L+150, 730), (R-150, 730), "No", lpos=0.35)
    c.arrow((R, 784), (R, 812))
    c.arrow((R, 878), (R, 904))
    c.arrow((L, 878), (L, 904))
    c.arrow((L, 970), (L, 996))
    c.arrow((L+150, 1023), (R-150, 1023))
    c.arrow((L, 1050), (L, 1076))
    c.arrow((L+150, 1106), (R-150, 1106))

    # loop back for the next blueprint slot
    c.d.line([(L-150)*S, 940*S, 120*S, 940*S], fill=LINE, width=2*S)
    c.d.line([120*S, 940*S, 120*S, 415*S], fill=LINE, width=2*S)
    c.d.line([120*S, 415*S, (L-150)*S, 415*S], fill=LINE, width=2*S)
    c._head(130*S, 415*S, (L-150)*S, 415*S, LINE)
    # label sits left of the return line so it clears the boxes
    c.d.text((46*S, 690*S), "next", font=font(10), fill=MUTED)
    c.d.text((46*S, 704*S), "slot", font=font(10), fill=MUTED)

    c.caption(1150, "Fig. 2  Workflow of blueprint-driven paper generation "
                    "with cycle-aware non-repetition")
    c.save("fig2_workflow.png")


if __name__ == "__main__":
    architecture()
    workflow()
