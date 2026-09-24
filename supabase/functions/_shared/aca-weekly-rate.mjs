export function completeUtcWeek(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
  const first = new Date(`${start}T00:00:00Z`), last = new Date(`${end}T00:00:00Z`);
  return Number.isFinite(first.getTime()) && Number.isFinite(last.getTime()) &&
    first.toISOString().slice(0, 10) === start && last.toISOString().slice(0, 10) === end &&
    first.getUTCDay() === 1 && last.getUTCDay() === 0 &&
    last.getTime() - first.getTime() === 6 * 86400000;
}

export function acaWeeklyRate(units, tiers) {
  const applicable = tiers.filter(t => t.active !== false && t.applies_to_role === 'agent' &&
    t.metric_key === 'qualified_enrollments' && t.benefit_type === 'rate_override');
  const base = applicable.find(t => Number(t.min_units) === 0 && Number(t.max_units) === 75 && Number(t.benefit_value) === 15);
  const high = applicable.find(t => Number(t.min_units) === 75 && t.max_units == null && Number(t.benefit_value) === 20);
  if (!base || !high || applicable.length !== 2) throw new Error('ACA weekly agent rates require exactly $15 below 75 and $20 at 75+.');
  return Number(units) >= 75 ? 20 : 15;
}
