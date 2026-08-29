import { createClient } from "npm:@supabase/supabase-js@^2";

const BUILD="B2026.08.29.042";
const EXECUTION_VERSION="1";
const CODE="video_editor";
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

const ENABLED_CAPABILITIES=[
  "live_video_project_read","live_media_library_read","video_asset_inventory","youtube_connection_awareness","provider_readiness_awareness",
  "legacy_provider_risk_detection","real_media_only","source_material_provenance","approved_source_guard","video_readiness_review",
  "production_plan_generation","existing_script_analysis","storyboard_analysis","cut_recommendation_generation","hook_review","pacing_review",
  "long_form_plan","mid_form_plan","short_form_plan","vertical_repurpose_plan","clip_idea_generation","title_generation","description_generation",
  "tag_metadata_generation","thumbnail_brief_generation","caption_plan_generation","cta_consistency_review","platform_delivery_plan","assignment_execution",
  "tracked_run_evidence","kpi_recording","escalation_path","duplicate_escalation_suppression","supervised_learning","owner_feedback_learning",
  "no_publish_boundary","no_oauth_boundary","no_delete_boundary","no_fake_media_boundary"
];
const PLANNED_PROVIDER_CAPABILITIES=[
  "provider_script_generation","provider_thumbnail_generation","provider_voiceover_generation","provider_scene_generation","finished_video_generation","final_asset_ingestion"
];
const PROTECTED_ACTIONS=new Set([
  "publish","schedule_publish","youtube_publish","connect_youtube","refresh_youtube_token","oauth","delete_project","delete_asset","delete_media",
  "mark_published","change_permissions","approve_media","replace_final_video","spend","buy_media","launch_campaign"
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
async function rows(table:string,select="*",limit=5000){const q:any=await db.from(table).select(select).limit(limit);if(q.error)throw q.error;return q.data||[]}
async function lessons(id:string){const q=await db.from("ai_employee_learning").select("id,lesson_text,usage_count").eq("ai_employee_id",id).eq("status","active").order("updated_at",{ascending:false}).limit(12);if(q.error)throw q.error;return q.data||[]}
async function markLessonsUsed(ls:any[]){for(const l of ls)await db.from("ai_employee_learning").update({usage_count:num(l.usage_count)+1,last_used_at:now(),updated_at:now()}).eq("id",l.id)}

function providerState(){
  const openai=Boolean(Deno.env.get("OPENAI_API_KEY"));
  const videoUrl=clean(Deno.env.get("ALLSHIELD_VIDEO_PROVIDER_URL")||Deno.env.get("VICTOR_VIDEO_PROVIDER_URL")||Deno.env.get("MAYA_VIDEO_PROVIDER_URL"),1000);
  const videoSecret=clean(Deno.env.get("ALLSHIELD_VIDEO_PROVIDER_SECRET")||Deno.env.get("VICTOR_VIDEO_PROVIDER_SECRET")||Deno.env.get("MAYA_VIDEO_PROVIDER_SECRET"),1000);
  return {
    openai_configured:openai,
    text_model:"gpt-5.6-sol",
    image_model:"gpt-image-2",
    voice_model:"gpt-4o-mini-tts",
    durable_video_provider_configured:Boolean(videoUrl&&videoSecret),
    provider_gateway_configured:Boolean(videoUrl&&videoSecret),
    legacy_sora_api_used:false,
    professional_ready:Boolean(openai&&videoUrl&&videoSecret)
  };
}

async function snapshot(){
  const [projects,assets,library,publishJobs,connections,settings,brand]=await Promise.all([
    rows("video_projects","id,created_by,title,project_type,orientation,target_duration_seconds,topic,objective,audience,tone,source_material,call_to_action,status,hook,outline,script,storyboard,captions,youtube_title,youtube_description,tags,thumbnail_prompt,publish_destinations,scheduled_for,final_media_library_id,metadata,created_at,updated_at"),
    rows("video_project_assets","id,project_id,asset_type,title,status,storage_bucket,storage_path,public_url,media_library_id,duration_seconds,orientation,scene_index,metadata,created_at,updated_at"),
    rows("media_library","id,title,description,storage_path,media_type,audience,status,duration_seconds,metadata,created_at,updated_at"),
    rows("video_publish_jobs","id,project_id,platform,status,scheduled_for,external_ref,error_message,metadata,created_at,updated_at"),
    rows("social_connections","id,platform,account_name,external_account_id,status,connection_mode,scopes,error_message,last_verified_at,updated_at"),
    rows("app_settings","setting_key,setting_value"),
    rows("social_brand_profiles","profile_key,status,approved_at,approved_facts,company_name,brand_voice,prohibited_claims")
  ]);
  const youtube=connections.find((x:any)=>x.platform==="youtube")||{platform:"youtube",status:"not_connected",scopes:[]};
  const careerSetting=settings.find((x:any)=>x.setting_key==="career_opportunity_sizzle")?.setting_value||null;
  const primaryBrand=brand.find((x:any)=>x.profile_key==="allshield_primary")||null;
  const providers=providerState();
  return {
    generated_at:now(),data_policy:"REAL MEDIA ONLY — no fabricated files, views, publish status, provider jobs, or performance metrics.",
    projects,assets,media_library:library,publish_jobs:publishJobs,youtube,career_setting:careerSetting,brand:primaryBrand,providers,
    counts:{video_projects:projects.length,project_assets:assets.length,media_library:library.length,publish_jobs:publishJobs.length},
  };
}

function projectReadiness(p:any,s:any){
  const projectAssets=s.assets.filter((a:any)=>a.project_id===p.id);
  const hasScript=Boolean(clean(p.script));const hasStoryboard=arr(p.storyboard).length>0;
  const finalAsset=projectAssets.find((a:any)=>a.asset_type==="final_video"&&a.status==="ready")||null;
  const externalFinal=clean(p.metadata?.final_video_url,2000)||null;
  return {
    project_id:p.id,title:p.title,status:p.status,project_type:p.project_type,orientation:p.orientation,
    script_ready:hasScript,storyboard_ready:hasStoryboard,metadata_ready:Boolean(clean(p.youtube_title)&&clean(p.youtube_description)),
    final_asset_ready:Boolean(finalAsset),external_final_video_ready:Boolean(externalFinal),final_video_url:externalFinal,
    final_provider:p.metadata?.final_video_source||p.metadata?.professional_video_provider||null,
    asset_count:projectAssets.length,provider_generation_status:p.metadata?.provider_generation_status||null,
  };
}

function analyze(s:any){
  const issues:any[]=[];const add=(priority:string,key:string,title:string,detail:string,owner="Victor")=>issues.push({priority,key,title,detail,category:"media_delivery",owner});
  if(!s.projects.length)add("normal","victor:no_video_projects","No video projects exist","Victor has no live project to edit or repurpose. A project must be created from real source material before production work can begin.","Media / Owner");
  if(low(s.youtube.status)!=="connected")add("high","media:youtube_not_connected","YouTube is not connected","The YouTube delivery account is not connected. Victor can prepare content and metadata but cannot deliver to YouTube until Owner/Admin completes OAuth.","Owner");
  if(!s.providers.openai_configured)add("high","media:creative_provider_not_configured","Professional text/image/voice provider is not configured","OPENAI_API_KEY is not configured in the server runtime, so Victor cannot create new provider-generated scripts, thumbnails or voiceovers.","Owner / Platform");
  if(!s.providers.durable_video_provider_configured)add("high","media:durable_video_provider_not_configured","Durable finished-video provider is not configured","No server-side video provider gateway is configured. Victor can plan and repurpose, but cannot autonomously request a new finished video asset.","Owner / Platform");
  if(s.projects.some((p:any)=>low(p.metadata?.provider_generation_status).includes("missing_openai_api_key")))add("normal","media:legacy_provider_block_recorded","Existing Video Studio records a provider block","At least one project records provider_generation_status=blocked_missing_openai_api_key. Victor will preserve the real finished asset and not report provider generation as available.","Media / Platform");
  for(const p of s.projects){const r=projectReadiness(p,s);if(!r.script_ready)add("normal",`victor:project:${p.id}:script_missing`,`${p.title} has no script`,`A production script is not stored on this project.`,"Victor");if(!r.storyboard_ready)add("normal",`victor:project:${p.id}:storyboard_missing`,`${p.title} has no storyboard`,`A storyboard is not stored on this project.`,"Victor");if(!r.final_asset_ready&&!r.external_final_video_ready)add("normal",`victor:project:${p.id}:final_missing`,`${p.title} has no verified final video`,`There is no ready final_video asset or real external final_video_url attached to this project.`,"Media / Provider");}
  return issues;
}

function clipPlan(p:any){
  const clips=arr(p.metadata?.clip_ideas);if(clips.length)return clips.slice(0,12);
  const scenes=arr(p.storyboard);return scenes.slice(0,6).map((scene:any,i:number)=>({title:clean(scene.title,100)||`Clip ${i+1}`,format:i%2===0?"shorts":"reels",duration_seconds:Math.min(60,Math.max(15,num(scene.duration_seconds)||30)),hook:clean(scene.on_screen_text||scene.narration,180),source_section:clean(scene.title,120)||`Scene ${i+1}`,visual_direction:clean(scene.visual_direction,400)}));
}
function cutRecommendations(p:any){
  const scenes=arr(p.storyboard);if(scenes.length)return scenes.slice(0,20).map((scene:any,i:number)=>({scene:i+1,title:clean(scene.title,120)||`Scene ${i+1}`,target_seconds:num(scene.duration_seconds)||8,keep:clean(scene.narration,220),visual:clean(scene.visual_direction,300),on_screen_text:clean(scene.on_screen_text,160),recommendation:i===0?"Open on the strongest hook; remove setup language before the value proposition.":"Keep pacing tight; remove pauses/repetition and preserve only claims supported by approved source material."}));
  return [{scene:1,title:"Source review required",target_seconds:null,keep:null,visual:null,on_screen_text:null,recommendation:"No storyboard exists. Victor will not invent edit points; add real source footage/transcript or an approved storyboard."}];
}
function deliveryPackage(p:any,s:any){
  const r=projectReadiness(p,s);const clips=clipPlan(p);return {
    project:r,
    production_plan:{objective:p.objective||null,audience:p.audience||null,tone:p.tone||null,cta:p.call_to_action||null,hook:p.hook||null,target_duration_seconds:p.target_duration_seconds||null,orientation:p.orientation||null},
    cut_recommendations:cutRecommendations(p),
    repurpose_plan:{long_form:p.project_type==="long"?[{title:p.youtube_title||p.title,orientation:"16:9",source:"full project"}]:[],mid_form:[{title:`${p.title} — key section cut`,orientation:"16:9",source:"best contiguous section from approved storyboard/script"}],short_form:clips},
    metadata:{youtube_title:p.youtube_title||p.title,youtube_description:p.youtube_description||"",tags:arr(p.tags),thumbnail_prompt:p.thumbnail_prompt||"",captions_present:Boolean(clean(p.captions))},
    delivery:{youtube_connected:low(s.youtube.status)==="connected",publish_allowed_for_victor:false,human_approval_required:true,existing_final_video:r.external_final_video_ready||r.final_asset_ready},
    provider_readiness:s.providers,
    note:"Victor may prepare and improve media deliverables, but external publishing/OAuth/deletion remain protected human actions."
  };
}

async function escalate(e:any,issue:any){
  if(!["high","critical"].includes(issue.priority))return {created:false,reason:"priority"};
  const existing=await db.from("ai_jobs").select("id,status").eq("agent_type",AVERY).in("status",["queued","running","failed"]).contains("input",{routing_key:issue.key}).limit(1).maybeSingle();
  if(existing.error)throw existing.error;if(existing.data)return {created:false,duplicate:true,id:existing.data.id};
  const req=await requester({id:null});const q=await db.from("ai_jobs").insert({requested_by:req,agent_type:AVERY,status:"queued",requires_approval:false,priority:issue.priority,source:"victor_media_analysis",assigned_by_ai_employee_id:e.id,input:{title:issue.title,assignment:issue.detail,rationale:issue.detail,routing_key:issue.key,assigned_by:"Victor",source_employee:CODE}}).select("id").single();if(q.error)throw q.error;return {created:true,id:q.data.id};
}
async function recordRun(e:any,runType:string,status:string,summary:any,errorText:string|null=null){const q=await db.from("ai_employee_runs").insert({ai_employee_id:e.id,run_type:runType,status,started_at:summary?.started_at||now(),completed_at:status==="completed"?now():null,summary,error_text:errorText}).select("id").single();if(q.error)throw q.error;return q.data.id}

async function perform(e:any,assignment:string,jobId:string|null,runType:string){
  const started_at=now(),ls=await lessons(e.id),s=await snapshot(),issues=analyze(s),projects=s.projects.map((p:any)=>projectReadiness(p,s));
  let selected:any=null;if(jobId){const jq=await db.from("ai_jobs").select("id,input,status").eq("id",jobId).eq("agent_type",CODE).maybeSingle();if(jq.error)throw jq.error;if(jq.data){const pid=jq.data.input?.project_id;selected=pid?s.projects.find((p:any)=>p.id===pid):null}}
  if(!selected&&s.projects.length===1)selected=s.projects[0];
  const pack=selected?deliveryPackage(selected,s):null;
  const escalations=[];for(const i of issues){const x=await escalate(e,i);if(["high","critical"].includes(i.priority))escalations.push({routing_key:i.key,...x})}
  const result={build:BUILD,execution_version:EXECUTION_VERSION,employee:{code:e.code,name:e.name,title:e.job_title},assignment:clean(assignment,4000)||"Media readiness and delivery review",started_at,completed_at:now(),snapshot:{counts:s.counts,youtube:s.youtube,career_setting:s.career_setting,providers:s.providers,projects},issues,issue_counts:{total:issues.length,high:issues.filter((i:any)=>i.priority==="high").length,critical:issues.filter((i:any)=>i.priority==="critical").length},delivery_package:pack,escalations,lessons_applied:ls.map((x:any)=>x.lesson_text),professional_completion:{core_media_employee_ready:true,finished_video_provider_ready:s.providers.durable_video_provider_configured,provider_creative_ready:s.providers.openai_configured,youtube_delivery_ready:low(s.youtube.status)==="connected",complete:Boolean(s.providers.durable_video_provider_configured&&s.providers.openai_configured)},boundaries:{publish:false,oauth:false,delete_media:false,fabricate_media:false}};
  const runId=await recordRun(e,runType,"completed",result);result.run_id=runId;await markLessonsUsed(ls);
  if(jobId){await db.from("ai_jobs").update({status:"completed",output:result,completed_at:now(),resolution_notes:"Victor completed a real media/video readiness review. Provider and account blockers remain explicit; no fake media or publish activity was created."}).eq("id",jobId).eq("agent_type",CODE)}
  return result;
}

async function providerPackage(project:any){
  const key=Deno.env.get("OPENAI_API_KEY");if(!key)return {ok:false,blocked:true,reason:"OPENAI_API_KEY_not_configured"};
  const facts=clean(project.source_material,12000);if(!facts)return {ok:false,blocked:true,reason:"approved_source_material_required"};
  const prompt=`Return valid JSON only. Create a professional video production package from ONLY the supplied source material. Never invent claims, numbers, testimonials, carrier relationships, legal promises, licenses or results. Project: ${project.title}. Type: ${project.project_type}. Audience: ${project.audience||""}. Objective: ${project.objective||""}. Tone: ${project.tone||""}. CTA: ${project.call_to_action||""}. SOURCE MATERIAL: ${facts}. JSON keys: hook, outline, script, storyboard, youtube_title, youtube_description, tags, thumbnail_prompt, captions, clip_ideas.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-sol",store:false,input:prompt})});const out=await r.json();if(!r.ok)return {ok:false,blocked:true,reason:out?.error?.message||`provider_${r.status}`};
  let text=clean(out?.output_text,50000);if(!text){const parts=[];for(const item of out?.output||[])for(const c of item?.content||[])if(typeof c?.text==="string")parts.push(c.text);text=parts.join("\n")}
  try{return {ok:true,package:JSON.parse(text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim())}}catch{return {ok:false,blocked:true,reason:"provider_returned_invalid_json"}}
}

async function requestFinishedVideo(project:any,pack:any){
  const gateway=clean(Deno.env.get("ALLSHIELD_VIDEO_PROVIDER_URL")||Deno.env.get("VICTOR_VIDEO_PROVIDER_URL")||Deno.env.get("MAYA_VIDEO_PROVIDER_URL"),1000);
  const secret=clean(Deno.env.get("ALLSHIELD_VIDEO_PROVIDER_SECRET")||Deno.env.get("VICTOR_VIDEO_PROVIDER_SECRET")||Deno.env.get("MAYA_VIDEO_PROVIDER_SECRET"),1000);
  if(!gateway||!secret)return {ok:false,blocked:true,reason:"durable_video_provider_not_configured"};
  const r=await fetch(gateway,{method:"POST",headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"},body:JSON.stringify({action:"create_video_draft",project:{id:project.id,title:project.title,project_type:project.project_type,orientation:project.orientation,target_duration_seconds:project.target_duration_seconds},package:pack,approval_required:true,publish_allowed:false})});
  const out=await r.json().catch(()=>({}));if(!r.ok)return {ok:false,blocked:true,reason:out?.error||`video_provider_${r.status}`};return {ok:true,provider:out};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"METHOD"},405);
  try{
    const a=await actor(req);const body=await req.json().catch(()=>({}));const action=clean(body.action||"status",120);
    if(PROTECTED_ACTIONS.has(action))return json({error:"PROTECTED_ACTION",action,human_approval_required:true},403);
    const e=await employee();
    if(action==="status"){const s=await snapshot();return json({ok:true,build:BUILD,execution_version:EXECUTION_VERSION,employee:{code:e.code,name:e.name,title:e.job_title,assignment:e.job_assignment},capabilities:{enabled:ENABLED_CAPABILITIES,planned_provider:PLANNED_PROVIDER_CAPABILITIES,total:ENABLED_CAPABILITIES.length+PLANNED_PROVIDER_CAPABILITIES.length},providers:s.providers,youtube:s.youtube,counts:s.counts,professional_completion:{core_media_employee_ready:true,complete:Boolean(s.providers.professional_ready)}})}
    if(action==="scan")return json({ok:true,...await perform(e,clean(body.assignment,4000),null,"scan")});
    if(action==="work"){const jobId=body.job_id?clean(body.job_id,80):null;return json({ok:true,...await perform(e,clean(body.assignment,4000),jobId,"work")})}
    if(action==="prepare_package"){
      const pid=clean(body.project_id,80);const p=await db.from("video_projects").select("*").eq("id",pid).maybeSingle();if(p.error)throw p.error;if(!p.data)return json({error:"PROJECT_NOT_FOUND"},404);
      if(clean(p.data.script)&&arr(p.data.storyboard).length)return json({ok:true,reused_existing_package:true,package:deliveryPackage(p.data,await snapshot())});
      const gen=await providerPackage(p.data);if(!gen.ok)return json(gen,409);const x=gen.package||{};const patch={hook:clean(x.hook,500),outline:arr(x.outline),script:clean(x.script,30000),storyboard:arr(x.storyboard),youtube_title:clean(x.youtube_title||p.data.title,100),youtube_description:clean(x.youtube_description,5000),tags:arr(x.tags).map(String).slice(0,30),thumbnail_prompt:clean(x.thumbnail_prompt,2000),captions:clean(x.captions,30000),status:"script_ready",metadata:{...(p.data.metadata||{}),clip_ideas:arr(x.clip_ideas),victor_engine:"openai:gpt-5.6-sol",victor_package_generated_at:now(),approval_required:true},updated_at:now()};
      const u=await db.from("video_projects").update(patch).eq("id",pid).select("*").single();if(u.error)throw u.error;return json({ok:true,project:u.data,provider:"openai:gpt-5.6-sol",approval_required:true});
    }
    if(action==="request_finished_video"){
      const pid=clean(body.project_id,80);const p=await db.from("video_projects").select("*").eq("id",pid).maybeSingle();if(p.error)throw p.error;if(!p.data)return json({error:"PROJECT_NOT_FOUND"},404);
      const pack=deliveryPackage(p.data,await snapshot());const r=await requestFinishedVideo(p.data,pack);if(!r.ok)return json(r,409);
      const meta={...(p.data.metadata||{}),victor_video_provider_job:r.provider,provider_generation_status:"requested_draft",approval_required:true,publish_allowed:false,victor_video_requested_at:now()};await db.from("video_projects").update({metadata:meta,updated_at:now()}).eq("id",pid);return json({ok:true,provider:r.provider,approval_required:true,publish_allowed:false});
    }
    return json({error:"UNKNOWN_ACTION"},400);
  }catch(e:any){const m=err(e);if(m==="AUTH")return json({error:"AUTH"},401);if(m==="FORBIDDEN")return json({error:"FORBIDDEN"},403);return json({error:m,build:BUILD},500)}
});
