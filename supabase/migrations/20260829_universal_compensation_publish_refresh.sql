-- B040: rebuild bonus/tier qualification snapshots whenever a compensation version is published.

create or replace function private.refresh_comp_qualification_campaign_month(
  p_campaign_id uuid,
  p_event_at timestamptz default now()
) returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_month_start date := date_trunc('month',p_event_at)::date;
  v_month_end date := (date_trunc('month',p_event_at) + interval '1 month - 1 day')::date;
  v_user uuid;
  v_count integer := 0;
begin
  select * into v_campaign from public.campaigns where id=p_campaign_id;
  if not found then return 0; end if;

  if v_campaign.production_source='campaign_enrollments' then
    for v_user in
      select distinct e.agent_id
      from public.campaign_enrollments e
      where e.campaign_id=p_campaign_id
        and e.status='qualified'
        and e.card_orderable=true
        and e.qualified_at>=v_month_start::timestamptz
        and e.qualified_at<(v_month_end+1)::timestamptz
    loop
      perform private.refresh_comp_qualification_snapshot(p_campaign_id,v_user,p_event_at);
      v_count := v_count + 1;
    end loop;
  else
    for v_user in
      select distinct e.user_id
      from public.comp_production_events e
      where e.campaign_id=p_campaign_id
        and e.status='qualified'
        and e.occurred_at>=v_month_start::timestamptz
        and e.occurred_at<(v_month_end+1)::timestamptz
    loop
      perform private.refresh_comp_qualification_snapshot(p_campaign_id,v_user,p_event_at);
      v_count := v_count + 1;
    end loop;
  end if;
  return v_count;
end;
$$;
revoke all on function private.refresh_comp_qualification_campaign_month(uuid,timestamptz) from public,anon,authenticated;

create or replace function private.comp_plan_publish_qualification_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_month date;
  v_end date;
begin
  if new.status='published' and old.status is distinct from 'published' then
    v_end := least(coalesce(new.effective_to,current_date),current_date);
    if new.effective_from<=v_end then
      for v_month in
        select gs::date
        from generate_series(date_trunc('month',new.effective_from)::date,date_trunc('month',v_end)::date,interval '1 month') gs
      loop
        perform private.refresh_comp_qualification_campaign_month(new.campaign_id,v_month::timestamptz);
      end loop;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.comp_plan_publish_qualification_trigger() from public,anon,authenticated;

drop trigger if exists comp_plan_publish_qualification_refresh on public.comp_plan_versions;
create trigger comp_plan_publish_qualification_refresh
after update of status on public.comp_plan_versions
for each row execute function private.comp_plan_publish_qualification_trigger();
