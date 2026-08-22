-- ============================================================
-- Seed: Data Structures — Trees & Graphs, with image questions.
--
-- Image questions carry FIXED uuids so the object name in the
-- question-images bucket is known before the row exists:
--       question-images/<question_id>.png
-- Upload the 12 files listed at the bottom of this script, or
-- attach them from the Question Bank screen (which writes the
-- same name).
--
-- Until a file is uploaded the question still works: the download
-- page reports the image as unavailable and prints the question
-- text alone.
--
-- Idempotent: fixed-id rows use ON CONFLICT DO NOTHING, text-only
-- rows are skipped when the same text already exists.
-- ============================================================
begin;

-- ---------- subject ----------
insert into public.subjects (code, name, semester)
values ('CS/AI/ML302PCC03', 'Data Structures', 3)
on conflict (code) do update
  set name = excluded.name, semester = excluded.semester;

-- ---------- image questions (fixed ids) ----------
-- Unit 4 = Trees, Unit 5 = Graphs. co_no is set = unit_no.
insert into public.questions
  (id, subject_id, unit_no, marks, difficulty, bt_level, co_no, text,
   image_url, is_active)
select v.id::uuid, s.id, v.unit_no, v.marks, v.difficulty, v.bt_level,
       v.unit_no, v.text, v.id || '.png', true
from public.subjects s
cross join (values
  -- ================= UNIT 4 : TREES =================
  ('a4e10001-0000-4000-8000-000000000401', 4, 4, 'medium', 3,
   'For the binary tree shown in the figure, write the preorder, inorder and postorder traversal sequences.'),
  ('a4e10002-0000-4000-8000-000000000402', 4, 4, 'medium', 3,
   'For the binary search tree shown in the figure, delete node 45 and redraw the resulting tree. State which case of deletion applies.'),
  ('a4e10003-0000-4000-8000-000000000403', 4, 4, 'hard', 4,
   'The AVL tree in the figure becomes unbalanced after inserting the given key. Identify the imbalance type and show the rotation performed, with the final balanced tree.'),
  ('a4e10004-0000-4000-8000-000000000404', 4, 4, 'medium', 3,
   'Construct the expression tree for the expression shown in the figure and evaluate it for the given values.'),
  ('a4e10005-0000-4000-8000-000000000405', 4, 4, 'medium', 4,
   'For the tree shown in the figure, determine the height, the number of leaf nodes, and state whether it is a complete binary tree. Justify your answer.'),
  ('a4e10006-0000-4000-8000-000000000406', 4, 4, 'hard', 4,
   'Insert the keys given in the figure into a B-tree of order 3, showing the tree after every split.'),

  -- ================= UNIT 5 : GRAPHS =================
  ('a4e10007-0000-4000-8000-000000000501', 5, 4, 'medium', 3,
   'For the graph shown in the figure, write the adjacency matrix and the adjacency list representation.'),
  ('a4e10008-0000-4000-8000-000000000502', 5, 4, 'medium', 3,
   'For the graph shown in the figure, write the BFS and DFS traversal sequences starting from vertex A.'),
  ('a4e10009-0000-4000-8000-000000000503', 5, 4, 'hard', 4,
   'Apply Dijkstra''s algorithm to the weighted graph in the figure to find the shortest path from the source vertex to every other vertex. Show each iteration.'),
  ('a4e1000a-0000-4000-8000-000000000504', 5, 4, 'hard', 4,
   'Find the minimum spanning tree of the weighted graph shown in the figure using Kruskal''s algorithm. Show the edges in the order selected and give the total cost.'),
  ('a4e1000b-0000-4000-8000-000000000505', 5, 4, 'medium', 3,
   'For the directed acyclic graph shown in the figure, obtain a topological ordering of the vertices and state whether the ordering is unique.'),
  ('a4e1000c-0000-4000-8000-000000000506', 5, 4, 'hard', 4,
   'Examine the two graphs shown in the figure and determine whether they are isomorphic. Justify with degree sequence and vertex mapping.')
) as v(id, unit_no, marks, difficulty, bt_level, text)
where s.code = 'CS/AI/ML302PCC03'
on conflict (id) do nothing;

-- ---------- supporting text-only questions ----------
-- A blueprint slot needs several candidates to choose from; without
-- these the bank would be too thin to generate a paper twice.
insert into public.questions
  (subject_id, unit_no, marks, difficulty, bt_level, co_no, text, is_active)
select s.id, v.unit_no, v.marks, v.difficulty, v.bt_level, v.unit_no, v.text, true
from public.subjects s
cross join (values
  -- ---- Unit 4 : Trees, 1 mark ----
  (4, 1, 'easy', 1, 'Define a binary tree.'),
  (4, 1, 'easy', 1, 'Define a binary search tree.'),
  (4, 1, 'easy', 1, 'Define the height of a tree.'),
  (4, 1, 'easy', 2, 'What is a complete binary tree?'),
  (4, 1, 'easy', 2, 'What is a threaded binary tree?'),
  (4, 1, 'easy', 1, 'Define the balance factor of an AVL tree node.'),
  (4, 1, 'easy', 2, 'State the difference between a full and a complete binary tree.'),
  (4, 1, 'easy', 1, 'Define a leaf node.'),
  (4, 1, 'easy', 2, 'What is the maximum number of nodes at level k of a binary tree?'),
  (4, 1, 'easy', 2, 'Define a B-tree of order m.'),
  -- ---- Unit 4 : Trees, 4 marks ----
  (4, 4, 'medium', 3, 'Construct a binary search tree by inserting the keys 50, 30, 70, 20, 40, 60, 80 in that order and write its inorder traversal.'),
  (4, 4, 'medium', 3, 'Write an algorithm for inorder traversal of a binary tree using a stack, without recursion.'),
  (4, 4, 'medium', 4, 'Compare array and linked representation of a binary tree with respect to memory and access time.'),
  (4, 4, 'medium', 3, 'Explain the four rotations used in an AVL tree with a suitable example of each.'),
  (4, 4, 'medium', 4, 'Derive the maximum and minimum number of nodes in an AVL tree of height h.'),
  -- ---- Unit 5 : Graphs, 1 mark ----
  (5, 1, 'easy', 1, 'Define a directed graph.'),
  (5, 1, 'easy', 1, 'Define the degree of a vertex.'),
  (5, 1, 'easy', 2, 'What is a spanning tree?'),
  (5, 1, 'easy', 1, 'Define a weighted graph.'),
  (5, 1, 'easy', 2, 'What is an adjacency matrix?'),
  (5, 1, 'easy', 1, 'Define a connected graph.'),
  (5, 1, 'easy', 2, 'What is a cycle in a graph?'),
  (5, 1, 'easy', 1, 'Define an acyclic graph.'),
  (5, 1, 'easy', 2, 'State one difference between BFS and DFS.'),
  (5, 1, 'easy', 2, 'What is the space complexity of an adjacency list for a graph with V vertices and E edges?'),
  -- ---- Unit 5 : Graphs, 4 marks ----
  (5, 4, 'medium', 3, 'Write the algorithm for breadth first search and state its time complexity for adjacency list representation.'),
  (5, 4, 'medium', 3, 'Compare adjacency matrix and adjacency list representation with respect to space and edge lookup time.'),
  (5, 4, 'medium', 4, 'Explain Prim''s algorithm for a minimum spanning tree and state how it differs from Kruskal''s algorithm.'),
  (5, 4, 'medium', 3, 'Explain with an example why Dijkstra''s algorithm fails on a graph containing negative edge weights.'),
  (5, 4, 'medium', 4, 'Explain the application of depth first search in detecting a cycle in a directed graph.')
) as v(unit_no, marks, difficulty, bt_level, text)
where s.code = 'CS/AI/ML302PCC03'
  and not exists (
    select 1 from public.questions q
    where q.subject_id = s.id and q.text = v.text
  );

commit;

-- ============================================================
-- Files to upload to the question-images bucket.
-- Run this to get the exact list; the name column is the object
-- name, and it must match exactly (lower case, .png).
-- ============================================================
select q.image_url as upload_this_file_name,
       q.unit_no,
       left(q.text, 60) || '...' as question
from public.questions q
join public.subjects s on s.id = q.subject_id
where s.code = 'CS/AI/ML302PCC03' and q.image_url is not null
order by q.unit_no, q.image_url;

-- bank summary
select unit_no, marks, count(*) as questions,
       count(*) filter (where image_url is not null) as with_image
from public.questions
where subject_id = (select id from public.subjects
                    where code = 'CS/AI/ML302PCC03')
group by unit_no, marks
order by unit_no, marks;

-- ------------------------------------------------------------
-- If you would rather attach the pictures from the Question Bank
-- screen instead of uploading them by hand, clear the paths first
-- so the questions do not point at files that are not there:
--
-- update public.questions set image_url = null
-- where subject_id = (select id from public.subjects
--                     where code = 'CS/AI/ML302PCC03');
-- ------------------------------------------------------------
