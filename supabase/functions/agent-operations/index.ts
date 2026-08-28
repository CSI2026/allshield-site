import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type,apikey,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clean=(v:unknown,max=180)=>String(v??"").trim().slice(0,max);
const AGENT_ROLES=["agent","team_lead","manager"];
const LIFECYCLE=["onboarding","prelicensing","license_verification","contracting","marketplace","license_ready","active","inactive"];
const OPS=["not_started","pending","in_progress","ready","complete","blocked","active","inactive"];

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer "))return json({error:"Missing authorization"},401);
    const token=auth.slice(7);
    const url=Deno.env.get("SUPABASE_URL")!;
    const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")!;
    const sec=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const uc=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
    const {data:ud,error:ue}=await uc.auth.getUser(token);
    if(ue||!ud.user)return json({error:"Invalid session"},401);
    const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:actor}=await admin.from("profiles").select("id,role,status").eq("id",ud.user.id).single();
    if(!actor||!["owner","admin"].includes(actor.role)||actor.status!=="active")return json({error:"Owner/Admin access required"},403);
    const body=await req.json();
    const action=clean(body.action,60)||"dashboard";

    async function coreSets(){
      const [pQ,oQ,lQ,eQ,mQ]=await Promise.all([
        admin.from("profiles").select("id,first_name,last_name,email,phone,username,role,status,resident_state,department_id,manager_id,created_at,updated_at").in("role",AGENT_ROLES).neq("status","terminated").order("last_name"),
        admin.from("onboarding_progress").select("user_id,step_key,completed,step_order,metadata"),
        admin.from("user_state_licenses").select("user_id,state_code,status,readiness_percent,license_number,expiration_date,is_resident,license_type"),
        admin.from("exam_attempts").select("user_id,score_percent,exam_type,state_code,created_at").order("created_at",{ascending:false}),
        admin.from("email_threads").select("id,agent_id,subject,contact_email,status,last_message_at,unread_count,department_key").not("agent_id","is",null).order("last_message_at",{ascending:false})
      ]);
      for(const q of [pQ,oQ,lQ,eQ,mQ])if(q.error)throw q.error;
      return {profiles:pQ.data||[],onboarding:oQ.data||[],licenses:lQ.data||[],exams:eQ.data||[],threads:mQ.data||[]};
    }

    function summarize(s:any){
      const incomplete=new Set(s.onboarding.filter((x:any)=>!x.completed).map((x:any)=>x.user_id));
      const onboardingIds=new Set(s.profiles.filter((x:any)=>x.status==="onboarding").map((x:any)=>x.id));
      incomplete.forEach((x:string)=>onboardingIds.add(x));
      const activeIds=new Set(s.profiles.filter((x:any)=>x.status==="active").map((x:any)=>x.id));
      const readyIds=new Set(s.licenses.filter((x:any)=>x.status==="active").map((x:any)=>x.user_id));
      const scores=s.exams.map((x:any)=>Number(x.score_percent)).filter(Number.isFinite);
      const avg=scores.length?Math.round(scores.reduce((a:number,b:number)=>a+b,0)/scores.length):null;
      const unread=s.threads.reduce((n:number,x:any)=>n+Number(x.unread_count||0),0);
      return {activeIds,onboardingIds,readyIds,avg,unread};
    }

    function profileRow(p:any,s:any){
      const licenses=s.licenses.filter((x:any)=>x.user_id===p.id);
      const exams=s.exams.filter((x:any)=>x.user_id===p.id);
      const unread=s.threads.filter((x:any)=>x.agent_id===p.id).reduce((n:number,x:any)=>n+Number(x.unread_count||0),0);
      const latestExam=exams[0]||null;
      const activeLicense=licenses.find((x:any)=>x.status==="active")||null;
      const steps=s.onboarding.filter((x:any)=>x.user_id===p.id);
      return {...p,display_name:[p.first_name,p.last_name].filter(Boolean).join(" ")||p.username||p.email||"Agent",onboarding_open:steps.filter((x:any)=>!x.completed).length,license_ready:!!activeLicense,license_state:activeLicense?.state_code||licenses[0]?.state_code||null,latest_exam_score:latestExam?Number(latestExam.score_percent):null,exam_attempts:exams.length,unread_agent_emails:unread};
    }

    if(action==="dashboard"){
      const s=await coreSets(),sum=summarize(s);
      return json({ok:true,counts:{active_accounts:sum.activeIds.size,onboarding_users:sum.onboardingIds.size,license_ready:sum.readyIds.size,avg_exam_score:sum.avg,agent_email_unread:sum.unread}});
    }

    if(action==="queue"){
      const kind=clean(body.kind,40),s=await coreSets(),sum=summarize(s);
      let rows=s.profiles.map((p:any)=>profileRow(p,s));
      if(kind==="active")rows=rows.filter((x:any)=>sum.activeIds.has(x.id));
      else if(kind==="onboarding")rows=rows.filter((x:any)=>sum.onboardingIds.has(x.id));
      else if(kind==="license_ready")rows=rows.filter((x:any)=>sum.readyIds.has(x.id));
      else if(kind==="testing")rows=rows.filter((x:any)=>x.exam_attempts>0).sort((a:any,b:any)=>Number(b.latest_exam_score||0)-Number(a.latest_exam_score||0));
      else if(kind==="agent_email")rows=rows.filter((x:any)=>x.unread_agent_emails>0).sort((a:any,b:any)=>b.unread_agent_emails-a.unread_agent_emails);
      else if(kind!=="all")return json({error:"Unknown queue"},400);
      return json({ok:true,kind,rows});
    }

    if(action==="profile"){
      const userId=clean(body.user_id,80);if(!userId)return json({error:"Missing agent id"},400);
      const {data:p,error:pe}=await admin.from("profiles").select("id,first_name,last_name,email,phone,username,role,status,resident_state,department_id,manager_id,created_at,updated_at").eq("id",userId).single();
      if(pe||!p)return json({error:"Agent not found"},404);
      if(!AGENT_ROLES.includes(String(p.role)))return json({error:"That account is not an agent profile"},400);
      const [obQ,liQ,exQ,dsQ,caQ,prQ,clQ,opQ,alQ,emQ,tlQ,auQ,appQ]=await Promise.all([
        admin.from("onboarding_progress").select("*").eq("user_id",userId).order("step_order"),
        admin.from("user_state_licenses").select("*").eq("user_id",userId).order("state_code"),
        admin.from("exam_attempts").select("id,exam_type,state_code,score_percent,question_count,correct_count,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(100),
        admin.from("document_signatures").select("id,document_id,document_title_snapshot,document_version_snapshot,signed_at,status,typed_name").eq("user_id",userId).order("signed_at",{ascending:false}),
        admin.from("agent_campaign_assignments").select("id,campaign_id,manager_id,active,started_at,ended_at").eq("user_id",userId).order("started_at",{ascending:false}),
        admin.from("production_entries").select("id,period_start,period_end,sales_count,quality_score,source,created_at").eq("user_id",userId).order("period_start",{ascending:false}).limit(100),
        admin.from("comp_ledger").select("id,campaign_id,earning_type,source_period_start,source_period_end,units,rate,amount,status,payable_on,paid_at,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(200),
        admin.from("agent_operational_status").select("*").eq("user_id",userId).maybeSingle(),
        admin.from("agent_mail_aliases").select("*").eq("user_id",userId).maybeSingle(),
        admin.from("email_threads").select("id,subject,contact_email,status,last_message_at,unread_count,department_key,created_at").eq("agent_id",userId).order("last_message_at",{ascending:false}).limit(100),
        admin.from("agent_timeline_events").select("id,event_type,title,detail,visibility,source,actor_id,metadata,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(200),
        admin.from("audit_log").select("id,action,object_type,details,created_at,actor_id").eq("object_id",userId).order("created_at",{ascending:false}).limit(200),
        admin.from("career_applications").select("id,full_name,email,phone,licensing_status,resident_state,status,source,notes,created_at,converted_at").eq("converted_user_id",userId).order("converted_at",{ascending:false}).limit(1).maybeSingle()
      ]);
      for(const q of [obQ,liQ,exQ,dsQ,caQ,prQ,clQ,opQ,alQ,emQ,tlQ,auQ,appQ])if(q.error)throw q.error;
      const assignments=caQ.data||[];let campaignMap:Record<string,unknown>={};
      const campaignIds=[...new Set(assignments.map((x:any)=>x.campaign_id).filter(Boolean))];
      if(campaignIds.length){const {data,error}=await admin.from("campaigns").select("id,code,name,status").in("id",campaignIds);if(error)throw error;campaignMap=Object.fromEntries((data||[]).map((x:any)=>[x.id,x]));}
      return json({ok:true,profile:p,onboarding:obQ.data||[],licenses:liQ.data||[],exams:exQ.data||[],documents:dsQ.data||[],campaigns:assignments.map((x:any)=>({...x,campaign:campaignMap[x.campaign_id]||null})),production:prQ.data||[],compensation:clQ.data||[],operations:opQ.data||null,mail_alias:alQ.data||null,communications:emQ.data||[],timeline:tlQ.data||[],audit:auQ.data||[],career_application:appQ.data||null});
    }

    if(action==="update_profile"){
      const userId=clean(body.user_id,80);if(!userId)return json({error:"Missing agent id"},400);
      const {data:t}=await admin.from("profiles").select("role").eq("id",userId).single();if(!t||!AGENT_ROLES.includes(String(t.role)))return json({error:"Agent not found"},404);
      const patch:any={updated_at:new Date().toISOString()};
      if(body.first_name!==undefined)patch.first_name=clean(body.first_name,80)||null;
      if(body.last_name!==undefined)patch.last_name=clean(body.last_name,80)||null;
      if(body.email!==undefined){const e=clean(body.email,200).toLowerCase();if(e&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return json({error:"Invalid email"},400);patch.email=e||null;}
      if(body.phone!==undefined)patch.phone=clean(body.phone,60)||null;
      if(body.resident_state!==undefined){const s=clean(body.resident_state,2).toUpperCase();if(s&&!/^[A-Z]{2}$/.test(s))return json({error:"Resident state must be two letters"},400);patch.resident_state=s||null;}
      if(body.status!==undefined){const s=clean(body.status,30);if(!["invited","onboarding","active","inactive","terminated"].includes(s))return json({error:"Invalid status"},400);patch.status=s;}
      const {error}=await admin.from("profiles").update(patch).eq("id",userId);if(error)throw error;
      await admin.from("audit_log").insert({actor_id:actor.id,action:"agent_master_profile_updated",object_type:"profile",object_id:userId,details:patch});
      await admin.from("agent_timeline_events").insert({user_id:userId,event_type:"profile_updated",title:"Master agent profile updated",visibility:"internal",source:"agent-operations",actor_id:actor.id,metadata:patch});
      return json({ok:true});
    }

    if(action==="update_operations"){
      const userId=clean(body.user_id,80);if(!userId)return json({error:"Missing agent id"},400);
      const patch:any={user_id:userId,updated_by:actor.id,updated_at:new Date().toISOString()};
      const lifecycle=clean(body.lifecycle_stage,40);if(lifecycle){if(!LIFECYCLE.includes(lifecycle))return json({error:"Invalid lifecycle stage"},400);patch.lifecycle_stage=lifecycle;}
      for(const key of ["background_status","financial_setup_status","coding_status","dialer_status","marketplace_status"]){if(body[key]!==undefined){const v=clean(body[key],40);if(!OPS.includes(v))return json({error:`Invalid ${key}`},400);patch[key]=v;}}
      const {error}=await admin.from("agent_operational_status").upsert(patch,{onConflict:"user_id"});if(error)throw error;
      await admin.from("agent_timeline_events").insert({user_id:userId,event_type:"operations_updated",title:"Agent operations status updated",visibility:"internal",source:"agent-operations",actor_id:actor.id,metadata:patch});
      return json({ok:true});
    }

    if(action==="communications"){
      const unreadOnly=body.unread_only===true;
      let q=admin.from("email_threads").select("id,agent_id,subject,contact_email,status,last_message_at,unread_count,department_key,created_at").not("agent_id","is",null).order("last_message_at",{ascending:false}).limit(300);
      if(unreadOnly)q=q.gt("unread_count",0);
      const {data:threads,error}=await q;if(error)throw error;
      const ids=[...new Set((threads||[]).map((x:any)=>x.agent_id))];let pmap:Record<string,any>={};
      if(ids.length){const {data,error:pe}=await admin.from("profiles").select("id,first_name,last_name,username,email").in("id",ids);if(pe)throw pe;pmap=Object.fromEntries((data||[]).map((x:any)=>[x.id,x]));}
      return json({ok:true,threads:(threads||[]).map((x:any)=>({...x,agent:pmap[x.agent_id]||null}))});
    }

    if(action==="thread"){
      const id=clean(body.thread_id,80);if(!id)return json({error:"Missing thread id"},400);
      const {data:t,error:te}=await admin.from("email_threads").select("*").eq("id",id).single();if(te||!t)return json({error:"Thread not found"},404);
      const {data:m,error:me}=await admin.from("email_messages").select("*").eq("thread_id",id).order("sent_at");if(me)throw me;
      await admin.from("email_threads").update({unread_count:0,updated_at:new Date().toISOString()}).eq("id",id);
      return json({ok:true,thread:t,messages:m||[]});
    }

    if(action==="assign_thread"){
      const threadId=clean(body.thread_id,80),userId=clean(body.user_id,80);if(!threadId||!userId)return json({error:"Thread and agent are required"},400);
      const {data:p}=await admin.from("profiles").select("id,role").eq("id",userId).single();if(!p||!AGENT_ROLES.includes(String(p.role)))return json({error:"Agent not found"},404);
      const {error}=await admin.from("email_threads").update({agent_id:userId,updated_at:new Date().toISOString()}).eq("id",threadId);if(error)throw error;
      await admin.from("agent_timeline_events").insert({user_id:userId,event_type:"communication_linked",title:"Vendor communication linked to agent",visibility:"internal",source:"agent-operations",actor_id:actor.id,metadata:{thread_id:threadId}});
      return json({ok:true});
    }

    return json({error:"Unknown action"},400);
  }catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}
});