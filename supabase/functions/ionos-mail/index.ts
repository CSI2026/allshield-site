import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-sync-key","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const SYNC_KEY="allshield-mail-sync-2026-08-19-a9c7f6d1";
const norm=(v:string)=>v.trim().toLowerCase();
const arr=(v:any)=>Array.isArray(v)?v:[];

function env(){const user=Deno.env.get("IONOS_EMAIL_USER"),pass=Deno.env.get("IONOS_EMAIL_PASSWORD"),imapHost=Deno.env.get("IONOS_IMAP_HOST"),smtpHost=Deno.env.get("IONOS_SMTP_HOST");if(!user||!pass||!imapHost||!smtpHost)throw new Error("IONOS mail secrets are incomplete");return{user,pass,imapHost,imapPort:Number(Deno.env.get("IONOS_IMAP_PORT")||993),smtpHost,smtpPort:Number(Deno.env.get("IONOS_SMTP_PORT")||465),tls:(Deno.env.get("IONOS_MAIL_TLS")||"true")==="true"}}
function admin(){return createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}})}
async function currentUser(req:Request){const ah=req.headers.get("Authorization")||"";if(!ah.startsWith("Bearer "))return null;const token=ah.slice(7);const c=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});const {data,error}=await c.auth.getUser(token);return error?null:data.user}
async function access(req:Request,mailboxId:string,send=false){const u=await currentUser(req);if(!u)return{ok:false,status:401,error:"Authentication required"};const a=admin();const {data:p}=await a.from("profiles").select("role,status").eq("id",u.id).maybeSingle();if(!p||["inactive","terminated"].includes(p.status))return{ok:false,status:403,error:"Account unavailable"};if(["owner","admin"].includes(p.role))return{ok:true,user:u,role:p.role};const {data:m}=await a.from("shared_mailbox_members").select("can_read,can_send").eq("mailbox_id",mailboxId).eq("user_id",u.id).maybeSingle();if(!m||!m.can_read||(send&&!m.can_send))return{ok:false,status:403,error:"Mailbox permission denied"};return{ok:true,user:u,role:p.role}}
function headerAddress(v:any){if(!v)return[];if(Array.isArray(v))return v.flatMap(headerAddress);if(typeof v==="string")return v.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[];if(v.value)return arr(v.value).map((x:any)=>x.address).filter(Boolean);return[]}
function subjectKey(s:string){return s.replace(/^\s*((re|fw|fwd):\s*)+/ig,"").trim().toLowerCase().slice(0,180)}

async function smtpSend(fromHeader:string,to:string,subject:string,text:string){
  const e=env();const c=await Deno.connectTls({hostname:e.smtpHost,port:e.smtpPort});const enc=new TextEncoder(),dec=new TextDecoder(),buf=new Uint8Array(16384);
  async function read(){let out="";while(true){const n=await c.read(buf);if(!n)break;out+=dec.decode(buf.subarray(0,n));const lines=out.split(/\r?\n/).filter(Boolean);if(lines.length&&/^\d{3} /.test(lines[lines.length-1]))break;if(out.length>65536)break}return out}
  async function cmd(s:string,ok:number[]){await c.write(enc.encode(s+"\r\n"));const r=await read();const code=Number(r.slice(0,3));if(!ok.includes(code))throw new Error(`SMTP ${code}: ${r.trim().slice(0,240)}`);return r}
  try{let g=await read();if(Number(g.slice(0,3))!==220)throw new Error(`SMTP greeting failed: ${g.slice(0,240)}`);await cmd("EHLO allshieldinsurancegroup.com",[250]);await cmd("AUTH LOGIN",[334]);await cmd(btoa(e.user),[334]);await cmd(btoa(e.pass),[235]);await cmd(`MAIL FROM:<${e.user}>`,[250]);await cmd(`RCPT TO:<${to}>`,[250,251]);await cmd("DATA",[354]);const cleanText=text.replace(/\r?\n\./g,"\n..");const msg=[`From: ${fromHeader}`,`To: ${to}`,`Subject: ${subject.replace(/[\r\n]+/g," ")}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@allshieldinsurancegroup.com>`,`MIME-Version: 1.0`,`Content-Type: text/plain; charset=UTF-8`,`Content-Transfer-Encoding: 8bit`,"",cleanText,"."].join("\r\n");await c.write(enc.encode(msg+"\r\n"));const r=await read();if(Number(r.slice(0,3))!==250)throw new Error(`SMTP send failed: ${r.trim().slice(0,240)}`);await cmd("QUIT",[221]).catch(()=>{})}finally{try{c.close()}catch{}}
}

async function syncInbox(){
  const a=admin(),e=env();
  const {data:mb,error:me}=await a.from("shared_mailboxes").select("id,email_address,config").eq("mailbox_key","info").eq("active",true).single();
  if(me||!mb)throw new Error(me?.message||"Mailbox not configured");
  const {data:run}=await a.from("mail_sync_runs").insert({mailbox_id:mb.id,status:"running"}).select("id").single();
  let fetched=0,inserted=0,agentLinked=0,aliasesActivated=0;
  try{
    const [{data:rules},{data:agentAliases}]=await Promise.all([
      a.from("mail_routing_rules").select("recipient_address,department_key,priority").eq("mailbox_id",mb.id).eq("active",true).order("priority"),
      a.from("agent_mail_aliases").select("id,user_id,alias_address,provider_status").eq("active",true).not("alias_address","is",null)
    ]);
    const routing=new Map((rules||[]).map((r:any)=>[norm(r.recipient_address),r.department_key]));
    const aliasMap=new Map((agentAliases||[]).filter((x:any)=>x.alias_address).map((x:any)=>[norm(x.alias_address),x]));
    const client=new ImapFlow({host:e.imapHost,port:e.imapPort,secure:e.tls,auth:{user:e.user,pass:e.pass},logger:false});
    await client.connect();const lock=await client.getMailboxLock("INBOX");
    try{
      const uids=await client.search({since:new Date(Date.now()-45*86400000)},{uid:true}) as number[];const recent=uids.slice(-300);
      if(recent.length){for await(const msg of client.fetch(recent,{uid:true,source:true,internalDate:true,envelope:true,flags:true},{uid:true})){
        fetched++;if(!msg.source)continue;const parsed=await simpleParser(msg.source as any);const extId=parsed.messageId||`ionos:${msg.uid}`;
        const {data:exists}=await a.from("email_messages").select("id").eq("external_message_id",extId).maybeSingle();if(exists)continue;
        const raw=msg.source.toString();
        const recipients=[...headerAddress(parsed.to),...headerAddress(parsed.cc),...headerAddress(parsed.headers.get("x-original-to")),...headerAddress(parsed.headers.get("delivered-to")),...headerAddress(parsed.headers.get("x-forwarded-to")),...headerAddress(raw.match(/^To:\s*(.+)$/im)?.[1]||"")].map(norm);
        let department="info";for(const r of recipients){if(routing.has(r)){department=routing.get(r)!;if(department!=="info")break}}
        const matchedAlias=recipients.map(r=>aliasMap.get(r)).find(Boolean) as any||null;
        const agentId=matchedAlias?.user_id||null;
        if(agentId){department="agent_operations";agentLinked++}
        const from=(parsed.from?.value?.[0]?.address||"").toLowerCase(),subj=parsed.subject||"(no subject)",ref=parsed.inReplyTo||arr(parsed.references)[0]||null;
        const baseThread=ref?`ref:${String(ref).slice(0,220)}`:`sub:${subjectKey(subj)}|${from}`;
        const threadKey=agentId?`agent:${agentId}|${baseThread}`:baseThread;
        let {data:th}=await a.from("email_threads").select("id,unread_count,agent_id").eq("mailbox_id",mb.id).eq("external_thread_id",threadKey).maybeSingle();
        const at=parsed.date?.toISOString()||msg.internalDate?.toISOString()||new Date().toISOString();
        if(!th){const ins=await a.from("email_threads").insert({mailbox_id:mb.id,external_thread_id:threadKey,subject:subj,contact_email:from||null,department_key:department,status:"open",last_message_at:at,unread_count:1,agent_id:agentId,metadata:{recipients,agent_alias:matchedAlias?.alias_address||null}}).select("id,unread_count,agent_id").single();if(ins.error)throw ins.error;th=ins.data}
        else{await a.from("email_threads").update({last_message_at:at,department_key:department,unread_count:Number(th.unread_count||0)+1,agent_id:agentId||th.agent_id||null,updated_at:new Date().toISOString()}).eq("id",th.id)}
        const insm=await a.from("email_messages").insert({thread_id:th.id,direction:"inbound",from_address:from||null,to_addresses:recipients,cc_addresses:headerAddress(parsed.cc).map(norm),body_text:parsed.text||null,body_html:typeof parsed.html==="string"?parsed.html:null,external_message_id:extId,subject:subj,sent_at:at,received_at:new Date().toISOString(),metadata:{imap_uid:msg.uid,department_key:department,flags:[...(msg.flags||[])],agent_id:agentId,agent_alias:matchedAlias?.alias_address||null}});if(insm.error)throw insm.error;
        if(agentId){
          const now=new Date().toISOString();
          if(matchedAlias.provider_status!=="active")aliasesActivated++;
          await a.from("agent_mail_aliases").update({provider_status:"active",last_verified_at:now,updated_at:now}).eq("id",matchedAlias.id);
          await a.from("agent_timeline_events").insert({user_id:agentId,event_type:"agent_email_received",title:"Agent operations email received",detail:subj,visibility:"internal",source:"ionos-mail",metadata:{thread_id:th.id,from_address:from,alias_address:matchedAlias.alias_address}});
        }
        inserted++;
      }}
    }finally{lock.release();await client.logout().catch(()=>{})}
    await a.from("mail_sync_runs").update({completed_at:new Date().toISOString(),status:"completed",fetched_count:fetched,inserted_count:inserted}).eq("id",run?.id);
    return{ok:true,fetched,inserted,agent_linked:agentLinked,aliases_activated:aliasesActivated,mailbox:mb.email_address};
  }catch(err){await a.from("mail_sync_runs").update({completed_at:new Date().toISOString(),status:"failed",fetched_count:fetched,inserted_count:inserted,error_text:err instanceof Error?err.message:String(err)}).eq("id",run?.id);throw err}
}

async function sendMail(req:Request,b:any){
  const a=admin();const {data:mb}=await a.from("shared_mailboxes").select("id,email_address,config").eq("mailbox_key","info").single();if(!mb)throw new Error("Mailbox missing");
  const ac:any=await access(req,mb.id,true);if(!ac.ok)return json({error:ac.error},ac.status);
  const to=norm(String(b.to||""));if(!to)return json({error:"Recipient required"},400);
  const sharedAliases=[mb.email_address,...arr(mb.config?.forwarded_aliases)].map(norm);
  const from=norm(String(b.from_address||mb.email_address));
  let agentAlias:any=null;
  if(!sharedAliases.includes(from)){
    const {data}=await a.from("agent_mail_aliases").select("id,user_id,alias_address,provider_status,active").eq("alias_address",from).eq("active",true).eq("provider_status","active").maybeSingle();
    agentAlias=data;
    if(!agentAlias)return json({error:"Agent sender identity is not verified for external mail"},400);
    if(b.thread_id){const {data:t}=await a.from("email_threads").select("agent_id").eq("id",String(b.thread_id)).maybeSingle();if(!t||t.agent_id!==agentAlias.user_id)return json({error:"Agent sender identity does not match this communication thread"},409)}
  }
  const subject=String(b.subject||"ALLSHIELD message"),text=String(b.text||"");await smtpSend(from,to,subject,text);
  if(b.thread_id){await a.from("email_messages").insert({thread_id:String(b.thread_id),direction:"outbound",from_address:from,to_addresses:[to],cc_addresses:[],body_text:text,subject,sent_by:ac.user.id,sent_at:new Date().toISOString(),metadata:{provider:"ionos",agent_alias_user_id:agentAlias?.user_id||null}});await a.from("email_threads").update({last_message_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",String(b.thread_id));if(agentAlias)await a.from("agent_timeline_events").insert({user_id:agentAlias.user_id,event_type:"agent_email_sent",title:"Agent operations email sent",detail:subject,visibility:"internal",source:"ionos-mail",actor_id:ac.user.id,metadata:{thread_id:String(b.thread_id),to_address:to,alias_address:from}})}
  return json({ok:true,sent:true,from,to});
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{const b=await req.json(),action=String(b.action||"status");
    if(action==="sync"){if(req.headers.get("x-sync-key")!==SYNC_KEY){const u=await currentUser(req);if(!u)return json({error:"Forbidden"},403)}return json(await syncInbox())}
    if(action==="roundtrip"){if(req.headers.get("x-sync-key")!==SYNC_KEY)return json({error:"Forbidden"},403);const e=env();await smtpSend(e.user,e.user,"ALLSHIELD Communications Hub self-test",`Automated mail roundtrip test ${new Date().toISOString()}`);await new Promise(r=>setTimeout(r,5000));const sync=await syncInbox();return json({ok:true,sent_to_self:true,sync})}
    if(action==="send")return await sendMail(req,b);
    const a=admin(),{data:mb}=await a.from("shared_mailboxes").select("id,email_address,config").eq("mailbox_key","info").single();if(!mb)return json({error:"Mailbox missing"},404);const ac:any=await access(req,mb.id,false);if(!ac.ok)return json({error:ac.error},ac.status);const {count}=await a.from("agent_mail_aliases").select("id",{count:"exact",head:true}).eq("active",true).eq("provider_status","active");return json({ok:true,configured:true,email_address:mb.email_address,aliases:mb.config?.forwarded_aliases||[],verified_agent_aliases:count||0})
  }catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}
});