import { createClient } from "npm:@supabase/supabase-js@2";

const BUILD = "B2026.08.29.040";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const nextFriday = (d: Date) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  let add = (5 - x.getUTCDay() + 7) % 7;
  if (add === 0) add = 7;
  x.setUTCDate(x.getUTCDate() + add);
  return x.toISOString().slice(0, 10);
};
const cleanCode = (v: unknown) => String(v || "").trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
const cleanKey = (v: unknown, fallback = "units") => String(v || fallback).trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || fallback;
const num = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const plural = (label: string, units?: number) => Number(units) === 1 ? label : (label.endsWith("s") ? label : `${label}s`);

async function authContext(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return { error: json({ error: "Missing authorization" }, 401) };
  const token = auth.slice(7);
  const url = Deno.env.get("SUPABASE_URL")!;
  const pub = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default || Deno.env.get("SUPABASE_ANON_KEY")!;
  const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const uc = createClient(url, pub, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: ud, error: ue } = await uc.auth.getUser(token);
  if (ue || !ud.user) return { error: json({ error: "Invalid session" }, 401) };
  const admin = createClient(url, sec, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor } = await admin.from("profiles").select("id,role,status").eq("id", ud.user.id).single();
  if (!actor || actor.status !== "active") return { error: json({ error: "Active account required" }, 403) };
  const { data: perms } = await admin.from("comp_permissions").select("permission_key").eq("user_id", actor.id);
  const pset = new Set((perms || []).map((x: any) => x.permission_key));
  const owner = actor.role === "owner";
  return {
    admin, actor, owner, pset,
    canComp: owner || pset.has("comp_manage") || pset.has("comp_edit"),
    canPayroll: owner || pset.has("payroll_manage") || pset.has("payroll_run"),
  };
}

async function resolveCampaign(admin: any, body: any) {
  const q = admin.from("campaigns").select("*");
  if (body.campaign_id) return (await q.eq("id", String(body.campaign_id)).maybeSingle()).data;
  return (await q.eq("code", cleanCode(body.campaign_code || "ACA_DIALER")).maybeSingle()).data;
}

function validateBonusRules(rows: any[], plan: any) {
  const out: any[] = [];
  for (const raw of rows) {
    const rule_type = cleanKey(raw.rule_type, "bonus");
    const threshold = num(raw.threshold, -1);
    const amount = num(raw.amount, -1);
    const period = String(raw.period || "monthly");
    const payout_type = String(raw.payout_type || "flat_bonus");
    if (threshold < 0 || amount < 0) throw new Error("Bonus thresholds and amounts must be zero or greater.");
    if (!["weekly", "monthly", "quarterly", "annual", "one_time"].includes(period)) throw new Error(`Unsupported bonus period: ${period}`);
    if (!["flat_bonus", "per_unit_bonus", "percent_of_value"].includes(payout_type)) throw new Error(`Unsupported bonus payout type: ${payout_type}`);
    out.push({
      plan_version_id: plan.id,
      rule_type,
      rule_name: String(raw.rule_name || rule_type.replace(/_/g, " ")).trim().slice(0, 160),
      threshold,
      amount,
      applies_to_role: cleanKey(raw.applies_to_role, "agent"),
      metric_key: cleanKey(raw.metric_key, plan.metric_key || "units"),
      period,
      aggregation_scope: cleanKey(raw.aggregation_scope, "self"),
      payout_type,
      generation_scope: raw.generation_scope || null,
      active: raw.active !== false,
      metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    });
  }
  return out;
}

function validateTierRules(rows: any[], plan: any) {
  const out: any[] = [];
  const codes = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i] || {};
    const tier_code = cleanKey(raw.tier_code || raw.tier_name || `tier_${i + 1}`, `tier_${i + 1}`);
    if (codes.has(tier_code)) throw new Error(`Duplicate tier code: ${tier_code}`);
    codes.add(tier_code);
    const benefit_type = String(raw.benefit_type || "rate_override");
    if (!["rate_override", "flat_bonus", "bonus_reference"].includes(benefit_type)) throw new Error(`Unsupported tier benefit type: ${benefit_type}`);
    const min_units = num(raw.min_units, 0);
    const max_units = raw.max_units === null || raw.max_units === undefined || raw.max_units === "" ? null : num(raw.max_units, -1);
    if (min_units < 0 || (max_units !== null && max_units <= min_units)) throw new Error(`Invalid unit range for tier ${tier_code}`);
    const benefit_value = benefit_type === "bonus_reference" ? null : num(raw.benefit_value, -1);
    if (benefit_type !== "bonus_reference" && Number(benefit_value) < 0) throw new Error(`Tier ${tier_code} requires a non-negative benefit value.`);
    const bonus_rule_type = benefit_type === "bonus_reference" ? cleanKey(raw.bonus_rule_type, "") : null;
    const bonus_threshold = benefit_type === "bonus_reference" ? num(raw.bonus_threshold, -1) : null;
    if (benefit_type === "bonus_reference" && (!bonus_rule_type || Number(bonus_threshold) < 0)) throw new Error(`Tier ${tier_code} requires a valid bonus reference.`);
    out.push({
      plan_version_id: plan.id,
      tier_order: Number.isInteger(Number(raw.tier_order)) ? Number(raw.tier_order) : i + 1,
      tier_code,
      tier_name: String(raw.tier_name || tier_code.replace(/_/g, " ")).trim().slice(0, 120),
      applies_to_role: cleanKey(raw.applies_to_role, "agent"),
      metric_key: cleanKey(raw.metric_key, plan.metric_key || "units"),
      min_units,
      max_units,
      benefit_type,
      benefit_value,
      bonus_rule_type,
      bonus_threshold,
      active: raw.active !== false,
      metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    });
  }
  return out;
}

async function productionByUser(admin: any, campaign: any, plan: any, start: string, end: string) {
  const by = new Map<string, { units: number; value: number }>();
  if (campaign.production_source === "campaign_enrollments") {
    const { data, error } = await admin.from("campaign_enrollments")
      .select("agent_id,qualified_at")
      .eq("campaign_id", campaign.id)
      .eq("status", "qualified")
      .eq("card_orderable", true)
      .gte("qualified_at", `${start}T00:00:00Z`)
      .lte("qualified_at", `${end}T23:59:59Z`);
    if (error) throw error;
    for (const row of data || []) {
      const old = by.get(row.agent_id) || { units: 0, value: 0 };
      old.units += 1;
      by.set(row.agent_id, old);
    }
  } else {
    const { data, error } = await admin.from("comp_production_events")
      .select("user_id,units,value_amount")
      .eq("campaign_id", campaign.id)
      .eq("status", "qualified")
      .eq("metric_key", plan.metric_key || campaign.primary_metric_key || "units")
      .gte("occurred_at", `${start}T00:00:00Z`)
      .lte("occurred_at", `${end}T23:59:59Z`);
    if (error) throw error;
    for (const row of data || []) {
      const old = by.get(row.user_id) || { units: 0, value: 0 };
      old.units += num(row.units);
      old.value += num(row.value_amount);
      by.set(row.user_id, old);
    }
  }
  return by;
}

function achievedTier(tiers: any[], units: number, role = "agent", metric = "units") {
  return tiers.filter((t: any) => t.active !== false && t.applies_to_role === role && t.metric_key === metric && units >= num(t.min_units) && (t.max_units == null || units < num(t.max_units)))
    .sort((a: any, b: any) => num(b.min_units) - num(a.min_units) || num(b.tier_order) - num(a.tier_order))[0] ||
    tiers.filter((t: any) => t.active !== false && t.applies_to_role === role && t.metric_key === metric && units >= num(t.min_units))
      .sort((a: any, b: any) => num(b.min_units) - num(a.min_units) || num(b.tier_order) - num(a.tier_order))[0] || null;
}

function effectiveRate(plan: any, tiers: any[], units: number) {
  const matches = tiers.filter((t: any) => t.active !== false && t.applies_to_role === "agent" && t.metric_key === plan.metric_key && t.benefit_type === "rate_override" && units >= num(t.min_units) && (t.max_units == null || units < num(t.max_units)))
    .sort((a: any, b: any) => num(b.min_units) - num(a.min_units));
  return num(matches[0]?.benefit_value, num(plan.base_rate, num(plan.base_enrollment_amount)));
}

function calcBase(plan: any, units: number, value: number, rate: number) {
  if (plan.rate_basis === "percent_of_value") return money(value * rate / 100);
  if (plan.rate_basis === "flat") return units > 0 ? money(rate) : 0;
  return money(units * rate);
}

function contractBody(campaign: any, plan: any, rules: any[], tiers: any[], splits: any[]) {
  const label = plan.unit_label || campaign.unit_label || "unit";
  const basis = plan.rate_basis === "percent_of_value"
    ? `${num(plan.base_rate)}% of verified production value`
    : plan.rate_basis === "flat"
      ? `$${num(plan.base_rate).toFixed(2)} flat base compensation when qualifying production is recorded`
      : `$${num(plan.base_rate, num(plan.base_enrollment_amount)).toFixed(2)} per ${label}`;
  const tierLines = tiers.filter((t: any) => t.active !== false && t.applies_to_role === "agent").sort((a: any, b: any) => num(a.tier_order) - num(b.tier_order)).map((t: any) => {
    if (t.benefit_type === "rate_override") {
      const benefit = plan.rate_basis === "percent_of_value"
        ? `${num(t.benefit_value).toFixed(2)}% rate`
        : plan.rate_basis === "flat"
          ? `$${num(t.benefit_value).toFixed(2)} flat rate`
          : `$${num(t.benefit_value).toFixed(2)} per ${label}`;
      return `- ${t.tier_name}: ${t.min_units}+ ${plural(label)} → ${benefit}`;
    }
    if (t.benefit_type === "flat_bonus") return `- ${t.tier_name}: ${t.min_units}+ ${plural(label)} → $${num(t.benefit_value).toFixed(2)} tier bonus`;
    const linked = rules.filter((r: any) => r.rule_type === t.bonus_rule_type && num(r.threshold) === num(t.bonus_threshold)).sort((a: any, b: any) => num(b.amount) - num(a.amount))[0];
    return `- ${t.tier_name}: ${t.min_units}+ ${plural(label)} → ${linked ? `$${num(linked.amount).toFixed(2)} ${linked.rule_name || "bonus"}` : `linked bonus rule ${t.bonus_rule_type} at ${t.bonus_threshold}`}`;
  });
  const bonusLines = rules.filter((r: any) => r.active !== false).sort((a: any, b: any) => String(a.applies_to_role).localeCompare(String(b.applies_to_role)) || num(a.threshold) - num(b.threshold)).map((r: any) => {
    const payout = r.payout_type === "percent_of_value" ? `${num(r.amount)}% of qualifying value` : r.payout_type === "per_unit_bonus" ? `$${num(r.amount).toFixed(2)} per qualifying ${label}` : `$${num(r.amount).toFixed(2)} bonus`;
    return `- ${r.rule_name || r.rule_type}: ${r.threshold}+ ${plural(label)} • ${r.aggregation_scope} → ${payout}`;
  });
  const residual = num(plan.residual_pool_per_member) > 0 || splits.length
    ? `\n## Residuals\nCurrent configured residual pool: $${num(plan.residual_pool_per_member).toFixed(4)} per eligible member. ${splits.map((s: any) => `Policy year ${s.policy_year} ${s.beneficiary_role}: $${num(s.amount_per_member).toFixed(4)}`).join("; ")}. Residual eligibility is determined by the program's reconciliation rules.\n`
    : "";
  const enrollment = plan.open_enrollment_start_mmdd || plan.open_enrollment_end_mmdd || plan.reconciliation_end_mmdd
    ? `\n## Program Window / Reconciliation\nConfigured program window: ${plan.open_enrollment_start_mmdd || "—"} through ${plan.open_enrollment_end_mmdd || "—"}; reconciliation through ${plan.reconciliation_end_mmdd || "—"}. Dates are version-controlled.\n`
    : "";
  return `# ${campaign.name} Compensation Addendum — Version ${plan.version}\n\nEffective ${plan.effective_from}.\n\n## Base Compensation\nPrimary metric: ${plan.metric_key}. Base compensation: ${basis}.\n\n## Agent Earning Tiers\n${tierLines.length ? tierLines.join("\n") : "No tier rules are configured for this version."}\n\n## Bonus Structure\n${bonusLines.length ? bonusLines.join("\n") : "No bonus rules are configured for this version."}\n\n## Payment Schedule\nPayments are issued on the program's configured payroll schedule. Current arrears setting: ${plan.weekly_arrears_days} days.\n${enrollment}${residual}\n## Version Control\nThis addendum is tied to compensation plan version ${plan.version}. Changes to rates, bonuses, tiers, or program rules require a new effective-dated version once a plan has been published. Earnings already accrued under a prior published version are not retroactively rewritten.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const ctx: any = await authContext(req);
    if (ctx.error) return ctx.error;
    const { admin, actor, owner, pset, canComp, canPayroll } = ctx;
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "status") return json({ ok: true, build: BUILD, universal_compensation: true, tiers: true, product_program_support: true });

    if (action === "list_programs") {
      if (!(canComp || canPayroll)) return json({ error: "Compensation access required" }, 403);
      const [{ data: campaigns, error: ce }, { data: plans, error: pe }] = await Promise.all([
        admin.from("campaigns").select("*").order("name"),
        admin.from("comp_plan_versions").select("id,campaign_id,version,status,effective_from,effective_to,base_rate,rate_basis,metric_key,unit_label,created_at").order("version", { ascending: false }),
      ]);
      if (ce || pe) return json({ error: (ce || pe)?.message }, 400);
      const latest = new Map<string, any>();
      for (const p of plans || []) if (!latest.has(p.campaign_id)) latest.set(p.campaign_id, p);
      return json({ ok: true, build: BUILD, programs: (campaigns || []).map((c: any) => ({ ...c, latest_plan: latest.get(c.id) || null })) });
    }

    if (action === "create_program") {
      if (!canComp) return json({ error: "Compensation edit permission required" }, 403);
      const code = cleanCode(body.code || body.campaign_code);
      const name = String(body.name || "").trim().slice(0, 160);
      if (!code || !name) return json({ error: "Program code and name are required" }, 400);
      const program_type = String(body.program_type || "program");
      const production_source = String(body.production_source || "comp_production_events");
      const metric = cleanKey(body.primary_metric_key || body.metric_key, "units");
      const unit = String(body.unit_label || "unit").trim().slice(0, 80) || "unit";
      const baseRate = Math.max(0, num(body.base_rate));
      const rateBasis = String(body.rate_basis || "per_unit");
      if (!["product", "program", "campaign", "service", "other"].includes(program_type)) return json({ error: "Invalid program type" }, 400);
      if (!["campaign_enrollments", "comp_production_events"].includes(production_source)) return json({ error: "Invalid production source" }, 400);
      if (!["per_unit", "percent_of_value", "flat"].includes(rateBasis)) return json({ error: "Invalid rate basis" }, 400);
      const { data: campaign, error: ce } = await admin.from("campaigns").insert({ code, name, status: "active", program_type, production_source, primary_metric_key: metric, unit_label: unit, metadata: body.metadata || {} }).select().single();
      if (ce) return json({ error: ce.message }, 400);
      const { data: plan, error: pe } = await admin.from("comp_plan_versions").insert({
        campaign_id: campaign.id, version: 1, status: "draft", effective_from: body.effective_from || today(),
        base_enrollment_amount: baseRate, base_rate: baseRate, rate_basis: rateBasis, metric_key: metric, unit_label: unit,
        weekly_arrears_days: Math.max(0, Math.trunc(num(body.weekly_arrears_days, 14))), payday_dow: Math.max(0, Math.min(6, Math.trunc(num(body.payday_dow, 5)))),
        residual_pool_per_member: Math.max(0, num(body.residual_pool_per_member)), config: body.config || {}, contract_terms: body.contract_terms || {}, created_by: actor.id,
      }).select().single();
      if (pe) {
        await admin.from("campaigns").delete().eq("id", campaign.id);
        return json({ error: pe.message }, 400);
      }
      const { error: te } = await admin.from("comp_tier_rules").insert({
        plan_version_id: plan.id, tier_order: 1, tier_code: "base", tier_name: "Base", applies_to_role: "agent", metric_key: metric,
        min_units: 0, max_units: null, benefit_type: "rate_override", benefit_value: baseRate, active: true,
        metadata: { source: "program_creation", note: "Base tier mirrors the entered base compensation rate." },
      });
      if (te) return json({ error: te.message }, 400);
      await admin.from("comp_plan_change_log").insert({ plan_version_id: plan.id, actor_id: actor.id, action: "program_and_draft_created", after_state: { campaign, plan } });
      return json({ ok: true, campaign, plan });
    }

    const campaign = await resolveCampaign(admin, body);
    if (!campaign) return json({ error: "Program / campaign not found" }, 404);

    if (action === "get_dashboard") {
      if (!(canComp || canPayroll)) return json({ error: "Compensation access required" }, 403);
      const { data: plans, error: pe } = await admin.from("comp_plan_versions").select("*").eq("campaign_id", campaign.id).order("version", { ascending: false });
      if (pe) return json({ error: pe.message }, 400);
      const plan = plans?.[0] || null;
      const [rules, tiers, residuals, contracts, runs, ledger] = await Promise.all([
        plan ? admin.from("comp_bonus_rules").select("*").eq("plan_version_id", plan.id).order("applies_to_role").order("threshold") : Promise.resolve({ data: [] }),
        plan ? admin.from("comp_tier_rules").select("*").eq("plan_version_id", plan.id).order("tier_order") : Promise.resolve({ data: [] }),
        plan ? admin.from("comp_residual_splits").select("*").eq("plan_version_id", plan.id).order("policy_year") : Promise.resolve({ data: [] }),
        admin.from("contract_plan_versions").select("id,version,status,title,effective_from,effective_to,published_at").eq("campaign_id", campaign.id).order("version", { ascending: false }).limit(5),
        admin.from("payroll_runs").select("*").eq("campaign_id", campaign.id).order("period_end", { ascending: false }).limit(10),
        admin.from("comp_ledger").select("status,amount").eq("campaign_id", campaign.id),
      ] as any);
      const totals: any = { earned: 0, pending: 0, paid: 0 };
      for (const x of ledger.data || []) totals[x.status] = (totals[x.status] || 0) + num(x.amount);
      return json({ ok: true, build: BUILD, campaign, plans: plans || [], plan, rules: rules.data || [], tiers: tiers.data || [], residuals: residuals.data || [], contracts: contracts.data || [], payroll_runs: runs.data || [], ledger_totals: totals, permissions: [...pset], owner });
    }

    if (action === "update_program") {
      if (!canComp) return json({ error: "Compensation edit permission required" }, 403);
      const before = campaign;
      const patch: any = {};
      if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 160);
      if (body.status !== undefined) patch.status = String(body.status);
      if (body.program_type !== undefined) patch.program_type = String(body.program_type);
      if (body.production_source !== undefined) patch.production_source = String(body.production_source);
      if (body.primary_metric_key !== undefined) patch.primary_metric_key = cleanKey(body.primary_metric_key, campaign.primary_metric_key || "units");
      if (body.unit_label !== undefined) patch.unit_label = String(body.unit_label).trim().slice(0, 80);
      if (body.metadata !== undefined) patch.metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
      const { data: updated, error } = await admin.from("campaigns").update(patch).eq("id", campaign.id).select().single();
      if (error) return json({ error: error.message }, 400);
      const { data: latest } = await admin.from("comp_plan_versions").select("id").eq("campaign_id", campaign.id).order("version", { ascending: false }).limit(1).maybeSingle();
      if (latest) await admin.from("comp_plan_change_log").insert({ plan_version_id: latest.id, actor_id: actor.id, action: "program_updated", before_state: before, after_state: updated });
      return json({ ok: true, campaign: updated });
    }

    if (action === "update_draft") {
      if (!canComp) return json({ error: "Compensation edit permission required" }, 403);
      const planId = String(body.plan_id || "");
      const { data: plan } = await admin.from("comp_plan_versions").select("*").eq("id", planId).single();
      if (!plan || plan.campaign_id !== campaign.id) return json({ error: "Plan not found" }, 404);
      if (plan.status !== "draft") return json({ error: "Only draft versions can be edited. Create a new version before changing a published plan." }, 409);
      const before = plan;
      const patch: any = {};
      for (const k of ["effective_from", "effective_to", "weekly_arrears_days", "payday_dow", "open_enrollment_start_mmdd", "open_enrollment_end_mmdd", "reconciliation_end_mmdd", "residual_pool_per_member", "config", "contract_terms", "rate_basis", "metric_key", "unit_label"]) if (body[k] !== undefined) patch[k] = body[k];
      if (body.metric_key !== undefined) patch.metric_key = cleanKey(body.metric_key, plan.metric_key || campaign.primary_metric_key || "units");
      if (body.unit_label !== undefined) patch.unit_label = String(body.unit_label).trim().slice(0, 80) || plan.unit_label;
      if (body.base_rate !== undefined || body.base_enrollment_amount !== undefined) {
        const r = Math.max(0, num(body.base_rate ?? body.base_enrollment_amount));
        patch.base_rate = r;
        patch.base_enrollment_amount = r;
      }
      if (patch.rate_basis && !["per_unit", "percent_of_value", "flat"].includes(String(patch.rate_basis))) return json({ error: "Invalid rate basis" }, 400);
      const nextPlan = { ...plan, ...patch };
      let bonusRows: any[] | null = null, tierRows: any[] | null = null;
      try {
        if (Array.isArray(body.bonus_rules)) bonusRows = validateBonusRules(body.bonus_rules, nextPlan);
        if (Array.isArray(body.tier_rules)) tierRows = validateTierRules(body.tier_rules, nextPlan);
      } catch (e) { return json({ error: e instanceof Error ? e.message : String(e) }, 400); }
      const { data: updated, error } = await admin.from("comp_plan_versions").update(patch).eq("id", planId).select().single();
      if (error) return json({ error: error.message }, 400);
      if (bonusRows) {
        await admin.from("comp_bonus_rules").delete().eq("plan_version_id", planId);
        if (bonusRows.length) {
          const { error: e } = await admin.from("comp_bonus_rules").insert(bonusRows.map((r: any) => ({ ...r, plan_version_id: planId })));
          if (e) return json({ error: e.message }, 400);
        }
      }
      if (tierRows) {
        await admin.from("comp_tier_rules").delete().eq("plan_version_id", planId);
        if (tierRows.length) {
          const { error: e } = await admin.from("comp_tier_rules").insert(tierRows.map((r: any) => ({ ...r, plan_version_id: planId })));
          if (e) return json({ error: e.message }, 400);
        }
      }
      if (Array.isArray(body.residual_splits)) {
        await admin.from("comp_residual_splits").delete().eq("plan_version_id", planId);
        if (body.residual_splits.length) {
          const rows = body.residual_splits.map((r: any) => ({ plan_version_id: planId, policy_year: r.policy_year, beneficiary_role: r.beneficiary_role, amount_per_member: r.amount_per_member }));
          const { error: e } = await admin.from("comp_residual_splits").insert(rows);
          if (e) return json({ error: e.message }, 400);
        }
      }
      await admin.from("comp_plan_change_log").insert({ plan_version_id: planId, actor_id: actor.id, action: "draft_updated", before_state: before, after_state: { plan: updated, bonus_rules: bonusRows, tier_rules: tierRows } });
      return json({ ok: true, plan: updated });
    }

    if (action === "create_draft") {
      if (!canComp) return json({ error: "Compensation edit permission required" }, 403);
      const { data: last } = await admin.from("comp_plan_versions").select("*").eq("campaign_id", campaign.id).order("version", { ascending: false }).limit(1).single();
      if (!last) return json({ error: "No source plan" }, 404);
      const { data: newp, error } = await admin.from("comp_plan_versions").insert({
        campaign_id: campaign.id, version: last.version + 1, status: "draft", effective_from: body.effective_from || last.effective_from,
        base_enrollment_amount: last.base_enrollment_amount, base_rate: last.base_rate, rate_basis: last.rate_basis, metric_key: last.metric_key, unit_label: last.unit_label,
        weekly_arrears_days: last.weekly_arrears_days, payday_dow: last.payday_dow,
        open_enrollment_start_mmdd: last.open_enrollment_start_mmdd, open_enrollment_end_mmdd: last.open_enrollment_end_mmdd, reconciliation_end_mmdd: last.reconciliation_end_mmdd,
        residual_pool_per_member: last.residual_pool_per_member, config: last.config, contract_terms: last.contract_terms, created_by: actor.id,
      }).select().single();
      if (error) return json({ error: error.message }, 400);
      const [{ data: rules }, { data: tiers }, { data: splits }] = await Promise.all([
        admin.from("comp_bonus_rules").select("rule_type,rule_name,threshold,amount,applies_to_role,metric_key,period,aggregation_scope,payout_type,generation_scope,active,metadata").eq("plan_version_id", last.id),
        admin.from("comp_tier_rules").select("tier_order,tier_code,tier_name,applies_to_role,metric_key,min_units,max_units,benefit_type,benefit_value,bonus_rule_type,bonus_threshold,active,metadata").eq("plan_version_id", last.id),
        admin.from("comp_residual_splits").select("policy_year,beneficiary_role,amount_per_member").eq("plan_version_id", last.id),
      ]);
      if (rules?.length) await admin.from("comp_bonus_rules").insert(rules.map((r: any) => ({ ...r, plan_version_id: newp.id })));
      if (tiers?.length) await admin.from("comp_tier_rules").insert(tiers.map((r: any) => ({ ...r, plan_version_id: newp.id })));
      if (splits?.length) await admin.from("comp_residual_splits").insert(splits.map((r: any) => ({ ...r, plan_version_id: newp.id })));
      await admin.from("comp_plan_change_log").insert({ plan_version_id: newp.id, actor_id: actor.id, action: "draft_created", after_state: newp });
      return json({ ok: true, plan: newp });
    }

    if (action === "publish") {
      if (!canComp) return json({ error: "Compensation publish permission required" }, 403);
      const planId = String(body.plan_id || "");
      const { data: plan } = await admin.from("comp_plan_versions").select("*").eq("id", planId).single();
      if (!plan || plan.campaign_id !== campaign.id || plan.status !== "draft") return json({ error: "Draft plan required" }, 409);
      const [{ data: rules }, { data: tiers }, { data: splits }] = await Promise.all([
        admin.from("comp_bonus_rules").select("*").eq("plan_version_id", planId),
        admin.from("comp_tier_rules").select("*").eq("plan_version_id", planId),
        admin.from("comp_residual_splits").select("*").eq("plan_version_id", planId),
      ]);
      const prior = await admin.from("comp_plan_versions").select("id,effective_from").eq("campaign_id", campaign.id).eq("status", "published");
      for (const p of prior.data || []) {
        const end = new Date(`${plan.effective_from}T00:00:00Z`);
        end.setUTCDate(end.getUTCDate() - 1);
        const { error: re } = await admin.from("comp_plan_versions").update({ status: "retired", effective_to: end.toISOString().slice(0, 10) }).eq("id", p.id);
        if (re) return json({ error: re.message }, 400);
      }
      const { data: pubPlan, error } = await admin.from("comp_plan_versions").update({ status: "published", published_by: actor.id, published_at: new Date().toISOString() }).eq("id", planId).select().single();
      if (error) return json({ error: error.message }, 400);
      const bodyText = contractBody(campaign, pubPlan, rules || [], tiers || [], splits || []);
      const { error: contractError } = await admin.from("contract_plan_versions").upsert({
        campaign_id: campaign.id, comp_plan_version_id: planId, version: plan.version, status: "published",
        title: `${campaign.name} Compensation Addendum v${plan.version}`, body_markdown: bodyText,
        effective_from: plan.effective_from, effective_to: plan.effective_to, published_by: actor.id, published_at: new Date().toISOString(), created_by: actor.id,
      }, { onConflict: "campaign_id,version" });
      if (contractError) return json({ error: contractError.message }, 400);
      await admin.from("comp_plan_change_log").insert({ plan_version_id: planId, actor_id: actor.id, action: "published", after_state: { plan: pubPlan, campaign_code: campaign.code } });
      return json({ ok: true, plan: pubPlan, contract_body: bodyText });
    }

    if (action === "record_production_event") {
      if (!canPayroll) return json({ error: "Payroll / production permission required" }, 403);
      if (campaign.production_source !== "comp_production_events") return json({ error: "This program uses a dedicated production adapter and does not accept generic production events." }, 409);
      const user_id = String(body.user_id || "");
      const units = num(body.units, -1), value_amount = num(body.value_amount, 0);
      if (!user_id || units < 0 || value_amount < 0) return json({ error: "Valid user, units and value are required" }, 400);
      const row: any = {
        campaign_id: campaign.id, user_id, occurred_at: body.occurred_at || new Date().toISOString(),
        metric_key: cleanKey(body.metric_key, campaign.primary_metric_key || "units"), units, value_amount,
        status: body.status || "qualified", source_type: body.source_type || "compensation_tool", source_ref: body.source_ref || null,
        metadata: body.metadata || {}, created_by: actor.id, updated_at: new Date().toISOString(),
      };
      let q;
      if (row.source_ref) q = await admin.from("comp_production_events").upsert(row, { onConflict: "campaign_id,source_ref" }).select().single();
      else q = await admin.from("comp_production_events").insert(row).select().single();
      if (q.error) return json({ error: q.error.message }, 400);
      return json({ ok: true, production_event: q.data });
    }

    if (action === "grant_permission" || action === "revoke_permission") {
      if (!owner) return json({ error: "Only Owner can delegate compensation authority" }, 403);
      const userId = String(body.user_id || ""), key = String(body.permission_key || "");
      const allowed = ["comp_manage", "comp_edit", "payroll_manage", "payroll_run"];
      if (!allowed.includes(key)) return json({ error: "Invalid permission" }, 400);
      if (action === "grant_permission") await admin.from("comp_permissions").upsert({ user_id: userId, permission_key: key, granted_by: actor.id }, { onConflict: "user_id,permission_key" });
      else await admin.from("comp_permissions").delete().eq("user_id", userId).eq("permission_key", key);
      return json({ ok: true });
    }

    if (action === "calculate_period") {
      if (!canPayroll) return json({ error: "Payroll permission required" }, 403);
      const start = String(body.period_start || ""), end = String(body.period_end || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return json({ error: "Valid period required" }, 400);
      const { data: plan } = await admin.from("comp_plan_versions").select("*").eq("campaign_id", campaign.id).eq("status", "published").lte("effective_from", end).or(`effective_to.is.null,effective_to.gte.${start}`).order("version", { ascending: false }).limit(1).single();
      if (!plan) return json({ error: "No published compensation plan covers this period" }, 409);
      const { data: tiers, error: tierError } = await admin.from("comp_tier_rules").select("*").eq("plan_version_id", plan.id).eq("active", true).order("tier_order");
      if (tierError) return json({ error: tierError.message }, 400);
      const by = await productionByUser(admin, campaign, plan, start, end);
      const payable = nextFriday(new Date(new Date(`${end}T00:00:00Z`).getTime() + num(plan.weekly_arrears_days, 14) * 86400000));
      let total = 0, entries = 0;
      for (const [uid, p] of by) {
        const rate = effectiveRate(plan, tiers || [], p.units);
        const amount = calcBase(plan, p.units, p.value, rate);
        if (amount <= 0) continue;
        total += amount; entries++;
        const tier = achievedTier(tiers || [], p.units, "agent", plan.metric_key);
        const ref = `basecomp:${campaign.id}:${plan.id}:${start}:${end}:${uid}`;
        const { error: le } = await admin.from("comp_ledger").upsert({
          user_id: uid, campaign_id: campaign.id, plan_version_id: plan.id, earning_type: "base_compensation",
          source_period_start: start, source_period_end: end, units: p.units, rate, amount, status: "pending", payable_on: payable, source_ref: ref,
          metadata: { build: BUILD, program_code: campaign.code, metric_key: plan.metric_key, rate_basis: plan.rate_basis, production_value: p.value, achieved_tier: tier?.tier_code || null, production_source: campaign.production_source },
        }, { onConflict: "source_ref" });
        if (le) return json({ error: le.message }, 400);
      }
      const { data: run, error: runError } = await admin.from("payroll_runs").upsert({ campaign_id: campaign.id, period_start: start, period_end: end, payable_on: payable, status: "calculated", gross_amount: money(total), created_by: actor.id }, { onConflict: "campaign_id,period_start,period_end" }).select().single();
      if (runError) return json({ error: runError.message }, 400);
      return json({ ok: true, build: BUILD, program: campaign.code, production_source: campaign.production_source, units: [...by.values()].reduce((s, x) => s + x.units, 0), people: by.size, ledger_entries_processed: entries, gross_amount: money(total), payable_on: payable, payroll_run: run });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e), build: BUILD }, 500);
  }
});
