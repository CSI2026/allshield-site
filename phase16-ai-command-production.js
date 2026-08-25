(()=>{
'use strict';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
async function sb(){for(let i=0;i<100;i++){if(window.allshieldSupabase)return window.allshieldSupabase;await new Promise(r=>setTimeout(r,50));}throw new Error('Supabase is not initialized.');}
async function invoke(name,body){const c=await sb();const {data,error}=await c.functions.invoke(name,{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data;}
function host(role){return document.getElementById(role+'Main');}
function base(role){return `<div class="dashboard-head"><div><div class="kicker">${role==='owner'?'AI COMMAND CENTER':role==='admin'?'AI OPERATIONS':'ALLSHIELD AI ASSISTANT'}</div><h2>${role==='owner'?'Live AI across Allshield.':role==='admin'?'Live administrative AI.':'Your live Allshield AI assistant.'}</h2><p>Authenticated AI uses current Allshield records available to your role. Only current authorized Allshield records are used.</p></div></div><div class="real-data-banner">LIVE SUPABASE + SECURED AI</div>`;}
function outBox(){return `<div class="bo-card" style="margin-top:18px"><h3>AI Output</h3><div id="allshieldLiveAIOutput" class="ai-output" style="white-space:pre-wrap;min-height:120px">Choose an AI analysis below or ask a question.</div></div>`;}
function askBox(role){return `<div class="bo-card" style="margin-top:18px"><h3>Ask Allshield AI</h3><textarea id="allshieldLiveAIPrompt" class="mini-input" style="height:110px" placeholder="Ask about training, onboarding, licensing, performance, operations..."></textarea><button class="btn btn-primary" style="margin-top:10px" onclick="allshieldLiveAIAsk('${role}')">Ask</button></div>`;}
function cards(role){
 if(role==='agent')return '';
 const a=[['academy','▣','Academy AI','Analyze course completion, exam results, readiness and weak areas.'],['operations','◎','Operations AI','Review onboarding, licensing and account workflow health.'],['performance','↗','Performance AI','Analyze production and promotion signals from live records.'],['compliance','✓','Compliance AI','Review document acknowledgments and onboarding gaps.']];
 if(role==='owner')a.push(['marketing','✦','Marketing AI','Analyze the live content queue and prepare recommendations.'],['video','▶','Media AI','Review the live media library and prepare next actions.']);
 return `<div class="ai-command-grid" style="margin-top:18px">${a.map(x=>`<div class="ai-agent-card"><div class="ai-agent-icon">${x[1]}</div><h4>${x[2]}</h4><p>${x[3]}</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="allshieldRunLiveAI('${x[0]}','${role}')">Run Live Review</button></div></div>`).join('')}</div>`;
}
async function safeCount(c,table,select='*'){const r=await c.from(table).select(select,{count:'exact',head:true});return r.error?null:r.count;}
async function liveSnapshot(kind){
 const c=await sb();
 if(kind==='academy'){
   const [p,a,e,r,v,co]=await Promise.all([
     c.from('profiles').select('id,role,status,resident_state'),
     c.from('course_assignments').select('user_id,progress_percent,completed_at'),
     c.from('exam_attempts').select('user_id,state_code,score_percent,created_at').order('created_at',{ascending:false}).limit(500),
     c.from('academy_launch_readiness').select('state_code,launch_ready,end_to_end_tested'),
     c.from('academy_question_validations').select('validation_status,confidence'),
     c.from('courses').select('id,title,state_code,status')]);
   [p,a,e,r,v,co].forEach(x=>{if(x.error)throw x.error});
   const exams=e.data||[], assignments=a.data||[];
   return {active_agents:(p.data||[]).filter(x=>['agent','team_lead','manager'].includes(x.role)&&x.status!=='terminated').length,course_assignments:assignments.length,course_complete:assignments.filter(x=>Number(x.progress_percent)>=100).length,exam_attempts:exams.length,average_exam_score:exams.length?Number((exams.reduce((n,x)=>n+Number(x.score_percent||0),0)/exams.length).toFixed(1)):null,state_launch_readiness:r.data||[],verified_questions:(v.data||[]).filter(x=>x.validation_status==='verified'&&Number(x.confidence)>=.9).length,published_courses:(co.data||[]).filter(x=>x.status==='published').map(x=>({title:x.title,state:x.state_code||'CORE'}))};
 }
 if(kind==='operations'){
   const [p,o,l]=await Promise.all([c.from('profiles').select('id,role,status'),c.from('onboarding_progress').select('user_id,step_key,completed'),c.from('user_state_licenses').select('user_id,state_code,status,readiness_percent')]);[p,o,l].forEach(x=>{if(x.error)throw x.error});
   const steps=o.data||[], ids=[...new Set(steps.map(x=>x.user_id))];
   return {profiles:(p.data||[]).length,active:(p.data||[]).filter(x=>x.status==='active').length,onboarding_users:ids.length,incomplete_onboarding_steps:steps.filter(x=>!x.completed).length,licenses:(l.data||[]).length,licenses_ready:(l.data||[]).filter(x=>Number(x.readiness_percent)>=85).length};
 }
 if(kind==='performance'){
   const [en,pr]=await Promise.all([c.from('campaign_enrollments').select('agent_id,status,created_at'),c.from('promotion_qualification_snapshots').select('user_id,qualification_month,personal_enrollments,active_direct_agents,qualifies')]);[en,pr].forEach(x=>{if(x.error)throw x.error});
   return {enrollment_records:(en.data||[]).length,completed_enrollments:(en.data||[]).filter(x=>String(x.status).toLowerCase()==='completed').length,promotion_snapshots:(pr.data||[]).length,qualifying_snapshots:(pr.data||[]).filter(x=>x.qualifies).length};
 }
 if(kind==='compliance'){
   const [d,s,o]=await Promise.all([c.from('document_templates').select('id,title,status,requires_signature'),c.from('document_signatures').select('document_id,user_id,acknowledged,signed_at'),c.from('onboarding_progress').select('user_id,step_key,completed')]);[d,s,o].forEach(x=>{if(x.error)throw x.error});
   return {published_documents:(d.data||[]).filter(x=>x.status==='published').length,required_signature_documents:(d.data||[]).filter(x=>x.status==='published'&&x.requires_signature).length,signatures:(s.data||[]).length,acknowledged_signatures:(s.data||[]).filter(x=>x.acknowledged).length,incomplete_onboarding_steps:(o.data||[]).filter(x=>!x.completed).length};
 }
 if(kind==='marketing'){
   const {data,error}=await c.from('marketing_posts').select('status,created_at');if(error)throw error;return {posts:(data||[]).length,drafts:(data||[]).filter(x=>x.status==='draft').length,approved:(data||[]).filter(x=>x.status==='approved').length,published:(data||[]).filter(x=>x.status==='published').length};
 }
 if(kind==='video'){
   const {data,error}=await c.from('media_library').select('media_type,status,created_at');if(error)throw error;return {media_assets:(data||[]).length,published:(data||[]).filter(x=>x.status==='published').length,by_type:(data||[]).reduce((m,x)=>(m[x.media_type||'other']=(m[x.media_type||'other']||0)+1,m),{})};
 }
 return {};
}
async function render(role){const h=host(role);if(!h)return;h.dataset.aiLive='1';h.innerHTML=base(role)+cards(role)+askBox(role)+outBox();try{const st=await invoke('ai-provider-status',{});const banner=h.querySelector('.real-data-banner');if(banner)banner.textContent=st.configured?'LIVE SUPABASE + AI PROVIDER READY':'LIVE SUPABASE + AI PROVIDER NOT CONFIGURED';}catch(_){}}
window.allshieldRunLiveAI=async function(kind,role='owner'){
 const out=document.getElementById('allshieldLiveAIOutput');if(out)out.textContent='Reading live Allshield records…';
 try{const snap=await liveSnapshot(kind);const prompt=`You are Allshield ${kind} AI. Analyze only this live Allshield snapshot and do not invent facts. Give specific findings, risks, and next actions. Snapshot: ${JSON.stringify(snap)}`;const r=await invoke('ai-assistant',{action:'assist',prompt});if(out)out.textContent=r.text||'No AI response returned.';}catch(e){if(out)out.textContent='AI review failed: '+(e.message||e);}
};
window.allshieldLiveAIAsk=async function(role='owner'){
 const i=document.getElementById('allshieldLiveAIPrompt'),out=document.getElementById('allshieldLiveAIOutput');const q=i?.value.trim();if(!q)return;if(out)out.textContent='Working…';try{const r=await invoke('ai-assistant',{action:'assist',prompt:q,portal_role:role});if(out)out.textContent=r.text||'No AI response returned.';}catch(e){if(out)out.textContent='AI request failed: '+(e.message||e);}
};
function install(){
  if(typeof window.registerAllshieldView!=='function')return setTimeout(install,60);
  if(window.__allshieldLiveAIInstalled)return;
  window.__allshieldLiveAIInstalled=true;
  window.registerAllshieldView('owner','ai',()=>render('owner'));
  window.registerAllshieldView('admin','ai',()=>render('admin'));
  window.registerAllshieldView('agent','ai',()=>render('agent'));
  window.runAIAgent=(name)=>window.allshieldRunLiveAI(name,document.getElementById('ownerPortal')?.classList.contains('show')?'owner':'admin');
  window.sendAI=(role)=>window.allshieldLiveAIAsk(role);
}
install();
})();
