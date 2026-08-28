create index if not exists ai_employee_certifications_build_idx on public.ai_employee_certifications(build_number,certified_at desc);
create index if not exists ai_employee_capabilities_key_idx on public.ai_employee_capabilities(capability_key,status);
