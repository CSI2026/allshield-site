import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@^2/cors";

const cors={...sdkCorsHeaders,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-allshield-cert-token"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const url=Deno.env.get("SUPABASE_URL")!;
const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")!;
const sec=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
const BUILD="B2026.08.28.035";
const CODE="operations_manager";
const MODEL=Deno.env.get("ALLSHIELD_AI_MODEL")||"gpt-5-mini";
const clean=(v:any,m=6000)=>String(v??"").trim().slice(0,m);
const nowIso=()=>new Date().toISOString();
const ageDays=(v:any)=>{const t=new Date(v||0).getTime();return Number.isFinite(t)&&t>0?Math.floor((Date.now()-t)/86400000):null};

async function employee(){
  const {data,error}=await admin.from("ai_employees").select("id,code,name,job_title,department,job_assignment,kpis,learning_enabled,status,config").eq("code",CODE).maybeSingle();
  if(error)throw error;
  if(!data||data.status!=="active")throw new Error("Olivia is unavailable.");
  return data;
}

async function actor(req:Request){
  const cert=clean(req.headers.get("x-allshield-cert-token"),200);
  if(cert){
    const ol=await employee();
    const expected=clean(ol.config?.certification_token,200);
    if(expected&&cert===expected)return {id:null,role:"owner",status:"active",certification:true};
  }
  const h=req.headers.get("Authorization")||"";
  if(!h.startsWith("Bearer "))throw new Error("AUTH");
  const tok=h.slice(7);
  const uc=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${tok}`}},auth:{persistSession:false}});
  const {data,error}=await uc.auth.getUser(tok);
  if(error||!data.user)throw new Error("AUTH");
  const {data:p}=await admin.from("profiles").select("id,role,status").eq("id",data.user.id).single();
  if(!p||p.status!=="active"||!["owner","admin"].includes(p.role))throw new Error("FORBIDDEN");
  return p;
}

async function rows(table:string,select="*",limit=5000){const r=await admin.from(table).select(select).limit(limit);if(r.error)throw r.error;return r.data||[]}

async function lessons(id:string){
  const {data,error}=await admin.from("ai_employee_learning").select("id,lesson_text,usage_count").eq("ai_employee_id",id).eq("status","active").order("updated_at",{ascending:false}).limit(12);
  if(error)throw error;return data||[];
}
async function markLessonsUsed(ls:any[]){for(const l of ls)await admin.from("ai_employee_learning").update({usage_count:Number(l.usage_count||0)+1,last_used_at:nowIso(),updated_at:nowIso()}).eq("id",l.id)}

async function snapshot(){
  const [profiles,onboard,ops,licenses,meetings,tasks,jobs]=await Promise.all([
    rows("profiles","id,first_name,last_name,email,role,status,resident_state,created_at"),
    rows("onboarding_progress","id,user_id,step_key,step_order,completed,completed_at,metadata"),
    rows("agent_operational_status","user_id,lifecycle_stage,background_status,financial_setup_status,coding_status,dialer_status,marketplace_status,updated_at"),
    rows("user_state_licenses","id,user_id,state_code,license_type,status,readiness_percent,expiration_date"),
    rows("company_meetings","id,title,meeting_type,starts_at,ends_at,audience,status,created_at"),
    rows("crm_tasks","id,assigned_to,title,due_at,status,priority,completed_at,created_at"),
    rows("ai_jobs","id,agent_type,status,input,priority,source,due_at,started_at,completed_at,created_at")
  ]);
  const agents=profiles.filter((p:any)=>["agent","team_lead","manager"].includes(String(p.role))&&String(p.status)!=="terminated");
  const ids=new Set(agents.map((a:any)=>a.id));
  const agentRows=agents.map((a:any)=>{
    const ap=onboard.filter((x:any)=>x.user_id===a.id);
    const ao=ops.find((x:any)=>x.user_id===a.id)||{};
    const al=licenses.filter((x:any)=>x.user_id===a.id);
    const incomplete=ap.filter((x:any)=>!x.completed).map((x:any)=>x.step_key);
    const ready=al.filter((x:any)=>Number(x.readiness_percent)>=85||["active","verified","ready"].includes(String(x.status).toLowerCase()));
    return {id:a.id,name:`${a.first_name||""} ${a.last_name||""}`.trim()||a.email||"Agent",profile_status:String(a.status),resident_state:a.resident_state||null,account_age_days:ageDays(a.created_at),onboarding:{total_steps:ap.length,incomplete_steps:incomplete.length,incomplete_step_keys:incomplete},operations:{lifecycle_stage:ao.lifecycle_stage||null,background_status:ao.background_status||null,financial_setup_status:ao.financial_setup_status||null,coding_status:ao.coding_status||null,dialer_status:ao.dialer_status||null,marketplace_status:ao.marketplace_status||null,last_updated:ao.updated_at||null},licensing:{records:al.length,ready_records:ready.length,states:al.map((x:any)=>({state:x.state_code,status:x.status,readiness:Number(x.readiness_percent||0),expiration_date:x.expiration_date||null}))}};
  });
  const scheduled=meetings.filter((m:any)=>String(m.status)==="scheduled");
  const openTasks=tasks.filter((t:any)=>!["completed","cancelled","closed"].includes(String(t.status).toLowerCase()));
  const overdueTasks=openTasks.filter((t:any)=>t.due_at&&new Date(t.due_at).getTime()<Date.now());
  const ownJobs=jobs.filter((j:any)=>j.agent_type===CODE);
  return {generated_at:nowIso(),agent_population:agentRows.length,agents:agentRows,meetings:{scheduled:scheduled.length,next:scheduled.sort((a:any,b:any)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()).slice(0,8).map((m:any)=>({id:m.id,title:m.title,starts_at:m.starts_at,audience:m.audience,status:m.status}))},tasks:{open:openTasks.length,overdue:overdueTasks.length,overdue_items:overdueTasks.slice(0,20).map((t:any)=>({id:t.id,title:t.title,assigned_to:ids.has(t.assigned_to)?t.assigned_to:null,due_at:t.due_at,priority:t.priority,status:t.status}))},olivia_queue:{queued:ownJobs.filter((j:any)=>j.status==="queued").length,running:ownJobs.filter((j:any)=>j.status==="running").length,failed:ownJobs.filter((j:any)=>j.status==="failed").length,open_items:ownJobs.filter((j:any)=>["queued","running","failed"].includes(j.status)).slice(-20).reverse().map((j:any)=>({id:j.id,status:j.status,priority:j.priority,source:j.source,due_at:j.due_at,title:j.input?.title||null,assignment:j.input?.assignment||null}))}};
}

function issues(s:any){
  const out:any[]=[];
  const add=(priority:string,key:string,title:string,detail:string,agent_id:string|null=null)=>out.push({priority,key,title,detail,agent_id});
  for(const a of s.agents){
    if(a.onboarding.incomplete_steps>0)add("high",`agent:${a.id}:onboarding`,`${a.name} — onboarding incomplete`,`${a.onboarding.incomplete_steps} incomplete step(s): ${a.onboarding.incomplete_step_keys.join(", ")||"unspecified"}.`,a.id);
    if(a.profile_status==="onboarding"&&Number(a.account_age_days)>=7)add("high",`agent:${a.id}:aging`,`${a.name} — aging onboarding account`,`Account has remained in onboarding for ${a.account_age_days} day(s).`,a.id);
    const o=a.operations||{};
    const blockers=[["background_status","Background"],["financial_setup_status","Financial setup"],["coding_status","Coding"],["dialer_status","Dialer"],["marketplace_status","Marketplace"]].filter(([k])=>["not_started","blocked","failed","rejected"].includes(String(o[k]||"").toLowerCase()));
    if(blockers.length)add("normal",`agent:${a.id}:ops_blockers`,`${a.name} — operational setup pending`,blockers.map(([,label])=>label).join(", ")+" require progression or review.",a.id);
    if(a.licensing.records===0)add("high",`agent:${a.id}:license_missing`,`${a.name} — no licensing record`,`No state licensing record is attached to this active agent master profile.`,a.id);
    else if(a.licensing.ready_records===0)add("normal",`agent:${a.id}:license_not_ready`,`${a.name} — licensing not ready`,`No attached state license is at the readiness threshold yet.`,a.id);
  }
  if(s.tasks.overdue>0)add("high","operations:overdue_tasks","Overdue operating tasks",`${s.tasks.overdue} open CRM task(s) are past due.`);
  if(s.olivia_queue.failed>0)add("high","operations:failed_ai_jobs","Failed Olivia work",`${s.olivia_queue.failed} Olivia job(s) are in failed status.`);
  const rank:any={critical:0,high:1,normal:2,low:3};
  return out.sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)||a.title.localeCompare(b.title));
}

function deterministicBrief(s:any,iss:any[],ls:any[]){
  const high=iss.filter((x:any)=>x.priority==="high").length;
  const agentLines=s.agents.length?s.agents.map((a:any,i:number)=>`${i+1}. ${a.name} | status=${a.profile_status} | onboarding incomplete=${a.onboarding.incomplete_steps} | license records=${a.licensing.records} | license ready=${a.licensing.ready_records}`).join("\n"):"No valid agent profiles are currently in the operations population.";
  const queueLines=iss.length?iss.map((x:any,i:number)=>`${i+1}. [${x.priority.toUpperCase()}] ${x.title}: ${x.detail}`).join("\n"):"1. No rule-based operations exception was detected.";
  const actions=iss.slice(0,8).map((x:any,i:number)=>`${i+1}. Review ${x.title}; confirm the responsible human/system owner and update only through the approved workflow.`).join("\n")||"1. Continue monitoring current operations and re-scan when records change.";
  return `OPERATIONS SUMMARY\nOlivia completed a live ALLSHIELD operations review across ${s.agent_population} valid agent profile(s). ${iss.length} actionable operating exception(s) were identified, including ${high} high-priority item(s). The review covered onboarding, account lifecycle, licensing readiness, meetings, task aging and Olivia's work queue.\n\nPRIORITY QUEUE\n${queueLines}\n\nAGENT WORKFLOW STATUS\n${agentLines}\n\nMEETINGS & TASKS\nScheduled company meetings: ${s.meetings.scheduled}. Open CRM tasks: ${s.tasks.open}. Overdue CRM tasks: ${s.tasks.overdue}. Olivia queue: ${s.olivia_queue.queued} queued, ${s.olivia_queue.running} running, ${s.olivia_queue.failed} failed.\n\nRECOMMENDED NEXT ACTIONS\n${actions}\n\nFOLLOW-UP RULES\nOlivia will keep unresolved items visible, compare later scans against the current state, and mark only her own internal AI work complete. Agent account status, licensing status, compensation, signatures, external publishing and destructive changes remain human-controlled.${ls.length?`\n\nAPPROVED LESSONS IN FORCE\n${ls.map((x:any,i:number)=>`${i+1}. ${x.lesson_text}`).join("\n")}`:""}`;
}

function extract(b:any){if(typeof b?.output_text==="string"&&b.output_text.trim())return b.output_text.trim();const p:string[]=[];for(const i of b?.output||[])for(const c of i?.content||[])if(typeof c?.text==="string")p.push(c.text);return p.join("\n").trim()}
async function makeBrief(ol:any,assignment:string,s:any,iss:any[]){
  const ls=ol.learning_enabled?await lessons(ol.id):[];
  const fallback=()=>({text:deterministicBrief(s,iss,ls),engine:"allshield:deterministic-operations-manager",provider_ready:false,lessons_used:ls.length});
  const key=Deno.env.get("OPENAI_API_KEY");
  if(!key)return fallback();
  const instructions=`You are Olivia, AI Operations Manager for ALLSHIELD Insurance Group. Complete the operations assignment using only the supplied live production data. Do the work, do not merely describe capabilities. Never invent facts. Do not change account status, licenses, compensation, signatures, permissions, regulated content, external publishing or destructive records. Return exact sections: OPERATIONS SUMMARY, PRIORITY QUEUE, AGENT WORKFLOW STATUS, MEETINGS & TASKS, RECOMMENDED NEXT ACTIONS, FOLLOW-UP RULES.`;
  const input=`Assignment: ${assignment}\nLIVE OPERATIONS SNAPSHOT: ${JSON.stringify(s)}\nDETECTED ISSUES: ${JSON.stringify(iss)}\nAPPROVED LESSONS: ${JSON.stringify(ls.map((x:any)=>x.lesson_text))}`;
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,store:false,instructions,input})});
    const b=await r.json();if(!r.ok)throw new Error(b?.error?.message||`AI provider error ${r.status}`);const text=extract(b);if(!text)throw new Error("AI provider returned no text.");return {text,engine:`openai:${MODEL}`,provider_ready:true,lessons_used:ls.length};
  }catch(e){const f=fallback();return {...f,provider_ready:true,provider_warning:e instanceof Error?e.message:String(e)}}
}

async function start(p:any,ol:any,assignment:string,jobId:string|null){
  const started=nowIso();let job:any=null;
  if(jobId){
    const {data,error}=await admin.from("ai_jobs").select("id,agent_type,status,input,priority,source,due_at").eq("id",jobId).maybeSingle();if(error)throw error;
    if(!data||data.agent_type!==CODE)throw new Error("The requested job does not belong to Olivia.");
    if(!["queued","running","failed"].includes(data.status))throw new Error("The requested Olivia job is not open for execution.");
    const u=await admin.from("ai_jobs").update({status:"running",started_at:started,resolution_notes:null}).eq("id",jobId).select("id").single();if(u.error)throw u.error;job={id:jobId};
  }else{
    const {data,error}=await admin.from("ai_jobs").insert({requested_by:p.id||null,agent_type:CODE,input:{assignment,source_action:"operations_scan",build:BUILD},status:"running",started_at:started,requires_approval:false,priority:"high",source:"olivia"}).select("id").single();if(error)throw error;job=data;
  }
  const {data:run,error:re}=await admin.from("ai_employee_runs").insert({ai_employee_id:ol.id,run_type:"olivia:operations_manager",status:"running",started_at:started,summary:{job_id:job.id,assignment,build:BUILD,certification:Boolean(p.certification)}}).select("id").single();if(re)throw re;
  return {job_id:job.id,run_id:run.id};
}
async function finish(t:any,status:string,res:any,err:string|null=null){
  const done=nowIso();
  await admin.from("ai_employee_runs").update({status,completed_at:done,error_text:err,summary:{job_id:t.job_id,build:BUILD,engine:res?.engine||null,provider_ready:res?.provider_ready??null,issue_count:res?.issues?.length||0,capabilities_exercised:res?.capabilities_exercised||[],output_preview:res?.text?String(res.text).slice(0,1800):null}}).eq("id",t.run_id);
  await admin.from("ai_jobs").update({status,completed_at:done,resolution_notes:status==="completed"?"Olivia completed the live operations review and returned a prioritized internal action plan.":err,output:status==="completed"?{text:res?.text||"",engine:res?.engine||null,issues:res?.issues||[],snapshot:res?.snapshot||null}:{error:err||"Unknown error"}}).eq("id",t.job_id);
}

async function run(p:any,assignment:string,jobId:string|null){
  const ol=await employee();const t=await start(p,ol,assignment,jobId);
  try{
    const s=await snapshot();const iss=issues(s);const brief=await makeBrief(ol,assignment,s,iss);const ls=ol.learning_enabled?await lessons(ol.id):[];
    if(ls.length)await markLessonsUsed(ls);
    const capabilities_exercised=["live_operations_read","valid_agent_population","onboarding_queue_audit","account_lifecycle_monitoring","licensing_workflow_monitoring","meeting_task_monitoring","aging_exception_detection","priority_action_planning","followup_resolution_tracking","supervised_learning","authorization_boundaries"];
    const res={...brief,snapshot:s,issues:iss,capabilities_exercised};await finish(t,"completed",res);
    return {ok:true,build:BUILD,employee:{code:ol.code,name:ol.name,job_title:ol.job_title},job_id:t.job_id,run_id:t.run_id,...res};
  }catch(e){const m=e instanceof Error?e.message:String(e);await finish(t,"failed",{},m);throw e}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const p=await actor(req);const b=await req.json().catch(()=>({}));const action=clean(b.action||"scan",40);const ol=await employee();
    if(action==="status")return json({ok:true,build:BUILD,employee:{code:ol.code,name:ol.name,job_title:ol.job_title,department:ol.department},provider_ready:Boolean(Deno.env.get("OPENAI_API_KEY")),fallback_ready:true,learning_enabled:ol.learning_enabled});
    if(["scan","run","work","execute_job","followup"].includes(action)){
      const jobId=clean(b.job_id,80)||null;const assignment=clean(b.assignment)||"Review the current live operations queue, identify onboarding, account, licensing, meeting and aging blockers, and return a prioritized internal action plan without changing protected records.";
      return json(await run(p,assignment,jobId));
    }
    return json({error:"Unknown action"},400);
  }catch(e){const m=e instanceof Error?e.message:String(e);return json({error:m},m==="AUTH"?401:m==="FORBIDDEN"?403:500)}
});
