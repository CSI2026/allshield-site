-- Allshield live onboarding/security hardening
-- Applied to project xxeiddnfbdqxwuojuggy on 2026-08-18.

-- Authenticated users may read their own profile; owner/admin visibility is enforced by RLS.
-- Direct browser writes are intentionally limited to personal profile fields.
revoke insert, delete, truncate on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name,last_name,resident_state,updated_at) on public.profiles to authenticated;

drop policy if exists profile_self_update on public.profiles;
create policy profile_self_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Existing schema already contains these uniqueness guarantees used by upsert flows:
-- onboarding_progress (user_id, step_key)
-- user_state_licenses (user_id, state_code, license_type)
-- profiles lower(username) where username is not null

-- Team-account creation and privileged role/status changes are performed only through
-- the manage-team-user Edge Function using server-side credentials.
