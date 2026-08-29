import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@^2/cors";

const cors={...sdkCorsHeaders,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"};
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const URL=Deno.env.get("SUPABASE_URL")!;
const PUB=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")!;
const SECRET_KEYS=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
const SECRET=SECRET_KEYS.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(URL,SECRET,{auth:{persistSession:false,autoRefreshToken:false}});

const BUILD="B2026.08.29.039";
const EXECUTION_VERSION="1";
const CODE="performance_analyst";
const AVERY="command_center";
const OPEN_JOB_STATUSES=["queued","running","failed"];
const PROTECTED_ACTIONS=new Set([
  "change_compensation","publish_comp_plan","edit_comp_plan","edit_bonus_rule","write_ledger","approve_payroll","pay_payroll",
  "change_promotion","approve_promotion","change_agent_status","change_role","change_permissions","override_metric","fabricate_metric"
]);
const CAPABILITIES=[
  "live_performance_read","real_data_only","data_completeness_awareness","data_source_provenance","production_trend_analysis",
  "enrollment_funnel_analysis","quality_score_analysis","period_comparison","campaign_comparison","team_performance_analysis",
  "compensation_plan_read","compensation_rule_validation","compensation_ledger_reconciliation","payroll_variance_analysis",
  "payout_schedule_analysis","bonus_eligibility_analysis","manager_override_analysis","promotion_qualification_analysis",
  "emerging_leader_detection","coaching_opportunity_detection","threshold_near_miss_detection","anomaly_detection",
  "assignment_execution","tracked_run_evidence","kpi_recording","escalation_path","duplicate_escalation_suppression",
  "recommendation_only_boundary","no_compensation_mutation","no_promotion_mutation","no_payroll_mutation","no_status_mutation",
  "supervised_learning","owner_feedback_learning"
];
const APPROVED_ACA_REFERENCE={
  campaign_code:"ACA_DIALER",
  base_enrollment_amount:15,
  agent_monthly:[{threshold:250,amount:250},{threshold:300,amount:500}],
  manager_direct_override_rate:0.25,
  manager_direct_coaching:[{threshold:200,amount:50},{threshold:250,amount:100},{threshold:300,amount:200}],
  market_monthly:[{threshold:1000,amount:1000},{threshold:2000,amount:2500},{threshold:3000,amount:4000}],
  promotion_rule:{direct_agents_required:2,team_enrollments_required:500,promoter_one_time_bonus:2500},
  promoted_market_below_1000_rate:0.25,
  promoting_manager_market:[{threshold:1000,amount:500},{threshold:2000,amount:1250},{threshold:3000,amount:2000}]
};

const clean=(v:any,n=8000)=>String(v??"").trim().slice(0,n);
const low=(v:any)=>clean(v).toLowerCase();
const now=()=>new Date().toISOString();
const num=(v:any)=>Number(v||0);
const round2=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
const asArray=(v:any)=>Array.isArray(v)?v:[];
const errText=(e:any)=>e instanceof Error?e.message:(()=>{try{return JSON.stringify(e)}catch{return String(e)}})();
function apiSecretMatches(req:Request){const key=clean(req.headers.get("apikey"),500);if(!key)return false;return Object.values(SECRET_KEYS).some(v=>typeof v==="string"&&v===key)||(typeof SECRET==="string"&&SECRET===key)}
async function employee(code=CODE){const r=await db.from("ai_employees").select("id,code,name,job_title,department,manager_employee_id,job_assignment,kpis,learning_enabled,status,config").eq("code",code).maybeSingle();if(r.error)throw r.error;if(!r.data||r.data.status!=="active")throw new Error(`${code} unavailable`);return r.data}
async function actor(req:Request){if(apiSecretMatches(req))return {id:null,role:"owner",internal_service:true};const h=req.headers.get("Authorization")||"";if(!h.startsWith("Bearer "))throw new Error("AUTH");const t=h.slice(7);const uc=createClient(URL,PUB,{global:{headers:{Authorization:`Bearer ${t}`}},auth:{persistSession:false,autoRefreshToken:false}});const u=await uc.auth.getUser(t);if(u.error||!u.data.user)throw new Error("AUTH");const p=await db.from("profiles").select("id,role,status").eq("id",u.data.user.id).single();if(p.error||!p.data||p.data.status!=="active"||!["owner","admin"].includes(String(p.data.role)))throw new Error("FORBIDDEN");return p.data}
async function requester(a:any){if(a?.id)return a.id;const r=await db.from("profiles").select("id").in("role",["owner","admin"]).eq("status","active").order("created_at",{ascending:true}).limit(1).maybeSingle();if(r.error)throw r.error;if(!r.data?.id)throw new Error("No active Owner/Admin requester is available.");return r.data.id}
async function rows(table:string,select="*",limit=5000){const r=await db.from(table).select(select).limit(limit);if(r.error)throw r.error;return r.data||[]}
async function lessons(id:string){const r=await db.from("ai_employee_learning").select("id,lesson_text,usage_count").eq("ai_employee_id",id).eq("status","active").order("updated_at",{ascending:false}).limit(12);if(r.error)throw r.error;return r.data||[]}
async function markLessonsUsed(ls:any[]){for(const l of ls){await db.from("ai_employee_learning").update({usage_count:num(l.usage_count)+1,last_used_at:now(),updated_at:now()}).eq("id",l.id)}}

function pairKey(threshold:any,amount:any){return `${num(threshold)}:${round2(num(amount))}`}
function expectedRuleIssues(plan:any,rules:any[]){
  const issues:any[]=[];
  const add=(priority:string,key:string,title:string,detail:string)=>issues.push({priority,key,title,detail,category:"compensation_configuration",owner:"Avery / Owner"});
  if(!plan){add("critical","marcus:aca_plan_missing","ACA compensation plan missing","The active ACA campaign has no compensation plan version to analyze.");return issues}
  if(low(plan.status)!=="published")add("high",`marcus:plan:${plan.id}:not_published","Active campaign compensation plan is not published",`ACA campaign is active while compensation plan v${plan.version} remains ${plan.status}. Marcus will analyze it as configuration only and will not treat it as payable authority.`);
  if(round2(num(plan.base_enrollment_amount))!==APPROVED_ACA_REFERENCE.base_enrollment_amount)add("critical",`marcus:plan:${plan.id}:base_mismatch","ACA base enrollment amount differs from approved framework",`Stored base amount is $${round2(num(plan.base_enrollment_amount))}; approved reference is $${APPROVED_ACA_REFERENCE.base_enrollment_amount}.`);
  const compare=(type:string,expected:any[],label:string)=>{
    const actual=rules.filter(r=>r.plan_version_id===plan.id&&r.rule_type===type);
    const actualKeys=new Set(actual.map(r=>pairKey(r.threshold,r.amount)));
    const expectedKeys=new Set(expected.map(r=>pairKey(r.threshold,r.amount)));
    for(const e of expected)if(!actualKeys.has(pairKey(e.threshold,e.amount)))add("high",`marcus:rule:${type}:missing:${e.threshold}`,`${label} rule missing`,`Expected ${label} threshold ${e.threshold} with amount $${e.amount}, but that exact rule is not stored.`);
    for(const a of actual)if(!expectedKeys.has(pairKey(a.threshold,a.amount)))add("high",`marcus:rule:${type}:unexpected:${a.threshold}:${a.amount}`,`${label} rule does not match approved framework`,`Stored ${label} threshold ${a.threshold} pays $${a.amount}, which is not in the approved reference.`);
  };
  compare("agent_monthly",APPROVED_ACA_REFERENCE.agent_monthly,"agent monthly bonus");
  compare("manager_direct_coaching",APPROVED_ACA_REFERENCE.manager_direct_coaching,"manager direct coaching bonus");
  compare("market_monthly",APPROVED_ACA_REFERENCE.market_monthly,"direct-market volume bonus");
  compare("promoting_manager_market",APPROVED_ACA_REFERENCE.promoting_manager_market,"promoting-manager market bonus");
  const pr=plan.config?.promotion_rule||{};
  for(const [k,v] of Object.entries(APPROVED_ACA_REFERENCE.promotion_rule))if(num(pr?.[k])!==num(v))add("high",`marcus:promotion_rule:${k}`,`Promotion rule mismatch: ${k}`,`Stored ${k}=${pr?.[k]??"missing"}; approved reference=${v}.`);
  return issues;
}

async function snapshot(){
  const [campaigns,production,enrollments,plans,rules,ledger,payrollRuns,payrollItems,promoSnaps,promoLevels,promotions,profiles]=await Promise.all([
    rows("campaigns","id,code,name,status,created_at"),
    rows("production_entries","id,user_id,period_start,period_end,sales_count,quality_score,source,created_at"),
    rows("campaign_enrollments","id,campaign_id,agent_id,submitted_at,qualified_at,status,card_orderable,residual_eligible,coverage_effective_date,reconciliation_status,created_at"),
    rows("comp_plan_versions","id,campaign_id,version,status,effective_from,effective_to,base_enrollment_amount,weekly_arrears_days,payday_dow,residual_pool_per_member,config,contract_terms,published_at,created_at"),
    rows("comp_bonus_rules","id,plan_version_id,rule_type,threshold,amount,generation_scope,metadata"),
    rows("comp_ledger","id,user_id,campaign_id,plan_version_id,earning_type,source_period_start,source_period_end,units,rate,amount,status,payable_on,paid_at,source_ref,created_at"),
    rows("payroll_runs","id,campaign_id,period_start,period_end,payable_on,status,gross_amount,approved_by,approved_at,paid_at,created_at"),
    rows("payroll_run_items","id,payroll_run_id,user_id,comp_ledger_id,earning_type,amount,created_at"),
    rows("promotion_qualification_snapshots","id,campaign_id,user_id,qualification_month,personal_enrollments,first_generation_enrollments,active_direct_agents,compliance_passed,sop_passed,qualifies,metadata,created_at"),
    rows("promotion_levels","id,code,name,level_order,requirements,active"),
    rows("user_promotions","id,user_id,level_id,status,recommended_by,approved_by,approved_at,created_at"),
    rows("profiles","id,first_name,last_name,username,role,status,manager_id,created_at")
  ]);
  const acaCampaign=campaigns.find((c:any)=>c.code===APPROVED_ACA_REFERENCE.campaign_code)||null;
  const acaPlans=acaCampaign?plans.filter((p:any)=>p.campaign_id===acaCampaign.id).sort((a:any,b:any)=>num(b.version)-num(a.version)):[];
  const acaPlan=acaPlans[0]||null;
  const names=new Map(profiles.map((p:any)=>[p.id,`${p.first_name||""} ${p.last_name||""}`.trim()||p.username||`User ${String(p.id).slice(0,8)}`]));
  const productionByUser=new Map<string,any>();
  for(const p of production){const x=productionByUser.get(p.user_id)||{sales:0,rows:0,quality_scores:[],sources:new Set<string>()};x.sales+=num(p.sales_count);x.rows++;if(p.quality_score!=null)x.quality_scores.push(num(p.quality_score));x.sources.add(String(p.source));productionByUser.set(p.user_id,x)}
  const enrollByUser=new Map<string,any>();
  for(const e of enrollments){const x=enrollByUser.get(e.agent_id)||{submitted:0,qualified:0,card_orderable:0,residual_eligible:0};x.submitted++;if(e.qualified_at||["qualified","approved","active"].includes(low(e.status)))x.qualified++;if(e.card_orderable)x.card_orderable++;if(e.residual_eligible)x.residual_eligible++;enrollByUser.set(e.agent_id,x)}
  const people=[...new Set([...productionByUser.keys(),...enrollByUser.keys()])].map(id=>{const p=productionByUser.get(id)||{sales:0,rows:0,quality_scores:[],sources:new Set<string>()},e=enrollByUser.get(id)||{submitted:0,qualified:0,card_orderable:0,residual_eligible:0};return {user_id:id,name:names.get(id)||`User ${String(id).slice(0,8)}`,production_sales:p.sales,production_rows:p.rows,average_quality:p.quality_scores.length?round2(p.quality_scores.reduce((a:number,b:number)=>a+b,0)/p.quality_scores.length):null,production_sources:[...p.sources],submitted_enrollments:e.submitted,qualified_enrollments:e.qualified,card_orderable:e.card_orderable,residual_eligible:e.residual_eligible,qualification_rate:e.submitted?round2(e.qualified/e.submitted*100):null}});
  const dataPresence={production_entries:production.length,campaign_enrollments:enrollments.length,comp_ledger:ledger.length,payroll_runs:payrollRuns.length,payroll_run_items:payrollItems.length,promotion_snapshots:promoSnaps.length,user_promotions:promotions.length};
  return {generated_at:now(),data_policy:"REAL DATA ONLY — empty sources remain empty; no simulated metrics are created.",approved_reference:APPROVED_ACA_REFERENCE,campaigns,aca:{campaign:acaCampaign,latest_plan:acaPlan,plan_count:acaPlans.length,bonus_rules:acaPlan?rules.filter((r:any)=>r.plan_version_id===acaPlan.id):[]},data_presence:dataPresence,people,counts:{profiles:profiles.length,campaigns:campaigns.length,production_entries:production.length,campaign_enrollments:enrollments.length,comp_plan_versions:plans.length,comp_bonus_rules:rules.length,comp_ledger:ledger.length,payroll_runs:payrollRuns.length,payroll_run_items:payrollItems.length,promotion_snapshots:promoSnaps.length,promotion_levels:promoLevels.length,user_promotions:promotions.length},raw:{production,enrollments,plans,rules,ledger,payrollRuns,payrollItems,promoSnaps,promoLevels,promotions,profiles}};
}

function analyze(s:any){
  const out:any[]=[];const add=(priority:string,key:string,title:string,detail:string,category:string,owner="Marcus")=>out.push({priority,key,title,detail,category,owner});
  if(!s.aca.campaign)add("critical","marcus:aca_campaign_missing","ACA campaign missing","The expected ACA_DIALER campaign is not present.","data_readiness","Avery / Owner");
  else if(low(s.aca.campaign.status)!=="active")add("high","marcus:aca_campaign_inactive","ACA campaign is not active",`Campaign status=${s.aca.campaign.status}.`,"data_readiness","Avery / Owner");
  for(const x of expectedRuleIssues(s.aca.latest_plan,s.raw.rules))out.push(x);
  const d=s.data_presence;if(!d.production_entries&&!d.campaign_enrollments)add("normal","marcus:no_live_production","No live production data recorded","Production and enrollment tables are empty. Marcus can validate configuration but cannot truthfully rank agents, calculate trends, or recommend performance coaching yet.","data_completeness","Operations / Data Intake");
  if(!d.comp_ledger)add("normal","marcus:no_comp_ledger","No compensation ledger activity recorded","There are no ledger earnings to reconcile yet.","data_completeness");
  if(!d.payroll_runs)add("normal","marcus:no_payroll_runs","No payroll runs recorded","There are no payroll runs to compare against compensation ledger activity.","data_completeness");
  if(!d.promotion_snapshots)add("normal","marcus:no_promotion_snapshots","No promotion qualification snapshots recorded","Marcus cannot identify verified promotion readiness without qualification snapshots.","data_completeness");
  for(const e of s.raw.production){if(num(e.sales_count)<0)add("critical",`marcus:production:${e.id}:negative`,`Negative production count detected`,`Production row ${e.id} has sales_count=${e.sales_count}.`,"data_integrity","Avery / Owner");if(e.quality_score!=null&&(num(e.quality_score)<0||num(e.quality_score)>100))add("high",`marcus:production:${e.id}:quality_range`,`Quality score outside 0–100`,`Production row ${e.id} has quality_score=${e.quality_score}.`,"data_integrity")}
  const prodDup=new Map<string,number>();for(const e of s.raw.production){const k=`${e.user_id}|${e.period_start}|${e.period_end}|${e.source}`;prodDup.set(k,(prodDup.get(k)||0)+1)}for(const [k,c] of prodDup)if(c>1)add("high",`marcus:production_duplicate:${k}`,"Potential duplicate production rows",`${c} rows share the same user, period and source.`,"data_integrity");
  for(const e of s.raw.enrollments){if(e.residual_eligible&&!e.qualified_at&&!["qualified","approved","active"].includes(low(e.status)))add("high",`marcus:enrollment:${e.id}:residual_without_qualification`,`Residual-eligible enrollment lacks qualification evidence`,`Enrollment ${e.id} is residual eligible but is not recorded as qualified/approved/active.`,"data_integrity");if(e.card_orderable&&!e.qualified_at&&low(e.status)==="submitted")add("normal",`marcus:enrollment:${e.id}:card_orderable_submitted`,`Card-orderable enrollment remains submitted`,`Enrollment ${e.id} is card orderable but remains in submitted status without qualified_at.`,"reconciliation")}
  for(const l of s.raw.ledger){const expected=round2(num(l.units)*num(l.rate)),actual=round2(num(l.amount));if(Math.abs(expected-actual)>0.01)add("critical",`marcus:ledger:${l.id}:math`,`Compensation ledger math mismatch`,`Ledger ${l.id}: units × rate = $${expected}, stored amount = $${actual}.`,"compensation_integrity","Avery / Owner");if(low(l.status)==="paid"&&!l.paid_at)add("high",`marcus:ledger:${l.id}:paid_without_timestamp`,`Paid ledger item has no paid_at timestamp`,`Ledger ${l.id} is marked paid without paid_at.`,"compensation_integrity")}
  const itemsByRun=new Map<string,number>();for(const i of s.raw.payrollItems)itemsByRun.set(i.payroll_run_id,round2((itemsByRun.get(i.payroll_run_id)||0)+num(i.amount)));for(const r of s.raw.payrollRuns){const itemTotal=round2(itemsByRun.get(r.id)||0),gross=round2(num(r.gross_amount));if(Math.abs(itemTotal-gross)>0.01)add("critical",`marcus:payroll:${r.id}:gross`,`Payroll gross does not match items`,`Payroll ${r.id}: item total $${itemTotal}, stored gross $${gross}.`,"payroll_integrity","Avery / Owner");if(low(r.status)==="paid"&&!r.paid_at)add("high",`marcus:payroll:${r.id}:paid_without_timestamp`,`Paid payroll run has no paid_at timestamp`,`Payroll ${r.id} is marked paid without paid_at.`,"payroll_integrity")}
  for(const p of s.raw.promoSnaps){if(p.qualifies&&(!p.compliance_passed||!p.sop_passed))add("critical",`marcus:promotion_snapshot:${p.id}:control_failure`,`Promotion snapshot qualifies despite failed controls`,`Snapshot ${p.id} qualifies=true while compliance_passed=${p.compliance_passed} and sop_passed=${p.sop_passed}.`,"promotion_integrity","Avery / Owner")}
  const rank:any={critical:0,high:1,normal:2,low:3};return out.sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)||a.title.localeCompare(b.title));
}

function coaching(s:any){
  if(!s.data_presence.production_entries&&!s.data_presence.campaign_enrollments)return [];
  const recs:any[]=[];
  for(const p of s.people){
    const monthly=p.qualified_enrollments||p.production_sales;
    const nextAgent=APPROVED_ACA_REFERENCE.agent_monthly.find(x=>monthly<x.threshold);
    if(nextAgent&&monthly>0&&monthly>=nextAgent.threshold*0.8)recs.push({user_id:p.user_id,name:p.name,type:"near_bonus_threshold",evidence:{current:monthly,next_threshold:nextAgent.threshold},recommendation:`Coach toward the ${nextAgent.threshold}-enrollment monthly milestone; current verified count is ${monthly}.`});
    if(p.qualification_rate!=null&&p.submitted_enrollments>=10&&p.qualification_rate<70)recs.push({user_id:p.user_id,name:p.name,type:"qualification_rate",evidence:{submitted:p.submitted_enrollments,qualified:p.qualified_enrollments,rate:p.qualification_rate},recommendation:"Review call quality, eligibility verification and submission accuracy; qualification rate is materially below 70%."});
    if(p.average_quality!=null&&p.average_quality<80)recs.push({user_id:p.user_id,name:p.name,type:"quality_score",evidence:{average_quality:p.average_quality},recommendation:"Review QA feedback and coaching opportunities; verified average quality score is below 80."});
  }
  return recs;
}
function emergingLeaders(s:any){return s.raw.promoSnaps.filter((x:any)=>x.compliance_passed&&x.sop_passed&&(x.qualifies||num(x.active_direct_agents)>=APPROVED_ACA_REFERENCE.promotion_rule.direct_agents_required||num(x.personal_enrollments)+num(x.first_generation_enrollments)>=APPROVED_ACA_REFERENCE.promotion_rule.team_enrollments_required*0.8)).map((x:any)=>({user_id:x.user_id,qualification_month:x.qualification_month,personal_enrollments:x.personal_enrollments,first_generation_enrollments:x.first_generation_enrollments,team_enrollments:num(x.personal_enrollments)+num(x.first_generation_enrollments),active_direct_agents:x.active_direct_agents,qualifies:x.qualifies,compliance_passed:x.compliance_passed,sop_passed:x.sop_passed,recommendation:x.qualifies?"Verified promotion snapshot indicates qualification; human approval remains required.":"Emerging-leader signal only; continue coaching and verify all promotion requirements."}))}
async function escalate(marcus:any,issues:any[],parentJobId:string|null,requestedBy:string){
  const high=issues.filter(x=>["critical","high"].includes(x.priority));const created:any[]=[];
  for(const i of high){const existing=await db.from("ai_jobs").select("id,status").eq("agent_type",AVERY).eq("source","marcus_performance_analysis").contains("input",{routing_key:i.key}).in("status",OPEN_JOB_STATUSES).limit(1).maybeSingle();if(existing.error)throw existing.error;if(existing.data){created.push({issue_key:i.key,job_id:existing.data.id,created:false,duplicate_suppressed:true});continue}const ins=await db.from("ai_jobs").insert({requested_by:requestedBy,agent_type:AVERY,input:{routing_key:i.key,from_employee:CODE,title:i.title,detail:i.detail,category:i.category,priority:i.priority,recommended_owner:i.owner},status:"queued",requires_approval:true,parent_job_id:parentJobId,assigned_by_ai_employee_id:marcus.id,priority:i.priority,source:"marcus_performance_analysis"}).select("id,status").single();if(ins.error)throw ins.error;created.push({issue_key:i.key,job_id:ins.data.id,created:true,duplicate_suppressed:false})}
  return created;
}
async function runAnalysis(marcus:any,runType:string,parentJobId:string|null,requestedBy:string,useLearning=true){
  const ls=useLearning?await lessons(marcus.id):[];const s=await snapshot();const issues=analyze(s),coach=coaching(s),leaders=emergingLeaders(s),escalations=await escalate(marcus,issues,parentJobId,requestedBy);
  const summary={build:BUILD,execution_version:EXECUTION_VERSION,employee:{code:marcus.code,name:marcus.name,title:marcus.job_title},data_policy:s.data_policy,data_presence:s.data_presence,counts:s.counts,aca:{campaign:s.aca.campaign,latest_plan:s.aca.latest_plan,bonus_rules:s.aca.bonus_rules},issue_count:issues.length,critical_count:issues.filter((x:any)=>x.priority==="critical").length,high_count:issues.filter((x:any)=>x.priority==="high").length,issues,coaching_recommendations:coach,emerging_leaders:leaders,escalations,approved_lessons_used:ls.map((x:any)=>({id:x.id,lesson_text:x.lesson_text})),boundaries:{recommendation_only:true,compensation_mutation:false,promotion_mutation:false,payroll_mutation:false,status_mutation:false}};
  const run=await db.from("ai_employee_runs").insert({ai_employee_id:marcus.id,run_type:runType,status:"completed",started_at:now(),completed_at:now(),summary}).select("id").single();if(run.error)throw run.error;if(ls.length)await markLessonsUsed(ls);return {...summary,run_id:run.data.id};
}
async function work(marcus:any,a:any,body:any){
  const requestedBy=await requester(a);let job:any=null;const jobId=clean(body.job_id,80)||null;const assignment=clean(body.assignment||body.prompt,4000)||"Analyze current ALLSHIELD production, compensation, payroll and promotion signals; report verified anomalies, coaching opportunities and emerging leaders without changing protected records.";
  if(jobId){const r=await db.from("ai_jobs").select("*").eq("id",jobId).maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error("Assigned job not found");if(r.data.agent_type!==CODE)throw new Error("Assigned job is not for Marcus");job=r.data;await db.from("ai_jobs").update({status:"running",started_at:now()}).eq("id",jobId)}else{const r=await db.from("ai_jobs").insert({requested_by:requestedBy,agent_type:CODE,input:{assignment},status:"running",requires_approval:false,priority:"normal",source:a?.internal_service?"internal":"human",started_at:now()}).select("*").single();if(r.error)throw r.error;job=r.data}
  try{const result=await runAnalysis(marcus,"work",job.id,requestedBy,true);const output={assignment,result};await db.from("ai_jobs").update({status:"completed",output,completed_at:now(),resolution_notes:`Marcus completed verified performance analysis on ${result.counts.production_entries} production row(s), ${result.counts.campaign_enrollments} enrollment row(s), ${result.counts.comp_ledger} ledger row(s) and ${result.counts.payroll_runs} payroll run(s).`}).eq("id",job.id);return {ok:true,job_id:job.id,...result,assignment}}catch(e){await db.from("ai_jobs").update({status:"failed",resolution_notes:clean(errText(e),1000)}).eq("id",job.id);throw e}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const a=await actor(req);const marcus=await employee();const body=await req.json().catch(()=>({}));const action=low(body.action||"status");
    if(PROTECTED_ACTIONS.has(action))return json({error:"Marcus is recommendation-only for compensation, payroll, promotion, status and permissions. Human approval and separate authorized workflows are required.",protected_action:action},403);
    if(action==="status")return json({ok:true,build:BUILD,execution_version:EXECUTION_VERSION,employee:{code:marcus.code,name:marcus.name,title:marcus.job_title,department:marcus.department,assignment:marcus.job_assignment,kpis:marcus.kpis},capabilities:CAPABILITIES,capability_count:CAPABILITIES.length,approved_reference:APPROVED_ACA_REFERENCE,boundaries:{recommendation_only:true,real_data_only:true,compensation_mutation:false,promotion_mutation:false,payroll_mutation:false,status_mutation:false,permissions_mutation:false}});
    if(action==="scan"){const r=await runAnalysis(marcus,"scan",null,await requester(a),true);return json({ok:true,...r})}
    if(action==="work")return json(await work(marcus,a,body));
    return json({error:"Unknown action"},400);
  }catch(e){const m=errText(e);return json({error:m},m==="AUTH"?401:m==="FORBIDDEN"?403:500)}
});
