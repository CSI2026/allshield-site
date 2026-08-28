(()=>{
'use strict';
const VERSION='2026.08.28.014';
const STATE_LABELS={
  TX:'Texas · General Lines Life, Accident & Health / HMO',
  FL:'Florida · Health & Life',
  GA:'Georgia · Accident & Sickness',
  TN:'Tennessee · Accident & Health'
};
const ROUTE_LABELS={prelicensing:'Pre-Licensing',licensed_verification:'License Verification',self_select:'Agent Chooses on First Login'};
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=d=>d?new Date(d).toLocaleString():'—';
const sb=()=>window.allshieldSupabase;

function toastSafe(msg){try{if(typeof window.toast==='function')window.toast(msg);else alert(msg)}catch{alert(msg)}}
function stateOptions(states,selected=''){
  return (states||[]).map(s=>`<option value="${esc(s.state_code)}" ${s.state_code===selected?'selected':''}>${esc(STATE_LABELS[s.state_code]||s.state_code)}</option>`).join('');
}
async function edge(name,body){
  const c=sb();if(!c)throw new Error('ALLSHIELD connection is not ready.');
  const {data,error}=await c.functions.invoke(name,{body});
  if(error)throw error;if(data?.error)throw new Error(data.error);return data;
}
async function context(){return edge('agent-onboarding',{action:'get_context'})}
function stepDone(ctx,key){return !!(ctx.steps||[]).find(x=>x.step_key===key)?.completed}
function firstPrimaryLicense(ctx){
  const active=(ctx.licenses||[]).find(x=>x.status==='active');
  const pending=(ctx.licenses||[]).find(x=>x.status==='pending_verification');
  const studying=(ctx.licenses||[]).find(x=>x.status==='studying');
  return active||pending||studying||null;
}
function injectStyles(){
  if($('#allshieldOnboardingRouter012'))return;
  const s=document.createElement('style');s.id='allshieldOnboardingRouter012';s.textContent=`
  .as-route-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border:1px solid rgba(119,200,255,.2);background:rgba(42,132,197,.08);border-radius:14px;margin:14px 0 18px}
  .as-route-banner strong{font-size:14px}.as-route-banner small{display:block;color:#8fa7bd;margin-top:4px}
  .as-step-grid{display:grid;gap:14px}.as-step{border:1px solid rgba(255,255,255,.09);background:#0b1829;border-radius:16px;padding:18px}
  .as-step h3{margin:0 0 7px;font-size:19px}.as-step p{color:#8fa4ba;line-height:1.55;margin:4px 0 12px}
  .as-step-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.as-ok{color:#9fe3bf}.as-wait{color:#ffd38a}
  .as-choice{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.as-choice button{min-height:64px}
  .as-inline{display:flex;gap:10px;flex-wrap:wrap;align-items:end}.as-inline>div{min-width:180px;flex:1}
  .as-license-card{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.07)}.as-license-card:last-child{border-bottom:0}
  .as-contract-copy{max-height:240px;overflow:auto;white-space:pre-wrap;padding:14px;border-radius:12px;background:#07111f;color:#b8c8d8;font-size:12px;line-height:1.6;margin:12px 0}
  .as-demo{display:inline-block;padding:4px 7px;border-radius:999px;background:rgba(255,194,92,.13);color:#ffd38a;font-size:9px;font-weight:900;letter-spacing:.08em}
  .as-route-pill{display:inline-block;padding:5px 9px;border-radius:999px;background:#102b46;color:#7bcaff;font-size:11px}
  @media(max-width:700px){.as-choice{grid-template-columns:1fr}.as-inline{display:grid;grid-template-columns:1fr}.as-inline>div{min-width:0}}
  `;document.head.appendChild(s);
}
function patchCareerApplication(){
  const select=$('#careerModal select');if(!select)return;
  if(select.dataset.asSimpleLicense==='1')return;
  select.innerHTML='<option value="not_licensed">Not licensed</option><option value="licensed">Licensed</option>';
  select.dataset.asSimpleLicense='1';
}

async function renderAgentOnboarding(main){
  main.innerHTML='<div class="bo-card">Loading your onboarding path…</div>';
  try{
    const ctx=await context(),path=ctx.pathway,primary=firstPrimaryLicense(ctx),active=(ctx.licenses||[]).find(x=>x.status==='active'),pending=(ctx.licenses||[]).find(x=>x.status==='pending_verification');
    let html=`<div class="dashboard-head"><div><div class="kicker">AGENT ONBOARDING</div><h2>Your next step — automatically routed.</h2><p>Your Careers application determines which onboarding path you receive. You only provide information ALLSHIELD does not already have.</p></div><button class="btn btn-primary" onclick="asRefreshAgentOnboarding()">Refresh</button></div>
    <div class="real-data-banner">LIVE SUPABASE DATA • SELF-SERVICE ONBOARDING</div>
    <div class="as-route-banner"><div><strong>${esc(ROUTE_LABELS[path]||path)}</strong><small>${ctx.source_application?'Route carried forward from your Careers application.':'Direct account — one licensing question is required.'}</small></div><span class="as-route-pill">${esc(ctx.profile.status)}</span></div>`;

    if(path==='self_select'){
      html+=`<div class="as-step"><h3>Are you currently licensed?</h3><p>This is only shown because this account was created directly instead of from a Careers application. Answer once and ALLSHIELD routes the rest.</p><div class="as-choice"><button class="btn btn-primary" onclick="asChooseLicenseStatus('licensed')">Yes — I am licensed</button><button class="btn btn-ghost" onclick="asChooseLicenseStatus('not_licensed')">No — I need my license</button></div></div>`;
      main.innerHTML=html;return;
    }

    html+='<div class="as-step-grid">';

    if(path==='prelicensing'){
      if(!primary){
        html+=`<div class="as-step"><div class="as-step-head"><h3>1. Choose your licensing state</h3><span class="as-wait">Required</span></div><p>Your product path is already set to <strong>Life & Health / ACA</strong>. Choose the state you are getting licensed in and ALLSHIELD assigns the correct Academy training automatically.</p><div class="as-inline"><div><label>License / Product</label><input class="mini-input" value="Life & Health / ACA" disabled></div><div><label>State</label><select id="asPrelicenseState" class="mini-input">${stateOptions(ctx.states)}</select></div><button class="btn btn-primary" onclick="asStartPrelicense()">Start My Training</button></div></div>`;
      }else{
        html+=`<div class="as-step"><div class="as-step-head"><h3>1. Licensing state selected</h3><span class="as-ok">✓ Complete</span></div><p><strong>${esc(STATE_LABELS[primary.state_code]||primary.state_code)}</strong><br>ALLSHIELD track: ${esc(primary.license_type)} • Status: ${esc(primary.status)}</p></div>`;
      }
      html+=`<div class="as-step"><div class="as-step-head"><h3>2. Academy training</h3><span class="${(ctx.assignments||[]).length?'as-ok':'as-wait'}">${(ctx.assignments||[]).length?'Assigned':'Waiting on state'}</span></div><p>${(ctx.assignments||[]).length?'Your assigned training is ready in Academy.':'Choose your state first and the correct Life & Health course will be assigned.'}</p>${(ctx.assignments||[]).map(a=>`<div class="as-license-card"><span>${esc(a.course?.title||'Assigned course')}</span><span class="pill">${Number(a.progress_percent||0)}%</span></div>`).join('')}</div>`;
      if(primary && primary.status==='studying'){
        html+=licenseSubmission(ctx,primary.state_code,'3. When your state license is issued');
      }
    }

    if(path==='licensed_verification'&&!pending&&!active){
      html+=licenseSubmission(ctx,ctx.profile.resident_state||'','License verification');
    }else if(path==='licensed_verification'&&pending){
      html+=`<div class="as-step"><div class="as-step-head"><h3>License verification</h3><span class="as-wait">Pending review</span></div><p>Your ${esc(pending.state_code)} license number <strong>${esc(pending.license_number)}</strong> was submitted. ALLSHIELD Admin/Owner verification is the next step.</p></div>`;
    }

    if(active){
      html+=`<div class="as-step"><div class="as-step-head"><h3>License verified</h3><span class="as-ok">✓ Verified</span></div><p>${esc(active.state_code)} • ${esc(active.license_type)} • License ${esc(active.license_number||'verified')}</p></div>`;
    }

    html+=contractBlock(ctx,!!active);
    html+=compBlock(ctx);
    html+=marketplaceBlock(ctx,active);
    html+=`<div class="as-step"><div class="as-step-head"><h3>Final readiness</h3><span class="${stepDone(ctx,'ready')?'as-ok':'as-wait'}">${stepDone(ctx,'ready')?'✓ Ready':'In progress'}</span></div><p>ALLSHIELD keeps this account in Onboarding until licensing, contracting, compensation setup, and Marketplace requirements are complete.</p></div>`;
    html+='</div>';
    main.innerHTML=html;
  }catch(e){main.innerHTML=`<div class="bo-card"><h3>Unable to load onboarding</h3><p>${esc(e.message||e)}</p></div>`}
}
function licenseSubmission(ctx,selected,title){
  return `<div class="as-step"><div class="as-step-head"><h3>${esc(title)}</h3><span class="as-wait">Submit for verification</span></div><p>Enter the license information exactly as it appears on your state record. ALLSHIELD will verify it before contracting unlocks.</p><div class="as-inline"><div><label>State</label><select id="asLicenseState" class="mini-input">${stateOptions(ctx.states,selected)}</select></div><div><label>License Number</label><input id="asLicenseNumber" class="mini-input" placeholder="License number"></div><div><label>Expiration Date</label><input id="asLicenseExpiration" type="date" class="mini-input"></div><button class="btn btn-primary" onclick="asSubmitLicense()">Submit License</button></div></div>`;
}
function contractBlock(ctx,unlocked){
  if(!unlocked)return `<div class="as-step"><div class="as-step-head"><h3>Contracting & e-sign</h3><span class="as-wait">Locked</span></div><p>This automatically unlocks after your license is verified.</p></div>`;
  if(ctx.contract_acceptance)return `<div class="as-step"><div class="as-step-head"><h3>Contracting & e-sign</h3><span class="as-ok">✓ Accepted</span></div><p>${esc(ctx.contract?.title||'Agent contract')} accepted ${fmt(ctx.contract_acceptance.accepted_at)}.</p></div>`;
  if(!ctx.contract)return `<div class="as-step"><div class="as-step-head"><h3>Contracting & e-sign</h3><span class="as-wait">Waiting on ALLSHIELD</span></div><p>Your license is verified. The contract step is ready to unlock automatically as soon as an Owner-approved contract is published. Draft contracts are never shown to agents.</p></div>`;
  return `<div class="as-step"><div class="as-step-head"><h3>Contracting & e-sign</h3><span class="as-wait">Action required</span></div><p><strong>${esc(ctx.contract.title)}</strong></p><div class="as-contract-copy">${esc(ctx.contract.body_markdown||'')}</div><div class="as-inline"><div><label>Type Full Legal Name</label><input id="asContractName" class="mini-input"></div><button class="btn btn-primary" onclick="asAcceptContract()">Accept & Sign</button></div></div>`;
}
function compBlock(ctx){
  const accepted=!!ctx.contract_acceptance,ready=accepted&&ctx.comp_plan?.status==='published';
  return `<div class="as-step"><div class="as-step-head"><h3>Compensation & pay setup</h3><span class="${ready?'as-ok':'as-wait'}">${ready?'✓ Plan assigned':accepted?'Pending plan publication':'Follows contract'}</span></div><p>${ready?`Compensation plan version ${esc(ctx.comp_plan.version)} is assigned through your signed contract.`:'This step follows contracting. Banking or payment credentials are not collected on an unsecured form.'}</p></div>`;
}
function marketplaceBlock(ctx,active){
  if(!active)return `<div class="as-step"><div class="as-step-head"><h3>ACA Marketplace certification</h3><span class="as-wait">Locked</span></div><p>This opens after state license verification.</p></div>`;
  const m=(ctx.marketplace||[]).find(x=>x.state_code===active.state_code);
  if(m)return `<div class="as-step"><div class="as-step-head"><h3>ACA Marketplace certification</h3><span class="as-wait">${esc(m.status)}</span></div><p>${esc(m.marketplace)} • Plan Year ${esc(m.plan_year)}</p>${m.training_url?`<a class="btn btn-primary" href="${esc(m.training_url)}" target="_blank" rel="noopener">Open Official Training</a>`:''}</div>`;
  return `<div class="as-step"><div class="as-step-head"><h3>ACA Marketplace certification</h3><span class="as-wait">Ready to start</span></div><p>ALLSHIELD will open the correct official Marketplace path for ${esc(active.state_code)}.</p><button class="btn btn-primary" onclick="asStartMarketplace('${esc(active.state_code)}')">Start Marketplace Step</button></div>`;
}

async function renderAgentLicensing(main){
  main.innerHTML='<div class="bo-card">Loading licensing records…</div>';
  try{
    const ctx=await context(),existing=new Set((ctx.licenses||[]).map(x=>x.state_code));
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">LICENSING CENTER</div><h2>Your licenses and additional states.</h2><p>Your first-state onboarding is separate from additional state licensing. Add another rollout state whenever you need it.</p></div></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
    <div class="bo-card" style="margin-top:18px"><h3>Current license tracks</h3>${(ctx.licenses||[]).map(x=>`<div class="as-license-card"><span><strong>${esc(x.state_code)}</strong> • ${esc(STATE_LABELS[x.state_code]||x.license_type)}<small style="display:block;color:#8298ad">${x.is_resident?'Resident':'Non-resident'} • ${esc(x.license_number||'No license number yet')}</small></span><span class="pill">${esc(x.status)}</span></div>`).join('')||'<p>No state licensing tracks yet.</p>'}</div>
    <div class="bo-card" style="margin-top:18px"><h3>Add another state</h3><p style="color:#8fa4ba">Only current ALLSHIELD rollout states are shown.</p><div class="as-inline"><div><label>State</label><select id="asAddState" class="mini-input">${(ctx.states||[]).filter(s=>!existing.has(s.state_code)).map(s=>`<option value="${esc(s.state_code)}">${esc(STATE_LABELS[s.state_code]||s.state_code)}</option>`).join('')}</select></div><button class="btn btn-primary" onclick="asAddStateTrack()" ${(ctx.states||[]).filter(s=>!existing.has(s.state_code)).length?'':'disabled'}>Add State Track</button></div></div>`;
  }catch(e){main.innerHTML=`<div class="bo-card">${esc(e.message||e)}</div>`}
}

async function renderRecruiting(main){
  const c=sb();if(!c){main.innerHTML='<div class="bo-card">Supabase unavailable.</div>';return}
  main.innerHTML='<div class="bo-card">Loading applicant pipeline…</div>';
  const [cq,lq]=await Promise.all([
    c.from('career_applications').select('*').order('created_at',{ascending:false}).limit(100),
    c.from('coverage_leads').select('*').order('created_at',{ascending:false}).limit(100)
  ]);
  if(cq.error||lq.error){main.innerHTML=`<div class="bo-card">${esc((cq.error||lq.error).message)}</div>`;return}
  const apps=cq.data||[],leads=lq.data||[];
  const licLabel=s=>s==='licensed'?'Licensed':'Not Licensed';
  const route=s=>s==='licensed'?'License Verification':'Pre-Licensing';
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">RECRUITING & LEADS</div><h2>Approve once. Onboarding routes itself.</h2><p>The licensing answer from the Careers application follows the applicant into their Agent account. Your team does not have to ask it again.</p></div><button class="btn btn-primary" onclick="asReloadRecruiting()">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA • APPLICATION → APPROVAL → AUTOMATED ROUTE</div>
  <div class="stat-grid" style="margin-top:18px"><div class="stat"><div class="label">NEW</div><div class="value">${apps.filter(x=>x.status==='new').length}</div></div><div class="stat"><div class="label">APPROVED</div><div class="value">${apps.filter(x=>x.status==='approved').length}</div></div><div class="stat"><div class="label">ONBOARDED</div><div class="value">${apps.filter(x=>x.status==='converted').length}</div></div><div class="stat"><div class="label">COVERAGE LEADS</div><div class="value">${leads.length}</div></div></div>
  <div class="bo-card" style="margin-top:18px"><h3>Career Applications</h3><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Applicant</th><th>License Answer</th><th>Automatic Route</th><th>Status</th><th>Received</th><th>Action</th></tr></thead><tbody>${apps.map(a=>`<tr><td><strong>${esc(a.full_name)}</strong> ${a.source==='demo_workflow_test'?'<span class="as-demo">DEMO TEST</span>':''}<br><small>${esc(a.email)}</small></td><td>${licLabel(a.licensing_status)}</td><td><span class="as-route-pill">${route(a.licensing_status)}</span></td><td>${esc(a.status)}</td><td>${fmt(a.created_at)}</td><td><div class="team-actions">${a.status==='new'?`<button class="tiny-btn" onclick="asApproveCareer('${a.id}')">Approve</button>`:''}${a.status==='approved'?`<button class="btn btn-primary" style="padding:8px 12px" onclick="asOnboardCareer('${a.id}')">Onboard Agent</button>`:''}${a.status==='converted'?'<span class="pill">Agent Created</span>':''}${!['converted','declined'].includes(a.status)?`<button class="tiny-btn" onclick="asDeclineCareer('${a.id}')">Decline</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="6">No applications yet.</td></tr>'}</tbody></table></div></div>
  <div class="bo-card" style="margin-top:18px"><h3>Coverage Leads</h3><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Prospect</th><th>Coverage</th><th>Status</th><th>Received</th></tr></thead><tbody>${leads.map(x=>`<tr><td>${esc(x.full_name)}<br><small>${esc(x.email)}</small></td><td>${esc(x.coverage_type)}</td><td>${esc(x.status)}</td><td>${fmt(x.created_at)}</td></tr>`).join('')||'<tr><td colspan="4">No coverage leads.</td></tr>'}</tbody></table></div></div>`;
}

async function renderSimpleTeam(main){
  main.innerHTML='<div class="bo-card">Loading team accounts…</div>';
  try{
    const users=await window.allshieldListTeamUsers();
    const gen=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';let out='AS-';for(let i=0;i<12;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out};
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">TEAM ACCOUNTS</div><h2>Keep access simple: Agent or Admin.</h2><p>Career applicants should normally be onboarded from Recruiting & Leads so their licensed/not-licensed answer carries forward automatically.</p></div></div><div class="real-data-banner">LIVE SUPABASE AUTH • OWNER PROTECTED</div>
    <div class="bo-grid"><div class="bo-card"><h3>Create Direct Account</h3><div class="team-form-grid"><div><label>First Name</label><input id="asTeamFirst" class="mini-input"></div><div><label>Last Name</label><input id="asTeamLast" class="mini-input"></div><div><label>Username</label><input id="asTeamUsername" class="mini-input"></div><div><label>Temporary Password</label><div style="display:flex;gap:8px"><input id="asTeamPassword" class="mini-input"><button class="tiny-btn" onclick="asGenerateTeamPassword()">Generate</button></div></div><div><label>Access</label><select id="asTeamAccess" class="mini-input"><option value="agent">Agent</option><option value="admin">Admin</option></select></div></div><button class="btn btn-primary" style="margin-top:12px" onclick="asCreateSimpleTeamAccount()">Create Account</button><div id="asTeamCreateResult" style="margin-top:12px"></div></div>
    <div class="bo-card"><h3>Automatic Rules</h3><div class="requirement"><span>Agent</span><span class="reqgood">Onboarding automatically</span></div><div class="requirement"><span>Admin</span><span class="reqgood">Admin portal access</span></div><div class="requirement"><span>Career applicant</span><span class="reqgood">License answer reused</span></div><div class="requirement"><span>Direct Agent</span><span class="pill">Answers license question once at login</span></div></div></div>
    <div class="bo-card" style="margin-top:18px"><h3>Live Team</h3><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Name</th><th>Username</th><th>Access</th><th>Status</th><th>State</th><th>Actions</th></tr></thead><tbody>${users.map(u=>`<tr><td>${esc(([u.first_name,u.last_name].filter(Boolean).join(' ')||'—'))}</td><td>${esc(u.username||((u.email||'').split('@')[0]))}</td><td>${u.role==='owner'?'<span class="pill">Owner</span>':esc(u.role==='admin'?'Admin':'Agent')}</td><td>${esc(u.status)}</td><td>${esc(u.resident_state||'—')}</td><td>${u.role==='owner'?'<span class="pill">Protected</span>':`<div class="team-actions"><button class="tiny-btn" onclick="asResetTeamPassword('${u.id}','${esc(u.username||'account')}')">Reset Password</button><button class="tiny-btn" onclick="asDeleteTeamAccount('${u.id}')">Delete</button></div>`}</td></tr>`).join('')}</tbody></table></div></div>`;
    window.__asGenPassword=gen;
  }catch(e){main.innerHTML=`<div class="bo-card">${esc(e.message||e)}</div>`}
}

async function renderAdminOnboarding(main){
  const c=sb();if(!c)return;
  main.innerHTML='<div class="bo-card">Loading onboarding oversight…</div>';
  const [pq,oq,lq]=await Promise.all([
    c.from('profiles').select('id,first_name,last_name,username,email,role,status,resident_state').eq('role','agent').order('created_at'),
    c.from('onboarding_progress').select('*').order('step_order'),
    c.from('user_state_licenses').select('*').order('state_code')
  ]);
  if(pq.error||oq.error||lq.error){main.innerHTML=`<div class="bo-card">${esc((pq.error||oq.error||lq.error).message)}</div>`;return}
  const people=pq.data||[],obs=oq.data||[],lics=lq.data||[];
  const routeFor=id=>{const s=obs.filter(x=>x.user_id===id);return s.map(x=>x.metadata?.pathway).find(Boolean)||'self_select'};
  main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">ONBOARDING CONTROL</div><h2>Exceptions only — the agent handles the rest.</h2><p>Admin/Owner steps are limited to approvals such as license verification. The agent supplies their own licensing data and completes self-service steps.</p></div><button class="btn btn-primary" onclick="asReloadAdminOnboarding()">Refresh</button></div><div class="real-data-banner">LIVE SUPABASE DATA</div>
  <div class="bo-card" style="margin-top:18px"><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Agent</th><th>Route</th><th>Progress</th><th>License</th><th>Admin Action</th></tr></thead><tbody>${people.map(p=>{const s=obs.filter(x=>x.user_id===p.id),done=s.filter(x=>x.completed).length,l=lics.find(x=>x.user_id===p.id&&x.status==='pending_verification')||lics.find(x=>x.user_id===p.id);return `<tr><td><strong>${esc(([p.first_name,p.last_name].filter(Boolean).join(' ')||p.username||p.email))}</strong><br><small>${esc(p.status)}</small></td><td><span class="as-route-pill">${esc(ROUTE_LABELS[routeFor(p.id)]||routeFor(p.id))}</span></td><td>${done}/${s.length||'—'}</td><td>${l?`${esc(l.state_code)} • ${esc(l.status)}`:'Waiting on agent'}</td><td>${l?.status==='pending_verification'?`<button class="btn btn-primary" style="padding:8px 12px" onclick="asVerifyLicense('${p.id}','${l.state_code}')">Verify License</button>`:'<span class="pill">No approval needed</span>'}</td></tr>`}).join('')||'<tr><td colspan="5">No agents.</td></tr>'}</tbody></table></div></div>`;
}

window.asRefreshAgentOnboarding=()=>renderAgentOnboarding($('#agentMain'));
window.asChooseLicenseStatus=async status=>{try{await edge('agent-onboarding',{action:'choose_licensing_status',licensing_status:status});await window.asRefreshAgentOnboarding()}catch(e){alert(e.message||e)}};
window.asStartPrelicense=async()=>{try{const state=$('#asPrelicenseState')?.value;if(!state)return;await edge('agent-onboarding',{action:'select_prelicense_state',state_code:state});toastSafe('Your training track is ready.');await window.asRefreshAgentOnboarding()}catch(e){alert(e.message||e)}};
window.asSubmitLicense=async()=>{try{const state=$('#asLicenseState')?.value,license_number=$('#asLicenseNumber')?.value.trim(),expiration_date=$('#asLicenseExpiration')?.value;await edge('agent-onboarding',{action:'submit_existing_license',state_code:state,license_number,expiration_date});toastSafe('License submitted for verification.');await window.asRefreshAgentOnboarding()}catch(e){alert(e.message||e)}};
window.asAcceptContract=async()=>{try{const typed_name=$('#asContractName')?.value.trim();await edge('agent-onboarding',{action:'accept_contract',typed_name});toastSafe('Contract accepted.');await window.asRefreshAgentOnboarding()}catch(e){alert(e.message||e)}};
window.asStartMarketplace=async state=>{try{const r=await edge('agent-onboarding',{action:'start_marketplace',state_code:state});if(r.training_url)window.open(r.training_url,'_blank','noopener');await window.asRefreshAgentOnboarding()}catch(e){alert(e.message||e)}};
window.asAddStateTrack=async()=>{try{const state=$('#asAddState')?.value;if(!state)return;await edge('agent-onboarding',{action:'add_state_track',state_code:state});toastSafe(state+' added to your licensing center.');await renderAgentLicensing($('#agentMain'))}catch(e){alert(e.message||e)}};

window.asReloadRecruiting=()=>renderRecruiting($('#ownerPortal.show #ownerMain')||$('#adminPortal.show #adminMain')||$('#ownerMain')||$('#adminMain'));
window.asApproveCareer=async id=>{const c=sb();const {error}=await c.from('career_applications').update({status:'approved',updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await window.asReloadRecruiting()};
window.asDeclineCareer=async id=>{if(!confirm('Decline this applicant?'))return;const c=sb();const {error}=await c.from('career_applications').update({status:'declined',updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await window.asReloadRecruiting()};
window.asOnboardCareer=async id=>{try{const r=await edge('convert-recruit',{application_id:id});alert(`Agent account created.\n\nUsername: ${r.username}\nTemporary password: ${r.temp_password}\nOnboarding route: ${ROUTE_LABELS[r.onboarding_pathway]||r.onboarding_pathway}\n\nCopy the temporary password now. It is not stored in readable form.`);await window.asReloadRecruiting()}catch(e){alert(e.message||e)}};

window.asGenerateTeamPassword=()=>{const e=$('#asTeamPassword');if(e)e.value=(window.__asGenPassword?window.__asGenPassword():'AS-'+Math.random().toString(36).slice(2)+'!9A')};
window.asCreateSimpleTeamAccount=async()=>{try{const role=$('#asTeamAccess').value;const payload={action:'create',first_name:$('#asTeamFirst').value.trim(),last_name:$('#asTeamLast').value.trim(),username:$('#asTeamUsername').value.trim(),password:$('#asTeamPassword').value,role,status:role==='admin'?'active':'onboarding'};const r=await window.allshieldManageTeamUser(payload);$('#asTeamCreateResult').innerHTML=`<span class="as-ok">Created ${esc(r.username)} • ${role==='agent'?'Agent onboarding':'Admin access'}</span>`;await renderSimpleTeam($('#ownerMain'))}catch(e){$('#asTeamCreateResult').textContent='Error: '+(e.message||e)}};
window.asResetTeamPassword=async(id,username)=>{const p=prompt('New temporary password for '+username+':',window.__asGenPassword?window.__asGenPassword():'');if(!p)return;try{await window.allshieldManageTeamUser({action:'reset_password',user_id:id,password:p});toastSafe('Password reset.')}catch(e){alert(e.message||e)}};
window.asDeleteTeamAccount=async id=>{if(!confirm('Delete this account?'))return;try{await window.allshieldManageTeamUser({action:'delete',user_id:id});await renderSimpleTeam($('#ownerMain'))}catch(e){alert(e.message||e)}};

window.asReloadAdminOnboarding=()=>renderAdminOnboarding($('#adminPortal.show #adminMain')||$('#ownerPortal.show #ownerMain')||$('#adminMain')||$('#ownerMain'));
window.asVerifyLicense=async(user_id,state_code)=>{if(!confirm(`Verify the ${state_code} license submission?`))return;try{await edge('agent-onboarding',{action:'verify_license',user_id,state_code});toastSafe('License verified. Contracting is the agent’s next step.');await window.asReloadAdminOnboarding()}catch(e){alert(e.message||e)}};

function registerViews(){
  if(typeof window.registerAllshieldView!=='function')return false;
  window.registerAllshieldView('agent','onboarding',main=>renderAgentOnboarding(main));
  window.registerAllshieldView('agent','licensing',main=>renderAgentLicensing(main));
  window.registerAllshieldView('admin','recruiting',main=>renderRecruiting(main));
  window.registerAllshieldView('owner','recruiting',main=>renderRecruiting(main));
  window.registerAllshieldView('admin','onboarding',main=>renderAdminOnboarding(main));
  window.registerAllshieldView('admin','licensing',main=>renderAdminOnboarding(main));
  window.registerAllshieldView('owner','onboarding',main=>renderAdminOnboarding(main));
  window.registerAllshieldView('owner','licensing',main=>renderAdminOnboarding(main));

  window.ALLSHIELD_ONBOARDING_ROUTER_VERSION=VERSION;
  return true;
}
function install(attempt=0){
  injectStyles();patchCareerApplication();
  if(registerViews()){
    setTimeout(()=>{patchCareerApplication();registerViews()},2500);
    setTimeout(()=>{patchCareerApplication();registerViews()},6000);
    return;
  }
  if(attempt<150)setTimeout(()=>install(attempt+1),100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(),{once:true});else install();
})();