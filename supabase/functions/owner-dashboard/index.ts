import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clean=(v:unknown,max=80)=>String(v??"").trim().slice(0,max);
const AGENT_ROLES=["agent","team_lead","manager"];

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const ah=req.headers.get("Authorization")||"";
    if(!ah.startsWith("Bearer "))return json({error:"Missing authorization"},401);
    const token=ah.slice(7);
    const url=Deno.env.get("SUPABASE_URL")!;
    const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")!;
    const sec=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const uc=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
    const {data:ud,error:ue}=await uc.auth.getUser(token);
    if(ue||!ud.user)return json({error:"Invalid session"},401);
    const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:actor}=await admin.from("profiles").select("id,role,status").eq("id",ud.user.id).single();
    if(!actor||actor.status!=="active"||!["owner","admin"].includes(actor.role))return json({error:"Owner/Admin access required"},403);

    const body=await req.json().catch(()=>({}));
    const action=clean(body.action,40)||"dashboard";

    async function snapshot(){
      const [profiles,licenses,exams,courses,leads,careers,audit]=await Promise.all([
        admin.from("profiles").select("id,first_name,last_name,email,username,role,status,resident_state").neq("status","terminated"),
        admin.from("user_state_licenses").select("id,user_id,state_code,status,readiness_percent,license_number,expiration_date,is_resident,license_type"),
        admin.from("exam_attempts").select("id,user_id,score_percent,exam_type,state_code,created_at").order("created_at",{ascending:false}).limit(500),
        admin.from("course_assignments").select("id,user_id,progress_percent,completed_at").limit(1000),
        admin.from("coverage_leads").select("id,status,created_at").order("created_at",{ascending:false}).limit(500),
        admin.from("career_applications").select("id,status,created_at").order("created_at",{ascending:false}).limit(500),
        admin.from("audit_log").select("id,action,object_type,created_at").order("created_at",{ascending:false}).limit(50)
      ]);
      const queries=[profiles,licenses,exams,courses,leads,careers,audit];
      const bad=queries.find((q:any)=>q.error);
      if(bad?.error)throw bad.error;
      const p=profiles.data||[];
      const agentProfiles=p.filter((x:any)=>AGENT_ROLES.includes(String(x.role)));
      const agentIds=new Set(agentProfiles.map((x:any)=>x.id));
      const l=(licenses.data||[]).filter((x:any)=>agentIds.has(x.user_id));
      const e=(exams.data||[]).filter((x:any)=>agentIds.has(x.user_id));
      const c=(courses.data||[]).filter((x:any)=>agentIds.has(x.user_id));
      const q=leads.data||[],r=careers.data||[],a=audit.data||[];
      const pmap=Object.fromEntries(agentProfiles.map((x:any)=>[x.id,x]));
      return {profiles:p,agentProfiles,agentIds,licenses:l,exams:e,courses:c,leads:q,careers:r,audit:a,pmap};
    }

    function metrics(s:any){
      const activeAgents=s.agentProfiles.filter((x:any)=>x.status==="active");
      const states=[...new Set(s.licenses.map((x:any)=>x.state_code).filter(Boolean))];
      const ready=s.licenses.filter((x:any)=>Number(x.readiness_percent||0)>=85);
      const avgScore=s.exams.length?Math.round(s.exams.reduce((n:number,x:any)=>n+Number(x.score_percent||0),0)/s.exams.length):null;
      return {activeAgents,states,ready,avgScore};
    }

    if(action==="queue"){
      const kind=clean(body.kind,40),s=await snapshot(),m=metrics(s);
      let rows:any[]=[];
      if(kind==="active_agents"){
        rows=m.activeAgents.map((x:any)=>({...x,display_name:[x.first_name,x.last_name].filter(Boolean).join(" ")||x.username||x.email||"Agent"}));
      }else if(kind==="states"){
        rows=m.states.sort().map((state_code:string)=>{
          const licenses=s.licenses.filter((x:any)=>x.state_code===state_code);
          const users=[...new Set(licenses.map((x:any)=>x.user_id))];
          return {state_code,agent_count:users.length,licensing_records:licenses.length,ready_records:licenses.filter((x:any)=>Number(x.readiness_percent||0)>=85).length,active_records:licenses.filter((x:any)=>String(x.status)==="active").length};
        });
      }else if(kind==="licensing_records"||kind==="exam_ready"){
        let licenses=s.licenses;
        if(kind==="exam_ready")licenses=licenses.filter((x:any)=>Number(x.readiness_percent||0)>=85);
        rows=licenses.map((x:any)=>{const p=s.pmap[x.user_id]||{};return {...x,agent:p,display_name:[p.first_name,p.last_name].filter(Boolean).join(" ")||p.username||p.email||"Agent"};});
      }else return json({error:"Unknown Owner dashboard queue"},400);
      return json({ok:true,kind,count:rows.length,rows});
    }

    if(action!=="dashboard")return json({error:"Unknown action"},400);
    const s=await snapshot(),m=metrics(s);
    const recent:any[]=[];
    for(const x of s.leads)recent.push({date:x.created_at,title:"Coverage lead",detail:`Customer protection request • ${x.status||"new"}`});
    for(const x of s.careers)recent.push({date:x.created_at,title:"Career application",detail:`Recruiting pipeline • ${x.status||"new"}`});
    for(const x of s.exams.slice(0,20))recent.push({date:x.created_at,title:"Exam attempt",detail:`Score ${Number(x.score_percent||0)}%`});
    for(const x of s.audit)recent.push({date:x.created_at,title:x.action||"System activity",detail:x.object_type||"Audit log"});
    recent.sort((x,y)=>new Date(y.date||0).getTime()-new Date(x.date||0).getTime());

    return json({ok:true,metrics:{active_agents:m.activeAgents.length,states_represented:m.states.length,licensing_records:s.licenses.length,exam_ready:m.ready.length,exam_attempts:s.exams.length,course_assignments:s.courses.length,coverage_leads:s.leads.length,career_applications:s.careers.length,average_exam_score:m.avgScore},recent:recent.slice(0,12),health:{supabase:true,profiles:true,licensing:true,academy:true,courses:true,crm:true,recruiting:true,audit:true}});
  }catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}
});
