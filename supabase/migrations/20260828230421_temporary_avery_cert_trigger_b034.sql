-- Temporary one-time production certification trigger used during B034 live verification.
-- The called runner was retired immediately after certification and the next migration drops this helper.
create or replace function private.run_avery_certification_b034()
returns bigint
language sql
security invoker
set search_path = private, public, net
as $$
  select net.http_get(
    url := 'https://xxeiddnfbdqxwuojuggy.supabase.co/functions/v1/ai-avery-cert-runner',
    params := jsonb_build_object('token','B034-AVERY-CERT-ONCE'),
    headers := jsonb_build_object('Accept','application/json'),
    timeout_milliseconds := 60000
  );
$$;
revoke all on function private.run_avery_certification_b034() from public, anon, authenticated;
