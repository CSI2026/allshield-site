import { createClient } from "npm:@supabase/supabase-js@2";

const BUILD = "B2026.08.29.040";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const cleanCode = (v: unknown) => String(v || "").trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
const monthBounds = (m: string) => { const [y, mo] = m.split("-").map(Number); return { start: `${m}-01`, end: new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10) }; };
const secondFriday = (m: string) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo, 1)); d.setUTCMonth(d.getUTCMonth() + 1, 1); const add = (5 - d.getUTCDay() + 7) % 7; d.setUTCDate(1 + add + 7); return d.toISOString().slice(0, 10); };

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
  const keys = new Set((perms || []).map((x: any) => x.permission_key));
  const allowed = actor.role === "owner" || keys.has("payroll_manage") || keys.has("payroll_run");
  if (!allowed) return { error: json({ error: "Payroll permission required" }, 403) };
  return { admin, actor };
}

async function resolveCampaign(admin: any, body: any) {
  if (body.campaign_id) return (await admin.from("campaigns").select("*").eq("id", String(body.campaign_id)).maybeSingle()).data;
  return (await admin.from("campaigns").select("*").eq("code", cleanCode(body.campaign_code || "ACA_DIALER")).maybeSingle()).data;
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
    for (const e of data || []) {
      const x = by.get(e.agent_id) || { units: 0, value: 0 };
      x.units += 1;
      by.set(e.agent_id, x);
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
    for (const e of data || []) {
      const x = by.get(e.user_id) || { units: 0, value: 0 };
      x.units += num(e.units);
      x.value += num(e.value_amount);
      by.set(e.user_id, x);
    }
  }
  return by;
}

function bestRule(rules: any[], role: string, scope: string, metric: string, units: number, type?: string) {
  return rules.filter((r: any) => r.active !== false && r.period === "monthly" && r.applies_to_role === role && r.aggregation_scope === scope && r.metric_key === metric && (!type || r.rule_type === type) && units >= num(r.threshold))
    .sort((a: any, b: any) => num(b.threshold) - num(a.threshold))[0] || null;
}

function groupTypes(rules: any[], role: string, scope: string, metric: string) {
  return [...new Set(rules.filter((r: any) => r.active !== false && r.period === "monthly" && r.applies_to_role === role && r.aggregation_scope === scope && r.metric_key === metric).map((r: any) => String(r.rule_type)))];
}

function payout(rule: any, units: number, value: number) {
  if (!rule) return 0;
  if (rule.payout_type === "per_unit_bonus") return money(units * num(rule.amount));
  if (rule.payout_type === "percent_of_value") return money(value * num(rule.amount) / 100);
  return money(num(rule.amount));
}

function achievedTier(tiers: any[], units: number, role: string, metric: string) {
  return tiers.filter((t: any) => t.active !== false && t.applies_to_role === role && t.metric_key === metric && units >= num(t.min_units) && (t.max_units == null || units < num(t.max_units)))
    .sort((a: any, b: any) => num(b.min_units) - num(a.min_units) || num(b.tier_order) - num(a.tier_order))[0] ||
    tiers.filter((t: any) => t.active !== false && t.applies_to_role === role && t.metric_key === metric && units >= num(t.min_units))
      .sort((a: any, b: any) => num(b.min_units) - num(a.min_units) || num(b.tier_order) - num(a.tier_order))[0] || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const ctx: any = await authContext(req);
    if (ctx.error) return ctx.error;
    const { admin, actor } = ctx;
    const body = await req.json();
    const action = String(body.action || "");
    const campaign = await resolveCampaign(admin, body);
    if (!campaign) return json({ error: "Program / campaign not found" }, 404);
    const { data: plan } = await admin.from("comp_plan_versions").select("*").eq("campaign_id", campaign.id).eq("status", "published").order("version", { ascending: false }).limit(1).maybeSingle();
    if (!plan) return json({ error: "Publish a compensation plan before running calculations." }, 409);
    const [{ data: rules, error: re }, { data: tiers, error: te }] = await Promise.all([
      admin.from("comp_bonus_rules").select("*").eq("plan_version_id", plan.id).eq("active", true),
      admin.from("comp_tier_rules").select("*").eq("plan_version_id", plan.id).eq("active", true).order("tier_order"),
    ]);
    if (re || te) return json({ error: (re || te)?.message }, 400);

    if (action === "status") return json({ ok: true, build: BUILD, program: campaign.code, plan_version: plan.version, universal_compensation: true, tiers: (tiers || []).length });

    if (action === "calculate_month") {
      const month = String(body.month || "");
      if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "Month must be YYYY-MM" }, 400);
      const { start, end } = monthBounds(month);
      const counts = await productionByUser(admin, campaign, plan, start, end);
      const { data: rels, error: le } = await admin.from("leadership_relationships").select("leader_id,member_id,generation,active").eq("campaign_id", campaign.id).eq("active", true);
      if (le) return json({ error: le.message }, 400);
      const direct = (rels || []).filter((r: any) => r.generation === 1);
      const payday = secondFriday(month);
      let processed = 0, total = 0, tierBonuses = 0;

      const add = async (uid: string, type: string, amount: number, units: number, value: number, ref: string, meta: any = {}) => {
        if (amount <= 0) return;
        const row = {
          user_id: uid, campaign_id: campaign.id, plan_version_id: plan.id, earning_type: type,
          source_period_start: start, source_period_end: end, units, rate: amount, amount, status: "pending", payable_on: payday, source_ref: ref,
          metadata: { build: BUILD, program_code: campaign.code, metric_key: plan.metric_key, production_value: value, ...meta },
        };
        const { error } = await admin.from("comp_ledger").upsert(row, { onConflict: "source_ref" });
        if (error) throw error;
        processed++; total += amount;
      };

      // Agent self bonuses. Each rule_type pays only its highest achieved threshold.
      const agentTypes = groupTypes(rules || [], "agent", "self", plan.metric_key);
      for (const [uid, p] of counts) {
        for (const type of agentTypes) {
          const r = bestRule(rules || [], "agent", "self", plan.metric_key, p.units, type);
          if (!r) continue;
          const amount = payout(r, p.units, p.value);
          await add(uid, `bonus:${type}`, amount, p.units, p.value, `bonus:${campaign.id}:${plan.id}:${month}:${uid}:${type}`, { rule_id: r.id, threshold: r.threshold, payout_type: r.payout_type, aggregation_scope: "self" });
        }
        const tier = achievedTier(tiers || [], p.units, "agent", plan.metric_key);
        if (tier?.benefit_type === "flat_bonus") {
          const amount = money(num(tier.benefit_value));
          await add(uid, "tier_bonus", amount, p.units, p.value, `tierbonus:${campaign.id}:${plan.id}:${month}:${uid}:${tier.tier_code}`, { tier_code: tier.tier_code, tier_name: tier.tier_name });
          tierBonuses += amount;
        }
      }

      // Manager rules are driven by reusable aggregation scopes rather than ACA-only rule names.
      const leaders = new Set(direct.map((r: any) => r.leader_id));
      const directMemberTypes = groupTypes(rules || [], "manager", "per_direct_member", plan.metric_key);
      const marketTypes = groupTypes(rules || [], "manager", "self_plus_first_generation", plan.metric_key);
      const promotedMarketTypes = groupTypes(rules || [], "manager", "promoted_market", plan.metric_key);
      const managerSelfTypes = groupTypes(rules || [], "manager", "self", plan.metric_key);

      for (const leader of leaders) {
        const members = direct.filter((r: any) => r.leader_id === leader).map((r: any) => r.member_id);
        for (const member of members) {
          const p = counts.get(member) || { units: 0, value: 0 };
          for (const type of directMemberTypes) {
            const r = bestRule(rules || [], "manager", "per_direct_member", plan.metric_key, p.units, type);
            if (!r) continue;
            await add(leader, `bonus:${type}`, payout(r, p.units, p.value), p.units, p.value, `mgrdirect:${campaign.id}:${plan.id}:${month}:${leader}:${member}:${type}`, { rule_id: r.id, member_id: member, threshold: r.threshold, payout_type: r.payout_type, aggregation_scope: "per_direct_member" });
          }
        }

        const self = counts.get(leader) || { units: 0, value: 0 };
        for (const type of managerSelfTypes) {
          const r = bestRule(rules || [], "manager", "self", plan.metric_key, self.units, type);
          if (r) await add(leader, `bonus:${type}`, payout(r, self.units, self.value), self.units, self.value, `mgrself:${campaign.id}:${plan.id}:${month}:${leader}:${type}`, { rule_id: r.id, threshold: r.threshold, payout_type: r.payout_type, aggregation_scope: "self" });
        }

        const market = members.reduce((a: any, member: string) => {
          const p = counts.get(member) || { units: 0, value: 0 };
          a.units += p.units; a.value += p.value; return a;
        }, { units: self.units, value: self.value });
        for (const type of marketTypes) {
          const r = bestRule(rules || [], "manager", "self_plus_first_generation", plan.metric_key, market.units, type);
          if (r) await add(leader, `bonus:${type}`, payout(r, market.units, market.value), market.units, market.value, `market:${campaign.id}:${plan.id}:${month}:${leader}:${type}`, { rule_id: r.id, threshold: r.threshold, payout_type: r.payout_type, aggregation_scope: "self_plus_first_generation" });
        }

        for (const promoted of members) {
          const promotedMembers = direct.filter((r: any) => r.leader_id === promoted).map((r: any) => r.member_id);
          if (!promotedMembers.length) continue;
          const promotedSelf = counts.get(promoted) || { units: 0, value: 0 };
          const promotedMarket = promotedMembers.reduce((a: any, member: string) => {
            const p = counts.get(member) || { units: 0, value: 0 };
            a.units += p.units; a.value += p.value; return a;
          }, { units: promotedSelf.units, value: promotedSelf.value });
          for (const type of promotedMarketTypes) {
            const r = bestRule(rules || [], "manager", "promoted_market", plan.metric_key, promotedMarket.units, type);
            if (r) await add(leader, `bonus:${type}`, payout(r, promotedMarket.units, promotedMarket.value), promotedMarket.units, promotedMarket.value, `promotedmarket:${campaign.id}:${plan.id}:${month}:${leader}:${promoted}:${type}`, { rule_id: r.id, promoted_manager_id: promoted, threshold: r.threshold, payout_type: r.payout_type, aggregation_scope: "promoted_market" });
          }
        }
      }

      // Promotion production snapshots remain opt-in per program through plan.config.promotion_rule.
      const promo = plan.config?.promotion_rule || null;
      if (promo) {
        const users = new Set<string>([...counts.keys(), ...direct.map((r: any) => r.leader_id), ...direct.map((r: any) => r.member_id)]);
        for (const uid of users) {
          const members = direct.filter((r: any) => r.leader_id === uid).map((r: any) => r.member_id);
          const directCount = members.length;
          const fg = members.reduce((s: number, m: string) => s + (counts.get(m)?.units || 0), 0);
          const personal = counts.get(uid)?.units || 0;
          const { data: old } = await admin.from("promotion_qualification_snapshots").select("compliance_passed,sop_passed").eq("campaign_id", campaign.id).eq("user_id", uid).eq("qualification_month", start).maybeSingle();
          const compliance = old?.compliance_passed || false, sop = old?.sop_passed || false;
          const productionOk = (personal + fg) >= num(promo.team_enrollments_required, 500) && directCount >= num(promo.direct_agents_required, 2);
          const qualifies = productionOk && compliance && sop;
          await admin.from("promotion_qualification_snapshots").upsert({
            campaign_id: campaign.id, user_id: uid, qualification_month: start,
            personal_enrollments: personal, first_generation_enrollments: fg, active_direct_agents: directCount,
            compliance_passed: compliance, sop_passed: sop, qualifies,
            metadata: { build: BUILD, production_qualified: productionOk, metric_key: plan.metric_key, program_code: campaign.code },
          }, { onConflict: "campaign_id,user_id,qualification_month" });
        }
      }

      return json({
        ok: true, build: BUILD, month, program: campaign.code, production_source: campaign.production_source,
        metric_key: plan.metric_key, qualified_units: [...counts.values()].reduce((s, x) => s + x.units, 0), people: counts.size,
        ledger_entries_processed: processed, bonus_total: money(total), tier_bonus_total: money(tierBonuses), bonus_payable_on: payday,
      });
    }

    if (action === "calculate_residuals") {
      if (campaign.production_source !== "campaign_enrollments") return json({ error: "Residual calculation is not configured for this product/program. Configure a residual adapter before running residuals." }, 409);
      const policyYear = num(body.policy_year, 1);
      if (policyYear < 1) return json({ error: "Invalid policy year" }, 400);
      const { data: splits } = await admin.from("comp_residual_splits").select("*").eq("plan_version_id", plan.id).eq("policy_year", policyYear);
      const agentRate = num((splits || []).find((s: any) => s.beneficiary_role === "agent")?.amount_per_member), managerRate = num((splits || []).find((s: any) => s.beneficiary_role === "manager")?.amount_per_member);
      const asOf = String(body.as_of || new Date().toISOString().slice(0, 10));
      const { data: enrs, error: ee } = await admin.from("campaign_enrollments").select("id,agent_id,coverage_effective_date").eq("campaign_id", campaign.id).eq("residual_eligible", true).eq("reconciliation_status", "verified").lte("coverage_effective_date", asOf);
      if (ee) return json({ error: ee.message }, 400);
      const { data: rels } = await admin.from("leadership_relationships").select("leader_id,member_id,generation,active").eq("campaign_id", campaign.id).eq("active", true).eq("generation", 1);
      const leaderByMember = new Map((rels || []).map((r: any) => [r.member_id, r.leader_id]));
      const agentCounts = new Map<string, number>(), managerCounts = new Map<string, number>();
      for (const e of enrs || []) {
        agentCounts.set(e.agent_id, (agentCounts.get(e.agent_id) || 0) + 1);
        const leader = leaderByMember.get(e.agent_id);
        if (leader) managerCounts.set(String(leader), (managerCounts.get(String(leader)) || 0) + 1);
      }
      let total = 0, entries = 0;
      for (const [uid, n] of agentCounts) {
        const amount = money(n * agentRate); if (amount <= 0) continue;
        await admin.from("comp_ledger").upsert({ user_id: uid, campaign_id: campaign.id, plan_version_id: plan.id, earning_type: "residual_agent", source_period_start: asOf, source_period_end: asOf, units: n, rate: agentRate, amount, status: "pending", payable_on: asOf, source_ref: `residual:agent:${campaign.id}:py${policyYear}:${asOf}:${uid}`, metadata: { build: BUILD, policy_year: policyYear, program_code: campaign.code } }, { onConflict: "source_ref" });
        total += amount; entries++;
      }
      for (const [uid, n] of managerCounts) {
        const amount = money(n * managerRate); if (amount <= 0) continue;
        await admin.from("comp_ledger").upsert({ user_id: uid, campaign_id: campaign.id, plan_version_id: plan.id, earning_type: "residual_manager", source_period_start: asOf, source_period_end: asOf, units: n, rate: managerRate, amount, status: "pending", payable_on: asOf, source_ref: `residual:manager:${campaign.id}:py${policyYear}:${asOf}:${uid}`, metadata: { build: BUILD, policy_year: policyYear, program_code: campaign.code } }, { onConflict: "source_ref" });
        total += amount; entries++;
      }
      return json({ ok: true, build: BUILD, program: campaign.code, policy_year: policyYear, eligible_members: (enrs || []).length, entries, total: money(total), agent_rate: agentRate, manager_rate: managerRate });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e), build: BUILD }, 500);
  }
});
