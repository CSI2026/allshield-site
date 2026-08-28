import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type,apikey","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const clean=(v:unknown,max=120)=>String(v??"").trim().slice(0,max);

const ROUTES={
  prelicensing:[
    ["profile",1],["license_selection",2],["prelicensing_training",3],["state_exam",4],
    ["license_verification",5],["contracting",6],["comp_setup",7],["marketplace",8],["ready",9]
  ],
  licensed_verification:[
    ["profile",1],["license_verification",2],["contracting",3],["comp_setup",4],["marketplace",5],["ready",6]
  ]
} as const;

function tempPassword(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$",a=new Uint32Array(16);
  crypto.getRandomValues(a);
  return "AS-"+[...a].map(n=>chars[n%chars.length]).join("");
}
function slugName(v:string){
  return v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"").slice(0,30)||"agent";
}
function pathwayFor(status:string){
  return status==="licensed"?"licensed_verification":"prelicensing";
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
    const {data:u}=await userClient.auth.getUser(token);
    if(!u.user)return json({error:"Invalid session"},401);

    const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:actor}=await admin.from("profiles").select("id,role,status").eq("id",u.user.id).single();
    if(!actor||!["owner","admin"].includes(actor.role)||actor.status!=="active")return json({error:"Admin access required"},403);

    const body=await req.json();
    const appId=clean(body.application_id,80);
    if(!appId)return json({error:"Missing application id"},400);

    const {data:app,error:appErr}=await admin.from("career_applications").select("*").eq("id",appId).single();
    if(appErr||!app)return json({error:"Application not found"},404);
    if(app.converted_user_id||app.status==="converted")return json({error:"Application is already converted."},409);
    if(app.status!=="approved")return json({error:"Approve the application before onboarding."},400);

    const licensingStatus=["licensed","not_licensed","studying"].includes(String(app.licensing_status))
      ? String(app.licensing_status)
      : "not_licensed";
    const pathway=pathwayFor(licensingStatus);

    const parts=clean(app.full_name,120).split(/\s+/),first=parts.shift()||"Agent",last=parts.join(" ")||null;
    const base=slugName([first,last].filter(Boolean).join("."));
    let username=base;
    for(let i=1;i<100;i++){
      const {count}=await admin.from("profiles").select("id",{count:"exact",head:true}).ilike("username",username);
      if(!count)break;
      username=`${base}.${i+1}`;
    }

    const password=tempPassword(),authEmail=`${username}@allshield.internal`;
    const {data:created,error:createErr}=await admin.auth.admin.createUser({
      email:authEmail,password,email_confirm:true,
      user_metadata:{first_name:first,last_name:last||"",username,source_application_id:app.id,onboarding_pathway:pathway}
    });
    if(createErr||!created.user)return json({error:createErr?.message||"Unable to create Auth user"},400);

    const state=app.resident_state?String(app.resident_state).trim().toUpperCase():null;
    const {error:pErr}=await admin.from("profiles").update({
      username,first_name:first,last_name:last,email:app.email,phone:app.phone||null,
      role:"agent",status:"onboarding",resident_state:/^[A-Z]{2}$/.test(state||"")?state:null,updated_at:new Date().toISOString()
    }).eq("id",created.user.id);
    if(pErr){
      await admin.auth.admin.deleteUser(created.user.id);
      return json({error:pErr.message},400);
    }

    const routeRows=ROUTES[pathway as keyof typeof ROUTES].map(([step_key,step_order])=>({
      user_id:created.user!.id,step_key,step_order,completed:false,
      metadata:{pathway,licensing_status:licensingStatus,source:"career_conversion",application_id:app.id}
    }));
    const {error:obErr}=await admin.from("onboarding_progress").upsert(routeRows,{onConflict:"user_id,step_key"});
    if(obErr){
      await admin.auth.admin.deleteUser(created.user.id);
      return json({error:obErr.message},400);
    }

    await admin.from("career_applications").update({
      status:"converted",converted_user_id:created.user.id,converted_at:new Date().toISOString(),updated_at:new Date().toISOString()
    }).eq("id",app.id);

    const details={username,user_id:created.user.id,onboarding_pathway:pathway,licensing_status:licensingStatus};
    await admin.from("pipeline_activity").insert({
      entity_type:"career_application",entity_id:app.id,actor_id:actor.id,action:"onboarded_to_agent",details
    });
    await admin.from("audit_log").insert({
      actor_id:actor.id,action:"career_application_onboarded",object_type:"career_application",object_id:app.id,details
    });

    return json({ok:true,username,temp_password:password,user_id:created.user.id,onboarding_pathway:pathway,licensing_status:licensingStatus});
  }catch(e){
    return json({error:e instanceof Error?e.message:String(e)},500);
  }
});