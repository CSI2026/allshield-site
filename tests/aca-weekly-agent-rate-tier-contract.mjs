import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260914_aca_weekly_agent_rate_tier.sql', 'utf8');
const admin = fs.readFileSync('supabase/functions/comp-admin/index.ts', 'utf8');
const ui = fs.readFileSync('universal-compensation-platform.js', 'utf8');

function ok(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}

ok('new plan is effective Monday 2026-09-14', /effective_from[\s\S]*2026-09-14/.test(migration));
ok('old individual agent bonuses are not cloned', /applies_to_role = 'manager'/.test(migration));
ok('standard weekly rate is $15 below 75', /'standard_weekly'[\s\S]*0, 75, 'rate_override', 15/.test(migration));
ok('75+ weekly rate is $20 for all units', /'weekly_75'[\s\S]*75, null, 'rate_override', 20/.test(migration));
ok('manager rules are preserved', /Manager team, direct-agent performance, coaching, market, promotion, and override compensation remains unchanged/.test(migration));
ok('payroll requires one Monday-Sunday week', /must be calculated as one Monday-Sunday week/.test(admin));
ok('agent dashboard uses weekly production for weekly tiers', /agent_rate_tier_period==='weekly'/.test(ui) && /THIS WEEK/.test(ui));

console.log('ACA weekly agent compensation contract checks passed.');
