alter function public.academy_enforce_canonical_ava_identity() set search_path = public, pg_temp;
alter function public.enforce_tx_academy_question_quality() set search_path = public, pg_temp;
alter function public.academy_sentence_excerpt(text, integer) set search_path = public, pg_temp;

drop policy if exists academy_instructor_preferences_select_own on public.academy_instructor_preferences;
create policy academy_instructor_preferences_select_own
  on public.academy_instructor_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists academy_instructor_preferences_update_own on public.academy_instructor_preferences;
create policy academy_instructor_preferences_update_own
  on public.academy_instructor_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists academy_instructor_preferences_upsert_own on public.academy_instructor_preferences;
create policy academy_instructor_preferences_upsert_own
  on public.academy_instructor_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
