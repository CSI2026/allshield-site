(()=>{
'use strict';
const VERSION='2026.08.28.001';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=d=>d?new Date(d).toLocaleString():'—';
const sb=()=>window.allshieldSupabase;
const licLabel=s=>s==='licensed'?'Licensed':'Not Licensed';
const route=s=>s==='licensed'?'License Verification':'Pre-Licensing';
const human=v=>String(v??'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

function injectStyles(){
  if($('#allshieldCareerApplicationDetailStyle'))return;
  const s=document.createElement('style');
  s.id='allshieldCareerApplicationDetailStyle';
  s.textContent=`
    .as-applicant-link{appearance:none;border:0;background:transparent;color:#fff;font:inherit;font-weight:800;padding:0;cursor:pointer;text-align:left;text-decoration:underline;text-decoration-color:rgba(119,200,255,.55);text-underline-offset:3px}
    .as-applicant-link:hover,.as-applicant-link:focus-visible{color:#7bcaff;outline:none;text-decoration-color:#7bcaff}
    .as-applicant-hint{display:block;color:#6faedc;font-size:10px;margin-top:4px;letter-spacing:.02em}
    .as-app-file-overlay{position:fixed;inset:0;z-index:9200;background:rgba(2,7,14,.82);backdrop-filter:blur(8px);display:none;align-items:flex-start;justify-content:center;padding:30px 18px;overflow:auto}
    .as-app-file-overlay.show{display:flex}
    .as-app-file{width:min(980px,100%);background:linear-gradient(180deg,#0d1b2e,#081321);border:1px solid rgba(119,200,255,.28);border-radius:24px;box-shadow:0 28px 100px rgba(0,0,0,.55);overflow:hidden}
    .as-app-file-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:24px 26px;border-bottom:1px solid rgba(255,255,255,.09);background:rgba(17,46,77,.45)}
    .as-app-file-head h2{font-family:Georgia,'Times New Roman',serif;font-size:32px;margin:5px 0 6px}.as-app-file-head p{margin:0;color:#91a5ba}
    .as-app-file-close{border:1px solid rgba(255,255,255,.14);background:#0b1a2c;color:#fff;border-radius:999px;width:38px;height:38px;font-size:22px;cursor:pointer;flex:none}
    .as-app-file-body{padding:24px 26px 28px}.as-app-section{border:1px solid rgba(255,255,255,.08);background:#0b1829;border-radius:18px;padding:18px;margin-bottom:16px}
    .as-app-section h3{font-family:Georgia,'Times New Roman',serif;font-size:21px;margin:0 0 14px}.as-app-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px}
    .as-app-field{padding:11px 0;border-bottom:1px solid rgba(255,255,255,.065)}.as-app-field .label{display:block;color:#7790a8;text-transform:uppercase;letter-spacing:.09em;font-size:9px;font-weight:800;margin-bottom:5px}.as-app-field .value{color:#eaf2fb;font-size:13px;line-height:1.45;overflow-wrap:anywhere}
    .as-app-notes{white-space:pre-wrap;color:#dce7f2;line-height:1.6;font-size:13px}.as-app-activity{display:grid;gap:9px}.as-app-event{padding:12px 13px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:#071321}.as-app-event strong{display:block;font-size:12px}.as-app-event small{display:block;color:#8198ae;margin-top:4px}.as-app-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
    .as-app-loading{padding:44px 24px;text-align:center;color:#a8bbcf}.as-app-error{padding:22px;color:#ffb3b3}.as-app-system-note{font-size:11px;color:#7f96ac;line-height:1.55;margin-top:8px}
    @media(max-width:700px){.as-app-file-overlay{padding:12px 8px}.as-app-file-head,.as-app-file-body{padding:18px}.as-app-file-head h2{font-size:26px}.as-app-grid{grid-template-columns:1fr}.as-app-actions .btn,.as-app-actions .tiny-btn{width:100%;justify-content:center}}
  `;
  document.head.appendChild(s);
}

function ensureModal(){
  injectStyles();
  let overlay=$('#asCareerApplicationFile');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.id='asCareerApplicationFile';
  overlay.className='as-app-file-overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Career application file');
  overlay.innerHTML='<div class="as-app-file" onclick="event.stopPropagation()"><div id="asCareerApplicationFileContent" class="as-app-loading">Loading complete application…</div></div>';
  overlay.addEventListener('click',()=>window.asCloseCareerApplication());
  document.body.appendChild(overlay);
  return overlay;
}

window.asCloseCareerApplication=()=>{
  const overlay=$('#asCareerApplicationFile');
  if(overlay)overlay.classList.remove('show');
};

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#asCareerApplicationFile.show'))window.asCloseCareerApplication()});

function field(label,value){
  const display=value===null||value===undefined||value===''?'Not provided':value;
  return `<div class="as-app-field"><span class="label">${esc(label)}</span><span class="value">${esc(display)}</span></div>`;
}

async function resolvePeople(app){
  const ids=[app.assigned_to,app.converted_user_id].filter(Boolean);
  if(!ids.length)return {};
  try{
    const {data,error}=await sb().from('profiles').select('id,first_name,last_name,username,email,role,status').in('id',ids);
    if(error)return {};
    return Object.fromEntries((data||[]).map(p=>[p.id,([p.first_name,p.last_name].filter(Boolean).join(' ')||p.username||p.email||p.id)]));
  }catch{return {}}
}

window.asOpenCareerApplication=async id=>{
  const overlay=ensureModal(),content=$('#asCareerApplicationFileContent');
  overlay.classList.add('show');
  content.className='as-app-loading';
  content.innerHTML='Loading complete application…';
  try{
    const c=sb();if(!c)throw new Error('ALLSHIELD connection is not ready.');
    const aq=await c.from('career_applications').select('*').eq('id',id).single();
    if(aq.error)throw aq.error;
    const app=aq.data;
    let activity=[];
    try{
      const q=await c.from('pipeline_activity').select('*').eq('entity_type','career_application').eq('entity_id',id).order('created_at',{ascending:false}).limit(100);
      if(!q.error)activity=q.data||[];
    }catch{}
    const people=await resolvePeople(app);
    const known=new Set(['id','full_name','email','phone','licensing_status','resident_state','status','source','assigned_to','converted_user_id','notes','ip_hash','created_at','updated_at','converted_at']);
    const extras=Object.entries(app).filter(([k,v])=>!known.has(k)&&v!==null&&v!==undefined&&v!=='');
    const source=app.source==='demo_workflow_test'?'Demo workflow test':human(app.source||'Website Careers');
    const assigned=app.assigned_to?(people[app.assigned_to]||app.assigned_to):'Unassigned';
    const converted=app.converted_user_id?(people[app.converted_user_id]||app.converted_user_id):'Not yet created';
    const actionButtons=`${app.status==='new'?`<button class="btn btn-primary" onclick="asCloseCareerApplication();asApproveCareer('${esc(app.id)}')">Approve Applicant</button>`:''}${app.status==='approved'?`<button class="btn btn-primary" onclick="asCloseCareerApplication();asOnboardCareer('${esc(app.id)}')">Onboard Agent</button>`:''}${!['converted','declined'].includes(app.status)?`<button class="tiny-btn" onclick="asCloseCareerApplication();asDeclineCareer('${esc(app.id)}')">Decline</button>`:''}`;
    content.className='';
    content.innerHTML=`
      <div class="as-app-file-head"><div><div class="kicker">CAREER APPLICATION FILE</div><h2>${esc(app.full_name||'Applicant')}</h2><p>Complete submitted record and internal pipeline history.</p></div><button class="as-app-file-close" aria-label="Close application" onclick="asCloseCareerApplication()">×</button></div>
      <div class="as-app-file-body">
        <div class="as-app-section"><h3>Applicant Information</h3><div class="as-app-grid">${field('Full name',app.full_name)}${field('Email',app.email)}${field('Phone',app.phone)}${field('Resident state',app.resident_state)}${field('License answer',licLabel(app.licensing_status))}${field('Automatic route',route(app.licensing_status))}</div></div>
        <div class="as-app-section"><h3>Application & Pipeline</h3><div class="as-app-grid">${field('Application ID',app.id)}${field('Current status',human(app.status))}${field('Source',source)}${field('Assigned to',assigned)}${field('Received',fmt(app.created_at))}${field('Last updated',fmt(app.updated_at))}${field('Onboarded / converted',app.converted_at?fmt(app.converted_at):'Not yet')}${field('Agent account',converted)}${field('Submission security fingerprint',app.ip_hash?'Recorded':'Not recorded')}</div><div class="as-app-system-note">The security fingerprint is retained by the system for intake protection; the raw hash is intentionally not exposed in the application viewer.</div></div>
        <div class="as-app-section"><h3>Internal Notes</h3><div class="as-app-notes">${esc(app.notes||'No internal notes have been added.')}</div></div>
        ${extras.length?`<div class="as-app-section"><h3>Additional Application Data</h3><div class="as-app-grid">${extras.map(([k,v])=>field(human(k),typeof v==='object'?JSON.stringify(v):v)).join('')}</div></div>`:''}
        <div class="as-app-section"><h3>Activity History</h3><div class="as-app-activity">${activity.length?activity.map(x=>`<div class="as-app-event"><strong>${esc(human(x.action||'activity'))}</strong><small>${esc(fmt(x.created_at))}${x.details&&Object.keys(x.details).length?' • '+esc(JSON.stringify(x.details)):''}</small></div>`).join(''):'<div class="as-app-event"><strong>No recorded pipeline activity yet.</strong></div>'}</div></div>
        ${actionButtons?`<div class="as-app-actions">${actionButtons}</div>`:''}
      </div>`;
  }catch(e){
    content.className='as-app-error';
    content.innerHTML=`<button class="as-app-file-close" style="float:right" aria-label="Close application" onclick="asCloseCareerApplication()">×</button><h3>Unable to open application</h3><p>${esc(e?.message||e)}</p>`;
  }
};

async function renderRecruiting(main){
  const c=sb();if(!c){main.innerHTML='<div class="bo-card">Supabase unavailable.</div>';return}
  main.innerHTML='<div class="bo-card">Loading applicant pipeline…</div>';
  const [cq,lq]=await Promise.all([
    c.from('career_applications').select('*').order('created_at',{ascending:false}).limit(100),
    c.from('coverage_leads').select('*').order('created_at',{ascending:false}).limit(100)
  ]);
  if(cq.error||lq.error){main.innerHTML=`<div class="bo-card">${esc((cq.error||lq.error).message)}</div>`;return}
  const apps=cq.data||[],leads=lq.data||[];
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">RECRUITING & LEADS</div><h2>Approve once. Onboarding routes itself.</h2><p>Click any applicant name to open their complete Careers application file before you approve, onboard, or decline them.</p></div><button class="btn btn-primary" onclick="asReloadRecruiting()">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA • APPLICATION → APPROVAL → AUTOMATED ROUTE</div>
  <div class="stat-grid" style="margin-top:18px"><div class="stat"><div class="label">NEW</div><div class="value">${apps.filter(x=>x.status==='new').length}</div></div><div class="stat"><div class="label">APPROVED</div><div class="value">${apps.filter(x=>x.status==='approved').length}</div></div><div class="stat"><div class="label">ONBOARDED</div><div class="value">${apps.filter(x=>x.status==='converted').length}</div></div><div class="stat"><div class="label">COVERAGE LEADS</div><div class="value">${leads.length}</div></div></div>
  <div class="bo-card" style="margin-top:18px"><h3>Career Applications</h3><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Applicant</th><th>License Answer</th><th>Automatic Route</th><th>Status</th><th>Received</th><th>Action</th></tr></thead><tbody>${apps.map(a=>`<tr><td><button type="button" class="as-applicant-link" onclick="asOpenCareerApplication('${esc(a.id)}')">${esc(a.full_name)}</button> ${a.source==='demo_workflow_test'?'<span class="as-demo">DEMO TEST</span>':''}<span class="as-applicant-hint">View full application</span><small>${esc(a.email)}</small></td><td>${licLabel(a.licensing_status)}</td><td><span class="as-route-pill">${route(a.licensing_status)}</span></td><td>${esc(a.status)}</td><td>${fmt(a.created_at)}</td><td><div class="team-actions">${a.status==='new'?`<button class="tiny-btn" onclick="asApproveCareer('${esc(a.id)}')">Approve</button>`:''}${a.status==='approved'?`<button class="btn btn-primary" style="padding:8px 12px" onclick="asOnboardCareer('${esc(a.id)}')">Onboard Agent</button>`:''}${a.status==='converted'?'<span class="pill">Agent Created</span>':''}${!['converted','declined'].includes(a.status)?`<button class="tiny-btn" onclick="asDeclineCareer('${esc(a.id)}')">Decline</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="6">No applications yet.</td></tr>'}</tbody></table></div></div>
  <div class="bo-card" style="margin-top:18px"><h3>Coverage Leads</h3><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Prospect</th><th>Coverage</th><th>Status</th><th>Received</th></tr></thead><tbody>${leads.map(x=>`<tr><td>${esc(x.full_name)}<br><small>${esc(x.email)}</small></td><td>${esc(x.coverage_type)}</td><td>${esc(x.status)}</td><td>${fmt(x.created_at)}</td></tr>`).join('')||'<tr><td colspan="4">No coverage leads.</td></tr>'}</tbody></table></div></div>`;
}

function activeMain(){return $('#ownerPortal.show #ownerMain')||$('#adminPortal.show #adminMain')||$('#ownerMain')||$('#adminMain')}
function register(){
  if(typeof window.registerAllshieldView!=='function')return false;
  window.registerAllshieldView('admin','recruiting',main=>renderRecruiting(main));
  window.registerAllshieldView('owner','recruiting',main=>renderRecruiting(main));
  window.asReloadRecruiting=()=>renderRecruiting(activeMain());
  window.ALLSHIELD_CAREER_APPLICATION_DETAIL_VERSION=VERSION;
  ensureModal();
  return true;
}
function install(attempt=0){
  if(register()){
    setTimeout(register,3000);
    setTimeout(register,6500);
    return;
  }
  if(attempt<150)setTimeout(()=>install(attempt+1),100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();
