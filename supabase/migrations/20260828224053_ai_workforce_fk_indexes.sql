create index if not exists ai_employees_manager_employee_id_idx on public.ai_employees(manager_employee_id);
create index if not exists ai_employee_feedback_ai_job_id_idx on public.ai_employee_feedback(ai_job_id);
create index if not exists ai_employee_feedback_ai_employee_run_id_idx on public.ai_employee_feedback(ai_employee_run_id);
create index if not exists ai_employee_feedback_reviewer_id_idx on public.ai_employee_feedback(reviewer_id);
create index if not exists ai_employee_learning_approved_by_idx on public.ai_employee_learning(approved_by);
