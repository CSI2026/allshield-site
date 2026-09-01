-- Canonical ALLSHIELD Academy instructor identity and media support.
update storage.buckets
set allowed_mime_types = array['video/mp4','audio/mpeg','audio/wav','image/jpeg','image/png','image/webp']::text[]
where id = 'academy-media';

create or replace function public.academy_enforce_canonical_ava_identity()
returns trigger
language plpgsql
as $$
begin
  if new.instructor_key = 'ava' then
    new.avatar_id := 'Emery_public_6';
    new.voice_id := '330290724a1b470fb63153f34d4c0183';
  end if;
  return new;
end;
$$;

drop trigger if exists academy_canonical_ava_identity on public.academy_instructor_preferences;
create trigger academy_canonical_ava_identity
before insert or update on public.academy_instructor_preferences
for each row execute function public.academy_enforce_canonical_ava_identity();

update public.academy_instructor_preferences
set avatar_id = 'Emery_public_6',
    voice_id = '330290724a1b470fb63153f34d4c0183',
    updated_at = now()
where instructor_key = 'ava';
