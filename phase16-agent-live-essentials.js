(()=>{
'use strict';
const VERSION='2026.08.28.002';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
async function sb(){for(let i=0;i<100;i++){if(window.allshieldSupabase)return window.allshieldSupabase;await new Promise(r=>setTimeout(r,50));}throw new Error('Supabase unavailable.');}
async function user(){const c=await sb();const {data,error}=await c.auth.getUser();if(error||!data.user)throw error||new Error('Sign in required.');return data.user;}
function h(){return document.getElementById('agentMain')}
function head(k,t,p){return `<div class="dashboard-head"><div><div class="kicker">${k}</div><h2>${t}</h2><p>${p}</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>`}
function agentStat(label,value,route,sub){return `<button type="button" class="stat agent-dashboard-stat" onclick="showAgentView('${route}',null)"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><small>${esc(sub)}</small></button>`}
function injectStyle(){if(document.getElementById('agentDashboardTileStyle'))return;const s=document.createElement('style');s.id='agentDashboardTileStyle';s.textContent=`.agent-dashboard-stat{color:inherit;text-align:left;width:100%;cursor:pointer;font:inherit;transition:.18s}.agent-dashboard-stat:hover{transform:translateY(-2px);border-color:rgba(123,202,255,.5);background:#10223a}.agent-dashboard-stat small{display:block;color:#7f93aa;margin-top:7px;font-size:10px}`;document.head.appendChild(s)}
async function licensing(){const c=await sb(),u=await user();const {data,error}=await c.from('user_state_licenses').select('*').eq('user_id',u.id).order('state_code');if(error)throw error;h().innerHTML=head('LICENSING CENTER','Your licensing readiness.','Current license and study records stored in Allshield.')+`<div class="bo-card" style="margin-top:18px">${(data||[]).length?(data||[]).map(x=>`<div class="resource"><span><strong>${esc(x.state_code)} — ${esc(x.license_type||'life_health')}</strong><small style="display:block">Status: ${esc(x.status||'—')}</small></span><span class="pill">${Number(x.readiness_percent||0)}%</span></div>`).join(''):'No license records yet.'}</div>`}
async function profile(){const c=await sb(),u=await user();const {data,error}=await c.from('profiles').select('first_name,last_name,phone,resident_state,username,status').eq('id',u.id).single();if(error)throw error;h().innerHTML=head('PROFILE & SETTINGS','Your account.','Changes save securely to your Allshield profile.')+`<div class="bo-card" style="margin-top:18px"><div class="bo-grid"><div><label>First Name</label><input id="pfFirst" class="mini-input" value="${esc(data.first_name||'')}"></div><div><label>Last Name</label><input id="pfLast" class="mini-input" value="${esc(data.last_name||'')}"></div><div><label>Phone</label><input id="pfPhone" class="mini-input" value="${esc(data.phone||'')}"></div><div><label>Resident State</label><input id="pfState" class="mini-input" maxlength="2" value="${esc(data.resident_state||'')}"></div></div><button class="btn btn-primary" style="margin-top:14px" onclick="saveProfile()">Save Profile</button></div>`}
async function docs(){const c=await sb(),u=await user();const [d,s]=await Promise.all([c.from('document_templates').select('id,title,category,version,requires_signature,status').eq('status','published').order('created_at'),c.from('document_signatures').select('document_id,acknowledged,signed_at').eq('user_id',u.id)]);if(d.error)throw d.error;if(s.error)throw s.error;const sm=new Map((s.data||[]).map(x=>[String(x.document_id),x]));h().innerHTML=head('DOCUMENTS & E-SIGN','Required documents.','Published Allshield documents and signature status.')+`<div class="bo-card" style="margin-top:18px">${(d.data||[]).length?(d.data||[]).map(x=>{const sig=sm.get(String(x.id));return `<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.category||'Document')} • Version ${esc(x.version||1)}</small></span>${x.requires_signature&&!sig?.acknowledged?`<button class="tiny-btn" onclick="allshieldAcknowledgeDoc('${esc(x.id)}','${esc(x.title)}')">Acknowledge & Sign</button>`:`<span class="pill">${x.requires_signature?'SIGNED':'AVAILABLE'}</span>`}</div>`}).join(''):'No published documents.'}</div>`}
window.allshieldAcknowledgeDoc=async function(id,title){try{const typed=prompt(`Type your full legal name to acknowledge and sign: ${title}`);if(!typed)return;const c=await sb(),u=await user();const {error}=await c.from('document_signatures').upsert({document_id:id,user_id:u.id,typed_name:typed.trim(),signature_payload:{type:'typed_acknowledgment',name:typed.trim()},acknowledged:true,signed_at:new Date().toISOString()},{onConflict:'document_id,user_id'});if(error)throw error;await docs();}catch(e){alert(e.message||e)}};
async function resources(){const c=await sb();const [d,co]=await Promise.all([c.from('document_templates').select('title,category,version,status,requires_signature').eq('status','published'),c.from('courses').select('title,category,state_code,status').eq('status','published')]);if(d.error)throw d.error;if(co.error)throw co.error;h().innerHTML=head('RESOURCES','Allshield resource library.','Current published documents and training resources.')+`<div class="bo-grid" style="margin-top:18px"><div class="bo-card"><h3>Documents</h3>${(d.data||[]).map(x=>`<div class="resource"><span>${esc(x.title)}</span><span class="pill">V${esc(x.version||1)}</span></div>`).join('')||'No documents.'}</div><div class="bo-card"><h3>Training</h3>${(co.data||[]).map(x=>`<div class="resource"><span>${esc(x.title)}</span><span class="pill">${esc(x.state_code||'CORE')}</span></div>`).join('')||'No courses.'}</div></div>`}
async function achievements(){const c=await sb(),u=await user();const [o,a,e,en]=await Promise.all([c.from('onboarding_progress').select('completed').eq('user_id',u.id),c.from('course_assignments').select('progress_percent').eq('user_id',u.id),c.from('exam_attempts').select('score_percent').eq('user_id',u.id),c.from('campaign_enrollments').select('id,status').eq('agent_id',u.id)]);[o,a,e,en].forEach(x=>{if(x.error)throw x.error});const on=(o.data||[]),as=(a.data||[]),ex=(e.data||[]),ep=(en.data||[]);const badges=[['🛡️','Foundation',on.length>0],['📘','Scholar',as.some(x=>Number(x.progress_percent)>=100)],['🎯','Ready',ex.some(x=>Number(x.score_percent)>=85)],['⭐','Producer',ep.some(x=>String(x.status).toLowerCase()==='completed')]];h().innerHTML=head('ACHIEVEMENTS','Your Allshield milestones.','Milestones are calculated from live onboarding, training, exams and production.')+`<div class="badge-grid" style="margin-top:18px">${badges.map(b=>`<div class="badge-card" style="opacity:${b[2]?1:.45}"><div class="medal">${b[0]}</div><strong>${b[1]}</strong><p style="font-size:11px">${b[2]?'Earned':'Not yet earned'}</p></div>`).join('')}</div>`}
async function dashboard(){
  const c=await sb(),u=await user();
  const [pr,on,lic,ex,en]=await Promise.all([
    c.from('profiles').select('first_name,last_name,username,email,status,resident_state').eq('id',u.id).maybeSingle(),
    c.from('onboarding_progress').select('completed').eq('user_id',u.id),
    c.from('user_state_licenses').select('state_code,status,readiness_percent').eq('user_id',u.id),
    c.from('exam_attempts').select('score_percent,created_at').eq('user_id',u.id).order('created_at',{ascending:false}).limit(20),
    c.from('campaign_enrollments').select('id,status,residual_eligible,submitted_at').eq('agent_id',u.id)
  ]);
  [pr,on,lic,ex,en].forEach(x=>{if(x.error)throw x.error});
  const profile=pr.data||{}, onboard=on.data||[], licenses=lic.data||[], exams=ex.data||[], enroll=en.data||[];
  const onboardingPct=onboard.length?Math.round(onboard.filter(x=>x.completed).length/onboard.length*100):0;
  const readiness=licenses.length?Math.round(licenses.reduce((n,x)=>n+Number(x.readiness_percent||0),0)/licenses.length):0;
  const latest=exams.length?Number(exams[0].score_percent):null;
  const qualified=enroll.filter(x=>x.residual_eligible||String(x.status).toLowerCase()==='qualified').length;
  const name=[profile.first_name,profile.last_name].filter(Boolean).join(' ')||profile.username||profile.email||'Agent';
  h().innerHTML=head('AGENT DASHBOARD',`Welcome, ${esc(name)}.`,'Your live onboarding, licensing, testing and production status.')+
  `<div class="real-data-banner">LIVE SUPABASE DATA • CLICK A TILE TO OPEN ITS WORK</div>
   <div class="stat-grid" style="margin-top:18px">
    ${agentStat('ONBOARDING',onboardingPct+'%','onboarding','Open your onboarding steps')}
    ${agentStat('LICENSE READINESS',readiness+'%','licensing','Open your licensing records')}
    ${agentStat('LATEST EXAM',latest===null?'—':latest+'%','tests','Open your testing history')}
    ${agentStat('QUALIFIED RECORDS',qualified,'production','Open your production records')}
   </div>
   <div class="bo-grid" style="margin-top:18px">
    <div class="bo-card"><h3>Licensing</h3><p>${licenses.length?licenses.map(x=>`${esc(x.state_code)} — ${esc(x.status)} (${Math.round(Number(x.readiness_percent||0))}%)`).join('<br>'):'No licensing records yet.'}</p></div>
    <div class="bo-card"><h3>Production</h3><p>${enroll.length} enrollment record(s) currently stored.</p></div>
   </div>`;
}
async function performance(){const c=await sb(),u=await user();const [en,ex]=await Promise.all([c.from('campaign_enrollments').select('id,status,created_at').eq('agent_id',u.id),c.from('exam_attempts').select('score_percent,created_at').eq('user_id',u.id)]);if(en.error)throw en.error;if(ex.error)throw ex.error;const complete=(en.data||[]).filter(x=>String(x.status).toLowerCase()==='completed').length,avg=(ex.data||[]).length?Math.round((ex.data||[]).reduce((n,x)=>n+Number(x.score_percent||0),0)/(ex.data||[]).length):null;h().innerHTML=head('PERFORMANCE & RANKINGS','Your live performance.','Current Allshield production and exam indicators.')+`<div class="stat-grid" style="margin-top:18px"><div class="stat"><div class="label">COMPLETED ENROLLMENTS</div><div class="value">${complete}</div></div><div class="stat"><div class="label">EXAM ATTEMPTS</div><div class="value">${(ex.data||[]).length}</div></div><div class="stat"><div class="label">AVG EXAM SCORE</div><div class="value">${avg===null?'—':avg+'%'}</div></div></div>`}
async function communications(){const c=await sb();const {data,error}=await c.from('company_communications').select('title,body,audience,status,published_at,created_at').eq('status','published').order('published_at',{ascending:false}).limit(50);if(error)throw error;h().innerHTML=head('COMPANY COMMUNICATIONS','Company announcements.','Published Allshield communications.')+`<div class="bo-card" style="margin-top:18px">${(data||[]).map(x=>`<div class="resource" style="align-items:flex-start"><span><strong>${esc(x.title)}</strong><small style="display:block;margin-top:5px">${esc(x.body)}</small></span><span class="pill">${x.published_at?new Date(x.published_at).toLocaleDateString():'PUBLISHED'}</span></div>`).join('')||'No published announcements.'}</div>`}
function install(){
  injectStyle();
  if(typeof window.registerAllshieldView!=='function')return setTimeout(install,60);
  if(window.__allshieldAgentLiveEssentials)return;
  window.__allshieldAgentLiveEssentials=true;
  const safe=(fn)=>()=>Promise.resolve(fn()).catch(err=>{const main=h();if(main)main.innerHTML=`<div class="bo-card"><h3>Unable to load this section</h3><p>${esc(err.message||err)}</p></div>`;});
  window.registerAllshieldView('agent','dashboard',safe(dashboard));
  window.registerAllshieldView('agent','licensing',safe(licensing));
  window.registerAllshieldView('agent','documents',safe(docs));
  window.registerAllshieldView('agent','resources',safe(resources));
  window.registerAllshieldView('agent','profile',safe(profile));
  window.registerAllshieldView('agent','achievements',safe(achievements));
  window.registerAllshieldView('agent','performance',safe(performance));
  window.registerAllshieldView('agent','communications',safe(communications));
  window.ALLSHIELD_AGENT_LIVE_ESSENTIALS_VERSION=VERSION;
}
install();
})();
