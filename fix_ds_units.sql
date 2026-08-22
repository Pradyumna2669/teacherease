-- ============================================================
-- Clean-up after merging the seeded Trees & Graphs questions
-- into CS/AI/ML302PCC03.
--
--   1. removes the duplicated BST-construction question
--   2. moves the seeded questions to the correct unit
--
-- Set the two unit numbers below to match your syllabus.
-- The seed used Unit 4 = Trees and Unit 5 = Graphs, which are
-- Stacks and Queues in your bank, so they must be moved.
--
-- Only the seeded rows are touched: image questions are matched
-- by their fixed ids, text questions by their exact text.
-- ============================================================
begin;

-- ---------- 1. the duplicate ----------
-- The Unit 4 copy (seeded) is already referenced by a generated paper, so it
-- cannot be deleted - the foreign key on paper_questions protects papers that
-- have already been issued. Deactivate it instead: is_active = false is the
-- soft delete this system uses everywhere, and the generator skips it from
-- here on. Your Unit 6 version is kept and stays selectable.
update public.questions
   set is_active = false
 where id = 'd1f090a7-b74b-46d6-8fe1-94e7e118d8c2';

-- ---------- 2. remap ----------
do $$
declare
  v_subject uuid;
  v_trees   int := 6;   -- <== unit number for TREES in your syllabus
  v_graphs  int := 6;   -- <== unit number for GRAPHS in your syllabus
  n int;
begin
  select id into v_subject from public.subjects
   where code = 'CS/AI/ML302PCC03';
  if v_subject is null then
    raise exception 'Subject CS/AI/ML302PCC03 not found.';
  end if;

  -- trees: image questions
  update public.questions
     set unit_no = v_trees, co_no = v_trees
   where subject_id = v_subject
     and id in (
    'a4e10001-0000-4000-8000-000000000401',
    'a4e10002-0000-4000-8000-000000000402',
    'a4e10003-0000-4000-8000-000000000403',
    'a4e10004-0000-4000-8000-000000000404',
    'a4e10005-0000-4000-8000-000000000405',
    'a4e10006-0000-4000-8000-000000000406'
     );
  get diagnostics n = row_count;
  raise notice 'trees, image questions moved: %', n;

  -- trees: text questions
  update public.questions
     set unit_no = v_trees, co_no = v_trees
   where subject_id = v_subject
     and text in (
    'Define a binary tree.',
    'Define a binary search tree.',
    'Define the height of a tree.',
    'What is a complete binary tree?',
    'What is a threaded binary tree?',
    'Define the balance factor of an AVL tree node.',
    'State the difference between a full and a complete binary tree.',
    'Define a leaf node.',
    'What is the maximum number of nodes at level k of a binary tree?',
    'Define a B-tree of order m.',
    'Construct a binary search tree by inserting the keys 50, 30, 70, 20, 40, 60, 80 in that order and write its inorder traversal.',
    'Write an algorithm for inorder traversal of a binary tree using a stack, without recursion.',
    'Compare array and linked representation of a binary tree with respect to memory and access time.',
    'Explain the four rotations used in an AVL tree with a suitable example of each.',
    'Derive the maximum and minimum number of nodes in an AVL tree of height h.'
     );
  get diagnostics n = row_count;
  raise notice 'trees, text questions moved: %', n;

  -- graphs: image questions
  update public.questions
     set unit_no = v_graphs, co_no = v_graphs
   where subject_id = v_subject
     and id in (
    'a4e10007-0000-4000-8000-000000000501',
    'a4e10008-0000-4000-8000-000000000502',
    'a4e10009-0000-4000-8000-000000000503',
    'a4e1000a-0000-4000-8000-000000000504',
    'a4e1000b-0000-4000-8000-000000000505',
    'a4e1000c-0000-4000-8000-000000000506'
     );
  get diagnostics n = row_count;
  raise notice 'graphs, image questions moved: %', n;

  -- graphs: text questions
  update public.questions
     set unit_no = v_graphs, co_no = v_graphs
   where subject_id = v_subject
     and text in (
    'Define a directed graph.',
    'Define the degree of a vertex.',
    'What is a spanning tree?',
    'Define a weighted graph.',
    'What is an adjacency matrix?',
    'Define a connected graph.',
    'What is a cycle in a graph?',
    'Define an acyclic graph.',
    'State one difference between BFS and DFS.',
    'What is the space complexity of an adjacency list for a graph with V vertices and E edges?',
    'Write the algorithm for breadth first search and state its time complexity for adjacency list representation.',
    'Compare adjacency matrix and adjacency list representation with respect to space and edge lookup time.',
    'Explain Prim''s algorithm for a minimum spanning tree and state how it differs from Kruskal''s algorithm.',
    'Explain with an example why Dijkstra''s algorithm fails on a graph containing negative edge weights.',
    'Explain the application of depth first search in detecting a cycle in a directed graph.'
     );
  get diagnostics n = row_count;
  raise notice 'graphs, text questions moved: %', n;
end $$;

commit;

-- ---------- optional: hard delete instead ----------
-- Only if the paper referencing it was a throwaway test. This destroys that
-- paper. Find which papers use the question first:
--
-- select p.id, p.title, p.variant, p.created_at
-- from public.papers p
-- join public.paper_questions pq on pq.paper_id = p.id
-- where pq.question_id = 'd1f090a7-b74b-46d6-8fe1-94e7e118d8c2';
--
-- Then, for each throwaway paper id:
--
-- delete from public.paper_questions where paper_id = '<paper-id>';
-- delete from public.papers          where id = '<paper-id>';
-- delete from public.questions       where id = 'd1f090a7-b74b-46d6-8fe1-94e7e118d8c2';

-- ---------- check ----------
select unit_no, marks, count(*) as questions,
       count(*) filter (where image_url is not null) as with_image
from public.questions
where subject_id = (select id from public.subjects
                    where code = 'CS/AI/ML302PCC03')
  and is_active
group by unit_no, marks
order by unit_no, marks;
