import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260829_universal_compensation_tiers.sql','utf8');
const admin=fs.readFileSync('supabase/functions/comp-admin/index.ts','utf8');
const calc=fs.readFileSync('supabase/functions/comp-calculations/index.ts','utf8');
const ui=fs.readFileSync('universal-compensation-platform.js','utf8');
const index=fs.readFileSync('index.html','utf8');

const checks=[];
const ok=(name,condition)=>checks.push({name,ok:!!condition});

ok('migration: campaign/product metadata', /program_type/.test(migration)&&/production_source/.test(migration)&&/primary_metric_key/.test(migration)&&/unit_label/.test(migration));
ok('migration: generic plan rate model', /base_rate numeric/.test(migration)&&/rate_basis/.test(migration)&&/percent_of_value/.test(migration));
ok('migration: first-class tier table', /create table if not exists public\.comp_tier_rules/.test(migration)&&/rate_override/.test(migration)&&/flat_bonus/.test(migration)&&/bonus_reference/.test(migration));
ok('migration: generic production events', /create table if not exists public\.comp_production_events/.test(migration));
ok('migration: RLS and explicit grants', /alter table public\.comp_tier_rules enable row level security/.test(migration)&&/grant select on public\.comp_tier_rules to authenticated/.test(migration)&&/alter table public\.comp_production_events enable row level security/.test(migration)&&/revoke all on public\.comp_production_events from anon/.test(migration));
ok('ACA manager threshold corrected to approved 200/$50', /manager_direct_coaching[\s\S]*r\.threshold=50[\s\S]*r\.amount=50[\s\S]*set threshold=200/.test(migration));
ok('ACA base tier retains approved $15 only', /'standard','Standard','agent','qualified_enrollments',0,250,[\s\S]*'rate_override',15/.test(migration));
ok('ACA 250 tier references approved bonus, not new rate', /'performance_250'[\s\S]*'bonus_reference',null,'agent_monthly',250/.test(migration));
ok('ACA 300 tier references approved bonus, not new rate', /'performance_300'[\s\S]*'bonus_reference',null,'agent_monthly',300/.test(migration));

ok('comp-admin B040 marker', /B2026\.08\.29\.040/.test(admin));
ok('comp-admin lists programs', /action === "list_programs"/.test(admin));
ok('comp-admin creates any product/program', /action === "create_program"/.test(admin)&&/program_type/.test(admin)&&/production_source/.test(admin));
ok('comp-admin edits program metadata', /action === "update_program"/.test(admin));
ok('comp-admin edits draft rates', /action === "update_draft"/.test(admin)&&/base_rate/.test(admin)&&/rate_basis/.test(admin));
ok('comp-admin edits bonus rules', /validateBonusRules/.test(admin)&&/bonus_rules/.test(admin));
ok('comp-admin edits tier rules', /validateTierRules/.test(admin)&&/tier_rules/.test(admin));
ok('published plans immutable', /Only draft versions can be edited/.test(admin));
ok('new version clones tiers and bonuses', /action === "create_draft"/.test(admin)&&/comp_tier_rules/.test(admin)&&/comp_bonus_rules/.test(admin));
ok('old published plan retired, not invalid superseded', /status: "retired"/.test(admin)&&!/status: "superseded"/.test(admin));
ok('generic production events supported', /action === "record_production_event"/.test(admin)&&/comp_production_events/.test(admin));
ok('base calc uses configured production adapter', /productionByUser/.test(admin)&&/campaign\.production_source === "campaign_enrollments"/.test(admin)&&/comp_production_events/.test(admin));
ok('base calc supports per-unit percent and flat', /percent_of_value/.test(admin)&&/plan\.rate_basis === "flat"/.test(admin)&&/units \* rate/.test(admin));
ok('tier can raise effective base rate', /effectiveRate/.test(admin)&&/benefit_type === "rate_override"/.test(admin));
ok('generic contract mentions product/program and tiers', /Agent Earning Tiers/.test(admin)&&/Version Control/.test(admin));

ok('comp-calculations B040 marker', /B2026\.08\.29\.040/.test(calc));
ok('monthly calc generic production adapter', /productionByUser/.test(calc)&&/comp_production_events/.test(calc));
ok('monthly bonuses are generic by role/scope/type', /groupTypes/.test(calc)&&/bestRule/.test(calc)&&/aggregation_scope/.test(calc));
ok('manager reusable scopes', /per_direct_member/.test(calc)&&/self_plus_first_generation/.test(calc)&&/promoted_market/.test(calc));
ok('generic payout types', /per_unit_bonus/.test(calc)&&/percent_of_value/.test(calc)&&/flat_bonus/.test(calc));
ok('generic residuals fail closed without adapter', /Residual calculation is not configured for this product\/program/.test(calc));

ok('UI owner compensation control', /registerAllshieldView\('owner','compensation'/.test(ui));
ok('UI admin compensation control', /registerAllshieldView\('admin','compensation'/.test(ui));
ok('UI agent compensation tiers', /registerAllshieldView\('agent','compensation'/.test(ui)&&/MY COMPENSATION & TIERS/.test(ui));
ok('UI program selector', /Product \/ Program/.test(ui)&&/ucProgramSelect/.test(ui));
ok('UI can create program', /createUniversalCompProgram/.test(ui));
ok('UI edits bonus structure', /BONUS STRUCTURE/.test(ui)&&/Add Bonus Rule/.test(ui));
ok('UI edits tier ladder', /AGENT EARNING TIERS/.test(ui)&&/Add Tier/.test(ui));
ok('UI tier choices include rate increase and bonus', /Higher Rate/.test(ui)&&/Tier Bonus/.test(ui)&&/Use Bonus Rule/.test(ui));
ok('UI agent shows next-tier progress', /Next Tier/.test(ui)&&/uc-progress/.test(ui));
ok('UI does not hard-code ACA as the selected product', !/ACA_DIALER/.test(ui));
ok('production index loads universal compensation module', /universal-compensation-platform\.js\?v=B2026\.08\.29\.040/.test(index));

const failed=checks.filter(x=>!x.ok);
for(const c of checks) console.log(`${c.ok?'PASS':'FAIL'}: ${c.name}`);
console.log(`Universal compensation contract: ${checks.length-failed.length}/${checks.length} PASS`);
if(failed.length) process.exit(1);
