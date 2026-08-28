with a as (select id from public.ai_employees where code='command_center')
insert into public.ai_employee_certifications(ai_employee_id,capability_key,status,evidence,build_number)
select a.id,c.capability_key,'pending','{}'::jsonb,'B2026.08.28.034'
from a join public.ai_employee_capabilities c on c.ai_employee_id=a.id
on conflict (ai_employee_id,capability_key,build_number)
do update set status='pending',evidence='{}'::jsonb,certified_at=now();
