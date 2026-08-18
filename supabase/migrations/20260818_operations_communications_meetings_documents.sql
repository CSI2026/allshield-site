-- Internal operations foundation: communications, meetings, documents and acknowledgements.

drop policy if exists "messages_recipient_update_read" on public.internal_messages;
create policy "messages_recipient_update_read" on public.internal_messages
for update to authenticated
using (
  recipient_user_id = auth.uid()
  or recipient_department_id = (select department_id from public.profiles where id = auth.uid())
  or public.is_owner_or_admin()
)
with check (
  recipient_user_id = auth.uid()
  or recipient_department_id = (select department_id from public.profiles where id = auth.uid())
  or public.is_owner_or_admin()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  starts_at timestamptz not null, ends_at timestamptz, join_url text,
  audience text not null default 'all', department_id uuid references public.departments(id) on delete set null,
  status text not null default 'scheduled' check (status in ('draft','scheduled','completed','cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.meetings enable row level security;
drop policy if exists "meetings_read_authenticated" on public.meetings;
create policy "meetings_read_authenticated" on public.meetings for select to authenticated
using (status <> 'draft' and (audience='all' or audience=public.current_app_role()::text or department_id=(select department_id from public.profiles where id=auth.uid()) or public.is_owner_or_admin()));
drop policy if exists "meetings_admin_write" on public.meetings;
create policy "meetings_admin_write" on public.meetings for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());

create table if not exists public.meeting_attendance (
  id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, joined_at timestamptz, left_at timestamptz,
  status text not null default 'registered' check (status in ('registered','attended','missed','excused')),
  unique(meeting_id,user_id)
);
alter table public.meeting_attendance enable row level security;
drop policy if exists "meeting_attendance_self_or_admin" on public.meeting_attendance;
create policy "meeting_attendance_self_or_admin" on public.meeting_attendance for all to authenticated
using (user_id=auth.uid() or public.is_owner_or_admin()) with check (user_id=auth.uid() or public.is_owner_or_admin());

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(), title text not null, category text not null default 'company', body text not null,
  version integer not null default 1, status text not null default 'draft' check (status in ('draft','published','retired')),
  required_roles text[] not null default array['agent']::text[], requires_signature boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), effective_at timestamptz
);
alter table public.document_templates enable row level security;
drop policy if exists "documents_read_published" on public.document_templates;
create policy "documents_read_published" on public.document_templates for select to authenticated
using ((status='published' and (public.current_app_role()::text=any(required_roles) or 'all'=any(required_roles))) or public.is_owner_or_admin());
drop policy if exists "documents_admin_write" on public.document_templates;
create policy "documents_admin_write" on public.document_templates for all to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());

create table if not exists public.document_signatures (
  id uuid primary key default gen_random_uuid(), document_id uuid not null references public.document_templates(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade, typed_name text not null,
  signature_payload jsonb not null default '{}'::jsonb, acknowledged boolean not null default true, signed_at timestamptz not null default now(),
  unique(document_id,user_id)
);
alter table public.document_signatures enable row level security;
drop policy if exists "document_signatures_self_read" on public.document_signatures;
create policy "document_signatures_self_read" on public.document_signatures for select to authenticated using (user_id=auth.uid() or public.is_owner_or_admin());
drop policy if exists "document_signatures_self_insert" on public.document_signatures;
create policy "document_signatures_self_insert" on public.document_signatures for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "document_signatures_admin_update" on public.document_signatures;
create policy "document_signatures_admin_update" on public.document_signatures for update to authenticated using (public.is_owner_or_admin()) with check (public.is_owner_or_admin());

insert into public.document_templates (title,category,body,version,status,required_roles,requires_signature,effective_at)
select 'Allshield Agent Standards Acknowledgment','compliance',
'I acknowledge that I have reviewed the Allshield Agent Standards and agree to follow applicable company procedures, carrier requirements, privacy obligations, compliance requirements, and lawful instructions. This acknowledgment is an internal company record and does not replace any separate carrier, regulator, licensing, or contractual requirement.',
1,'published',array['agent','team_lead','manager'],true,now()
where not exists (select 1 from public.document_templates where title='Allshield Agent Standards Acknowledgment' and status='published');
