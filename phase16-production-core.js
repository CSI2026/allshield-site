(() => {
"use strict";

const VERSION="B2026.08.23.021";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const toastMsg=m=>{try{ if(typeof window.toast==='function') window.toast(m); else alert(m); }catch{alert(m)}};

async function sb(){
  for(let i=0;i<100;i++){
    if(window.allshieldSupabase) return window.allshieldSupabase;
    await new Promise(r=>setTimeout(r,50));
  }
  throw new Error("Supabase is not initialized.");
}

async function me(){
  const c=await sb();
  const {data,error}=await c.auth.getUser();
  if(error) throw error;
  return data.user;
}

async function invoke(name,body){
  const c=await sb();
  const {data,error}=await c.functions.invoke(name,{body});
  if(error) throw error;
  if(data?.error) throw new Error(data.error);
  return data;
}

function cleanLoginLabels(){
  $$('[data-backend-status]').forEach(el=>{
    if(window.allshieldSupabase){el.textContent='Supabase connected';el.classList.add('live');}
  });
}

window.loadProfile=async function(){
  try{
    const c=await sb(), u=await me();
    const {data,error}=await c.from('profiles')
      .select('first_name,last_name,phone,resident_state')
      .eq('id',u.id).single();
    if(error) throw error;
    const vals={First:data?.first_name||'',Last:data?.last_name||'',Phone:data?.phone||'',State:data?.resident_state||''};
    Object.entries(vals).forEach(([k,v])=>{const el=document.getElementById('pf'+k); if(el) el.value=v;});
  }catch(e){console.error(e);toastMsg('Unable to load profile: '+(e.message||e));}
};

window.saveProfile=async function(){
  try{
    const c=await sb(), u=await me();
    const patch={
      first_name:document.getElementById('pfFirst')?.value.trim()||null,
      last_name:document.getElementById('pfLast')?.value.trim()||null,
      phone:document.getElementById('pfPhone')?.value.trim()||null,
      resident_state:(document.getElementById('pfState')?.value.trim()||'').slice(0,2).toUpperCase()||null,
      updated_at:new Date().toISOString()
    };
    const {error}=await c.from('profiles').update(patch).eq('id',u.id);
    if(error) throw error;
    toastMsg('Profile saved.');
  }catch(e){console.error(e);toastMsg('Profile save failed: '+(e.message||e));}
};

window.loadChecklist=async function(){
  try{
    const c=await sb(),u=await me();
    const {data,error}=await c.from('onboarding_progress').select('step_key,completed').eq('user_id',u.id);
    if(error) throw error;
    const map=Object.fromEntries((data||[]).map(x=>[x.step_key,!!x.completed]));
    setTimeout(()=>$$('[data-ob]').forEach(el=>{el.checked=!!map[el.dataset.ob];}),0);
  }catch(e){console.error(e);}
};

window.saveChecklist=async function(){
  try{
    const c=await sb(),u=await me();
    const items=$$('[data-ob]').map((el,i)=>({
      user_id:u.id,step_key:el.dataset.ob,step_order:i+1,completed:!!el.checked,
      completed_at:el.checked?new Date().toISOString():null,metadata:{}
    }));
    if(!items.length) return toastMsg('No onboarding steps are on this page.');
    const {error}=await c.from('onboarding_progress').upsert(items,{onConflict:'user_id,step_key'});
    if(error) throw error;
    toastMsg('Onboarding progress saved.');
  }catch(e){console.error(e);toastMsg('Onboarding save failed: '+(e.message||e));}
};

window.saveSig=async function(){
  try{
    const c=await sb(),u=await me();
    const {data:doc,error:de}=await c.from('document_templates')
      .select('id,title').eq('status','published').eq('requires_signature',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
    if(de) throw de;
    if(!doc) throw new Error('No published signature document is configured.');
    const canvas=document.getElementById('sigCanvas');
    const signature_payload=canvas?.toDataURL?canvas.toDataURL('image/png'):null;
    const {data:p}=await c.from('profiles').select('first_name,last_name').eq('id',u.id).single();
    const typed_name=[p?.first_name,p?.last_name].filter(Boolean).join(' ');
    const {error}=await c.from('document_signatures').upsert({
      document_id:doc.id,user_id:u.id,typed_name,signature_payload,acknowledged:true,signed_at:new Date().toISOString()
    },{onConflict:'document_id,user_id'});
    if(error) throw error;
    toastMsg('Signature saved securely.');
  }catch(e){console.error(e);toastMsg('Signature save failed: '+(e.message||e));}
};

window.createCourse=async function(){
  const title=document.getElementById('courseTitle')?.value.trim();
  const body=document.getElementById('courseBody')?.value.trim()||'';
  if(!title) return toastMsg('Enter a module title first.');
  try{
    const c=await sb(),u=await me();
    const {data:course,error}=await c.from('courses').insert({title,category:'internal',version:1,status:'draft',created_by:u.id}).select('id').single();
    if(error) throw error;
    const {error:me}=await c.from('course_modules').insert({course_id:course.id,module_order:1,title,body});
    if(me) throw me;
    document.getElementById('courseTitle').value='';
    document.getElementById('courseBody').value='';
    toastMsg('Draft course created in Supabase.');
  }catch(e){console.error(e);toastMsg('Course creation failed: '+(e.message||e));}
};

async function renderAgentProduction(main){
  if(main.dataset.prodLive==='1') return; main.dataset.prodLive='1';
  try{
    const c=await sb(),u=await me();
    const [en,comp,exam]=await Promise.all([
      c.from('campaign_enrollments').select('id,status,created_at').eq('agent_id',u.id),
      c.from('comp_ledger').select('amount,status,payable_on').eq('user_id',u.id),
      c.from('exam_attempts').select('score_percent,created_at').eq('user_id',u.id)
    ]);
    [en,comp,exam].forEach(x=>{if(x.error)throw x.error});
    const enroll=en.data||[], ledger=comp.data||[], exams=exam.data||[];
    const earned=ledger.reduce((n,x)=>n+Number(x.amount||0),0);
    const avg=exams.length?Math.round(exams.reduce((n,x)=>n+Number(x.score_percent||0),0)/exams.length):null;
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">PRODUCTION</div><h2>Your live performance.</h2><p>Current production, earnings and exam activity from Allshield records.</p></div></div>
    <div class="real-data-banner">LIVE SUPABASE DATA</div>
    <div class="stat-grid" style="margin-top:18px">
      <div class="stat"><div class="label">ENROLLMENTS</div><div class="value">${enroll.length}</div></div>
      <div class="stat"><div class="label">LEDGER ENTRIES</div><div class="value">${ledger.length}</div></div>
      <div class="stat"><div class="label">RECORDED EARNINGS</div><div class="value">$${earned.toFixed(2)}</div></div>
      <div class="stat"><div class="label">AVG EXAM SCORE</div><div class="value">${avg===null?'—':avg+'%'}</div></div>
    </div>`;
  }catch(e){main.innerHTML=`<div class="bo-card">LIVE DATA ERROR: ${esc(e.message||e)}</div>`;}
}

function start(){
  cleanLoginLabels();
  if(typeof window.registerAllshieldView!=='function') return setTimeout(start,60);
  const A=()=>document.getElementById('agentMain');
  window.registerAllshieldView('agent','production',()=>renderAgentProduction(A()));
  console.log('Allshield production core canonical views registered',VERSION);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
