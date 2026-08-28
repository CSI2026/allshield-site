import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const DEFAULT_ONBOARDING=[["profile",1],["license",2],["standards",3],["training",4],["test",5]] as const;
const PRELICENSE_ONBOARDING=[["profile",1],["license_selection",2],["prelicensing_training",3],["state_exam",4],["license_verification",5],["contracting",6],["comp_setup",7],["marketplace",8],["ready",9]] as const;
const LICENSED_ONBOARDING=[["profile",1],["license_verification",2],["contracting",3],["comp_setup",4],["marketplace",5],["ready",6]] as const;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
function clean(v:unknown,max=160){return String(v??"").trim().slice(0,max)}
function namePart(v:unknown){const s=clean(v,80).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9]+/g,"").slice(0,20).toLowerCase();return s?s[0].toUpperCase()+s.slice(1):""}
function emailOk(v:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function tempPassword(first:string,last:string){return `${first[0]}${last[0]}${new Date().getFullYear()}AS`.toUpperCase()}
function welcomeText(first:string,username:string,password:string,internalEmail:string,contactEmail:string,licensing:string){
 const route=licensing==="licensed"
  ? "Licensed Agent route: license verification, contracting, compensation setup, Marketplace requirements, then production readiness."
  : "Pre-Licensing route: choose your resident-state track, complete assigned Life & Health training and licensing steps, then move into contracting, compensation setup, Marketplace requirements, and production readiness.";
 return `Hi ${first},\n\nWelcome to ALLSHIELD Insurance Group. Your Agent Portal account is ready.\n\nUsername: ${username}\nTemporary password: ${password}\nInternal ALLSHIELD login identity: ${internalEmail}\nContact email on file: ${contactEmail}\n\n${route}\n\nSign in at: https://allshieldinsurancegroup.com/\n\nKeep these temporary credentials private. If you need help accessing your account, reply to this email or contact ALLSHIELD onboarding.\n\nALLSHIELD Insurance Group\nonboarding@allshieldinsurancegroup.com`;
}

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
   const first=namePart(body.first_name),last=namePart(body.last_name),role=String(body.role||"agent");
   if(!first||!last)return json({error:"First name and last name are required."},400);
   let status=String(body.status||(role==="admin"?"active":"onboarding"));
   const residentState=clean(body.resident_state,2).toUpperCase()||null;
   const realEmail=clean(body.email,200).toLowerCase();
   const phone=clean(body.phone,60)||null;
   const licensingStatus=clean(body.licensing_status,40);
   const recruitingSource=clean(body.recruiting_source,160);
   if(!validRoles.includes(role)||role==="owner"||(!isOwner&&!adminRoles.includes(role)))return json({error:"You cannot create that role."},403);
   if(role==="agent")status="onboarding";
   if(role==="admin")status="active";
   if(!validStatuses.includes(status))return json({error:"Invalid status."},400);
   if(residentState&&!/^[A-Z]{2}$/.test(residentState))return json({error:"Resident state must be a 2-letter code."},400);
   if(role==="agent"&&!emailOk(realEmail))return json({error:"A valid contact email is required for manual agent onboarding."},400);
   if(role==="agent"&&!['licensed','not_licensed'].includes(licensingStatus))return json({error:"Select Licensed or Not Licensed."},400);
   if(role==="agent"&&!recruitingSource)return json({error:"Recruiting source is required for manual agent onboarding."},400);

   const baseDisplay=`${first}.${last}`;
   let displayUsername=baseDisplay,loginUsername=baseDisplay.toLowerCase();
   for(let i=1;i<100;i++){
     const {count}=await admin.from("profiles").select("id",{count:"exact",head:true}).ilike("username",displayUsername);
     if(!count)break;
     displayUsername=`${baseDisplay}.${i+1}`;
     loginUsername=displayUsername.toLowerCase();
   }
   const password=tempPassword(first,last);
   if(password.length<8)return json({error:"Generated temporary password did not meet ALLSHIELD security requirements."},500);
   const internalEmail=`${loginUsername}@allshield.internal`;
   const {data:created,error:createError}=await admin.auth.admin.createUser({
     email:internalEmail,password,email_confirm:true,
     user_metadata:{first_name:first,last_name:last,username:displayUsername,internal_email:internalEmail,contact_email:realEmail||null,recruiting_source:recruitingSource||null,licensing_status:licensingStatus||null}
   });
   if(createError||!created.user)return json({error:createError?.message||"Unable to create user"},400);
   const {error:profileError}=await admin.from("profiles").update({
     username:displayUsername,first_name:first,last_name:last,email:realEmail||null,phone,role,status,resident_state:residentState,
     department_id:body.department_id||null,manager_id:body.manager_id||null,updated_at:new Date().toISOString()
   }).eq("id",created.user.id);
   if(profileError){await admin.auth.admin.deleteUser(created.user.id);return json({error:profileError.message},400)}

   let onboardingPathway:string|null=null;
   if(role==="agent"){
    onboardingPathway=licensingStatus==="licensed"?"licensed_verification":"prelicensing";
    const steps=licensingStatus==="licensed"?LICENSED_ONBOARDING:PRELICENSE_ONBOARDING;
    const rows=steps.map(([step_key,step_order])=>({
      user_id:created.user!.id,step_key,step_order,completed:false,
      metadata:{pathway:onboardingPathway,licensing_status:licensingStatus,source:"manual_onboarding",recruiting_source:recruitingSource,contact_email:realEmail}
    }));
    const {error:onboardingError}=await admin.from("onboarding_progress").insert(rows);
    if(onboardingError){await admin.auth.admin.deleteUser(created.user.id);return json({error:onboardingError.message},400)}
   } else if(["team_lead","manager"].includes(role)){
    const rows=DEFAULT_ONBOARDING.map(([step_key,step_order])=>({user_id:created.user!.id,step_key,step_order,completed:false,metadata:{source:"direct_account_creation"}}));
    const {error:onboardingError}=await admin.from("onboarding_progress").insert(rows);
    if(onboardingError){await admin.auth.admin.deleteUser(created.user.id);return json({error:onboardingError.message},400)}
   }

   let notificationSent=false,notificationError:string|null=null;
   if(role==="agent"&&realEmail){
     try{
       const mailRes=await fetch(`${url}/functions/v1/ionos-mail`,{
         method:"POST",
         headers:{"Content-Type":"application/json",apikey:publishableKey,Authorization:authHeader},
         body:JSON.stringify({action:"send",from_address:"onboarding@allshieldinsurancegroup.com",to:realEmail,subject:`Welcome to ALLSHIELD, ${first}`,text:welcomeText(first,displayUsername,password,internalEmail,realEmail,licensingStatus)})
       });
       const raw=await mailRes.text();
       let mail:any={};try{mail=raw?JSON.parse(raw):{}}catch{mail={error:raw}}
       if(!mailRes.ok||mail.error)throw new Error(mail.error||`Mail service error ${mailRes.status}`);
       notificationSent=true;
     }catch(e){notificationError=e instanceof Error?e.message:String(e)}
   }

   const details={username:displayUsername,internal_email:internalEmail,contact_email:realEmail||null,role,status,resident_state:residentState,onboarding_pathway:onboardingPathway,licensing_status:licensingStatus||null,recruiting_source:recruitingSource||null,notification_sent:notificationSent,notification_error:notificationError};
   await admin.from("audit_log").insert({actor_id:actor.id,action:"team_user_created",object_type:"profile",object_id:created.user.id,details});
   if(role==="agent")await admin.from("audit_log").insert({actor_id:actor.id,action:"manual_agent_onboarded",object_type:"profile",object_id:created.user.id,details});
   return json({ok:true,user_id:created.user.id,username:displayUsername,temp_password:password,internal_email:internalEmail,contact_email:realEmail||null,role,status,onboarding_pathway:onboardingPathway,licensing_status:licensingStatus||null,recruiting_source:recruitingSource||null,notification_sent:notificationSent,notification_error:notificationError});
  }

  if(action==="update"){
   const userId=String(body.user_id||"");if(!userId)return json({error:"Missing user id"},400);
   const {data:target}=await admin.from("profiles").select("role").eq("id",userId).single();if(!target)return json({error:"User not found"},404);
   if(target.role==="owner"||(!isOwner&&target.role==="admin"))return json({error:"You cannot modify this account."},403);
   const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
   if(body.role!==undefined){if(!validRoles.includes(body.role)||body.role==="owner"||(!isOwner&&!adminRoles.includes(body.role)))return json({error:"You cannot assign that role."},403);patch.role=body.role;}
   if(body.status!==undefined){if(!validStatuses.includes(body.status))return json({error:"Invalid status"},400);patch.status=body.status;}
   if(body.first_name!==undefined)patch.first_name=String(body.first_name||"").trim()||null;
   if(body.last_name!==undefined)patch.last_name=String(body.last_name||"").trim()||null;
   if(body.email!==undefined){const e=clean(body.email,200).toLowerCase();if(e&&!emailOk(e))return json({error:"Invalid contact email."},400);patch.email=e||null;}
   if(body.phone!==undefined)patch.phone=clean(body.phone,60)||null;
   if(body.department_id!==undefined)patch.department_id=body.department_id||null;
   if(body.manager_id!==undefined)patch.manager_id=body.manager_id||null;
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