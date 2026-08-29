-- B041 hardening: published compensation and signed agreement content are immutable.

create or replace function private.guard_published_contract_body()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if old.status in ('published','retired') and (
    new.body_markdown is distinct from old.body_markdown or
    new.body_hash is distinct from old.body_hash or
    new.comp_plan_version_id is distinct from old.comp_plan_version_id or
    new.version is distinct from old.version or
    new.effective_from is distinct from old.effective_from
  ) then
    raise exception 'Published compensation agreement content is immutable; create a new compensation version.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_published_contract_body() from public,anon,authenticated;
drop trigger if exists guard_published_contract_body on public.contract_plan_versions;
create trigger guard_published_contract_body
before update on public.contract_plan_versions
for each row execute function private.guard_published_contract_body();

create or replace function private.guard_published_comp_plan_terms()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if old.status in ('published','retired') and (
    new.effective_from is distinct from old.effective_from or
    new.base_enrollment_amount is distinct from old.base_enrollment_amount or
    new.base_rate is distinct from old.base_rate or
    new.rate_basis is distinct from old.rate_basis or
    new.metric_key is distinct from old.metric_key or
    new.unit_label is distinct from old.unit_label or
    new.weekly_arrears_days is distinct from old.weekly_arrears_days or
    new.payday_dow is distinct from old.payday_dow or
    new.open_enrollment_start_mmdd is distinct from old.open_enrollment_start_mmdd or
    new.open_enrollment_end_mmdd is distinct from old.open_enrollment_end_mmdd or
    new.reconciliation_end_mmdd is distinct from old.reconciliation_end_mmdd or
    new.residual_pool_per_member is distinct from old.residual_pool_per_member or
    new.residuals_enabled is distinct from old.residuals_enabled or
    new.config is distinct from old.config or
    new.contract_terms is distinct from old.contract_terms
  ) then
    raise exception 'Published compensation terms are immutable; create a new draft version.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_published_comp_plan_terms() from public,anon,authenticated;
drop trigger if exists guard_published_comp_plan_terms on public.comp_plan_versions;
create trigger guard_published_comp_plan_terms
before update on public.comp_plan_versions
for each row execute function private.guard_published_comp_plan_terms();

create or replace function private.guard_published_comp_child()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_plan_id uuid;
  v_status text;
begin
  v_plan_id := case when tg_op='DELETE' then old.plan_version_id else new.plan_version_id end;
  select status into v_status from public.comp_plan_versions where id=v_plan_id;
  if v_status is distinct from 'draft' then
    raise exception 'Published compensation rules are immutable; create a new draft version.';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function private.guard_published_comp_child() from public,anon,authenticated;

drop trigger if exists guard_published_comp_bonus on public.comp_bonus_rules;
create trigger guard_published_comp_bonus before insert or update or delete on public.comp_bonus_rules for each row execute function private.guard_published_comp_child();
drop trigger if exists guard_published_comp_tier on public.comp_tier_rules;
create trigger guard_published_comp_tier before insert or update or delete on public.comp_tier_rules for each row execute function private.guard_published_comp_child();
drop trigger if exists guard_published_comp_residual on public.comp_residual_splits;
create trigger guard_published_comp_residual before insert or update or delete on public.comp_residual_splits for each row execute function private.guard_published_comp_child();
