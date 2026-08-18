import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const DEFAULT_ONBOARDING=[["profile",1],["license",2],["standards",3],["training",4],["test",5]] as const;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const authHeader=req.headers.get("Authorization")||"";
  if(!authHeader.startsWith("Bearer "))return json({error:"Missing authorization"},401);
  const token=authHeader.slice(7);
  const publishableKeys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
  const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const url=Deno.env.get("SUPABASE_URL")!;
  const publishableKey=publishableKeys.default||Deno.env.get("SUPABASE_ANON_KEY")!;
  const secretKey=secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,publishableKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
  const {data:userData,error:userError}=await userClient.auth.getUser(token);
  if(userError||!userData.user)return json({error:"Invalid session"},401);
  const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:actor}=await admin.from("profiles").select("id,role,status").eq("id",userData.user.id).single();
  if(!actor||!["owner","admin"].includes(actor.role)||actor.status!=="active")return json({error:"Admin access required"},403);
  const isOwner=actor.role==="owner";
  const body=await req.json();
  const action=String(body.action||"");
  const validRoles=["owner","admin","manager","team_lead","agent","staff"];
  const adminRoles=["manager","team_lead","agent","staff"];
  const validStatuses=["invited","onboarding","active","inactive","terminated"];

  if(action==="create"){
   const username=String(body.username||"").trim().toLowerCase(),password=String(body.password||""),role=String(body.role||"agent"),status=String(body.status||"onboarding");
   const residentState=String(body.resident_state||"").trim().toUpperCase()||null;
   if(!/^[a-z0-9._-]{3,40}$/.test(username))return json({error:"Username must be 3-40 characters using letters, numbers, dot, underscore or hyphen."},400);
   if(password.length<8)return json({error:"Temporary password must be at least 8 characters."},400);
   if(!validRoles.includes(role)||role==="owner"||(!isOwner&&!adminRoles.includes(role)))return json({error:"You cannot create that role."},403);
   if(!validStatuses.includes(status))return json({error:"Invalid status."},400);
   if(residentState&&!/^[A-Z]{2}$/.test(residentState))return json({error:"Resident state must be a 2-letter code."},400);
   const email=`${username}@allshield.internal`;
   const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{first_name:body.first_name||"",last_name:body.last_name||"",username}});
   if(createError||!created.user)return json({error:createError?.message||"Unable to create user"},400);
   const {error:profileError}=await admin.from("profiles").update({username,first_name:body.first_name||null,last_name:body.last_name||null,role,status,resident_state:residentState,department_id:body.department_id||null,updated_at:new Date().toISOString()}).eq("id",created.user.id);
   if(profileError){await admin.auth.admin.deleteUser(created.user.id);return json({error:profileError.message},400)}
   if(["agent","team_lead","manager"].includes(role)){
    const rows=DEFAULT_ONBOARDING.map(([step_key,step_order])=>({user_id:created.user.id,step_key,step_order,completed:false,metadata:{}}));
    const {error:onboardingError}=await admin.from("onboarding_progress").upsert(rows,{onConflict:"user_id,step_key"});
    if(onboardingError){await admin.auth.admin.deleteUser(created.user.id);return json({error:onboardingError.message},400)}
    if(residentState){const {error:licenseError}=await admin.from("user_state_licenses").upsert({user_id:created.user.id,state_code:residentState,license_type:"life_health",is_resident:true,status:"studying",readiness_percent:0,metadata:{}},{onConflict:"user_id,state_code,license_type"});if(licenseError){await admin.auth.admin.deleteUser(created.user.id);return json({error:licenseError.message},400)}}
   }
   await admin.from("audit_log").insert({actor_id:actor.id,action:"team_user_created",object_type:"profile",object_id:created.user.id,details:{username,role,status,resident_state:residentState}});
   return json({ok:true,user_id:created.user.id,username,role,status});
  }

  if(action==="update"){
   const userId=String(body.user_id||"");if(!userId)return json({error:"Missing user id"},400);
   const {data:target}=await admin.from("profiles").select("role").eq("id",userId).single();if(!target)return json({error:"User not found"},404);
   if(target.role==="owner"||(!isOwner&&target.role==="admin"))return json({error:"You cannot modify this account."},403);
   const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
   if(body.role!==undefined){if(!validRoles.includes(body.role)||body.role==="owner"||(!isOwner&&!adminRoles.includes(body.role)))return json({error:"You cannot assign that role."},403);patch.role=body.role;}
   if(body.status!==undefined){if(!validStatuses.includes(body.status))return json({error:"Invalid status"},400);patch.status=body.status;}
   if(body.department_id!==undefined)patch.department_id=body.department_id||null;
   if(body.resident_state!==undefined){const s=String(body.resident_state||"").trim().toUpperCase()||null;if(s&&!/^[A-Z]{2}$/.test(s))return json({error:"Resident state must be a 2-letter code."},400);patch.resident_state=s;}
   const {error}=await admin.from("profiles").update(patch).eq("id",userId);if(error)return json({error:error.message},400);
   await admin.from("audit_log").insert({actor_id:actor.id,action:"team_user_updated",object_type:"profile",object_id:userId,details:patch});return json({ok:true});
  }

  if(action==="reset_password"){
   const userId=String(body.user_id||""),password=String(body.password||"");if(password.length<8)return json({error:"Password must be at least 8 characters."},400);
   const {data:target}=await admin.from("profiles").select("role").eq("id",userId).single();if(!target)return json({error:"User not found"},404);
   if(target.role==="owner"||(!isOwner&&target.role==="admin"))return json({error:"You cannot reset this account's password."},403);
   const {error}=await admin.auth.admin.updateUserById(userId,{password});if(error)return json({error:error.message},400);
   await admin.from("audit_log").insert({actor_id:actor.id,action:"team_password_reset",object_type:"profile",object_id:userId,details:{}});return json({ok:true});
  }

  if(action==="delete"){
   if(!isOwner)return json({error:"Only the Owner can delete accounts."},403);
   const userId=String(body.user_id||"");const {data:target}=await admin.from("profiles").select("role,username").eq("id",userId).single();if(!target)return json({error:"User not found"},404);if(target.role==="owner")return json({error:"Owner account cannot be deleted."},403);
   await admin.from("audit_log").insert({actor_id:actor.id,action:"team_user_deleted",object_type:"profile",object_id:userId,details:{username:target.username}});
   const {error}=await admin.auth.admin.deleteUser(userId);if(error)return json({error:error.message},400);return json({ok:true});
  }
  return json({error:"Unknown action"},400);
 }catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}
});
