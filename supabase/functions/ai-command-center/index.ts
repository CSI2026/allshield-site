import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@^2/cors";

const cors={...sdkCorsHeaders,"Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const url=Deno.env.get('SUPABASE_URL')!;
const pub=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||Deno.env.get('SUPABASE_ANON_KEY')!;
const sec=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
const legacyKindToCode:{[k:string]:string}={
  academy:'training_coach',training:'training_coach',testing:'testing_analyst',licensing:'licensing_curriculum_manager',content:'content_manager',
  operations:'operations_manager',performance:'performance_analyst',compliance:'regulatory_monitor',marketing:'marketing_manager',video:'video_editor',
  company:'command_center',ask:'command_center'
};
const codeToContext:{[k:string]:string}={
  command_center:'company',operations_manager:'operations',performance_analyst:'performance',marketing_manager:'marketing',video_editor:'video',
  regulatory_monitor:'compliance',licensing_curriculum_manager:'academy',training_coach:'academy',testing_analyst:'academy',content_manager:'content'
};
const leadershipOnly=new Set(['command_center','marketing_manager','video_editor','licensing_curriculum_manager','testing_analyst','content_manager']);
const clean=(v:any,max=4000)=>String(v??'').trim().slice(0,max);

async function actor(req:Request){
  const ah=req.headers.get('Authorization')||'';
  if(!ah.startsWith('Bearer ')) throw new Error('AUTH');
  const token=ah.slice(7);
  const uc=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
  const {data,error}=await uc.auth.getUser(token);
  if(error||!data.user) throw new Error('AUTH');
  const {data:p}=await admin.from('profiles').select('id,role,status,first_name,last_name').eq('id',data.user.id).single();
  if(!p||p.status!=='active') throw new Error('FORBIDDEN');
  return p;
}
const rows=async(table:string,select='*',limit=1000)=>{const r=await admin.from(table).select(select).limit(limit);if(r.error)throw r.error;return r.data||[]};
const countBy=(a:any[],key:string)=>a.reduce((m:any,x:any)=>{const k=String(x?.[key]??'unknown');m[k]=(m[k]||0)+1;return m;},{});
const sum=(a:any[],key:string)=>a.reduce((n:any,x:any)=>n+Number(x?.[key]||0),0);
const pct=(n:number,d:number)=>d?Number((n*100/d).toFixed(1)):null;
const mean=(a:number[])=>a.length?Number((a.reduce((n,x)=>n+x,0)/a.length).toFixed(2)):null;

async function snapshot(kind:string,profile:any){
  const owner=['owner','admin'].includes(profile.role);
  if(kind==='academy'){
    const [assign,exam,ready,valid,courses]=await Promise.all([
      rows('course_assignments','user_id,progress_percent,completed_at'),
      rows('exam_attempts','user_id,state_code,score_percent,created_at'),
      rows('academy_launch_readiness','state_code,launch_ready,end_to_end_tested,blueprint_ready,study_guide_ready,question_bank_ready'),
      rows('academy_question_validations','validation_status,confidence'),
      rows('courses','id,title,state_code,status')]);
    const ex=owner?exam:exam.filter((x:any)=>x.user_id===profile.id),as=owner?assign:assign.filter((x:any)=>x.user_id===profile.id);
    return {course_assignments:as.length,course_complete:as.filter((x:any)=>Number(x.progress_percent)>=100).length,exam_attempts:ex.length,average_exam_score:ex.length?Number((sum(ex,'score_percent')/ex.length).toFixed(1)):null,launch_ready_states:ready.filter((x:any)=>x.launch_ready).map((x:any)=>x.state_code),end_to_end_tested_states:ready.filter((x:any)=>x.end_to_end_tested).map((x:any)=>x.state_code),verified_questions:valid.filter((x:any)=>x.validation_status==='verified'&&Number(x.confidence)>=.9).length,published_courses:courses.filter((x:any)=>x.status==='published').length};
  }
  if(kind==='operations'){
    const [profiles,onboard,licenses,depts,meetings,comms]=await Promise.all([
      rows('profiles','id,role,status,department_id,manager_id'),rows('onboarding_progress','user_id,step_key,completed'),rows('user_state_licenses','user_id,state_code,status,readiness_percent,expiration_date'),rows('departments','id,name,slug'),rows('company_meetings','status,starts_at'),rows('company_communications','status,publish_at')]);
    if(!owner){const o=onboard.filter((x:any)=>x.user_id===profile.id),l=licenses.filter((x:any)=>x.user_id===profile.id);return {account_status:profile.status,incomplete_onboarding_steps:o.filter((x:any)=>!x.completed).length,licenses:l.length,licenses_ready:l.filter((x:any)=>Number(x.readiness_percent)>=85).length};}
    return {profiles:profiles.length,active_accounts:profiles.filter((x:any)=>x.status==='active').length,onboarding_accounts:profiles.filter((x:any)=>x.status==='onboarding').length,incomplete_onboarding_steps:onboard.filter((x:any)=>!x.completed).length,licenses:licenses.length,licenses_ready:licenses.filter((x:any)=>Number(x.readiness_percent)>=85).length,departments:depts.length,scheduled_meetings:meetings.filter((x:any)=>x.status==='scheduled').length,draft_communications:comms.filter((x:any)=>x.status==='draft').length};
  }
  if(kind==='performance'){
    const [en,ledger,promos]=await Promise.all([rows('campaign_enrollments','agent_id,status,created_at'),rows('comp_ledger','user_id,earning_type,amount,status,payable_on'),rows('promotion_qualification_snapshots','user_id,qualification_month,personal_enrollments,active_direct_agents,qualifies')]);
    const e=owner?en:en.filter((x:any)=>x.agent_id===profile.id),l=owner?ledger:ledger.filter((x:any)=>x.user_id===profile.id),p=owner?promos:promos.filter((x:any)=>x.user_id===profile.id);
    return {enrollment_records:e.length,completed_enrollments:e.filter((x:any)=>String(x.status).toLowerCase()==='completed').length,ledger_entries:l.length,recorded_amount:Number(sum(l,'amount').toFixed(2)),promotion_snapshots:p.length,qualifying_snapshots:p.filter((x:any)=>x.qualifies).length};
  }
  if(kind==='compliance'){
    const [docs,sigs,onboard,licenses,findings]=await Promise.all([rows('document_templates','id,title,status,requires_signature'),rows('document_signatures','document_id,user_id,acknowledged,signed_at'),rows('onboarding_progress','user_id,completed'),rows('user_state_licenses','user_id,state_code,status,expiration_date'),rows('curriculum_validation_findings','severity,finding_type,resolved_at,confidence')]);
    const s=owner?sigs:sigs.filter((x:any)=>x.user_id===profile.id),o=owner?onboard:onboard.filter((x:any)=>x.user_id===profile.id),l=owner?licenses:licenses.filter((x:any)=>x.user_id===profile.id);
    return {published_documents:docs.filter((x:any)=>x.status==='published').length,required_signature_documents:docs.filter((x:any)=>x.status==='published'&&x.requires_signature).length,acknowledged_signatures:s.filter((x:any)=>x.acknowledged).length,incomplete_onboarding_steps:o.filter((x:any)=>!x.completed).length,license_statuses:countBy(l,'status'),open_curriculum_findings:owner?findings.filter((x:any)=>!x.resolved_at).length:undefined,open_findings_by_severity:owner?countBy(findings.filter((x:any)=>!x.resolved_at),'severity'):undefined};
  }
  if(kind==='content'){
    if(!owner)return {available:false,reason:'Content quality analysis is limited to leadership roles.'};
    const [courses,modules,guides,questions,versions,comms]=await Promise.all([
      rows('courses','id,title,state_code,version,status,created_at'),rows('course_modules','id,course_id,title'),rows('study_guides','id,state_code,title,version,status,validated_at,created_at'),rows('question_bank','id,state_code,version,status,source_reference,created_at'),rows('content_versions','content_type,content_key,version_number,status,created_at,published_at'),rows('company_communications','id,title,status,created_at,updated_at')]);
    return {courses:courses.length,published_courses:courses.filter((x:any)=>x.status==='published').length,modules:modules.length,study_guides:guides.length,published_guides:guides.filter((x:any)=>x.status==='published').length,unvalidated_guides:guides.filter((x:any)=>!x.validated_at).length,questions:questions.length,published_questions:questions.filter((x:any)=>x.status==='published').length,questions_without_source:questions.filter((x:any)=>!x.source_reference).length,content_versions:versions.length,version_statuses:countBy(versions,'status'),communications:comms.length};
  }
  if(kind==='marketing'){
    if(!owner)return {available:false,reason:'Marketing analysis is limited to leadership roles.'};
    const [posts,conns,jobs,brand]=await Promise.all([rows('marketing_posts','status,platforms,scheduled_for,published_at'),rows('social_connections','platform,status,last_verified_at,error_message'),rows('social_publish_jobs','platform,status,error_message,created_at'),rows('social_brand_profiles','profile_key,status,approved_at,brand_voice')]);
    return {posts:posts.length,post_statuses:countBy(posts,'status'),connections:conns.map((x:any)=>({platform:x.platform,status:x.status,error:x.error_message||null})),publish_jobs:jobs.length,publish_job_statuses:countBy(jobs,'status'),brand_profile_status:brand[0]?.status||'missing'};
  }
  if(kind==='video'){
    if(!owner)return {available:false,reason:'Video Studio analysis is limited to leadership roles.'};
    const [media,projects,assets,conns]=await Promise.all([rows('media_library','media_type,status,duration_seconds,created_at,metadata'),rows('video_projects','project_type,orientation,target_duration_seconds,status,created_at,updated_at'),rows('video_project_assets','asset_type,status,duration_seconds,orientation,created_at'),rows('social_connections','platform,status,error_message')]);
    const vids=media.filter((x:any)=>String(x.media_type||'').toLowerCase().includes('video'));
    return {video_assets:vids.length,video_asset_statuses:countBy(vids,'status'),projects:projects.length,project_types:countBy(projects,'project_type'),project_statuses:countBy(projects,'status'),project_assets:assets.length,asset_types:countBy(assets,'asset_type'),youtube_connection:conns.find((x:any)=>x.platform==='youtube')||{status:'not_connected'}};
  }
  if(kind==='company'){
    const kinds=['academy','operations','performance','compliance','content','marketing','video'];const out:any={};for(const k of kinds)out[k]=await snapshot(k,profile);return out;
  }
  return {};
}

function extractText(payload:any){if(typeof payload?.output_text==='string'&&payload.output_text.trim())return payload.output_text.trim();const parts:string[]=[];for(const item of payload?.output||[])for(const c of item?.content||[]){if(typeof c?.text==='string')parts.push(c.text);else if(typeof c?.text?.value==='string')parts.push(c.text.value)}return parts.join('\n').trim();}
async function getEmployeeByCode(code:string){const {data,error}=await admin.from('ai_employees').select('id,code,name,job_title,department,manager_employee_id,job_assignment,role_description,status,autonomy_level,kpis,learning_enabled,config').eq('code',code).maybeSingle();if(error)throw error;return data||null;}
async function activeLessons(employeeId:string){const {data,error}=await admin.from('ai_employee_learning').select('id,lesson_text,confidence,evidence_count,usage_count').eq('ai_employee_id',employeeId).eq('status','active').order('updated_at',{ascending:false}).limit(12);if(error)throw error;return data||[];}
async function markLessonsUsed(lessons:any[]){for(const l of lessons){await admin.from('ai_employee_learning').update({usage_count:Number(l.usage_count||0)+1,last_used_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',l.id);}}
function lessonBlock(lessons:any[]){if(!lessons.length)return 'No approved prior lessons are stored yet.';return lessons.map((l:any,i:number)=>`${i+1}. ${l.lesson_text}`).join('\n');}

async function createTrackedJob(employee:any,profile:any,kind:string,input:any){
  const {data:j,error:je}=await admin.from('ai_jobs').insert({requested_by:profile.id,agent_type:employee.code,input:{kind,...input},status:'running',requires_approval:true}).select('id').single();if(je)throw je;
  const {data:r,error:re}=await admin.from('ai_employee_runs').insert({ai_employee_id:employee.id,run_type:`workforce:${employee.code}`,status:'running',started_at:new Date().toISOString(),summary:{job_id:j.id,actor_id:profile.id,actor_role:profile.role,kind,assignment:input.assignment||null}}).select('id').single();if(re){await admin.from('ai_jobs').update({status:'failed',output:{error:re.message},completed_at:new Date().toISOString()}).eq('id',j.id);throw re;}
  return {job_id:j.id,run_id:r.id};
}
async function finishTrackedJob(track:any,status:string,result:any,errorText:string|null=null){
  const now=new Date().toISOString();
  await admin.from('ai_employee_runs').update({status:status==='completed'?'completed':'failed',completed_at:now,summary:{...(result?.run_summary||{}),job_id:track.job_id,engine:result?.engine||null,output_preview:result?.text?String(result.text).slice(0,1800):null},error_text:errorText}).eq('id',track.run_id);
  await admin.from('ai_jobs').update({status:status==='completed'?'completed':'failed',completed_at:now,output:status==='completed'?{text:result?.text||'',engine:result?.engine||null}:{error:errorText||'Unknown error'}}).eq('id',track.job_id);
}

async function runEmployee(employee:any,profile:any,assignment=''){
  const contextKind=codeToContext[employee.code]||'company';
  const snap=await snapshot(contextKind,profile);
  const lessons=employee.learning_enabled?await activeLessons(employee.id):[];
  const key=Deno.env.get('OPENAI_API_KEY');if(!key)throw new Error('AI provider is not configured.');
  const task=assignment||employee.job_assignment||employee.role_description||'Analyze the current authorized ALLSHIELD context and complete your assigned role.';
  const kpis=Array.isArray(employee.kpis)?employee.kpis:[];
  const instruction=`You are ${employee.name}, ${employee.job_title||employee.role_description}, an AI employee inside ALLSHIELD Insurance Group.\nDepartment: ${employee.department||'ALLSHIELD'}.\nPermanent job assignment: ${employee.job_assignment||employee.role_description}.\nRole KPI charter: ${JSON.stringify(kpis)}.\n\nYou are expected to DO the assigned knowledge-work deliverable, not merely describe what you could do. Use only the authorized live context supplied. Never invent facts, counts, people, regulations, customer information, platform connections, or completed actions. Never claim a protected system change occurred unless the system actually performed it. Never change your own permissions, approval boundaries, or job charter. Regulated, compensation, account-status, external-publishing, signature, and destructive changes remain human-approved.\n\nAPPROVED LESSONS FROM PRIOR WORK:\n${lessonBlock(lessons)}\nApply these lessons when relevant. If a stored lesson conflicts with current authoritative data, law, compliance controls, or the current explicit assignment, follow the current authoritative data and controls.\n\nReturn a useful completed work product with these headings: WORK COMPLETED, DELIVERABLE, RISKS / ATTENTION, RECOMMENDED NEXT ACTIONS. Be concise but substantive.`;
  const input=`Current assignment: ${task}\n\nLive authorized ALLSHIELD context: ${JSON.stringify(snap)}`;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5-mini',store:false,instructions:instruction,input})});
  const body=await r.json();if(!r.ok)throw new Error(body?.error?.message||`AI provider error ${r.status}`);const text=extractText(body);if(!text)throw new Error('AI provider returned no text.');
  if(lessons.length)await markLessonsUsed(lessons);
  return {text,snapshot:snap,engine:'openai:gpt-5-mini',lessons_used:lessons.length,run_summary:{employee_code:employee.code,employee_name:employee.name,job_title:employee.job_title,context_kind:contextKind,lessons_used:lessons.length}};
}

async function recentRuns(){const {data}=await admin.from('ai_employee_runs').select('id,ai_employee_id,run_type,status,started_at,completed_at,summary,error_text,created_at').order('created_at',{ascending:false}).limit(20);const em=await admin.from('ai_employees').select('id,name,job_title,code');const map=Object.fromEntries((em.data||[]).map((x:any)=>[x.id,x]));return (data||[]).map((x:any)=>({...x,employee:map[x.ai_employee_id]||null,job_id:x.summary?.job_id||null}));}

async function buildScorecards(employees:any[]){
  const [runs,jobs,feedback,learning]=await Promise.all([
    rows('ai_employee_runs','id,ai_employee_id,status,started_at,completed_at,created_at',5000),
    rows('ai_jobs','id,agent_type,status,approved_by,created_at,completed_at',5000),
    rows('ai_employee_feedback','id,ai_employee_id,rating,outcome,created_at',5000),
    rows('ai_employee_learning','id,ai_employee_id,status,usage_count,created_at,updated_at',5000)
  ]);
  const out:any={};
  for(const e of employees){
    const er=runs.filter((x:any)=>x.ai_employee_id===e.id),ej=jobs.filter((x:any)=>x.agent_type===e.code),ef=feedback.filter((x:any)=>x.ai_employee_id===e.id),el=learning.filter((x:any)=>x.ai_employee_id===e.id&&x.status==='active');
    const finished=er.filter((x:any)=>['completed','failed'].includes(x.status)),completed=finished.filter((x:any)=>x.status==='completed').length,failed=finished.filter((x:any)=>x.status==='failed').length;
    const accepted=ef.filter((x:any)=>x.outcome==='accepted').length,ratings=ef.map((x:any)=>Number(x.rating)).filter((x:any)=>Number.isFinite(x));
    const executionRate=pct(completed,finished.length),acceptanceRate=pct(accepted,ef.length),avgRating=mean(ratings);
    const score=ef.length&&executionRate!==null&&avgRating!==null&&acceptanceRate!==null?Math.round(executionRate*.30+(avgRating/5*100)*.40+acceptanceRate*.30):null;
    const times=[...er.map((x:any)=>x.completed_at||x.started_at||x.created_at),...ej.map((x:any)=>x.completed_at||x.created_at)].filter(Boolean).sort();
    out[e.code]={jobs_assigned:ej.length,jobs_completed:ej.filter((x:any)=>x.status==='completed').length,total_runs:er.length,completed_runs:completed,failed_runs:failed,execution_rate:executionRate,feedback_reviews:ef.length,average_rating:avgRating,acceptance_rate:acceptanceRate,active_lessons:el.length,lessons_used:el.reduce((n:number,x:any)=>n+Number(x.usage_count||0),0),overall_score:score,last_activity:times.length?times[times.length-1]:null};
  }
  return out;
}

async function workforceStatus(){
  const {data,error}=await admin.from('ai_employees').select('id,code,name,job_title,department,manager_employee_id,job_assignment,role_description,status,autonomy_level,kpis,learning_enabled').eq('status','active').order('department').order('name');if(error)throw error;
  const employees=data||[],scorecards=await buildScorecards(employees);
  const byId=Object.fromEntries(employees.map((e:any)=>[e.id,e]));
  return employees.map((e:any)=>({...e,manager:e.manager_employee_id?{id:e.manager_employee_id,name:byId[e.manager_employee_id]?.name||null,job_title:byId[e.manager_employee_id]?.job_title||null}:null,scorecard:scorecards[e.code]||{}}));
}

async function saveFeedback(profile:any,b:any){
  if(!['owner','admin'].includes(profile.role))throw new Error('LEADERSHIP');
  const code=clean(b.employee_code,120),employee=await getEmployeeByCode(code);if(!employee)throw new Error('Employee not found.');
  const rating=Number(b.rating);if(!Number.isInteger(rating)||rating<1||rating>5)throw new Error('Rating must be from 1 to 5.');
  const outcome=clean(b.outcome,20);if(!['accepted','revised','rejected'].includes(outcome))throw new Error('Outcome must be accepted, revised, or rejected.');
  const feedbackText=clean(b.feedback_text,6000);if(feedbackText.length<3)throw new Error('Feedback is required.');
  const teach=b.teach_employee===true;
  const jobId=clean(b.job_id,80)||null,runId=clean(b.run_id,80)||null;
  if(jobId){const {data:j}=await admin.from('ai_jobs').select('id,agent_type').eq('id',jobId).maybeSingle();if(!j||j.agent_type!==employee.code)throw new Error('Job does not belong to this employee.');}
  if(runId){const {data:r}=await admin.from('ai_employee_runs').select('id,ai_employee_id').eq('id',runId).maybeSingle();if(!r||r.ai_employee_id!==employee.id)throw new Error('Run does not belong to this employee.');}
  const {data:f,error:fe}=await admin.from('ai_employee_feedback').insert({ai_employee_id:employee.id,ai_job_id:jobId,ai_employee_run_id:runId,reviewer_id:profile.id,rating,outcome,feedback_text:feedbackText,teach_employee:teach}).select('id,created_at').single();if(fe)throw fe;
  let lesson=null;
  if(teach&&employee.learning_enabled){const {data:l,error:le}=await admin.from('ai_employee_learning').insert({ai_employee_id:employee.id,source_feedback_id:f.id,lesson_text:feedbackText,status:'active',confidence:1,evidence_count:1,approved_by:profile.id,approved_at:new Date().toISOString()}).select('id,lesson_text,status').single();if(le)throw le;lesson=l;}
  if(jobId&&outcome==='accepted')await admin.from('ai_jobs').update({approved_by:profile.id}).eq('id',jobId);
  const workforce=await workforceStatus();
  return {feedback:f,lesson,employee,scorecard:workforce.find((x:any)=>x.code===employee.code)?.scorecard||{}};
}

async function employeeDetail(code:string){const workforce=await workforceStatus(),employee=workforce.find((x:any)=>x.code===code);if(!employee)throw new Error('Employee not found.');const [fb,learn,runsData,jobsData]=await Promise.all([
  admin.from('ai_employee_feedback').select('id,rating,outcome,feedback_text,teach_employee,created_at,ai_job_id,ai_employee_run_id').eq('ai_employee_id',employee.id).order('created_at',{ascending:false}).limit(20),
  admin.from('ai_employee_learning').select('id,lesson_text,status,confidence,evidence_count,usage_count,last_used_at,created_at,updated_at').eq('ai_employee_id',employee.id).order('updated_at',{ascending:false}).limit(20),
  admin.from('ai_employee_runs').select('id,run_type,status,started_at,completed_at,summary,error_text,created_at').eq('ai_employee_id',employee.id).order('created_at',{ascending:false}).limit(20),
  admin.from('ai_jobs').select('id,status,input,output,approved_by,created_at,completed_at').eq('agent_type',employee.code).order('created_at',{ascending:false}).limit(20)
]);if(fb.error)throw fb.error;if(learn.error)throw learn.error;if(runsData.error)throw runsData.error;if(jobsData.error)throw jobsData.error;return {employee,feedback:fb.data||[],learning:learn.data||[],runs:runsData.data||[],jobs:jobsData.data||[]};}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const p=await actor(req);const b=await req.json().catch(()=>({}));const action=clean(b.action||'status',40);
    if(action==='status'){const provider=Boolean(Deno.env.get('OPENAI_API_KEY'));return json({ok:true,provider_ready:provider,employees:await workforceStatus(),recent_runs:await recentRuns(),learning_system:'supervised'});}
    if(action==='employee_detail'){if(!['owner','admin'].includes(p.role))return json({error:'Leadership access required.'},403);return json({ok:true,...await employeeDetail(clean(b.employee_code,120))});}
    if(action==='feedback'){const saved=await saveFeedback(p,b);return json({ok:true,...saved,recent_runs:await recentRuns()});}

    let employee:any=null,assignment='';let kind='';
    if(action==='work'){
      if(!['owner','admin'].includes(p.role))return json({error:'Leadership access is required to assign AI work.'},403);
      const code=clean(b.employee_code,120);employee=await getEmployeeByCode(code);assignment=clean(b.assignment,6000);if(!assignment)return json({error:'A work assignment is required.'},400);kind=code;
    }else if(action==='ask'){
      employee=await getEmployeeByCode('command_center');assignment=clean(b.question||b.prompt,6000);if(!assignment)return json({error:'A question is required.'},400);kind='ask';
    }else if(action==='run'){
      kind=clean(b.kind||'company',120);const code=legacyKindToCode[kind]||kind;employee=await getEmployeeByCode(code);assignment=clean(b.assignment,6000);
    }else return json({error:'Unknown action.'},400);
    if(!employee||employee.status!=='active')return json({error:'AI employee is unavailable.'},404);
    if(!['owner','admin'].includes(p.role)&&leadershipOnly.has(employee.code))return json({error:'This AI employee requires a leadership role.'},403);

    const task=assignment||employee.job_assignment||employee.role_description;
    const track=await createTrackedJob(employee,p,kind,{assignment:task,source_action:action});
    try{const result=await runEmployee(employee,p,task);await finishTrackedJob(track,'completed',result);return json({ok:true,kind,employee,job_id:track.job_id,run_id:track.run_id,text:result.text,snapshot:result.snapshot,engine:result.engine,lessons_used:result.lessons_used,scorecard:(await workforceStatus()).find((x:any)=>x.code===employee.code)?.scorecard||{},recent_runs:await recentRuns()});}
    catch(e){const m=e instanceof Error?e.message:String(e);await finishTrackedJob(track,'failed',{run_summary:{employee_code:employee.code,employee_name:employee.name}},m);throw e;}
  }catch(e){const m=e instanceof Error?e.message:String(e);return json({error:m},m==='AUTH'?401:m==='FORBIDDEN'||m==='LEADERSHIP'?403:500);}
});
