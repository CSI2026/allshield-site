import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@^2/cors";

const cors = { ...sdkCorsHeaders, "Access-Control-Allow-Methods": "POST,OPTIONS" };
const json = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const url = Deno.env.get("SUPABASE_URL")!;
const pub = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default || Deno.env.get("SUPABASE_ANON_KEY")!;
const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, sec, { auth: { persistSession: false, autoRefreshToken: false } });
const BUILD = "B2026.08.28.034";
const CODE = "command_center";
const MODEL = Deno.env.get("ALLSHIELD_AI_MODEL") || "gpt-5-mini";
const clean = (v: any, m = 6000) => String(v ?? "").trim().slice(0, m);
const countBy = (a: any[], k: string) => a.reduce((m: any, x: any) => { const v = String(x?.[k] ?? "unknown"); m[v] = (m[v] || 0) + 1; return m; }, {});
const rows = async (t: string, s = "*", l = 3000) => { const r = await admin.from(t).select(s).limit(l); if (r.error) throw r.error; return r.data || []; };

async function actor(req: Request) {
  const h = req.headers.get("Authorization") || "";
  if (!h.startsWith("Bearer ")) throw new Error("AUTH");
  const tok = h.slice(7);
  const uc = createClient(url, pub, { global: { headers: { Authorization: `Bearer ${tok}` } }, auth: { persistSession: false } });
  const { data, error } = await uc.auth.getUser(tok);
  if (error || !data.user) throw new Error("AUTH");
  const { data: p } = await admin.from("profiles").select("id,role,status").eq("id", data.user.id).single();
  if (!p || p.status !== "active" || !["owner", "admin"].includes(p.role)) throw new Error("FORBIDDEN");
  return p;
}

async function employee(c = CODE) {
  const { data, error } = await admin.from("ai_employees").select("id,code,name,job_title,department,job_assignment,kpis,learning_enabled,status").eq("code", c).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active") throw new Error(`AI employee unavailable: ${c}`);
  return data;
}

async function snapshot() {
  const [profiles, onboard, licenses, enroll, ledger, docs, sigs, findings, courses, ready, guides, questions, posts, conns, pubJobs, media, projects] = await Promise.all([
    rows("profiles", "id,status,role"), rows("onboarding_progress", "completed"), rows("user_state_licenses", "status,readiness_percent"), rows("campaign_enrollments", "status"), rows("comp_ledger", "amount,status"), rows("document_templates", "status,requires_signature"), rows("document_signatures", "acknowledged"), rows("curriculum_validation_findings", "severity,resolved_at"), rows("courses", "status,state_code"), rows("academy_launch_readiness", "state_code,launch_ready,end_to_end_tested"), rows("study_guides", "status,validated_at"), rows("question_bank", "status,source_reference"), rows("marketing_posts", "status"), rows("social_connections", "platform,status,error_message"), rows("social_publish_jobs", "status"), rows("media_library", "media_type,status"), rows("video_projects", "status")
  ]);
  const videos = media.filter((x: any) => String(x.media_type || "").toLowerCase().includes("video"));
  return {
    operations: { profiles: profiles.length, active_accounts: profiles.filter((x: any) => x.status === "active").length, onboarding_accounts: profiles.filter((x: any) => x.status === "onboarding").length, incomplete_onboarding_steps: onboard.filter((x: any) => !x.completed).length, licenses: licenses.length, licenses_ready: licenses.filter((x: any) => Number(x.readiness_percent) >= 85).length, license_statuses: countBy(licenses, "status") },
    performance: { enrollment_records: enroll.length, completed_enrollments: enroll.filter((x: any) => String(x.status).toLowerCase() === "completed").length, ledger_entries: ledger.length, recorded_amount: Number(ledger.reduce((n: number, x: any) => n + Number(x.amount || 0), 0).toFixed(2)) },
    compliance: { published_documents: docs.filter((x: any) => x.status === "published").length, required_signature_documents: docs.filter((x: any) => x.status === "published" && x.requires_signature).length, acknowledged_signatures: sigs.filter((x: any) => x.acknowledged).length, open_curriculum_findings: findings.filter((x: any) => !x.resolved_at).length, open_findings_by_severity: countBy(findings.filter((x: any) => !x.resolved_at), "severity") },
    academy: { published_courses: courses.filter((x: any) => x.status === "published").length, launch_ready_states: ready.filter((x: any) => x.launch_ready).map((x: any) => x.state_code), end_to_end_tested_states: ready.filter((x: any) => x.end_to_end_tested).map((x: any) => x.state_code), published_guides: guides.filter((x: any) => x.status === "published").length, unvalidated_guides: guides.filter((x: any) => !x.validated_at).length, published_questions: questions.filter((x: any) => x.status === "published").length, questions_without_source: questions.filter((x: any) => !x.source_reference).length },
    marketing: { posts: posts.length, post_statuses: countBy(posts, "status"), connections: conns.map((x: any) => ({ platform: x.platform, status: x.status, error: x.error_message || null })), publish_job_statuses: countBy(pubJobs, "status") },
    media: { video_assets: videos.length, video_statuses: countBy(videos, "status"), projects: projects.length, project_statuses: countBy(projects, "status"), youtube_connection: conns.find((x: any) => x.platform === "youtube") || { status: "not_connected" } }
  };
}

async function unresolved() {
  const j = await rows("ai_jobs", "id,agent_type,status,input,priority,source,due_at,created_at", 3000);
  return j.filter((x: any) => ["queued", "running", "failed"].includes(x.status)).slice(-100).reverse();
}

async function workforce() {
  const [e, r, j] = await Promise.all([rows("ai_employees", "id,code,name,job_title,department,status", 100), rows("ai_employee_runs", "ai_employee_id,status", 5000), rows("ai_jobs", "agent_type,status", 5000)]);
  return e.filter((x: any) => x.status === "active").map((x: any) => ({ code: x.code, name: x.name, job_title: x.job_title, department: x.department, total_runs: r.filter((q: any) => q.ai_employee_id === x.id).length, completed_runs: r.filter((q: any) => q.ai_employee_id === x.id && q.status === "completed").length, failed_runs: r.filter((q: any) => q.ai_employee_id === x.id && q.status === "failed").length, queued_jobs: j.filter((q: any) => q.agent_type === x.code && q.status === "queued").length }));
}

function signals(s: any) {
  const o: any[] = [];
  const add = (employee_code: string, priority: string, routing_key: string, title: string, assignment: string, rationale: string) => o.push({ employee_code, priority, routing_key, title, assignment, rationale });
  if (Number(s.operations.incomplete_onboarding_steps) > 0) add("operations_manager", "high", "operations:onboarding_backlog", "Onboarding backlog review", "Review the live onboarding queue, identify the largest blockers, and return a prioritized internal operations action plan. Do not change protected account records without approval.", `${s.operations.incomplete_onboarding_steps} incomplete onboarding steps are recorded.`);
  if (Number(s.compliance.open_curriculum_findings) > 0) add("regulatory_monitor", "critical", "compliance:open_findings", "Compliance findings review", "Audit unresolved compliance/curriculum findings, rank them by severity, and prepare evidence-based remediation recommendations. Do not alter regulated content without approval.", `${s.compliance.open_curriculum_findings} unresolved findings are recorded.`);
  const bad = (s.marketing.connections || []).filter((x: any) => x.status && x.status !== "connected");
  const failed = Number(s.marketing.publish_job_statuses?.failed || 0);
  if (bad.length || failed) add("marketing_manager", "high", "marketing:delivery_health", "Marketing delivery health review", "Review social connection and publish-job health, identify blocked channels, and prepare a safe recovery plan. Do not publish externally without approval.", `${bad.length} connection issue(s) and ${failed} failed publish job(s) are recorded.`);
  if ((s.media.youtube_connection?.status || "not_connected") !== "connected") add("video_editor", "normal", "media:youtube_readiness", "Media delivery readiness review", "Review current media/video readiness and YouTube connection state; identify what can be completed internally now and what requires owner action.", `YouTube status is ${s.media.youtube_connection?.status || "not_connected"}.`);
  if (Number(s.academy.unvalidated_guides) > 0 || Number(s.academy.questions_without_source) > 0) add("licensing_curriculum_manager", "high", "academy:content_quality", "Academy content quality review", "Review unvalidated guides and unsupported question-bank items; prepare a correction priority list. Do not publish regulated curriculum changes without approval.", `${s.academy.unvalidated_guides} unvalidated guide(s) and ${s.academy.questions_without_source} question(s) without sources are recorded.`);
  return o.slice(0, 6);
}

async function lessons(id: string) {
  const { data, error } = await admin.from("ai_employee_learning").select("id,lesson_text,usage_count").eq("ai_employee_id", id).eq("status", "active").order("updated_at", { ascending: false }).limit(12);
  if (error) throw error;
  return data || [];
}

function deterministicBrief(s: any, o: any[], sig: any[], ls: any[]) {
  const crit = sig.filter((x: any) => x.priority === "critical");
  const high = sig.filter((x: any) => x.priority === "high");
  const failed = o.filter((x: any) => x.status === "failed");
  const priorityLines = sig.length ? sig.map((x: any, i: number) => `${i + 1}. [${String(x.priority).toUpperCase()}] ${x.title} -> ${x.employee_code}: ${x.rationale}`).join("\n") : "1. No rule-based material exception was detected in the current live snapshot.";
  const openLines = o.length ? o.slice(0, 10).map((x: any, i: number) => `${i + 1}. ${x.agent_type} | ${x.status} | ${x.priority || "normal"} | ${x.input?.assignment || "No assignment text"}`).join("\n") : "No unresolved AI jobs are currently recorded.";
  const risks = [...crit.map((x: any) => x.title), ...failed.map((x: any) => `Failed AI job: ${x.agent_type}`)];
  return `EXECUTIVE SUMMARY\nAvery completed a live ALLSHIELD operating scan. ${sig.length} routed priority signal(s) were identified (${crit.length} critical, ${high.length} high). ${o.length} unresolved AI work item(s) were visible at scan time.\n\nTOP PRIORITIES\n${priorityLines}\n\nDELEGATED / OPEN WORK\n${openLines}\n\nRISKS REQUIRING OWNER ATTENTION\n${risks.length ? risks.map((x: any, i: number) => `${i + 1}. ${x}`).join("\n") : "No critical rule-based exception or failed AI job requires immediate owner attention from this scan."}\n\nNEXT FOLLOW-UP\nAvery will keep routed work visible in the AI job queue, surface failed or overdue items, and include them in the next operating brief.${ls.length ? `\n\nAPPROVED OWNER LESSONS IN FORCE\n${ls.map((x: any, i: number) => `${i + 1}. ${x.lesson_text}`).join("\n")}` : ""}`;
}

function extract(b: any) {
  if (typeof b?.output_text === "string" && b.output_text.trim()) return b.output_text.trim();
  const p: string[] = [];
  for (const i of b?.output || []) for (const c of i?.content || []) if (typeof c?.text === "string") p.push(c.text);
  return p.join("\n").trim();
}

async function makeBrief(av: any, assignment: string, s: any, o: any[], w: any[], sig: any[]) {
  const ls = av.learning_enabled ? await lessons(av.id) : [];
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { text: deterministicBrief(s, o, sig, ls), engine: "allshield:deterministic-chief-of-staff", provider_ready: false, lessons_used: ls.length };
  const instructions = "You are Avery, AI Chief of Staff for ALLSHIELD Insurance Group. Complete the executive operating review using only supplied live production data. Never invent facts. Protected business changes remain human-controlled. Return exact sections: EXECUTIVE SUMMARY, TOP PRIORITIES, DELEGATED / OPEN WORK, RISKS REQUIRING OWNER ATTENTION, NEXT FOLLOW-UP.";
  const input = `Assignment: ${assignment}\nLIVE SNAPSHOT: ${JSON.stringify(s)}\nUNRESOLVED WORK: ${JSON.stringify(o)}\nWORKFORCE: ${JSON.stringify(w)}\nROUTING SIGNALS: ${JSON.stringify(sig)}\nAPPROVED LESSONS: ${JSON.stringify(ls.map((x: any) => x.lesson_text))}`;
  try {
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: MODEL, store: false, instructions, input }) });
    const b = await r.json();
    if (!r.ok) throw new Error(b?.error?.message || `AI provider error ${r.status}`);
    const text = extract(b);
    if (!text) throw new Error("AI provider returned no text.");
    return { text, engine: `openai:${MODEL}`, provider_ready: true, lessons_used: ls.length };
  } catch (e) {
    return { text: deterministicBrief(s, o, sig, ls), engine: "allshield:deterministic-chief-of-staff", provider_ready: true, provider_warning: e instanceof Error ? e.message : String(e), lessons_used: ls.length };
  }
}

async function start(p: any, a: string, action: string) {
  const av = await employee();
  const now = new Date().toISOString();
  const { data: j, error: je } = await admin.from("ai_jobs").insert({ requested_by: p.id, agent_type: CODE, input: { assignment: a, source_action: action, build: BUILD }, status: "running", started_at: now, requires_approval: false, priority: "high", source: "avery" }).select("id").single();
  if (je) throw je;
  const { data: r, error: re } = await admin.from("ai_employee_runs").insert({ ai_employee_id: av.id, run_type: "avery:chief_of_staff", status: "running", started_at: now, summary: { job_id: j.id, assignment: a, build: BUILD } }).select("id").single();
  if (re) throw re;
  return { av, job_id: j.id, run_id: r.id };
}

async function finish(t: any, status: string, res: any, err: string | null = null) {
  const now = new Date().toISOString();
  await admin.from("ai_employee_runs").update({ status, completed_at: now, error_text: err, summary: { job_id: t.job_id, build: BUILD, engine: res?.engine || null, provider_ready: res?.provider_ready ?? null, signals: res?.signals || [], delegated_jobs: res?.delegated_jobs || [], output_preview: res?.text ? String(res.text).slice(0, 1800) : null } }).eq("id", t.run_id);
  await admin.from("ai_jobs").update({ status, completed_at: now, output: status === "completed" ? { text: res?.text || "", engine: res?.engine || null, provider_ready: res?.provider_ready ?? null, signals: res?.signals || [], delegated_jobs: res?.delegated_jobs || [] } : { error: err || "Unknown error" } }).eq("id", t.job_id);
}

async function delegate(p: any, av: any, parent: string, sig: any[]) {
  const ex = await rows("ai_jobs", "id,agent_type,status,input", 3000);
  const made: any[] = [];
  for (const c of sig) {
    const target = await employee(c.employee_code);
    const dup = ex.find((x: any) => ["queued", "running"].includes(x.status) && x.input?.routing_key === c.routing_key);
    if (dup) { made.push({ job_id: dup.id, employee_code: c.employee_code, employee_name: target.name, status: "already_open", priority: c.priority }); continue; }
    const due = new Date(Date.now() + (c.priority === "critical" ? 4 : c.priority === "high" ? 24 : 72) * 3600000).toISOString();
    const { data: j, error } = await admin.from("ai_jobs").insert({ requested_by: p.id, agent_type: c.employee_code, parent_job_id: parent, assigned_by_ai_employee_id: av.id, input: { assignment: c.assignment, routing_key: c.routing_key, title: c.title, rationale: c.rationale, assigned_by: "Avery", execution_blocked_until_certified: true }, status: "queued", requires_approval: false, priority: c.priority, source: "avery_company_scan", due_at: due }).select("id,status,priority,due_at").single();
    if (error) throw error;
    made.push({ job_id: j.id, employee_code: c.employee_code, employee_name: target.name, status: j.status, priority: j.priority, due_at: j.due_at });
  }
  return made;
}

async function scan(p: any, a: string) {
  const t = await start(p, a, "scan");
  try {
    const s = await snapshot();
    const o = await unresolved();
    const w = await workforce();
    const sig = signals(s);
    const d = await delegate(p, t.av, t.job_id, sig);
    const brief = await makeBrief(t.av, a, s, o, w, sig);
    const res = { ...brief, snapshot: s, signals: sig, delegated_jobs: d, open_work_before: o.length, capabilities_exercised: ["cross_department_live_read", "executive_company_scan", "priority_triage", "ai_work_delegation", "unresolved_work_tracking", "executive_briefing", "human_feedback_learning", "authorization_boundaries"] };
    await finish(t, "completed", res);
    return { ok: true, build: BUILD, employee: { code: t.av.code, name: t.av.name, job_title: t.av.job_title }, job_id: t.job_id, run_id: t.run_id, ...res };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    await finish(t, "failed", {}, m);
    throw e;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const p = await actor(req);
    const b = await req.json().catch(() => ({}));
    const action = clean(b.action || "scan", 40);
    if (action === "status") return json({ ok: true, build: BUILD, employee: await employee(), open_work: await unresolved(), workforce: await workforce(), provider_ready: Boolean(Deno.env.get("OPENAI_API_KEY")), fallback_ready: true });
    if (action === "scan" || action === "run" || action === "work") return json(await scan(p, clean(b.assignment) || "Run a complete ALLSHIELD company scan, identify material priorities, route safe internal follow-up work, track unresolved work, and prepare the owner operating brief."));
    if (action === "ask" || action === "brief") {
      const q = clean(b.question || b.prompt || b.assignment) || "Prepare the current owner-level ALLSHIELD operating brief.";
      const t = await start(p, q, action);
      try {
        const s = await snapshot();
        const o = await unresolved();
        const w = await workforce();
        const res = { ...(await makeBrief(t.av, q, s, o, w, [])), snapshot: s, signals: [], delegated_jobs: [] };
        await finish(t, "completed", res);
        return json({ ok: true, build: BUILD, employee: { code: t.av.code, name: t.av.name, job_title: t.av.job_title }, job_id: t.job_id, run_id: t.run_id, ...res });
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        await finish(t, "failed", {}, m);
        throw e;
      }
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return json({ error: m }, m === "AUTH" ? 401 : m === "FORBIDDEN" ? 403 : 500);
  }
});
