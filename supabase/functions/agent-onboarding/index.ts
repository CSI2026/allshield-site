import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,content-type,apikey","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const clean=(v:unknown,max=160)=>String(v??"").trim().slice(0,max);
const ROUTES={
  prelicensing:[
    ["profile",1],["license_selection",2],["prelicensing_training",3],["state_exam",4],
    ["license_verification",5],["contracting",6],["comp_setup",7],["marketplace",8],["ready",9]
  ],
  licensed_verification:[
    ["profile",1],["license_verification",2],["contracting",3],["comp_setup",4],["marketplace",5],["ready",6]
  ]
} as const;

async function digest(v:string){
  const b=new TextEncoder().encode(v);
  const h=await crypto.subtle.digest("SHA-256",b);
  return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

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
    const userClient=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
    const {data:ud,error:ue}=await userClient.auth.getUser(token);
    if(ue||!ud.user)return json({error:"Invalid session"},401);
    const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:actor}=await admin.from("profiles").select("*").eq("id",ud.user.id).single();
    if(!actor)return json({error:"Profile not found"},404);
    const body=await req.json();
    const action=clean(body.action,60)||"get_context";

    const isAdmin=["owner","admin"].includes(actor.role)&&actor.status==="active";
    const isAgent=["agent","team_lead","manager"].includes(actor.role)&&["onboarding","active"].includes(actor.status);

    const getPath=async(userId:string)=>{
      const {data:steps}=await admin.from("onboarding_progress").select("step_key,metadata").eq("user_id",userId).order("step_order");
      const fromMeta=(steps||[]).map(x=>x.metadata?.pathway).find(Boolean);
      if(fromMeta)return String(fromMeta);
      const {data:app}=await admin.from("career_applications").select("licensing_status").eq("converted_user_id",userId).order("converted_at",{ascending:false}).limit(1).maybeSingle();
      if(app?.licensing_status==="licensed")return "licensed_verification";
      if(app?.licensing_status==="not_licensed"||app?.licensing_status==="studying")return "prelicensing";
      return "self_select";
    };

    const setRoute=async(userId:string,pathway:"prelicensing"|"licensed_verification",licensingStatus:string,source:string)=>{
      await admin.from("onboarding_progress").delete().eq("user_id",userId);
      const rows=ROUTES[pathway].map(([step_key,step_order])=>({
        user_id:userId,step_key,step_order,completed:false,
        metadata:{pathway,licensing_status:licensingStatus,source}
      }));
      const {error}=await admin.from("onboarding_progress").insert(rows);
      if(error)throw error;
    };

    const step=async(userId:string,key:string,completed:boolean,metadata:Record<string,unknown>={})=>{
      const {data:existing}=await admin.from("onboarding_progress").select("id,metadata").eq("user_id",userId).eq("step_key",key).maybeSingle();
      if(!existing)return;
      const merged={...(existing.metadata||{}),...metadata};
      const {error}=await admin.from("onboarding_progress").update({
        completed,completed_at:completed?new Date().toISOString():null,metadata:merged
      }).eq("id",existing.id);
      if(error)throw error;
    };

    const stateTrack=async(state:string)=>{
      const {data:track,error}=await admin.from("academy_launch_tracks").select("*").eq("state_code",state).eq("licensing_status","ready").maybeSingle();
      if(error)throw error;
      if(!track)throw new Error("That state is not open in the current ALLSHIELD launch.");
      return track;
    };

    const assignTraining=async(userId:string,state:string,assignedBy:string)=>{
      const [{data:foundation},{data:stateCourse}]=await Promise.all([
        admin.from("courses").select("id,title").eq("title","Allshield Life & Health Foundations").eq("status","published").limit(1).maybeSingle(),
        admin.from("courses").select("id,title").eq("state_code",state).eq("category","state_exam_prep").eq("status","published").limit(1).maybeSingle()
      ]);
      const courses=[foundation,stateCourse].filter(Boolean) as {id:string,title:string}[];
      for(const course of courses){
        const {error}=await admin.from("course_assignments").upsert({
          user_id:userId,course_id:course.id,assigned_by:assignedBy,progress_percent:0
        },{onConflict:"user_id,course_id",ignoreDuplicates:true});
        if(error)throw error;
      }
      return courses;
    };

    if(action==="get_context"){
      if(!isAgent)return json({error:"Agent access required"},403);
      const path=await getPath(actor.id);
      const [stepsQ,licensesQ,tracksQ,assignQ,contractQ,marketsQ,sourceQ]=await Promise.all([
        admin.from("onboarding_progress").select("*").eq("user_id",actor.id).order("step_order"),
        admin.from("user_state_licenses").select("*").eq("user_id",actor.id).order("state_code"),
        admin.from("academy_launch_tracks").select("state_code,priority,license_track,licensing_status,marketplace_type,marketplace_url").eq("licensing_status","ready").order("priority"),
        admin.from("course_assignments").select("course_id,progress_percent,assigned_at").eq("user_id",actor.id),
        admin.from("contract_plan_versions").select("id,title,body_markdown,version,status,comp_plan_version_id,effective_from,effective_to").eq("status","published").order("version",{ascending:false}).limit(1).maybeSingle(),
        admin.from("marketplace_certifications").select("*").eq("user_id",actor.id).order("plan_year",{ascending:false}),
        admin.from("career_applications").select("id,licensing_status,source").eq("converted_user_id",actor.id).order("converted_at",{ascending:false}).limit(1).maybeSingle()
      ]);
      for(const q of [stepsQ,licensesQ,tracksQ,assignQ,contractQ,marketsQ,sourceQ])if(q.error)throw q.error;
      const assignments=assignQ.data||[];
      const courseIds=assignments.map(x=>x.course_id);
      let courseMap:Record<string,unknown>={};
      if(courseIds.length){
        const {data:courses,error}=await admin.from("courses").select("id,title,category,state_code,status").in("id",courseIds);
        if(error)throw error;
        courseMap=Object.fromEntries((courses||[]).map(x=>[x.id,x]));
      }
      let acceptance=null,compPlan=null;
      if(contractQ.data){
        const {data:a,error}=await admin.from("user_contract_acceptances").select("*").eq("user_id",actor.id).eq("contract_version_id",contractQ.data.id).maybeSingle();
        if(error)throw error; acceptance=a;
        if(contractQ.data.comp_plan_version_id){
          const {data:cp,error:ce}=await admin.from("comp_plan_versions").select("id,version,status,base_enrollment_amount,effective_from,contract_terms").eq("id",contractQ.data.comp_plan_version_id).maybeSingle();
          if(ce)throw ce; compPlan=cp;
        }
      }
      return json({
        ok:true,pathway:path,profile:actor,source_application:sourceQ.data||null,
        steps:stepsQ.data||[],licenses:licensesQ.data||[],states:tracksQ.data||[],
        assignments:assignments.map(x=>({...x,course:courseMap[x.course_id]||null})),
        contract:contractQ.data||null,contract_acceptance:acceptance,comp_plan:compPlan,
        marketplace:marketsQ.data||[]
      });
    }

    if(action==="choose_licensing_status"){
      if(!isAgent)return json({error:"Agent access required"},403);
      const current=await getPath(actor.id);
      if(current!=="self_select")return json({error:"Your licensing route was already set from your application."},409);
      const answer=clean(body.licensing_status,40);
      if(!["licensed","not_licensed","studying"].includes(answer))return json({error:"Choose licensed or not licensed."},400);
      const pathway=answer==="licensed"?"licensed_verification":"prelicensing";
      await setRoute(actor.id,pathway,answer,"agent_self_select");
      await admin.from("audit_log").insert({actor_id:actor.id,action:"agent_onboarding_route_selected",object_type:"profile",object_id:actor.id,details:{pathway,licensing_status:answer}});
      return json({ok:true,pathway});
    }

    if(action==="select_prelicense_state"){
      if(!isAgent)return json({error:"Agent access required"},403);
      let pathway=await getPath(actor.id);
      if(pathway==="self_select"){
        await setRoute(actor.id,"prelicensing","not_licensed","agent_state_selection");
        pathway="prelicensing";
      }
      if(pathway!=="prelicensing")return json({error:"This action is for the pre-licensing route."},400);
      const state=clean(body.state_code,2).toUpperCase();
      const track=await stateTrack(state);
      const licenseType=String(track.license_track);
      const {error:pe}=await admin.from("profiles").update({resident_state:state,updated_at:new Date().toISOString()}).eq("id",actor.id);
      if(pe)throw pe;
      const {error:le}=await admin.from("user_state_licenses").upsert({
        user_id:actor.id,state_code:state,license_type:licenseType,is_resident:true,status:"studying",readiness_percent:0,
        metadata:{pathway:"prelicensing",product:"life_health_aca",source:"agent_state_selection",selected_at:new Date().toISOString()}
      },{onConflict:"user_id,state_code,license_type"});
      if(le)throw le;
      const courses=await assignTraining(actor.id,state,actor.id);
      await step(actor.id,"license_selection",true,{state_code:state,license_type:licenseType});
      await step(actor.id,"profile",Boolean(actor.first_name&&actor.last_name),{resident_state:state});
      await admin.from("audit_log").insert({actor_id:actor.id,action:"prelicense_state_selected",object_type:"profile",object_id:actor.id,details:{state,license_type:licenseType}});
      return json({ok:true,state_code:state,license_type:licenseType,courses});
    }

    if(action==="submit_existing_license"){
      if(!isAgent)return json({error:"Agent access required"},403);
      const pathway=await getPath(actor.id);
      if(!["licensed_verification","prelicensing"].includes(pathway))return json({error:"Select your licensing route first."},400);
      const state=clean(body.state_code,2).toUpperCase(),number=clean(body.license_number,80),expiration=clean(body.expiration_date,20);
      if(!number)return json({error:"License number is required."},400);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(expiration))return json({error:"License expiration date is required."},400);
      const track=await stateTrack(state),licenseType=String(track.license_track);
      const resident=actor.resident_state?String(actor.resident_state)===state:true;
      if(!actor.resident_state)await admin.from("profiles").update({resident_state:state,updated_at:new Date().toISOString()}).eq("id",actor.id);
      const {error}=await admin.from("user_state_licenses").upsert({
        user_id:actor.id,state_code:state,license_type:licenseType,is_resident:resident,status:"pending_verification",
        readiness_percent:0,license_number:number,expiration_date:expiration,
        metadata:{pathway,product:"life_health_aca",source:"agent_license_submission",submitted_at:new Date().toISOString()}
      },{onConflict:"user_id,state_code,license_type"});
      if(error)throw error;
      await step(actor.id,"license_verification",false,{state_code:state,submitted:true,submitted_at:new Date().toISOString()});
      await admin.from("audit_log").insert({actor_id:actor.id,action:"license_submitted_for_verification",object_type:"profile",object_id:actor.id,details:{state,license_type:licenseType}});
      return json({ok:true,status:"pending_verification",state_code:state,license_type:licenseType});
    }

    if(action==="add_state_track"){
      if(!isAgent)return json({error:"Agent access required"},403);
      const state=clean(body.state_code,2).toUpperCase(),track=await stateTrack(state),licenseType=String(track.license_track);
      const {data:existing}=await admin.from("user_state_licenses").select("id,status").eq("user_id",actor.id).eq("state_code",state).maybeSingle();
      if(existing)return json({error:`${state} is already on your licensing record.`},409);
      const {error}=await admin.from("user_state_licenses").insert({
        user_id:actor.id,state_code:state,license_type:licenseType,is_resident:String(actor.resident_state||"")===state,
        status:"studying",readiness_percent:0,metadata:{additional_state:true,source:"agent_add_state",selected_at:new Date().toISOString()}
      });
      if(error)throw error;
      const courses=await assignTraining(actor.id,state,actor.id);
      return json({ok:true,state_code:state,license_type:licenseType,courses});
    }

    if(action==="verify_license"){
      if(!isAdmin)return json({error:"Owner/Admin access required"},403);
      const userId=clean(body.user_id,80),state=clean(body.state_code,2).toUpperCase();
      const {data:lic,error:qe}=await admin.from("user_state_licenses").select("*").eq("user_id",userId).eq("state_code",state).eq("status","pending_verification").limit(1).maybeSingle();
      if(qe)throw qe;
      if(!lic)return json({error:"No pending license submission found for that state."},404);
      const metadata={...(lic.metadata||{}),verified_at:new Date().toISOString(),verified_by:actor.id,verification_status:"verified"};
      const {error}=await admin.from("user_state_licenses").update({status:"active",readiness_percent:100,metadata}).eq("id",lic.id);
      if(error)throw error;
      await step(userId,"prelicensing_training",true,{completed_by_license_verification:true});
      await step(userId,"state_exam",true,{completed_by_license_verification:true});
      await step(userId,"license_verification",true,{state_code:state,verified_by:actor.id});
      await admin.from("audit_log").insert({actor_id:actor.id,action:"agent_license_verified",object_type:"profile",object_id:userId,details:{state,license_type:lic.license_type}});
      return json({ok:true,user_id:userId,state_code:state,status:"active"});
    }

    if(action==="accept_contract"){
      if(!isAgent)return json({error:"Agent access required"},403);
      const typed=clean(body.typed_name,120);
      if(typed.length<3)return json({error:"Type your full legal name to accept the contract."},400);
      const {data:activeLic}=await admin.from("user_state_licenses").select("id").eq("user_id",actor.id).eq("status","active").limit(1).maybeSingle();
      if(!activeLic)return json({error:"Your license must be verified before contracting."},400);
      const {data:contract,error:ce}=await admin.from("contract_plan_versions").select("*").eq("status","published").order("version",{ascending:false}).limit(1).maybeSingle();
      if(ce)throw ce;
      if(!contract)return json({error:"No published agent contract is available yet."},409);
      const ip=(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
      const ipHash=await digest(ip);
      const {error}=await admin.from("user_contract_acceptances").upsert({
        user_id:actor.id,contract_version_id:contract.id,accepted_at:new Date().toISOString(),typed_name:typed,ip_hash:ipHash,
        metadata:{source:"self_service_onboarding"}
      },{onConflict:"user_id,contract_version_id"});
      if(error)throw error;
      await step(actor.id,"contracting",true,{contract_version_id:contract.id,accepted_at:new Date().toISOString()});
      let compReady=false;
      if(contract.comp_plan_version_id){
        const {data:cp}=await admin.from("comp_plan_versions").select("id,status").eq("id",contract.comp_plan_version_id).maybeSingle();
        compReady=cp?.status==="published";
        if(compReady)await step(actor.id,"comp_setup",true,{comp_plan_version_id:cp.id});
      }
      return json({ok:true,contract_version_id:contract.id,comp_ready:compReady});
    }

    if(action==="start_marketplace"){
      if(!isAgent)return json({error:"Agent access required"},403);
      const state=clean(body.state_code,2).toUpperCase();
      const track=await stateTrack(state);
      const {data:lic}=await admin.from("user_state_licenses").select("id,status").eq("user_id",actor.id).eq("state_code",state).eq("status","active").limit(1).maybeSingle();
      if(!lic)return json({error:"Verify your state license before Marketplace certification."},400);
      const marketplace=String(track.marketplace_type),trainingUrl=String(track.marketplace_url||"");
      const {error}=await admin.from("marketplace_certifications").upsert({
        user_id:actor.id,state_code:state,marketplace,plan_year:2027,status:"not_started",training_url:trainingUrl,
        metadata:{annual:true,required_for_aca_ready:true,source:"self_service_onboarding"}
      },{onConflict:"user_id,state_code,plan_year"});
      if(error)throw error;
      await step(actor.id,"marketplace",false,{state_code:state,status:"started",training_url:trainingUrl});
      return json({ok:true,state_code:state,marketplace,training_url:trainingUrl});
    }

    return json({error:"Unknown action"},400);
  }catch(e){
    return json({error:e instanceof Error?e.message:String(e)},500);
  }
});
