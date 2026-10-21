-- Coverage rows must belong to a class the teacher owns.
--
-- 0013's policy checked only user_id, so a signed-in teacher could insert a
-- coverage row carrying her own user_id but pointing at somebody else's
-- class_id. RLS then hid the row from that other teacher, so nothing leaked --
-- but the row existed, attached to a class that was never hers.
--
-- Harmless while a class has exactly one owner. Not harmless the moment a class
-- is shared with a school, which is on the roadmap. Cheaper to close now than
-- to find it later with rows already in the table.

drop policy if exists "teacher_coverage_all_own" on public.teacher_coverage;

create policy "teacher_coverage_all_own" on public.teacher_coverage
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.teacher_classes c
      where c.id = teacher_coverage.class_id
        and c.user_id = auth.uid()
    )
  );
