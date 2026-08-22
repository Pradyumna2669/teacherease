"""Render the 12 tree and graph figures for the Data Structures seed.

Each file is named after the question id it belongs to, so the output can be
uploaded to the question-images bucket as-is:

    question_images/<question_id>.png

Drawn with Pillow at 3x and downsampled — black on white, no colour, so the
figures print cleanly on an exam paper.

Run:  python make_ds_figures.py
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

S = 3                                   # supersampling
OUT_DIR = "question_images"
FONTS = r"C:\Windows\Fonts"

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREY = (110, 110, 110)


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(os.path.join(FONTS, name), size * S)
    except OSError:
        return ImageFont.load_default()


class Fig:
    def __init__(self, w=640, h=420):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w * S, h * S), WHITE)
        self.d = ImageDraw.Draw(self.img)

    # --- primitives ----------------------------------------------------------
    def edge(self, p1, p2, *, weight=None, directed=False, width=2):
        x1, y1 = p1[0] * S, p1[1] * S
        x2, y2 = p2[0] * S, p2[1] * S
        self.d.line([x1, y1, x2, y2], fill=BLACK, width=width * S)
        if directed:
            self._arrow_head(p1, p2)
        if weight is not None:
            mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
            self._chip(mx, my, str(weight))

    def _arrow_head(self, p1, p2, r=24, size=11):
        """Arrow head placed on the circle edge of the target node."""
        a = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        tx, ty = p2[0] - r * math.cos(a), p2[1] - r * math.sin(a)
        pts = [
            (tx * S, ty * S),
            ((tx - size * math.cos(a - 0.42)) * S, (ty - size * math.sin(a - 0.42)) * S),
            ((tx - size * math.cos(a + 0.42)) * S, (ty - size * math.sin(a + 0.42)) * S),
        ]
        self.d.polygon(pts, fill=BLACK)

    def _chip(self, cx, cy, text, size=13):
        f = font(size)
        tw = self.d.textlength(text, font=f) / S
        pad = 4
        self.d.rectangle([(cx - tw / 2 - pad) * S, (cy - 9) * S,
                          (cx + tw / 2 + pad) * S, (cy + 9) * S], fill=WHITE)
        self.d.text(((cx - tw / 2) * S, (cy - 8) * S), text, font=f, fill=BLACK)

    def node(self, p, label, *, r=22, size=15, bold=True, note=None):
        x, y = p[0] * S, p[1] * S
        rr = r * S
        self.d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=WHITE,
                       outline=BLACK, width=2 * S)
        f = font(size, bold)
        tw = self.d.textlength(str(label), font=f) / S
        self.d.text((x - tw / 2 * S, y - (size * 0.72) * S), str(label),
                    font=f, fill=BLACK)
        if note:
            fn = font(11)
            nw = self.d.textlength(note, font=fn) / S
            self.d.text(((p[0] - nw / 2) * S, (p[1] + r + 4) * S), note,
                        font=fn, fill=GREY)

    def box(self, p, label, *, w=52, h=38, size=15):
        x, y = p
        self.d.rectangle([(x - w / 2) * S, (y - h / 2) * S,
                          (x + w / 2) * S, (y + h / 2) * S],
                         fill=WHITE, outline=BLACK, width=2 * S)
        f = font(size, True)
        tw = self.d.textlength(str(label), font=f) / S
        self.d.text(((x - tw / 2) * S, (y - size * 0.72) * S), str(label),
                    font=f, fill=BLACK)

    def title(self, text, y=18, size=15):
        f = font(size, True)
        tw = self.d.textlength(text, font=f) / S
        self.d.text(((self.w / 2 - tw / 2) * S, y * S), text, font=f, fill=BLACK)

    def caption(self, text, size=13, y=None):
        f = font(size)
        tw = self.d.textlength(text, font=f) / S
        yy = self.h - 30 if y is None else y
        self.d.text(((self.w / 2 - tw / 2) * S, yy * S), text, font=f, fill=BLACK)

    def label_at(self, p, text, size=13, bold=False):
        f = font(size, bold)
        tw = self.d.textlength(text, font=f) / S
        self.d.text(((p[0] - tw / 2) * S, p[1] * S), text, font=f, fill=BLACK)

    def save(self, name):
        os.makedirs(OUT_DIR, exist_ok=True)
        path = os.path.join(OUT_DIR, name)
        self.img.resize((self.w, self.h), Image.LANCZOS).save(path, optimize=True)
        print("  ", name)


def tree(f, nodes, edges, **kw):
    """nodes: {label: (x, y)} ; edges: [(parent, child)]"""
    for a, b in edges:
        f.edge(nodes[a], nodes[b])
    for label, p in nodes.items():
        f.node(p, str(label).split("#")[0], **kw)


# =============================================================== UNIT 4 =====
def fig_traversal():
    f = Fig()
    f.title("Binary tree")
    n = {"A": (320, 70), "B": (190, 155), "C": (450, 155),
         "D": (120, 245), "E": (255, 245), "F": (385, 245), "G": (515, 245),
         "H": (70, 335), "I": (185, 335)}
    e = [("A", "B"), ("A", "C"), ("B", "D"), ("B", "E"),
         ("C", "F"), ("C", "G"), ("D", "H"), ("D", "I")]
    tree(f, n, e)
    f.caption("Write the preorder, inorder and postorder traversals.")
    f.save("a4e10001-0000-4000-8000-000000000401.png")


def fig_bst_delete():
    f = Fig()
    f.title("Binary search tree")
    n = {50: (320, 70), 30: (190, 155), 70: (450, 155),
         20: (120, 245), 45: (262, 245), 60: (385, 245), 80: (515, 245),
         40: (205, 330), 47: (312, 330)}
    e = [(50, 30), (50, 70), (30, 20), (30, 45), (70, 60), (70, 80),
         (45, 40), (45, 47)]
    tree(f, n, e)
    f.caption("Delete node 45 and redraw the tree.")
    f.save("a4e10002-0000-4000-8000-000000000402.png")


def fig_avl():
    f = Fig(640, 400)
    f.title("AVL tree after inserting 10")
    n = {30: (330, 90), 20: (210, 190), 40: (450, 190), 10: (110, 290)}
    for a, b in [(30, 20), (30, 40), (20, 10)]:
        f.edge(n[a], n[b])
    f.node(n[30], 30, note="bf = +2")
    f.node(n[20], 20, note="bf = +1")
    f.node(n[40], 40, note="bf = 0")
    f.node(n[10], 10, note="bf = 0  (newly inserted)")
    f.caption("Identify the imbalance and show the rotation.")
    f.save("a4e10003-0000-4000-8000-000000000403.png")


def fig_expression_tree():
    f = Fig()
    f.title("Expression tree")
    n = {"*": (320, 70), "+": (190, 165), "-": (450, 165),
         "a": (120, 260), "b": (258, 260), "c": (385, 260), "5": (515, 260)}
    e = [("*", "+"), ("*", "-"), ("+", "a"), ("+", "b"), ("-", "c"), ("-", "5")]
    tree(f, n, e)
    f.caption("Evaluate for a = 4, b = 2, c = 9.")
    f.save("a4e10004-0000-4000-8000-000000000404.png")


def fig_tree_props():
    f = Fig()
    f.title("Binary tree")
    n = {1: (320, 70), 2: (195, 158), 3: (455, 158),
         4: (120, 246), 5: (270, 246), 6: (530, 246), 7: (215, 334)}
    e = [(1, 2), (1, 3), (2, 4), (2, 5), (3, 6), (5, 7)]
    tree(f, n, e)
    f.caption("State the height, the number of leaves, and whether it is complete.")
    f.save("a4e10005-0000-4000-8000-000000000405.png")


def fig_btree_keys():
    f = Fig(640, 300)
    f.title("Insert the following keys into a B-tree of order 3")
    keys = [10, 20, 5, 6, 12, 30, 7, 17]
    x0, gap = 78, 70
    for i, k in enumerate(keys):
        f.box((x0 + i * gap, 150), k)
    f.label_at((320, 205), "insertion order: left to right", 12)
    f.caption("Show the tree after every split.")
    f.save("a4e10006-0000-4000-8000-000000000406.png")


# =============================================================== UNIT 5 =====
def fig_adjacency():
    f = Fig(640, 400)
    f.title("Undirected graph G")
    n = {"A": (320, 80), "B": (170, 190), "C": (470, 190),
         "D": (225, 320), "E": (415, 320)}
    for a, b in [("A", "B"), ("A", "C"), ("B", "C"), ("B", "D"),
                 ("C", "E"), ("D", "E")]:
        f.edge(n[a], n[b])
    for k, p in n.items():
        f.node(p, k)
    f.caption("Write the adjacency matrix and the adjacency list.")
    f.save("a4e10007-0000-4000-8000-000000000501.png")


def fig_bfs_dfs():
    f = Fig(640, 400)
    f.title("Graph G")
    n = {"A": (110, 100), "B": (300, 70), "C": (110, 280),
         "D": (320, 210), "E": (300, 340), "F": (520, 200)}
    for a, b in [("A", "B"), ("A", "C"), ("B", "D"), ("C", "D"),
                 ("C", "E"), ("D", "F"), ("E", "F")]:
        f.edge(n[a], n[b])
    for k, p in n.items():
        f.node(p, k)
    f.caption("Write the BFS and DFS sequences starting from A.")
    f.save("a4e10008-0000-4000-8000-000000000502.png")


def fig_dijkstra():
    f = Fig(640, 400)
    f.title("Weighted graph, source S")
    n = {"S": (100, 200), "A": (280, 90), "B": (280, 310),
         "C": (450, 90), "D": (450, 310), "E": (585, 200)}
    for a, b, w in [("S", "A", 4), ("S", "B", 2), ("A", "B", 1),
                    ("A", "C", 5), ("B", "D", 8), ("C", "D", 2),
                    ("C", "E", 6), ("D", "E", 3)]:
        f.edge(n[a], n[b], weight=w)
    for k, p in n.items():
        f.node(p, k)
    f.caption("Find the shortest path from S to every vertex. Show each iteration.")
    f.save("a4e10009-0000-4000-8000-000000000503.png")


def fig_kruskal():
    f = Fig(640, 400)
    f.title("Weighted graph")
    n = {1: (110, 110), 2: (320, 70), 3: (530, 110),
         4: (110, 300), 5: (320, 340), 6: (530, 300)}
    for a, b, w in [(1, 2, 7), (2, 3, 9), (1, 4, 5), (2, 4, 8),
                    (2, 5, 6), (3, 6, 4), (4, 5, 12), (5, 6, 10),
                    (3, 5, 11)]:
        f.edge(n[a], n[b], weight=w)
    for k, p in n.items():
        f.node(p, k)
    f.caption("Find the minimum spanning tree using Kruskal's algorithm.")
    f.save("a4e1000a-0000-4000-8000-000000000504.png")


def fig_dag():
    f = Fig(640, 380)
    f.title("Directed acyclic graph")
    n = {"A": (95, 100), "B": (95, 280), "C": (270, 190),
         "D": (430, 90), "E": (430, 290), "F": (580, 190)}
    for a, b in [("A", "C"), ("B", "C"), ("A", "D"), ("C", "D"),
                 ("C", "E"), ("D", "F"), ("E", "F")]:
        f.edge(n[a], n[b], directed=True)
    for k, p in n.items():
        f.node(p, k)
    f.caption("Give a topological ordering. Is it unique?")
    f.save("a4e1000b-0000-4000-8000-000000000505.png")


def fig_isomorphism():
    f = Fig(680, 400)
    f.title("Are G1 and G2 isomorphic?")

    # G1 — pentagon
    cx, cy, r = 170, 220, 105
    p1 = {}
    for i, name in enumerate(["u1", "u2", "u3", "u4", "u5"]):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        p1[name] = (cx + r * math.cos(a), cy + r * math.sin(a))
    order = ["u1", "u2", "u3", "u4", "u5"]
    for i in range(5):
        f.edge(p1[order[i]], p1[order[(i + 1) % 5]])
    for k, p in p1.items():
        f.node(p, k, r=21, size=12)
    f.label_at((170, 355), "G1", 14, True)

    # G2 — the same cycle drawn as a five-point star
    cx2 = 500
    p2 = {}
    for i, name in enumerate(["v1", "v2", "v3", "v4", "v5"]):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        p2[name] = (cx2 + r * math.cos(a), cy + r * math.sin(a))
    order2 = ["v1", "v3", "v5", "v2", "v4"]
    for i in range(5):
        f.edge(p2[order2[i]], p2[order2[(i + 1) % 5]])
    for k, p in p2.items():
        f.node(p, k, r=21, size=12)
    f.label_at((500, 355), "G2", 14, True)

    f.caption("Justify with degree sequence and a vertex mapping.", y=378)
    f.save("a4e1000c-0000-4000-8000-000000000506.png")


if __name__ == "__main__":
    print("writing figures to", OUT_DIR + "/")
    for fn in [fig_traversal, fig_bst_delete, fig_avl, fig_expression_tree,
               fig_tree_props, fig_btree_keys, fig_adjacency, fig_bfs_dfs,
               fig_dijkstra, fig_kruskal, fig_dag, fig_isomorphism]:
        fn()
    print("done — 12 figures")
