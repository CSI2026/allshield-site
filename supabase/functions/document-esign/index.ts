import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@^2/cors";

const cors={...sdkCorsHeaders,"Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clean=(v:unknown,max=240)=>String(v??"").trim().slice(0,max);
const AGENT_ROLES=["agent","team_lead","manager"];
const CONSENT_TEXT="I consent to receive and use this document electronically and to use an electronic signature for this transaction. I intend my electronic signature to be legally binding for this exact document version.";

async function sha256(v:string){const b=new TextEncoder().encode(v);const h=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function ipFrom(req:Request){const raw=(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"").split(",")[0].trim();return raw||null;}

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
    const {data:actor,error:ae}=await admin.from("profiles").select("id,email,first_name,last_name,role,status,resident_state,phone").eq("id",ud.user.id).single();
    if(ae||!actor)return json({error:"Profile not found"},404);
    const body=await req.json().catch(()=>({}));
    const action=clean(body.action,60)||"get_context";
    const isOwner=actor.role==="owner"&&actor.status==="active";
    const isStaff=["owner","admin"].includes(actor.role)&&actor.status==="active";
    const isAgent=AGENT_ROLES.includes(actor.role)&&["onboarding","active"].includes(actor.status);

    const allowedDocs=async()=>{
      const {data,error}=await admin.from("document_templates").select("id,title,category,body,version,status,required_roles,requires_signature,effective_at,onboarding_required,requires_verified_license,requires_countersign,sort_order").eq("status","published").order("sort_order").order("version",{ascending:false});
      if(error)throw error;
      return (data||[]).filter((d:any)=>d.required_roles?.includes("all")||d.required_roles?.includes(actor.role));
    };
    const activeLicenses=async(userId:string)=>{const {data,error}=await admin.from("user_state_licenses").select("state_code,license_type,license_number,expiration_date,status").eq("user_id",userId).eq("status","active").order("state_code");if(error)throw error;return data||[];};
    const syncOnboarding=async(userId:string)=>{
      const {data:profile}=await admin.from("profiles").select("role").eq("id",userId).maybeSingle();
      if(!profile||!AGENT_ROLES.includes(profile.role))return {complete:false,required:0,executed:0};
      const {data:docs,error:de}=await admin.from("document_templates").select("id,required_roles,requires_countersign").eq("status","published").eq("onboarding_required",true);
      if(de)throw de;
      const required=(docs||[]).filter((d:any)=>d.required_roles?.includes("all")||d.required_roles?.includes(profile.role));
      const ids=required.map((d:any)=>d.id);
      let sigs:any[]=[];
      if(ids.length){const {data,error}=await admin.from("document_signatures").select("id,document_id").eq("user_id",userId).in("document_id",ids);if(error)throw error;sigs=data||[];}
      let counters:any[]=[];
      if(sigs.length){const {data,error}=await admin.from("document_countersignatures").select("signature_id").in("signature_id",sigs.map((s:any)=>s.id));if(error)throw error;counters=data||[];}
      const counterSet=new Set(counters.map((c:any)=>c.signature_id));
      const sigByDoc=new Map(sigs.map((s:any)=>[s.document_id,s]));
      const executed=required.filter((d:any)=>{const s:any=sigByDoc.get(d.id);return !!s&&(!d.requires_countersign||counterSet.has(s.id));}).length;
      const complete=required.length>0&&executed===required.length;
      const {data:step}=await admin.from("onboarding_progress").select("id,metadata").eq("user_id",userId).eq("step_key","contracting").maybeSingle();
      if(step){await admin.from("onboarding_progress").update({completed:complete,completed_at:complete?new Date().toISOString():null,metadata:{...(step.metadata||{}),esign_required:required.length,esign_executed:executed,esign_status:complete?"fully_executed":"in_progress"}}).eq("id",step.id);}
      return {complete,required:required.length,executed};
    };

    if(action==="get_context"){
      if(!isAgent)return json({error:"Agent access required"},403);
      const docs=await allowedDocs(),licenses=await activeLicenses(actor.id),ids=docs.map((d:any)=>d.id);
      let sigs:any[]=[];if(ids.length){const {data,error}=await admin.from("document_signatures").select("*").eq("user_id",actor.id).in("document_id",ids);if(error)throw error;sigs=data||[];}
      let counters:any[]=[];if(sigs.length){const {data,error}=await admin.from("document_countersignatures").select("*").in("signature_id",sigs.map((s:any)=>s.id));if(error)throw error;counters=data||[];}
      const sigByDoc=new Map(sigs.map((s:any)=>[s.document_id,s])),counterBySig=new Map(counters.map((c:any)=>[c.signature_id,c]));
      return json({ok:true,actor,has_active_license:licenses.length>0,active_licenses:licenses,documents:docs.map((d:any)=>{const s:any=sigByDoc.get(d.id);return {...d,can_sign:!d.requires_verified_license||licenses.length>0,signature:s||null,countersign:s?counterBySig.get(s.id)||null:null};})});
    }

    if(action==="staff_context"){
      if(!isStaff)return json({error:"Owner/Admin access required"},403);
      const [{data:docs,error:de},{data:sigs,error:se}]=await Promise.all([
        admin.from("document_templates").select("id,title,version,status,requires_countersign").eq("status","published").order("sort_order"),
        admin.from("document_signatures").select("id,user_id,document_id,typed_name,document_title_snapshot,document_version_snapshot,signer_email,signed_at,status").order("signed_at",{ascending:false}).limit(250)
      ]);if(de)throw de;if(se)throw se;
      const signatures=sigs||[],sigIds=signatures.map((s:any)=>s.id),userIds=[...new Set(signatures.map((s:any)=>s.user_id))];
      let counters:any[]=[];if(sigIds.length){const {data,error}=await admin.from("document_countersignatures").select("signature_id,signed_at").in("signature_id",sigIds);if(error)throw error;counters=data||[];}
      let people:any[]=[];if(userIds.length){const {data,error}=await admin.from("profiles").select("id,email,first_name,last_name").in("id",userIds);if(error)throw error;people=data||[];}
      const counterSet=new Set(counters.map((c:any)=>c.signature_id)),peopleMap=new Map(people.map((p:any)=>[p.id,p]));
      const records=signatures.map((s:any)=>{const p:any=peopleMap.get(s.user_id);return {...s,signer_name:[p?.first_name,p?.last_name].filter(Boolean).join(" ")||s.typed_name,signer_email:p?.email||s.signer_email,countersigned:counterSet.has(s.id)};});
      return json({ok:true,published_documents:(docs||[]).length,total_signatures:records.length,pending_countersignatures:records.filter((r:any)=>!r.countersigned).length,fully_executed:records.filter((r:any)=>r.countersigned).length,records});
    }

    if(action==="get_record"){
      const id=clean(body.signature_id,80);if(!id)return json({error:"signature_id is required"},400);
      const {data:s,error:se}=await admin.from("document_signatures").select("*").eq("id",id).maybeSingle();if(se)throw se;if(!s)return json({error:"Signature record not found"},404);
      if(!isStaff&&s.user_id!==actor.id)return json({error:"Access denied"},403);
      const [{data:c,error:ce},{data:p,error:pe},{data:events,error:ee}]=await Promise.all([
        admin.from("document_countersignatures").select("*").eq("signature_id",id).maybeSingle(),
        admin.from("profiles").select("id,email,first_name,last_name,role").eq("id",s.user_id).maybeSingle(),
        admin.from("document_signature_events").select("event_type,actor_user_id,metadata,created_at").eq("signature_id",id).order("created_at")
      ]);if(ce)throw ce;if(pe)throw pe;if(ee)throw ee;
      return json({ok:true,signature:s,countersignature:c||null,signer:p||null,events:events||[]});
    }

    if(action==="sign"){
      if(!isAgent)return json({error:"Agent access required"},403);
      const documentId=clean(body.document_id,80),typed=clean(body.typed_name,140),npn=clean(body.npn,80),licensesText=clean(body.license_numbers,400),sig=String(body.signature_data_url||"");
      if(typed.length<3)return json({error:"Full legal name is required"},400);
      if(!npn)return json({error:"NPN is required"},400);
      if(body.acknowledged_terms!==true||body.consent_electronic_records!==true||body.intent_to_sign!==true)return json({error:"All electronic-signature acknowledgments are required"},400);
      if(!sig.startsWith("data:image/png;base64,")||sig.length<200||sig.length>1200000)return json({error:"Draw a valid signature in the signature box"},400);
      const {data:doc,error:de}=await admin.from("document_templates").select("*").eq("id",documentId).eq("status","published").maybeSingle();if(de)throw de;if(!doc)return json({error:"Published document not found"},404);
      if(!(doc.required_roles?.includes("all")||doc.required_roles?.includes(actor.role)))return json({error:"This document is not assigned to your role"},403);
      const licenses=await activeLicenses(actor.id);if(doc.requires_verified_license&&licenses.length===0)return json({error:"A verified active license is required before signing this document"},400);
      const {data:existing}=await admin.from("document_signatures").select("id").eq("document_id",doc.id).eq("user_id",actor.id).maybeSingle();if(existing)return json({error:"This exact document version is already signed"},409);
      const docHash=await sha256(doc.body),client=(body.client&&typeof body.client==="object")?body.client:{},ip=ipFrom(req),ua=req.headers.get("user-agent")||"";
      const {data:inserted,error:ie}=await admin.from("document_signatures").insert({document_id:doc.id,user_id:actor.id,typed_name:typed,signature_payload:{signature_data_url:sig,method:"drawn",npn,license_numbers:licensesText,acknowledged_terms:true,consent_version:"2026-08-28-v1",client},acknowledged:true,signed_at:new Date().toISOString(),document_title_snapshot:doc.title,document_version_snapshot:doc.version,document_body_snapshot:doc.body,document_body_sha256:docHash,signer_email:actor.email,signer_role:actor.role,consent_text:CONSENT_TEXT,consent_electronic_records:true,intent_to_sign:true,signer_ip:ip,signer_user_agent:ua,status:"signed"}).select("*").single();
      if(ie)throw ie;
      await admin.from("document_signature_events").insert({signature_id:inserted.id,event_type:"agent_signed",actor_user_id:actor.id,metadata:{document_id:doc.id,document_version:doc.version,document_sha256:docHash,ip_present:!!ip,user_agent_present:!!ua}});
      const onboarding=await syncOnboarding(actor.id);
      return json({ok:true,signature_id:inserted.id,fully_executed:onboarding.complete,onboarding});
    }

    if(action==="countersign"){
      if(!isOwner)return json({error:"Owner access required"},403);
      if(body.authorize!==true)return json({error:"Explicit Owner authorization is required"},400);
      const id=clean(body.signature_id,80);if(!id)return json({error:"signature_id is required"},400);
      const {data:s,error:se}=await admin.from("document_signatures").select("id,user_id,document_id,document_title_snapshot,document_version_snapshot,document_body_sha256").eq("id",id).maybeSingle();if(se)throw se;if(!s)return json({error:"Signature record not found"},404);
      const {data:existing}=await admin.from("document_countersignatures").select("id").eq("signature_id",id).maybeSingle();if(existing)return json({error:"This signature record is already countersigned"},409);
      const {data:ownerSig,error:oe}=await admin.from("owner_signature_profiles").select("typed_name,title,company_name,signature_data_url,updated_at").eq("user_id",actor.id).maybeSingle();if(oe)throw oe;if(!ownerSig?.signature_data_url)return json({error:"Save your Owner signature profile before countersigning agreements"},400);
      const ip=ipFrom(req),ua=req.headers.get("user-agent")||"";
      const {data:c,error:ce}=await admin.from("document_countersignatures").insert({signature_id:id,owner_user_id:actor.id,typed_name:ownerSig.typed_name,title:ownerSig.title,company_name:ownerSig.company_name,signature_data_url:ownerSig.signature_data_url,signer_ip:ip,signer_user_agent:ua,audit_payload:{authorization:"explicit_owner_action",owner_signature_profile_updated_at:ownerSig.updated_at,document_sha256:s.document_body_sha256},signed_at:new Date().toISOString()}).select("*").single();if(ce)throw ce;
      await admin.from("document_signature_events").insert({signature_id:id,event_type:"owner_countersigned",actor_user_id:actor.id,metadata:{document_id:s.document_id,document_version:s.document_version_snapshot,document_sha256:s.document_body_sha256,authorization:"explicit"}});
      const onboarding=await syncOnboarding(s.user_id);
      return json({ok:true,countersignature_id:c.id,onboarding});
    }

    return json({error:"Unknown action"},400);
  }catch(e){return json({error:e instanceof Error?e.message:String(e)},500);}
});