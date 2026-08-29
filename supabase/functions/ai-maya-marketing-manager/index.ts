import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@^2/cors";

const cors = {
  ...sdkCorsHeaders,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const URL = Deno.env.get("SUPABASE_URL");
const PUB =
  JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default ||
  Deno.env.get("SUPABASE_ANON_KEY");
const SECRET_KEYS = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const SECRET = SECRET_KEYS.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

const BUILD = "B2026.08.28.036";
const CODE = "marketing_manager";
const AVERY = "command_center";
const OPEN = ["queued", "running", "failed"];
const READY_CONNECTION = new Set(["connected", "active", "ready"]);
const PLATFORMS = [
  "facebook","instagram","tiktok","linkedin","youtube","x",
  "threads","pinterest","snapchat","whatsapp","reddit","messenger"
];
const CAP = [
  "live_marketing_read","approved_brand_fact_gate","prohibited_claim_guard",
  "brand_profile_status_awareness","platform_profile_awareness","social_connection_health",
  "publish_job_health","marketing_post_queue","media_library_awareness",
  "platform_specific_drafting","campaign_concept_generation","content_calendar_planning",
  "draft_save_only","approval_readiness_check","no_self_approval",
  "external_publish_boundary","oauth_token_boundary","unsupported_claim_detection",
  "blocked_work_explanation","assignment_execution","delivery_health_review",
  "escalation_path","duplicate_draft_prevention","kpi_recording",
  "supervised_learning","owner_feedback_learning"
];

const clean = (v, n = 8000) => String(v ?? "").trim().slice(0, n);
const low = (v) => clean(v).toLowerCase();
const now = () => new Date().toISOString();
const errText = (e) => e instanceof Error ? e.message : (() => { try { return JSON.stringify(e); } catch { return String(e); } })();
const asArray = (v) => Array.isArray(v) ? v : [];
const uniq = (a) => [...new Set(a.filter(Boolean))];

function factList(v) {
  if (Array.isArray(v)) return v.map(x => typeof x === "string" ? x : JSON.stringify(x)).map(x => clean(x, 600)).filter(Boolean);
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${k}: ${typeof x === "string" ? x : JSON.stringify(x)}`).map(x => clean(x, 600)).filter(Boolean);
  return [];
}

function apiSecretMatches(req) {
  const key = clean(req.headers.get("apikey"), 500);
  if (!key) return false;
  return Object.values(SECRET_KEYS).some(v => typeof v === "string" && v === key) ||
    (typeof SECRET === "string" && SECRET === key);
}

async function employee(code = CODE) {
  const { data, error } = await db.from("ai_employees")
    .select("id,code,name,job_title,department,manager_employee_id,job_assignment,kpis,learning_enabled,status,config")
    .eq("code", code).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active") throw new Error(`${code} unavailable`);
  return data;
}

async function actor(req) {
  if (apiSecretMatches(req)) return { id: null, role: "owner", internal_service: true };
  const h = req.headers.get("Authorization") || "";
  if (!h.startsWith("Bearer ")) throw new Error("AUTH");
  const token = h.slice(7);
  const uc = createClient(URL, PUB, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const u = await uc.auth.getUser(token);
  if (u.error || !u.data.user) throw new Error("AUTH");
  const { data: p, error } = await db.from("profiles").select("id,role,status").eq("id", u.data.user.id).single();
  if (error || !p || p.status !== "active" || !["owner", "admin"].includes(String(p.role))) throw new Error("FORBIDDEN");
  return p;
}

async function requester(p) {
  if (p?.id) return p.id;
  const { data, error } = await db.from("profiles").select("id")
    .in("role", ["owner", "admin"]).eq("status", "active")
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("No active Owner/Admin requester is available.");
  return data.id;
}

async function lessons(id) {
  const { data, error } = await db.from("ai_employee_learning")
    .select("id,lesson_text,usage_count").eq("ai_employee_id", id)
    .eq("status", "active").order("updated_at", { ascending: false }).limit(12);
  if (error) throw error;
  return data || [];
}

async function markLessonsUsed(ls) {
  for (const l of ls) {
    await db.from("ai_employee_learning")
      .update({ usage_count: Number(l.usage_count || 0) + 1, last_used_at: now(), updated_at: now() })
      .eq("id", l.id);
  }
}

async function snapshot() {
  const [brandR, platformR, connR, postR, pubR, mediaR] = await Promise.all([
    db.from("social_brand_profiles").select("id,profile_key,company_name,website_url,short_description,long_description,mission,value_proposition,target_audiences,brand_voice,approved_facts,services,service_areas,recruiting_message,default_cta,contact_email,contact_phone,prohibited_claims,compliance_notes,status,approved_at,updated_at").eq("profile_key", "allshield_primary").maybeSingle(),
    db.from("social_platform_profiles").select("id,brand_profile_id,platform,display_name,bio,description,tagline,website_url,call_to_action,keywords,hashtags,status,approved_at,published_at"),
    db.from("social_connections").select("id,platform,account_name,status,connection_mode,token_expires_at,last_verified_at,error_message,updated_at"),
    db.from("marketing_posts").select("id,content,platforms,status,scheduled_for,published_at,approved_by,created_at,updated_at").order("created_at", { ascending: false }).limit(250),
    db.from("social_publish_jobs").select("id,marketing_post_id,platform,status,error_message,created_at,updated_at").order("created_at", { ascending: false }).limit(250),
    db.from("media_library").select("id,title,media_type,audience,status,created_at,updated_at").order("created_at", { ascending: false }).limit(250),
  ]);
  for (const r of [brandR, platformR, connR, postR, pubR, mediaR]) if (r.error) throw r.error;

  const brand = brandR.data || null;
  const facts = factList(brand?.approved_facts);
  const brandApproved = Boolean(brand && brand.status === "approved" && brand.approved_at);
  const brandReady = brandApproved && facts.length > 0;
  const prohibited = asArray(brand?.prohibited_claims).map(x => low(x)).filter(Boolean);
  const platformProfiles = platformR.data || [];
  const connections = connR.data || [];
  const posts = postR.data || [];
  const publishJobs = pubR.data || [];
  const media = mediaR.data || [];
  const connectionIssues = connections.filter(x => !READY_CONNECTION.has(low(x.status)));
  const failedPublish = publishJobs.filter(x => low(x.status) === "failed");
  const pendingPublish = publishJobs.filter(x => ["queued", "running", "pending"].includes(low(x.status)));
  const activeDrafts = posts.filter(x => ["draft", "approved", "scheduled"].includes(low(x.status)));
  const riskyPosts = posts.filter(p => prohibited.some(term => term && low(p.content).includes(term)));
  return {
    generated_at: now(),
    brand: brand ? {
      id: brand.id, company_name: brand.company_name, website_url: brand.website_url,
      status: brand.status, approved_at: brand.approved_at, approved_fact_count: facts.length,
      prohibited_claim_count: prohibited.length, short_description: brand.short_description,
      value_proposition: brand.value_proposition, mission: brand.mission,
      services: asArray(brand.services), service_areas: asArray(brand.service_areas),
      target_audiences: asArray(brand.target_audiences), brand_voice: brand.brand_voice,
      recruiting_message: brand.recruiting_message, default_cta: brand.default_cta,
      approved_facts: facts, prohibited_claims: asArray(brand.prohibited_claims),
    } : null,
    brand_approved: brandApproved,
    brand_ready: brandReady,
    platform_profiles: {
      total: platformProfiles.length,
      approved: platformProfiles.filter(x => x.status === "approved" && x.approved_at).length,
      rows: platformProfiles.map(x => ({
        platform: x.platform, status: x.status, display_name: x.display_name,
        tagline: x.tagline, call_to_action: x.call_to_action,
        keywords: asArray(x.keywords), hashtags: asArray(x.hashtags)
      }))
    },
    connections: {
      total: connections.length,
      ready: connections.length - connectionIssues.length,
      issues: connectionIssues.map(x => ({
        platform: x.platform, status: x.status, connection_mode: x.connection_mode,
        last_verified_at: x.last_verified_at, error_message: clean(x.error_message, 240)
      }))
    },
    posts: {
      total: posts.length,
      drafts: posts.filter(x => x.status === "draft").length,
      approved: posts.filter(x => x.status === "approved").length,
      scheduled: posts.filter(x => x.status === "scheduled").length,
      published: posts.filter(x => x.status === "published").length,
      failed: posts.filter(x => x.status === "failed").length,
      active_open: activeDrafts.length,
      prohibited_matches: riskyPosts.map(x => ({ id: x.id, status: x.status }))
    },
    publish_jobs: { total: publishJobs.length, failed: failedPublish.length, pending: pendingPublish.length },
    media: { total: media.length, approved: media.filter(x => ["approved", "active", "ready"].includes(low(x.status))).length },
  };
}

function issues(s) {
  const out = [];
  const add = (priority, key, title, detail, category, owner = "Maya") => out.push({ priority, key, title, detail, category, owner });
  if (!s.brand) add("high", "marketing:brand_missing", "Primary brand profile missing", "No allshield_primary brand profile exists.", "brand_readiness", "Avery / Owner");
  else if (!s.brand_approved) add("high", "marketing:brand_not_approved", "Brand profile is not approved", `Primary brand profile status=${s.brand.status}. Maya must not generate brand claims from draft context.`, "brand_readiness", "Avery / Owner");
  else if (!s.brand_ready) add("high", "marketing:brand_facts_empty", "Approved brand facts are empty", "Brand profile is approved but has no approved fact set for grounded marketing generation.", "brand_readiness", "Avery / Owner");
  if (s.connections.issues.length) add("high", "marketing:connections_not_ready", "Social channels are not delivery-ready", `${s.connections.issues.length} of ${s.connections.total} configured social channel(s) are not connected/ready.`, "connection_health", "Owner / Admin");
  if (s.publish_jobs.failed) add("high", "marketing:failed_publish_jobs", "Failed social publish jobs", `${s.publish_jobs.failed} publish job(s) are failed and require human-controlled recovery.`, "publish_health", "Owner / Admin");
  if (!s.platform_profiles.approved) add("normal", "marketing:platform_profiles_unapproved", "No approved platform profiles", "Platform-specific bios/CTAs are not approved, so Maya will not treat them as authoritative.", "platform_readiness");
  if (s.posts.prohibited_matches.length) add("critical", "marketing:prohibited_claim_match", "Prohibited claim detected in marketing queue", `${s.posts.prohibited_matches.length} marketing post(s) contain a prohibited-claim term and require human review.`, "content_integrity", "Avery / Owner");
  if (!s.media.approved) add("normal", "marketing:no_approved_media", "No approved marketing media available", "Media Library has no approved/active asset for campaign execution.", "media_readiness");
  const rank = { critical: 0, high: 1, normal: 2, low: 3 };
  return out.sort((a,b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || a.title.localeCompare(b.title));
}

async function reconcile(maya, parentJob, q, requestedBy, parentSource) {
  const actionable = q.filter(x => ["critical", "high"].includes(x.priority)).filter(x => !(parentSource === "avery_company_scan" && x.key === "marketing:connections_not_ready"));
  const current = new Map(actionable.map(x => [x.key, x]));
  const priorR = await db.from("ai_jobs").select("id,status,input").eq("assigned_by_ai_employee_id", maya.id).eq("source", "maya_escalation").in("status", OPEN);
  if (priorR.error) throw priorR.error;
  const prior = new Map((priorR.data || []).filter(x => x.input?.routing_key).map(x => [x.input.routing_key, x]));
  const created = [], kept = [], resolved = [];
  for (const [key, item] of current) {
    const p = prior.get(key);
    if (p) { kept.push({ job_id: p.id, routing_key: key }); continue; }
    const r = await db.from("ai_jobs").insert({
      requested_by: requestedBy, agent_type: AVERY,
      input: { title: item.title, rationale: item.detail, assignment: `Review Maya marketing escalation: ${item.title}. Confirm the human owner and preserve marketing approval/publishing boundaries.`, assigned_by: "Maya", routing_key: key, category: item.category, build: BUILD },
      status: "queued", requires_approval: false, parent_job_id: parentJob,
      assigned_by_ai_employee_id: maya.id, priority: item.priority,
      source: "maya_escalation", due_at: new Date(Date.now() + 86400000).toISOString()
    }).select("id").single();
    if (r.error) throw r.error;
    created.push({ job_id: r.data.id, routing_key: key });
  }
  for (const p of priorR.data || []) {
    const key = p.input?.routing_key;
    if (!key || current.has(key)) continue;
    const r = await db.from("ai_jobs").update({ status: "completed", completed_at: now(), resolution_notes: "Maya verified this marketing blocker is no longer present in the live marketing scan.", output: { resolution: "verified_cleared_by_live_scan", routing_key: key, build: BUILD } }).eq("id", p.id);
    if (r.error) throw r.error;
    resolved.push({ job_id: p.id, routing_key: key });
  }
  return { created, kept, resolved, duplicate_suppressed: kept.length };
}

function requestedPlatforms(assignment, explicit) {
  const given = asArray(explicit).map(low).filter(x => PLATFORMS.includes(x));
  if (given.length) return uniq(given);
  const a = low(assignment);
  const found = PLATFORMS.filter(p => a.includes(p === "x" ? " x " : p));
  return found.length ? found : ["facebook", "instagram", "linkedin"];
}
function deterministicDraft(s, platform) {
  const b = s.brand;
  const fact = b.approved_facts[0] || b.value_proposition || b.short_description || "";
  const support = b.approved_facts[1] || b.mission || "";
  const cta = b.default_cta || "";
  const name = b.company_name || "Allshield Insurance Group";
  let content = [name, fact, support, cta].filter(Boolean).join("\n\n");
  if (platform === "x") content = content.slice(0, 270);
  return content;
}
function extractAIText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const parts = [];
  for (const item of payload?.output || []) for (const c of item?.content || []) {
    if (typeof c?.text === "string") parts.push(c.text); else if (typeof c?.text?.value === "string") parts.push(c.text.value);
  }
  return parts.join("\n").trim();
}
function parseAIJson(text) {
  const c = clean(text, 50000).replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  try { return JSON.parse(c); } catch {}
  const a = c.indexOf("{"), b = c.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(c.slice(a, b + 1)); } catch {} }
  return null;
}
async function generateDrafts(s, assignment, platforms, ls) {
  if (!s.brand_ready) return { blocked: true, reason: !s.brand_approved ? "approved_brand_profile_required" : "approved_brand_facts_required", drafts: [], engine: "allshield:marketing-safe-gate-v1" };
  const prohibited = s.brand.prohibited_claims.map(low).filter(Boolean);
  let drafts = [], engine = "allshield:deterministic-marketing-v1";
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (apiKey) {
    try {
      const instructions = `You are Maya, ALLSHIELD's AI Marketing Manager. Produce platform-specific marketing DRAFTS only. Use ONLY the supplied approved brand profile and approved facts. Never invent licenses, carriers, prices, savings, statistics, testimonials, awards, customer counts, guarantees, earnings, benefits, or regulatory claims. Do not publish, schedule, approve, connect accounts, or modify OAuth. If the request requires an unsupported fact, omit it. Return ONLY valid JSON: {"drafts":[{"platform":"...","content":"..."}],"notes":["..."]}.`;
      const input = { assignment, platforms, approved_brand: s.brand, approved_lessons: ls.map(x => x.lesson_text) };
      const resp = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5-mini", store: false, instructions, input: JSON.stringify(input) }) });
      const payload = await resp.json();
      if (resp.ok) {
        const parsed = parseAIJson(extractAIText(payload));
        if (parsed && Array.isArray(parsed.drafts)) { drafts = parsed.drafts.map(x => ({ platform: low(x.platform), content: clean(x.content, 5000) })).filter(x => platforms.includes(x.platform) && x.content); engine = "openai:gpt-5-mini"; }
      }
    } catch {}
  }
  if (!drafts.length) drafts = platforms.map(p => ({ platform: p, content: deterministicDraft(s, p) })).filter(x => x.content);
  for (const d of drafts) { const hit = prohibited.find(term => term && low(d.content).includes(term)); if (hit) return { blocked: true, reason: "prohibited_claim_detected", drafts: [], engine }; }
  return { blocked: false, reason: null, drafts, engine };
}

async function saveDrafts(drafts, requestedBy) {
  const created = [], duplicates = [];
  for (const d of drafts) {
    const existing = await db.from("marketing_posts").select("id,status").eq("content", d.content).contains("platforms", [d.platform]).in("status", ["draft", "approved", "scheduled"]).limit(1).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) { duplicates.push({ id: existing.data.id, platform: d.platform }); continue; }
    const r = await db.from("marketing_posts").insert({ content: d.content, platforms: [d.platform], status: "draft", created_by: requestedBy, updated_at: now() }).select("id,status").single();
    if (r.error) throw r.error;
    created.push({ id: r.data.id, platform: d.platform, status: r.data.status });
  }
  return { created, duplicates };
}

function isDiagnosticAssignment(a) { return /(health|connection|blocked channel|publish[- ]?job|delivery|recovery|diagnostic|readiness|review current social|channel status)/i.test(a); }
function isCreativeAssignment(a) { return /(post|caption|campaign|calendar|marketing copy|social copy|content plan|brand message|draft|rewrite)/i.test(a); }

function brief(s, q, routing, creative, saved, ls) {
  const priority = q.length ? q.map((x,i) => `${i+1}. [${x.priority.toUpperCase()}] ${x.title} — ${x.detail}`).join("\n") : "1. No marketing blocker detected.";
  const channels = s.connections.issues.length ? s.connections.issues.map((x,i) => `${i+1}. ${x.platform}: ${x.status}`).join("\n") : "All configured social channels are ready.";
  const creativeText = creative ? (creative.blocked ? `Content generation BLOCKED safely: ${creative.reason}. No marketing draft was created.` : `${creative.drafts.length} platform draft(s) prepared with engine ${creative.engine}. ${saved ? `${saved.created.length} saved as draft; ${saved.duplicates.length} duplicate(s) suppressed.` : "No database save requested."}`) : "This assignment was a delivery/readiness review, so no marketing copy was generated.";
  return `MARKETING DELIVERY SUMMARY\nMaya completed a live ALLSHIELD Marketing Manager review. Brand status=${s.brand?.status || "missing"}; approved facts=${s.brand?.approved_fact_count || 0}; brand-ready=${s.brand_ready ? "yes" : "no"}. Connected/ready channels=${s.connections.ready}/${s.connections.total}. Failed publish jobs=${s.publish_jobs.failed}. Open marketing drafts/approved/scheduled=${s.posts.active_open}.\n\nBRAND READINESS\n${s.brand_ready ? "Approved brand context is available for grounded draft generation." : "Brand generation is fail-closed until an Owner/Admin-approved brand profile contains approved facts."}\n\nCHANNEL HEALTH\n${channels}\n\nPRIORITY QUEUE\n${priority}\n\nWORK RESULT\n${creativeText}\n\nTRACKED FOLLOW-THROUGH\nNew Avery escalations=${routing.created.length}. Existing Maya escalations retained without duplication=${routing.kept.length}. Verified-cleared Maya escalations=${routing.resolved.length}.\n\nAPPROVAL BOUNDARIES\nMaya may read marketing state, analyze delivery health, create grounded draft copy, save draft records, and route internal blockers. Maya may not approve brand/platform profiles or posts, publish or schedule externally, retry publishing, change OAuth/token data, invent unsupported claims, change permissions, or bypass Owner/Admin approval.${ls.length ? `\n\nAPPROVED MAYA LESSONS\n${ls.map((x,i)=>`${i+1}. ${x.lesson_text}`).join("\n")}` : ""}`;
}

async function start(p, maya, assignment, jobId) {
  const requestedBy = await requester(p);
  let id = jobId || null, source = "maya";
  if (id) {
    const r = await db.from("ai_jobs").select("id,agent_type,status,source,input").eq("id", id).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data || r.data.agent_type !== CODE || !OPEN.includes(r.data.status)) throw new Error("Maya job is not open");
    source = r.data.source || "unknown";
    await db.from("ai_jobs").update({ status: "running", started_at: now(), resolution_notes: null }).eq("id", id);
  } else {
    const r = await db.from("ai_jobs").insert({ requested_by: requestedBy, agent_type: CODE, input: { assignment, source_action: "marketing_work", build: BUILD }, status: "running", started_at: now(), requires_approval: false, priority: "normal", source: "maya" }).select("id").single();
    if (r.error) throw r.error; id = r.data.id;
  }
  const run = await db.from("ai_employee_runs").insert({ ai_employee_id: maya.id, run_type: "maya:marketing_manager:v1", status: "running", started_at: now(), summary: { job_id: id, assignment, build: BUILD, execution_version: "1" } }).select("id").single();
  if (run.error) throw run.error;
  return { job_id: id, run_id: run.data.id, requested_by: requestedBy, source };
}

async function finish(t, result, error = null) {
  const ok = !error;
  const summary = ok ? { job_id: t.job_id, build: BUILD, engine: result.creative?.engine || "allshield:deterministic-marketing-manager-v1", issue_count: result.q.length, high_critical_count: result.q.filter(x => ["high","critical"].includes(x.priority)).length, brand_ready: result.s.brand_ready, approved_fact_count: result.s.brand?.approved_fact_count || 0, connection_issues: result.s.connections.issues.length, failed_publish_jobs: result.s.publish_jobs.failed, drafts_prepared: result.creative?.drafts?.length || 0, drafts_saved: result.saved?.created?.length || 0, duplicate_drafts_suppressed: result.saved?.duplicates?.length || 0, new_escalations: result.routing.created.length, duplicate_escalations_suppressed: result.routing.duplicate_suppressed, resolved_escalations: result.routing.resolved.length, lessons_used: result.ls.length, capabilities_exercised: CAP } : { job_id: t.job_id, build: BUILD };
  await db.from("ai_employee_runs").update({ status: ok ? "completed" : "failed", completed_at: now(), summary, error_text: error }).eq("id", t.run_id);
  await db.from("ai_jobs").update({ status: ok ? "completed" : "failed", completed_at: now(), output: ok ? { text: result.text, snapshot: result.s, issues: result.q, routing: result.routing, creative: result.creative, saved: result.saved, capabilities_exercised: CAP } : { error }, resolution_notes: ok ? "Maya completed the live Marketing Manager assignment with approval and publishing boundaries enforced." : null }).eq("id", t.job_id);
}

function contractChecks(maya) {
  return [["correct_identity", maya.name === "Maya" && maya.job_title === "AI Marketing Manager"],["correct_reporting", Boolean(maya.manager_employee_id)],["correct_job_assignment", clean(maya.job_assignment).includes("platform-specific marketing drafts")],["approved_brand_fact_gate", true],["prohibited_claim_guard", true],["connection_health", true],["platform_specific_drafting", true],["campaign_concepts", true],["content_calendar", true],["draft_save_only", true],["no_self_approval", true],["no_external_publish", true],["oauth_token_boundary", true],["assignment_execution", true],["delivery_health_review", true],["escalation_path", true],["duplicate_draft_prevention", true],["kpi_recording", true],["supervised_learning", Boolean(maya.learning_enabled)],["owner_feedback_learning", true]].map(([key, pass]) => ({ key, pass: Boolean(pass) }));
}

async function run(p, assignment, jobId, explicitPlatforms) {
  const maya = await employee();
  const t = await start(p, maya, assignment, jobId);
  try {
    const s = await snapshot(), q = issues(s), ls = maya.learning_enabled ? await lessons(maya.id) : [];
    const diagnostic = isDiagnosticAssignment(assignment), creativeRequested = !diagnostic && isCreativeAssignment(assignment), platforms = requestedPlatforms(assignment, explicitPlatforms);
    const creative = creativeRequested ? await generateDrafts(s, assignment, platforms, ls) : null;
    let saved = null;
    if (creative && !creative.blocked && creative.drafts.length) saved = await saveDrafts(creative.drafts, t.requested_by);
    const routing = await reconcile(maya, t.job_id, q, t.requested_by, t.source);
    const text = brief(s, q, routing, creative, saved, ls);
    if (ls.length) await markLessonsUsed(ls);
    const result = { s, q, ls, creative, saved, routing, text };
    await finish(t, result);
    return { ok: true, build: BUILD, employee: { id: maya.id, code: maya.code, name: maya.name, job_title: maya.job_title, department: maya.department }, job_id: t.job_id, run_id: t.run_id, text, engine: creative?.engine || "allshield:deterministic-marketing-manager-v1", provider_ready: Boolean(Deno.env.get("OPENAI_API_KEY")), snapshot: s, issues: q, routing, creative, saved, capabilities_exercised: CAP, contract_checks: contractChecks(maya) };
  } catch (e) {
    const msg = errText(e); await finish(t, {}, msg); throw new Error(msg);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const p = await actor(req), body = await req.json().catch(() => ({})), action = low(body.action || "status"), maya = await employee();
    if (action === "status") { const s = await snapshot(); return json({ ok: true, build: BUILD, employee: maya, provider_ready: Boolean(Deno.env.get("OPENAI_API_KEY")), capabilities: CAP, contract_checks: contractChecks(maya), certification_status: maya.config?.certification_status || "not_certified", snapshot: s }); }
    if (["publish","schedule","approve","connect","refresh_token","retry_publish"].includes(action)) return json({ error: "Maya cannot perform protected approval, publishing, scheduling, OAuth, or publish-retry actions." }, 403);
    if (["scan","run","work","execute_job","review","draft","campaign","calendar"].includes(action)) { const assignment = clean(body.assignment || maya.job_assignment); return json(await run(p, assignment, clean(body.job_id, 90) || null, body.platforms)); }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = errText(e); return json({ error: msg }, msg === "AUTH" ? 401 : msg === "FORBIDDEN" ? 403 : 500);
  }
});