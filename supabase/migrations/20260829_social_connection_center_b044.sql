-- B044 Social Connection Center
-- Secure provider credential storage uses Supabase Vault. Browser clients never receive decrypted provider secrets.

create table if not exists public.social_connection_verifications (
  platform text primary key references public.social_connections(platform) on delete cascade,
  status text not null default 'not_connected' check (status in ('not_connected','partial','verified','failed','unsupported')),
  professional_ready boolean not null default false,
  token_ok boolean not null default false,
  identity_ok boolean not null default false,
  publish_ok boolean not null default false,
  engagement_ok boolean not null default false,
  comments_read_ok boolean not null default false,
  comments_reply_ok boolean not null default false,
  required_scopes_ok boolean not null default false,
  account_name text,
  external_account_id text,
  granted_scopes text[] not null default '{}',
  missing_scopes text[] not null default '{}',
  details jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.social_connection_verifications enable row level security;
revoke all on public.social_connection_verifications from anon;
grant select on public.social_connection_verifications to authenticated;

drop policy if exists social_connection_verifications_owner_admin_read on public.social_connection_verifications;
create policy social_connection_verifications_owner_admin_read
on public.social_connection_verifications for select to authenticated
using ((select private.is_owner_or_admin()));

insert into public.social_connection_verifications(platform,status,professional_ready)
select platform,'not_connected',false from public.social_connections
on conflict (platform) do nothing;

-- Service-role-only Vault bridge. These functions are not executable by browser roles.
create or replace function public.social_vault_upsert(
  p_name text,
  p_value text,
  p_description text default null
) returns uuid
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_id uuid;
begin
  if current_user not in ('service_role','postgres') then
    raise exception 'service role required';
  end if;
  if nullif(btrim(p_name),'') is null or nullif(p_value,'') is null then
    raise exception 'secret name and value are required';
  end if;
  select id into v_id
  from vault.decrypted_secrets
  where name=p_name
  order by updated_at desc nulls last, created_at desc
  limit 1;
  if v_id is null then
    v_id := vault.create_secret(p_value,p_name,p_description,null);
  else
    perform vault.update_secret(v_id,p_value,p_name,p_description,null);
  end if;
  return v_id;
end;
$$;

create or replace function public.social_vault_get(p_names text[])
returns table(secret_name text, secret_value text)
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
begin
  if current_user not in ('service_role','postgres') then
    raise exception 'service role required';
  end if;
  return query
  select d.name,d.decrypted_secret
  from vault.decrypted_secrets d
  where d.name=any(p_names);
end;
$$;

revoke all on function public.social_vault_upsert(text,text,text) from public,anon,authenticated;
revoke all on function public.social_vault_get(text[]) from public,anon,authenticated;
grant execute on function public.social_vault_upsert(text,text,text) to service_role;
grant execute on function public.social_vault_get(text[]) to service_role;

comment on table public.social_connection_verifications is 'Server-verified social account identity, permission, token, publishing, engagement and comment capability evidence for Maya/Victor readiness.';
comment on function public.social_vault_upsert(text,text,text) is 'Service-role-only bridge for encrypted social provider credentials in Supabase Vault.';
