import { createClient } from "npm:@supabase/supabase-js@^2";

const BUILD="B2026.08.29.043";
const EXECUTION_VERSION="1";
const CODE="regulatory_monitor";
const AVERY="command_center";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const URL=Deno.env.get("SUPABASE_URL")!;
const PUB=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")!;
const SECRET_KEYS=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
const SECRET=SECRET_KEYS.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(URL,SECRET,{auth:{persistSession:false,autoRefreshToken:false}});
const now=()=>new Date().toISOString();
const clean=(v:any,n=12000)=>String(v??"").trim().slice(0,n);
const low=(v:any)=>clean(v).toLowerCase();
const num=(v:any)=>Number(v||0);
const arr=(v:any)=>Array.isArray(v)?v:[];
const err=(e:any)=>e instanceof Error?e.message:String(e);
const dayMs=86400000;
const dateOnly=(v:any)=>{const s=clean(v,40);return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):null};
const daysUntil=(v:any)=>{const d=dateOnly(v);if(!d)return null;return Math.ceil((new Date(`${d}T00:00:00Z`).getTime()-Date.now())/dayMs)};

const CAPABILITIES=[
  "authoritative_source_registry_read","authority_rank_validation","source_freshness_analysis","source_fingerprint_monitoring","source_fetch_evidence",
  "source_fetch_failure_tracking","regulatory_change_detection","regulatory_change_duplicate_suppression","change_review_queue_awareness","future_effective_date_awareness",
  "exam_blueprint_review","blueprint_activation_guard","validation_finding_review","open_finding_followup","monitor_run_review","monitor_run_evidence",
  "jurisdiction_coverage_review","marketplace_rule_awareness","licensing_requirement_awareness","state_license_record_review","license_clearance_fail_closed",
  "license_expiration_awareness","onboarding_compliance_gap_review","contract_acceptance_awareness","signature_compliance_awareness","source_conflict_awareness",
  "uncertainty_escalation","avery_escalation_path","duplicate_escalation_suppression","assignment_execution","tracked_run_evidence","kpi_recording",
  "supervised_learning","owner_feedback_learning","no_auto_publish_boundary","no_regulated_activation_boundary","no_blueprint_change_boundary",
  "no_license_clearance_boundary","no_fabricated_regulatory_claims_boundary"
];
const PROTECTED_ACTIONS=new Set([
  "activate_regulatory_change","apply_regulatory_change","publish_curriculum","publish_course","change_exam_blueprint","activate_exam_blueprint",
  "resolve_finding","dismiss_change","mark_license_active","clear_license","issue_license","change_permissions","self_certify","override_source_authority"
]);

function apiSecretMatches(req:Request){const key=clean(req.headers.get("apikey"),500);if(!key)return false;return Object.values(SECRET_KEYS).some(v=>typeof v==="string"&&v===key)||key===SECRET}
async function actor(req:Request){
  if(apiSecretMatches(req))return {id:null,role:"owner",internal_service:true};
  const h=req.headers.get("Authorization")||"";if(!h.startsWith("Bearer "))throw new Error("AUTH");
  const token=h.slice(7);const uc=createClient(URL,PUB,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const u=await uc.auth.getUser(token);if(u.error||!u.data.user)throw new Error("AUTH");
  const p=await db.from("profiles").select("id,role,status").eq("id",u.data.user.id).single();
  if(p.error||!p.data||p.data.status!=="active"||!["owner","admin"].includes(String(p.data.role)))throw new Error("FORBIDDEN");
  return p.data;
}
async function requester(a:any){if(a?.id)return a.id;const q=await db.from("profiles").select("id").in("role",["owner","admin"]).eq("status","active").order("created_at").limit(1).maybeSingle();if(q.error)throw q.error;if(!q.data?.id)throw new Error("No active Owner/Admin requester available");return q.data.id}
async function employee(code=CODE){const q=await db.from("ai_employees").select("id,code,name,job_title,department,status,manager_employee_id,job_assignment,kpis,learning_enabled,config").eq("code",code).maybeSingle();if(q.error)throw q.error;if(!q.data||q.data.status!=="active")throw new Error(`${code} unavailable`);return q.data}
async function rows(table:string,select="*",limit=10000){const q:any=await db.from(table).select(select).limit(limit);if(q.error)throw q.error;return q.data||[]}
async function lessons(id:string){const q=await db.from("ai_employee_learning").select("id,lesson_text,usage_count").eq("ai_employee_id",id).eq("status","active").order("updated_at",{ascending:false}).limit(12);if(q.error)throw q.error;return q.data||[]}
async function markLessonsUsed(ls:any[]){for(const l of ls)await db.from("ai_employee_learning").update({usage_count:num(l.usage_count)+1,last_used_at:now(),updated_at:now()}).eq("id",l.id)}

async function snapshot(){
  const [sources,runs,changes,findings,blueprints,licenses,assignments,requirements,acceptances,profiles]=await Promise.all([
    rows("curriculum_source_registry","id,jurisdiction,topic,source_name,source_url,source_class,authority_rank,active,last_checked_at,last_changed_at,content_fingerprint,metadata,created_at"),
    rows("curriculum_monitor_runs","id,run_type,status,started_at,completed_at,sources_checked,changes_detected,content_items_impacted,summary,error_text,created_at"),
    rows("curriculum_change_events","id,monitor_run_id,source_id,jurisdiction,topic,change_type,effective_at,detected_at,confidence,evidence,status"),
    rows("curriculum_validation_findings","id,monitor_run_id,content_type,content_id,severity,finding_type,finding,recommended_action,confidence,resolved_at,metadata,created_at"),
    rows("exam_blueprints","id,state_code,license_track,title,source_url,effective_from,version,status,sections,metadata,created_at"),
    rows("user_state_licenses","id,user_id,state_code,license_type,is_resident,status,readiness_percent,license_number,expiration_date,metadata"),
    rows("agent_campaign_assignments","id,user_id,campaign_id,manager_id,active,started_at,ended_at"),
    rows("user_contract_requirements","id,user_id,campaign_id,contract_version_id,status,required_at,accepted_at,metadata,created_at"),
    rows("user_contract_acceptances","id,user_id,contract_version_id,accepted_at,typed_name,metadata"),
    rows("profiles","id,first_name,last_name,role,status,resident_state,created_at")
  ]);
  return {generated_at:now(),sources,runs,changes,findings,blueprints,licenses,assignments,requirements,acceptances,profiles};
}
function profileName(s:any,uid:string){const p=s.profiles.find((x:any)=>x.id===uid);return p?clean(`${p.first_name||""} ${p.last_name||""}`.trim()||p.id,160):uid}
function analyze(s:any){
  const issues:any[]=[];const add=(priority:string,key:string,title:string,detail:string,category="regulatory",owner="Riley",evidence:any={})=>issues.push({priority,key,title,detail,category,owner,evidence});
  const active=s.sources.filter((x:any)=>x.active);
  const stale=active.filter((x:any)=>!x.last_checked_at||(Date.now()-new Date(x.last_checked_at).getTime())>72*3600000);
  if(stale.length)add("high","regulatory:authoritative_sources_stale_72h",`${stale.length} authoritative sources need revalidation`,`The active authoritative-source registry has ${stale.length} source(s) whose last successful check is older than 72 hours. Riley must revalidate them before treating the registry as freshly verified.`,"source_monitoring","Riley",{source_ids:stale.map((x:any)=>x.id)});
  const lowAuthority=active.filter((x:any)=>num(x.authority_rank)<95);
  if(lowAuthority.length)add("critical","regulatory:low_authority_active_source","Active source below authority threshold",`${lowAuthority.length} active regulatory source(s) have authority_rank below 95. They cannot control regulated content without human review.`,"source_authority","Owner / Riley",{source_ids:lowAuthority.map((x:any)=>x.id)});
  const noFingerprint=active.filter((x:any)=>!clean(x.content_fingerprint));
  if(noFingerprint.length)add("high","regulatory:missing_source_fingerprint","Authoritative source fingerprint missing",`${noFingerprint.length} active source(s) lack a stored fingerprint, preventing reliable change comparison.`,"source_monitoring","Riley",{source_ids:noFingerprint.map((x:any)=>x.id)});
  const openChanges=s.changes.filter((x:any)=>["detected","needs_review"].includes(low(x.status)));
  if(openChanges.length)add("high","regulatory:changes_need_review",`${openChanges.length} regulatory change event(s) need review`,`Detected regulatory changes must remain review-only until an authorized human validates scope, effective date and downstream impact.`,"change_review","Owner / Compliance",{change_event_ids:openChanges.map((x:any)=>x.id)});
  const openFindings=s.findings.filter((x:any)=>!x.resolved_at);
  if(openFindings.length)add(openFindings.some((x:any)=>x.severity==="critical")?"critical":"high","regulatory:open_validation_findings",`${openFindings.length} validation finding(s) remain open`,`Riley must follow open validation findings through resolution; no affected regulated content should be treated as cleared solely by AI.`,"validation","Owner / Compliance",{finding_ids:openFindings.map((x:any)=>x.id)});
  const conflicts=active.filter((x:any)=>num(x.metadata?.unresolved_source_conflicts)>0||String(x.metadata?.source_conflict_status||"").startsWith("unresolved"));
  if(conflicts.length)add("critical","regulatory:source_conflict","Unresolved authoritative-source conflict",`${conflicts.length} active source(s) record unresolved authority conflicts. Riley must escalate and fail closed.`,"source_conflict","Owner / Compliance",{source_ids:conflicts.map((x:any)=>x.id)});
  for(const b of s.blueprints.filter((x:any)=>x.status==="draft")){
    const d=daysUntil(b.effective_from);if(d!==null&&d>=0&&d<=14){add(d<=3?"high":"normal",`regulatory:blueprint:${b.id}:effective_date`,`${b.state_code} exam blueprint becomes effective ${b.effective_from}`,`${b.title} is staged as draft and becomes effective in ${d} day(s). Riley must perform authoritative same-day/near-effective verification; Riley cannot activate the blueprint.`,"exam_blueprint","Owner / Curriculum",{blueprint_id:b.id,state_code:b.state_code,effective_from:b.effective_from,source_url:b.source_url});}
  }
  for(const l of s.licenses){
    const p=s.profiles.find((x:any)=>x.id===l.user_id);const licensed=["active","licensed","approved"].includes(low(l.status))&&Boolean(clean(l.license_number));
    if(!licensed&&p&&["active","onboarding"].includes(low(p.status)))add("normal",`licensing:user:${l.user_id}:${l.state_code}:not_cleared`,`${profileName(s,l.user_id)} is not license-cleared in ${l.state_code}`,`Stored license status is ${l.status||"unknown"}, readiness ${l.readiness_percent??0}%, and no valid active license clearance can be inferred. Riley will not mark the user licensed.`,"licensing","Licensing / Owner",{license_id:l.id,user_id:l.user_id,state_code:l.state_code,status:l.status,license_number_present:Boolean(clean(l.license_number))});
    const exp=daysUntil(l.expiration_date);if(licensed&&exp!==null&&exp>=0&&exp<=30)add(exp<=7?"high":"normal",`licensing:user:${l.user_id}:${l.state_code}:expiring`,`${profileName(s,l.user_id)} license expires soon`,`The stored ${l.state_code} ${l.license_type} license expires in ${exp} day(s). Renewal status requires verification before continued clearance.`,"licensing","Licensing / Owner",{license_id:l.id,expiration_date:l.expiration_date});
  }
  const pendingReq=s.requirements.filter((x:any)=>low(x.status)==="pending");if(pendingReq.length)add("normal","compliance:pending_contract_acceptances",`${pendingReq.length} compensation agreement(s) pending acceptance`,`Living compensation agreements remain pending and should not be represented as accepted until a matching signed acceptance exists.`,"signature_compliance","Operations / Owner",{requirement_ids:pendingReq.map((x:any)=>x.id)});
  return issues;
}

async function sha256(bytes:ArrayBuffer){const d=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function fetchSource(src:any){
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),12000);
  try{
    const r=await fetch(src.source_url,{redirect:"follow",signal:ctl.signal,headers:{"User-Agent":"ALLSHIELD-Regulatory-Monitor/1.0 (+compliance review; no automated publication)","Accept":"text/html,application/pdf,text/plain,application/json,*/*;q=0.5"}});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const bytes=await r.arrayBuffer();if(bytes.byteLength===0)throw new Error("empty response");if(bytes.byteLength>12_000_000)throw new Error(`response too large: ${bytes.byteLength}`);
    return {ok:true,status:r.status,final_url:r.url,content_type:r.headers.get("content-type"),etag:r.headers.get("etag"),last_modified:r.headers.get("last-modified"),bytes:bytes.byteLength,fingerprint:await sha256(bytes)};
  }catch(e){return {ok:false,error:err(e)}}finally{clearTimeout(timer)}
}
async function duplicateChange(srcId:string,newFp:string){const q=await db.from("curriculum_change_events").select("id,status,evidence").eq("source_id",srcId).in("status",["detected","needs_review"]).contains("evidence",{riley_new_fingerprint:newFp}).limit(1).maybeSingle();if(q.error)throw q.error;return q.data||null}
async function monitorSources(limit:number|null=null){
  const all=await rows("curriculum_source_registry","id,jurisdiction,topic,source_name,source_url,source_class,authority_rank,active,last_checked_at,last_changed_at,content_fingerprint,metadata");let active=all.filter((x:any)=>x.active&&num(x.authority_rank)>=95);if(limit&&limit>0)active=active.slice(0,Math.min(limit,active.length));
  const run=await db.from("curriculum_monitor_runs").insert({run_type:"manual",status:"running",started_at:now(),sources_checked:0,changes_detected:0,content_items_impacted:0,summary:{engine:CODE,build:BUILD,mode:"authoritative_live_fetch",auto_publish:false}}).select("id").single();if(run.error)throw run.error;
  const results=await Promise.all(active.map(async(src:any)=>({src,result:await fetchSource(src)})));
  let checked=0,changes=0,baseline=0,failed=0,duplicates=0;const detail:any[]=[];
  for(const {src,result} of results){
    const meta={...(src.metadata||{})};
    if(!result.ok){failed++;meta.riley_last_fetch_error=result.error;meta.riley_last_fetch_error_at=now();await db.from("curriculum_source_registry").update({metadata:meta}).eq("id",src.id);detail.push({source_id:src.id,name:src.source_name,status:"fetch_error",error:result.error});continue;}
    checked++;const old=clean(meta.riley_fingerprint_v1,100);const fp=result.fingerprint;meta.riley_last_http_status=result.status;meta.riley_last_content_type=result.content_type;meta.riley_last_etag=result.etag;meta.riley_last_modified=result.last_modified;meta.riley_last_bytes=result.bytes;meta.riley_last_final_url=result.final_url;meta.riley_last_successful_fetch_at=now();delete meta.riley_last_fetch_error;
    if(!old){baseline++;meta.riley_fingerprint_v1=fp;meta.riley_fingerprint_baselined_at=now();await db.from("curriculum_source_registry").update({last_checked_at:now(),metadata:meta}).eq("id",src.id);detail.push({source_id:src.id,name:src.source_name,status:"baseline_confirmed",fingerprint:fp});continue;}
    if(old===fp){meta.riley_last_verification_result="unchanged";meta.riley_last_verified_at=now();delete meta.riley_pending_fingerprint;await db.from("curriculum_source_registry").update({last_checked_at:now(),metadata:meta}).eq("id",src.id);detail.push({source_id:src.id,name:src.source_name,status:"unchanged"});continue;}
    changes++;meta.riley_pending_fingerprint=fp;meta.riley_previous_fingerprint=old;meta.riley_change_detected_at=now();await db.from("curriculum_source_registry").update({last_checked_at:now(),last_changed_at:now(),metadata:meta}).eq("id",src.id);
    const dup=await duplicateChange(src.id,fp);if(dup){duplicates++;detail.push({source_id:src.id,name:src.source_name,status:"changed_duplicate_review",change_event_id:dup.id});continue;}
    const ce=await db.from("curriculum_change_events").insert({monitor_run_id:run.data.id,source_id:src.id,jurisdiction:src.jurisdiction,topic:src.topic,change_type:"modified",effective_at:null,detected_at:now(),confidence:0.55,evidence:{riley_new_fingerprint:fp,riley_previous_fingerprint:old,http_status:result.status,content_type:result.content_type,etag:result.etag,last_modified:result.last_modified,bytes:result.bytes,final_url:result.final_url,source_url:src.source_url,note:"Fingerprint change alone is not treated as a confirmed regulatory change; human review required."},status:"needs_review"}).select("id").single();if(ce.error)throw ce.error;detail.push({source_id:src.id,name:src.source_name,status:"changed_needs_review",change_event_id:ce.data.id});
  }
  const status=failed?"partial":"completed";const summary={engine:CODE,build:BUILD,mode:"authoritative_live_fetch",requested_sources:active.length,sources_checked:checked,baselines_created:baseline,changes_detected:changes,duplicate_changes_suppressed:duplicates,fetch_failures:failed,auto_publish:false,detail};
  await db.from("curriculum_monitor_runs").update({status,completed_at:now(),sources_checked:checked,changes_detected:changes,content_items_impacted:0,summary,error_text:failed?`${failed} authoritative source fetch(es) failed; freshness not claimed for those sources.`:null}).eq("id",run.data.id);
  return {run_id:run.data.id,status,...summary};
}

async function escalate(e:any,issue:any){
  if(!["high","critical"].includes(issue.priority))return {created:false,reason:"priority"};
  const existing=await db.from("ai_jobs").select("id,status").eq("agent_type",AVERY).in("status",["queued","running","failed"]).contains("input",{routing_key:issue.key}).limit(1).maybeSingle();if(existing.error)throw existing.error;if(existing.data)return {created:false,duplicate:true,id:existing.data.id};
  const req=await requester({id:null});const q=await db.from("ai_jobs").insert({requested_by:req,agent_type:AVERY,status:"queued",requires_approval:false,priority:issue.priority,source:"riley_regulatory_analysis",assigned_by_ai_employee_id:e.id,input:{title:issue.title,assignment:issue.detail,rationale:issue.detail,routing_key:issue.key,assigned_by:"Riley",source_employee:CODE,evidence:issue.evidence}}).select("id").single();if(q.error)throw q.error;return {created:true,id:q.data.id};
}
async function recordRun(e:any,runType:string,status:string,summary:any,errorText:string|null=null){const q=await db.from("ai_employee_runs").insert({ai_employee_id:e.id,run_type:runType,status,started_at:summary?.started_at||now(),completed_at:status==="completed"?now():null,summary,error_text:errorText}).select("id").single();if(q.error)throw q.error;return q.data.id}
async function perform(e:any,assignment:string,jobId:string|null,runType:string,liveMonitor=false,limit:number|null=null){
  const started_at=now(),ls=await lessons(e.id);let monitor:any=null;if(liveMonitor)monitor=await monitorSources(limit);const s=await snapshot(),issues=analyze(s),escalations=[];for(const i of issues){const x=await escalate(e,i);if(["high","critical"].includes(i.priority))escalations.push({routing_key:i.key,...x})}
  const latest=s.runs.sort((a:any,b:any)=>new Date(b.started_at).getTime()-new Date(a.started_at).getTime())[0]||null;
  const result={build:BUILD,execution_version:EXECUTION_VERSION,employee:{code:e.code,name:e.name,title:e.job_title},assignment:clean(assignment,4000)||"Regulatory and licensing compliance review",started_at,completed_at:now(),live_monitor:monitor,summary:{active_authoritative_sources:s.sources.filter((x:any)=>x.active).length,latest_monitor_run:latest,open_change_events:s.changes.filter((x:any)=>["detected","needs_review"].includes(low(x.status))).length,open_validation_findings:s.findings.filter((x:any)=>!x.resolved_at).length,exam_blueprints:s.blueprints.map((b:any)=>({id:b.id,state_code:b.state_code,title:b.title,effective_from:b.effective_from,status:b.status,version:b.version,days_until_effective:daysUntil(b.effective_from)})),license_records:s.licenses.map((l:any)=>({id:l.id,user_id:l.user_id,name:profileName(s,l.user_id),state_code:l.state_code,license_type:l.license_type,status:l.status,readiness_percent:l.readiness_percent,license_number_present:Boolean(clean(l.license_number)),expiration_date:l.expiration_date}))},issues,issue_counts:{total:issues.length,high:issues.filter((i:any)=>i.priority==="high").length,critical:issues.filter((i:any)=>i.priority==="critical").length},escalations,lessons_applied:ls.map((x:any)=>x.lesson_text),boundaries:{auto_publish:false,activate_regulatory_change:false,change_blueprint:false,clear_license:false,fabricate_regulatory_claims:false},regulatory_clearance:"HUMAN REVIEW REQUIRED FOR REGULATED CHANGES"};
  const runId=await recordRun(e,runType,"completed",result);result.run_id=runId;await markLessonsUsed(ls);
  if(jobId){await db.from("ai_jobs").update({status:"completed",output:result,completed_at:now(),resolution_notes:"Riley completed a real regulatory/licensing review. Authoritative-source uncertainty and future-effective items remain human-review gated; no regulated change, blueprint activation or license clearance was performed."}).eq("id",jobId).eq("agent_type",CODE)}
  return result;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json({error:"METHOD"},405);
  try{
    const a=await actor(req),body=await req.json().catch(()=>({})),action=clean(body.action||"status",120);if(PROTECTED_ACTIONS.has(action))return json({error:"PROTECTED_ACTION",action,human_approval_required:true},403);const e=await employee();
    if(action==="status"){const s=await snapshot(),issues=analyze(s);return json({ok:true,build:BUILD,execution_version:EXECUTION_VERSION,employee:{code:e.code,name:e.name,title:e.job_title,assignment:e.job_assignment},capabilities:CAPABILITIES,total_capabilities:CAPABILITIES.length,active_authoritative_sources:s.sources.filter((x:any)=>x.active).length,issues:issues.map((x:any)=>({priority:x.priority,key:x.key,title:x.title})),boundaries:{auto_publish:false,regulated_activation:false,blueprint_change:false,license_clearance:false}})}
    if(action==="scan")return json({ok:true,...await perform(e,clean(body.assignment,4000),null,"scan",false,null)});
    if(action==="monitor_sources")return json({ok:true,...await perform(e,clean(body.assignment,4000)||"Authoritative source live revalidation",null,"monitor_sources",true,body.limit?Math.max(1,Math.min(100,Number(body.limit))):null)});
    if(action==="work"){const jobId=body.job_id?clean(body.job_id,80):null;return json({ok:true,...await perform(e,clean(body.assignment,4000),jobId,"work",body.live_monitor===true,body.limit?Math.max(1,Math.min(100,Number(body.limit))):null)})}
    return json({error:"UNKNOWN_ACTION"},400);
  }catch(e:any){const m=err(e);if(m==="AUTH")return json({error:"AUTH"},401);if(m==="FORBIDDEN")return json({error:"FORBIDDEN"},403);return json({error:m,build:BUILD},500)}
});
