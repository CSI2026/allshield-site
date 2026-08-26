(function(){
'use strict';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let cache=null;
let currentAdminView='onboarding', currentOwnerView='academy';
async function sb(){if(window.allshieldSupabase)return window.allshieldSupabase;for(let i=0;i<60;i++){await sleep(100);if(window.allshieldSupabase)return window.allshieldSupabase;}throw new Error('Supabase connection unavailable.');}
async function invoke(action,payload={}){const c=await sb();const {data,error}=await c.functions.invoke('academy-admin',{body:{action,...payload}});if(error)throw error;if(data?.error){const e=new Error(data.error);e.details=data;e.status=409;throw e;}return data;}
async function roster(force=false){if(cache&&!force)return cache;cache=await invoke('roster');return cache;}
const who=u=>[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||u.email||'Agent';
const pill=(txt,good=false)=>`<span class="pill"${good?' style="border-color:rgba(70,220,150,.35);color:#7ee2b8"':''}>${esc(txt)}</span>`;
const load=main=>{main.innerHTML='<div class="bo-card"><h3>Loading live Academy data…</h3></div>';};
const fail=(main,e)=>{main.innerHTML=`<div class="bo-card"><h3>Academy data unavailable</h3><p>${esc(e?.message||e)}</p></div>`;};
function stepsHtml(u){const map=Object.fromEntries((u.onboarding||[]).map(x=>[x.step_key,x]));return ['profile','license','standards','training','test'].map(k=>`<span title="${esc(k)}" style="display:inline-block;margin:2px 3px;padding:4px 7px;border-radius:8px;border:1px solid rgba(255,255,255,.09);font-size:11px;${map[k]?.completed?'color:#72ddb1':'color:#7f93a8'}">${map[k]?.completed?'✓':'○'} ${esc(k)}</span>`).join('');}
function latestExam(u){const x=(u.recent_exams||[])[0];return x?`${Number(x.score_percent||0).toFixed(1)}% ${esc(x.exam_type||'exam')}`:'—';}
function activationMissing(u){const map=Object.fromEntries((u.onboarding||[]).map(x=>[x.step_key,!!x.completed]));return ['profile','license','standards','training','test'].filter(k=>!map[k]);}

async function renderOnboarding(main){load(main);try{const d=await roster(true);const users=d.users||[];main.innerHTML=`
<div class="dashboard-head"><div><div class="kicker">ONBOARDING CONTROL</div><h2>Agent launch control.</h2><p>Live course, licensing, exam and onboarding readiness. Records come directly from Supabase.</p></div><button class="btn btn-primary" onclick="allshieldAcademyRefresh()">Refresh</button></div>
<div class="real-data-banner">LIVE SUPABASE DATA • Automated training/test gates • Human standards approval</div>
<div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Agent</th><th>Status</th><th>State</th><th>Onboarding</th><th>Courses</th><th>Latest Exam</th><th>Actions</th></tr>${users.map(u=>`<tr>
<td><strong>${esc(who(u))}</strong><small style="display:block;color:#7f93a8">${esc(u.username||'')}</small></td>
<td>${pill(u.status||'—',u.status==='active')}</td><td>${esc(u.resident_state||'—')}</td>
<td><div>${Number(u.onboarding_percent||0)}%</div><div>${stepsHtml(u)}</div></td>
<td>${Number(u.course_percent||0)}%</td><td>${latestExam(u)}</td>
<td><div class="team-actions"><button class="tiny-btn" onclick="allshieldAcademyAssign('${u.id}')">Assign Required</button><button class="tiny-btn" onclick="allshieldAcademySync('${u.id}')">Sync Gates</button><button class="tiny-btn" onclick="allshieldStandardsReview('${u.id}',true)">Approve Standards</button><button class="tiny-btn" onclick="allshieldAcademyActivate('${u.id}')">Activate If Ready</button></div></td>
</tr>`).join('')||'<tr><td colspan="7">No agent accounts yet.</td></tr>'}</table></div>`;}catch(e){fail(main,e)}}

async function renderTests(main){load(main);try{const d=await roster(true);const users=d.users||[];const attempts=users.flatMap(u=>(u.recent_exams||[]).map(x=>({...x,_u:u}))).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));const ready=users.filter(u=>u.exam_ready).length;const avg=attempts.length?attempts.reduce((n,x)=>n+Number(x.score_percent||0),0)/attempts.length:null;main.innerHTML=`
<div class="dashboard-head"><div><div class="kicker">TESTS & SCORING</div><h2>Verified exam oversight.</h2><p>Scores come from the validated answer key. AI coaching cannot alter the score.</p></div><button class="btn btn-primary" onclick="allshieldAcademyRefresh()">Refresh</button></div>
<div class="real-data-banner">DETERMINISTIC GRADING • AI COACHING AFTER VERIFIED SCORE</div>
<div class="stat-grid" style="margin-top:18px"><div class="stat"><div class="label">RECENT ATTEMPTS</div><div class="value">${attempts.length}</div></div><div class="stat"><div class="label">AVG SCORE</div><div class="value">${avg===null?'—':avg.toFixed(1)+'%'}</div></div><div class="stat"><div class="label">EXAM READY</div><div class="value">${ready}</div></div></div>
<div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Agent</th><th>Exam</th><th>State</th><th>Score</th><th>Correct</th><th>Date</th></tr>${attempts.slice(0,75).map(x=>`<tr><td>${esc(who(x._u))}</td><td>${esc(x.exam_type||'Assessment')}</td><td>${esc(x.state_code||'—')}</td><td>${Number(x.score_percent||0).toFixed(1)}%</td><td>${Number(x.correct_count||0)}/${Number(x.question_count||0)}</td><td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join('')||'<tr><td colspan="6">No exam attempts yet.</td></tr>'}</table></div>`;}catch(e){fail(main,e)}}

async function renderCourses(main){load(main);try{const c=await sb();const [{data:courses,error:ce},{data:modules,error:me},{data:assignments,error:ae}]=await Promise.all([c.from('courses').select('id,title,category,state_code,version,status,created_at').order('created_at'),c.from('course_modules').select('id,course_id,module_order,title').order('module_order'),c.from('course_assignments').select('course_id,user_id,progress_percent,completed_at')]);if(ce)throw ce;if(me)throw me;if(ae)throw ae;main.innerHTML=`
<div class="dashboard-head"><div><div class="kicker">COURSE BUILDER</div><h2>Published Academy curriculum.</h2><p>Live curriculum inventory and assignment progress.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA • Published curriculum only is assigned to agents</div>
<div class="bo-card" style="margin-top:18px">${(courses||[]).map(x=>{const mods=(modules||[]).filter(m=>m.course_id===x.id);const as=(assignments||[]).filter(a=>a.course_id===x.id);const avg=as.length?Math.round(as.reduce((n,a)=>n+Number(a.progress_percent||0),0)/as.length):0;return `<div class="resource"><span><strong>${esc(x.title)}</strong><small style="display:block">${esc(x.category||'Course')} ${x.state_code?'• '+esc(x.state_code):''} • ${mods.length} modules • ${as.length} assigned • ${avg}% avg progress</small></span>${pill(x.status||'—',x.status==='published')}</div>`}).join('')||'No courses configured.'}</div>`;}catch(e){fail(main,e)}}

async function renderLicensing(main){load(main);try{const d=await roster(true);const users=d.users||[];main.innerHTML=`
<div class="dashboard-head"><div><div class="kicker">LICENSING OVERSIGHT</div><h2>Licensing and exam-readiness.</h2><p>Resident-state license records and Academy readiness gates.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
<div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Agent</th><th>Resident State</th><th>License Status</th><th>License #</th><th>Readiness</th><th>Exam Ready</th></tr>${users.map(u=>{const l=(u.licenses||[]).find(x=>String(x.state_code||'').toUpperCase()===String(u.resident_state||'').toUpperCase())||(u.licenses||[])[0]||{};return `<tr><td>${esc(who(u))}</td><td>${esc(u.resident_state||'—')}</td><td>${esc(l.status||'—')}</td><td>${esc(l.license_number||'—')}</td><td>${l.readiness_percent==null?'—':Number(l.readiness_percent)+'%'}</td><td>${u.exam_ready?pill('YES',true):pill('NOT YET')}</td></tr>`}).join('')||'<tr><td colspan="6">No agents yet.</td></tr>'}</table></div>`;}catch(e){fail(main,e)}}

async function renderOwnerAcademy(main){load(main);try{const c=await sb();const [r,tracks,ready,qv,ai]=await Promise.all([roster(true),c.from('academy_launch_tracks').select('*').order('priority'),c.from('academy_launch_readiness').select('*'),c.from('academy_question_validations').select('validation_status,confidence'),c.functions.invoke('ai-provider-status',{body:{}})]);if(tracks.error)throw tracks.error;if(ready.error)throw ready.error;if(qv.error)throw qv.error;const users=r.users||[];const rv=Object.fromEntries((ready.data||[]).map(x=>[x.state_code,x]));const verified=(qv.data||[]).filter(x=>x.validation_status==='verified').length;const review=(qv.data||[]).filter(x=>x.validation_status!=='verified').length;main.innerHTML=`
<div class="dashboard-head"><div><div class="kicker">ACADEMY GOVERNANCE</div><h2>Academy launch control.</h2><p>Curriculum, question validation, state readiness, AI status and agent progress.</p></div><button class="btn btn-primary" onclick="allshieldAcademyRefresh()">Refresh</button></div>
<div class="real-data-banner">TRUE MASTER • LIVE SUPABASE BACKEND</div>
<div class="stat-grid" style="margin-top:18px"><div class="stat"><div class="label">ACADEMY AGENTS</div><div class="value">${users.length}</div></div><div class="stat"><div class="label">VERIFIED QUESTIONS</div><div class="value">${verified}</div></div><div class="stat"><div class="label">NEEDS REVIEW</div><div class="value">${review}</div></div><div class="stat"><div class="label">AI PROVIDER</div><div class="value" style="font-size:18px">${ai.error?'CHECK':(ai.data?.configured?'READY':'NOT CONFIGURED')}</div></div></div>
<div class="bo-card" style="margin-top:18px"><h3>State Launch Tracks</h3><table class="admin-table"><tr><th>State</th><th>License Track</th><th>Marketplace</th><th>Blueprint</th><th>Study Guide</th><th>Questions</th><th>Simulations</th><th>End-to-End</th><th>Launch</th></tr>${(tracks.data||[]).map(t=>{const x=rv[t.state_code]||{};return `<tr><td>${esc(t.state_code)}</td><td>${esc(t.license_track||'—')}</td><td>${esc(t.marketplace_status||'—')}</td><td>${x.blueprint_ready?'✓':'○'}</td><td>${x.study_guide_ready?'✓':'○'}</td><td>${x.question_bank_ready?'✓':'○'}</td><td>${x.simulations_ready?'✓':'○'}</td><td>${x.end_to_end_tested?'✓':'○'}</td><td>${x.launch_ready?pill('READY',true):pill('BUILDING')}</td></tr>`}).join('')}</table></div>`;}catch(e){fail(main,e)}}


const US_STATES=[['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']];

async function renderOwnerStates(main){
  load(main);
  try{
    const c=await sb();
    const [licensesQ,profilesQ,tracksQ,readyQ]=await Promise.all([
      c.from('user_state_licenses').select('user_id,state_code,status,readiness_percent,license_number,expiration_date,is_resident'),
      c.from('profiles').select('id,status,role'),
      c.from('academy_launch_tracks').select('state_code,license_track,licensing_status,marketplace_type,marketplace_status,priority'),
      c.from('academy_launch_readiness').select('*')
    ]);
    [licensesQ,profilesQ,tracksQ,readyQ].forEach(x=>{if(x.error)throw x.error});
    const profiles=Object.fromEntries((profilesQ.data||[]).map(x=>[x.id,x]));
    const licenses=licensesQ.data||[],tracks=Object.fromEntries((tracksQ.data||[]).map(x=>[String(x.state_code).trim(),x])),ready=Object.fromEntries((readyQ.data||[]).map(x=>[String(x.state_code).trim(),x]));
    const rows=US_STATES.map(([code,state])=>{
      const ls=licenses.filter(x=>String(x.state_code||'').trim()===code && profiles[x.user_id]?.status!=='terminated');
      const active=ls.filter(x=>['active','licensed','approved'].includes(String(x.status||'').toLowerCase())).length;
      const avg=ls.length?Math.round(ls.reduce((n,x)=>n+Number(x.readiness_percent||0),0)/ls.length):0;
      const t=tracks[code],r=ready[code];
      return {code,state,total:ls.length,active,avg,t,r};
    });
    main.innerHTML=`
      <div class="dashboard-head"><div><div class="kicker">STATE LICENSING MATRIX</div><h2>All 50 states.</h2><p>Live team license coverage plus Academy rollout readiness for every state.</p></div><button class="btn btn-primary" id="stateMatrixRefresh">Refresh</button></div>
      <div class="real-data-banner">LIVE SUPABASE LICENSING + ACADEMY DATA</div>
      <div class="stat-grid" style="margin-top:18px"><div class="stat"><div class="label">STATES</div><div class="value">50</div></div><div class="stat"><div class="label">LICENSE RECORDS</div><div class="value">${licenses.length}</div></div><div class="stat"><div class="label">STATES WITH LICENSES</div><div class="value">${rows.filter(x=>x.total).length}</div></div><div class="stat"><div class="label">ACADEMY LAUNCH READY</div><div class="value">${rows.filter(x=>x.r?.launch_ready).length}</div></div></div>
      <div class="bo-card" style="margin-top:18px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h3 style="margin:0">State Matrix</h3><input id="stateMatrixSearch" class="mini-input" style="max-width:280px" placeholder="Search state"></div><div style="overflow:auto;margin-top:12px"><table class="admin-table"><thead><tr><th>State</th><th>License Records</th><th>Active / Licensed</th><th>Avg Readiness</th><th>Academy Track</th><th>Marketplace</th><th>Launch Readiness</th></tr></thead><tbody id="stateMatrixRows"></tbody></table></div></div>`;
    const paint=()=>{const q=(document.getElementById('stateMatrixSearch')?.value||'').toLowerCase();document.getElementById('stateMatrixRows').innerHTML=rows.filter(x=>(x.code+' '+x.state).toLowerCase().includes(q)).map(x=>`<tr><td><strong>${esc(x.code)}</strong><small style="display:block">${esc(x.state)}</small></td><td>${x.total}</td><td>${x.active}</td><td>${x.total?x.avg+'%':'—'}</td><td>${esc(x.t?.license_track||'Not configured')}</td><td>${esc(x.t?.marketplace_status||x.t?.marketplace_type||'Not configured')}</td><td>${x.r?.launch_ready?pill('READY',true):x.r?pill('BUILDING'):pill('NOT CONFIGURED')}</td></tr>`).join('');};
    document.getElementById('stateMatrixSearch').oninput=paint;
    document.getElementById('stateMatrixRefresh').onclick=()=>renderOwnerStates(main);
    paint();
  }catch(e){fail(main,e)}
}

window.allshieldAcademyRefresh=()=>{cache=null;const a=document.getElementById('adminMain'),o=document.getElementById('ownerMain');if(a&&a.offsetParent){if(currentAdminView==='tests')renderTests(a);else if(currentAdminView==='courses')renderCourses(a);else if(currentAdminView==='licensing')renderLicensing(a);else renderOnboarding(a);}if(o&&o.offsetParent){if(currentOwnerView==='testing')renderTests(o);else if(currentOwnerView==='states')renderOwnerStates(o);else renderOwnerAcademy(o);}};
window.allshieldAcademyAssign=async id=>{try{const r=await invoke('assign_required_courses',{user_id:id});cache=null;alert(`Required courses checked. New assignments: ${r.assigned_new}`);const m=document.getElementById('adminMain');if(m)renderOnboarding(m);}catch(e){alert(e.message||e)}};
window.allshieldAcademySync=async id=>{try{await invoke('sync_readiness',{user_id:id});cache=null;const m=document.getElementById('adminMain');if(m)renderOnboarding(m);}catch(e){alert(e.message||e)}};
window.allshieldStandardsReview=async(id,completed)=>{try{await invoke('set_step',{user_id:id,step_key:'standards',completed});cache=null;const m=document.getElementById('adminMain');if(m)renderOnboarding(m);}catch(e){alert(e.message||e)}};
window.allshieldAcademyActivate=async id=>{try{await invoke('activate_if_ready',{user_id:id});cache=null;alert('Agent activated.');const m=document.getElementById('adminMain');if(m)renderOnboarding(m);}catch(e){const d=e.details;alert(d?.missing_steps?`Not ready. Missing: ${d.missing_steps.join(', ')}`:(e.message||e))}};

function install(){
  if(typeof window.registerAllshieldView!=='function') return setTimeout(install,60);
  if(window.__allshieldAcademyAdminInstalled)return;
  window.__allshieldAcademyAdminInstalled=true;
  const adminMain=()=>document.getElementById('adminMain');
  const ownerMain=()=>document.getElementById('ownerMain');
  window.registerAllshieldView('admin','onboarding',()=>{currentAdminView='onboarding';return renderOnboarding(adminMain());});
  window.registerAllshieldView('admin','tests',()=>{currentAdminView='tests';return renderTests(adminMain());});
  window.registerAllshieldView('admin','courses',()=>{currentAdminView='courses';return renderCourses(adminMain());});
  window.registerAllshieldView('admin','licensing',()=>{currentAdminView='licensing';return renderLicensing(adminMain());});
  window.registerAllshieldView('owner','academy',()=>{currentOwnerView='academy';return renderOwnerAcademy(ownerMain());});
  window.registerAllshieldView('owner','states',()=>{currentOwnerView='states';return renderOwnerStates(ownerMain());});
}
install();
})();
