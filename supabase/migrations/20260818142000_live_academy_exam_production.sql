create table if not exists public.academy_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, module_id)
);
alter table public.academy_module_progress enable row level security;
drop policy if exists "academy_progress_self_or_admin" on public.academy_module_progress;
create policy "academy_progress_self_or_admin" on public.academy_module_progress
for all to authenticated
using (user_id = auth.uid() or public.is_owner_or_admin())
with check (user_id = auth.uid() or public.is_owner_or_admin());

insert into public.courses(title, category, state_code, version, status, effective_at)
select 'Allshield Life & Health Foundations', 'licensing_foundations', null, 1, 'published', now()
where not exists (select 1 from public.courses where title='Allshield Life & Health Foundations' and version=1);

insert into public.course_modules(course_id, module_order, title, body)
select c.id, v.module_order, v.title, v.body::jsonb
from public.courses c
cross join (values
  (1, 'Insurance Foundations', '{"summary":"Core insurance concepts used across Life & Health training.","topics":["risk pooling and insurable risk","policy parties and basic contract structure","premium, benefit, exclusion and limitation terminology"],"notice":"Internal readiness material. Agents must complete all state-required education and carrier training separately."}'),
  (2, 'Ethics, Consent & Documentation', '{"summary":"Allshield standards for customer authorization, accurate representations and documentation.","topics":["verify identity and authorization before discussing protected details","do not misrepresent benefits, costs, networks or eligibility","document material customer decisions and required disclosures"],"notice":"Use current carrier, marketplace and state requirements when handling a real transaction."}'),
  (3, 'Life Insurance Fundamentals', '{"summary":"Foundational distinctions among common life insurance structures.","topics":["term versus permanent coverage concepts","beneficiary and ownership basics","needs-based conversations rather than one-size-fits-all recommendations"],"notice":"Product availability, underwriting and contract terms vary by carrier and jurisdiction."}'),
  (4, 'Health Insurance Fundamentals', '{"summary":"Foundational health-plan terminology and customer-fit considerations.","topics":["premium, deductible, copayment, coinsurance and out-of-pocket maximum","provider network and formulary considerations","eligibility and enrollment rules must be verified from current authoritative sources"],"notice":"Do not treat this module as an official statement of federal or state enrollment law."}')
) as v(module_order,title,body)
where c.title='Allshield Life & Health Foundations' and c.version=1
and not exists (select 1 from public.course_modules m where m.course_id=c.id and m.module_order=v.module_order);

insert into public.course_assignments(user_id, course_id, progress_percent)
select p.id, c.id, 0
from public.profiles p join public.courses c on c.title='Allshield Life & Health Foundations' and c.version=1
where p.role in ('agent','team_lead','manager')
and not exists (select 1 from public.course_assignments a where a.user_id=p.id and a.course_id=c.id);

insert into public.question_bank(category,state_code,prompt,answers,correct_answer_key,explanation,source_reference,version,status)
select v.category, null, v.prompt, v.answers::jsonb, v.correct_key, v.explanation, 'Allshield internal readiness standard', 1, 'published'
from (values
 ('foundations','Which statement best describes the purpose of risk pooling in insurance?','{"a":"It guarantees every claim will be paid regardless of the contract.","b":"It spreads financial risk across a group of insured exposures.","c":"It eliminates underwriting and eligibility requirements.","d":"It makes all insurance products identical."}','b','Risk pooling spreads the financial impact of uncertain losses across a larger group.'),
 ('ethics','Before discussing a customer’s protected enrollment or policy details, what should an agent do first?','{"a":"Verify identity or authorization and follow required consent procedures.","b":"Ask for payment information.","c":"Promise the lowest available price.","d":"Skip verification if the customer sounds familiar."}','a','Identity, authorization and required consent should be established before protected details are discussed.'),
 ('ethics','Which approach is consistent with Allshield’s customer standard?','{"a":"Describe a benefit as guaranteed when it is not.","b":"Leave out exclusions to make a plan easier to sell.","c":"Explain material costs and limitations accurately and document the customer decision.","d":"Use the same recommendation for every customer."}','c','Accurate representations, disclosure of material terms and appropriate documentation are core standards.'),
 ('life','Which is a basic distinction between term and permanent life insurance?','{"a":"Term coverage is generally designed for a specified period, while permanent coverage is designed to remain in force subject to contract requirements.","b":"Permanent insurance never requires premiums.","c":"Term insurance always builds cash value.","d":"There is no meaningful structural difference."}','a','Term and permanent insurance have different duration and product structures; actual contract terms vary by policy.'),
 ('health','Which group contains common health-plan cost-sharing terms?','{"a":"Premium, deductible, copayment and coinsurance.","b":"Beneficiary, surrender value, annuitant and rider only.","c":"Lien, escrow, title and appraisal.","d":"Dividend, strike price, option and margin."}','a','Premium, deductible, copayment and coinsurance are common health-insurance cost terms.')
) as v(category,prompt,answers,correct_key,explanation)
where not exists (select 1 from public.question_bank q where q.prompt=v.prompt and q.version=1);

drop policy if exists "assignments_self_or_admin" on public.course_assignments;
create policy "assignments_read_self_or_admin" on public.course_assignments for select to authenticated using (user_id = auth.uid() or public.is_owner_or_admin());
create policy "assignments_update_self_or_admin" on public.course_assignments for update to authenticated using (user_id = auth.uid() or public.is_owner_or_admin()) with check (user_id = auth.uid() or public.is_owner_or_admin());
create policy "assignments_insert_admin" on public.course_assignments for insert to authenticated with check (public.is_owner_or_admin());
create policy "assignments_delete_admin" on public.course_assignments for delete to authenticated using (public.is_owner_or_admin());
revoke update on public.course_assignments from authenticated;
grant update(progress_percent, completed_at) on public.course_assignments to authenticated;
