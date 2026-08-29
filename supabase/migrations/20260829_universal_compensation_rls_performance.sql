-- B040 follow-up: optimize the new universal compensation production-event table.

create index if not exists comp_production_events_user_id_idx
  on public.comp_production_events(user_id);
create index if not exists comp_production_events_created_by_idx
  on public.comp_production_events(created_by)
  where created_by is not null;

drop policy if exists comp_production_events_self_read on public.comp_production_events;
drop policy if exists comp_production_events_admin_write on public.comp_production_events;
drop policy if exists comp_production_events_admin_insert on public.comp_production_events;
drop policy if exists comp_production_events_admin_update on public.comp_production_events;
drop policy if exists comp_production_events_admin_delete on public.comp_production_events;

create policy comp_production_events_self_read on public.comp_production_events
  for select to authenticated
  using (user_id=(select auth.uid()) or private.is_owner_or_admin());

create policy comp_production_events_admin_insert on public.comp_production_events
  for insert to authenticated
  with check (private.is_owner_or_admin());

create policy comp_production_events_admin_update on public.comp_production_events
  for update to authenticated
  using (private.is_owner_or_admin())
  with check (private.is_owner_or_admin());

create policy comp_production_events_admin_delete on public.comp_production_events
  for delete to authenticated
  using (private.is_owner_or_admin());
