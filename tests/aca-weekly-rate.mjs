import assert from 'node:assert/strict';
import fs from 'node:fs';
import { completeUtcWeek, acaWeeklyRate } from '../supabase/functions/_shared/aca-weekly-rate.mjs';

const tiers = [
  { active:true, applies_to_role:'agent', metric_key:'qualified_enrollments', benefit_type:'rate_override', min_units:0, max_units:75, benefit_value:15 },
  { active:true, applies_to_role:'agent', metric_key:'qualified_enrollments', benefit_type:'rate_override', min_units:75, max_units:null, benefit_value:20 },
];
assert.equal(completeUtcWeek('2026-09-28', '2026-10-04'), true);
assert.equal(completeUtcWeek('2026-09-29', '2026-10-04'), false);
assert.equal(completeUtcWeek('2026-09-28', '2026-10-05'), false);
assert.equal(completeUtcWeek('2026-02-30', '2026-03-08'), false);
for (const [units, rate, total] of [[0,15,0],[74,15,1110],[75,20,1500],[76,20,1520]]) {
  assert.equal(acaWeeklyRate(units, tiers), rate);
  assert.equal(units * acaWeeklyRate(units, tiers), total);
}
assert.throws(() => acaWeeklyRate(75, tiers.slice(0,1)), /require exactly/);
const migration=fs.readFileSync('supabase/migrations/20260924122858_replace_aca_agent_weekly_compensation.sql','utf8');
assert.match(migration,/applies_to_role='manager'/);
assert.match(migration,/weekly_75/);
assert.match(migration,/including the first 74/);
assert.match(migration,/status='retired'/);
assert.doesNotMatch(migration,/insert into public\.comp_bonus_rules[\s\S]*?applies_to_role='agent'/);
console.log('ACA weekly rate: 74/75 boundary, whole-week payout and incomplete period PASS');
