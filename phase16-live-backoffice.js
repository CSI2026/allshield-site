(function(){
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'')
 .replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

async function sb(){
  if(window.allshieldSupabase) return window.allshieldSupabase;
  for(let i=0;i<50;i++){
    await new Promise(r=>setTimeout(r,100));
    if(window.allshieldSupabase) return window.allshieldSupabase;
  }
  throw new Error('Supabase connection unavailable.');
}

const empty=msg=>`<div class="bo-card" style="margin-top:18px;opacity:.75">${esc(msg)}</div>`;
const banner='<div class="real-data-banner">LIVE SUPABASE DATA</div>';

function name(p){
  return [p.first_name,p.last_name].filter(Boolean).join(' ') || p.email || 'Account';
}

async function renderAdminDashboard(main){
  try{
    const c=await sb();
    const [pr,ob,lic,ex]=await Promise.all([
      c.from('profiles').select('id,first_name,last_name,email,role,status'),
      c.from('onboarding_progress').select('user_id,completed'),
      c.from('user_state_licenses').select('id,user_id,status,readiness_percent'),
      c.from('exam_attempts').select('user_id,score_percent,created_at')
    ]);
    [pr,ob,lic,ex].forEach(x=>{if(x.error)throw x.error});

    const profiles=pr.data||[], onboarding=ob.data||[],
          licenses=lic.data||[], exams=ex.data||[];

    const active=profiles.filter(x=>x.status==='active').length;
    const obUsers=[...new Set(onboarding.map(x=>x.user_id))].length;
    const ready=licenses.filter(x=>Number(x.readiness_percent||0)>=85).length;
    const avg=exams.length
      ? Math.round(exams.reduce((n,x)=>n+Number(x.score_percent||0),0)/exams.length)
      : null;

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">ALLSHIELD OPERATIONS</div>
        <h2>Executive overview.</h2>
        <p>Live team, onboarding, licensing and assessment information.</p>
      </div></div>
      ${banner}
      <div class="stat-grid" style="margin-top:18px">
        <div class="stat"><div class="label">ACTIVE ACCOUNTS</div><div class="value">${active}</div></div>
        <div class="stat"><div class="label">ONBOARDING USERS</div><div class="value">${obUsers}</div></div>
        <div class="stat"><div class="label">LICENSE READY</div><div class="value">${ready}</div></div>
        <div class="stat"><div class="label">AVG EXAM SCORE</div><div class="value">${avg===null?'—':avg+'%'}</div></div>
      </div>`;
  }catch(e){
    main.innerHTML=empty('Data unavailable: '+(e.message||e));
  }
}

async function renderPermissions(main){
  try{
    const c=await sb();
    const [pr,up]=await Promise.all([
      c.from('profiles').select('id,first_name,last_name,email,role,status').order('created_at',{ascending:true}),
      c.from('user_permissions').select('user_id,permission_key,allowed')
    ]);
    [pr,up].forEach(x=>{if(x.error)throw x.error});

    const profiles=pr.data||[];
    const overrides=up.data||[];
    const roles=['owner','admin','manager','team_lead','agent','staff'];
    const labels={owner:'Owner',admin:'Admin',manager:'Manager',team_lead:'Team Lead',agent:'Agent',staff:'Staff'};
    const scopes={
      owner:'Full platform control',
      admin:'Operations and assigned administrative controls',
      manager:'Assigned team and management tools',
      team_lead:'Assigned team and coaching tools',
      agent:'Personal profile and assigned production tools',
      staff:'Assigned internal tools'
    };
    const counts=Object.fromEntries(roles.map(r=>[r,profiles.filter(x=>x.role===r && x.status!=='terminated').length]));
    const overrideUsers=new Set(overrides.map(x=>x.user_id));

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">ROLES & PERMISSIONS</div>
        <h2>Live access control.</h2>
        <p>Role assignments come from live user profiles. Individual permission overrides come from Supabase.</p>
      </div></div>${banner}
      <div class="bo-card" style="margin-top:18px">
        <table class="rank-table">
          <tr><th>Role</th><th>Active People</th><th>Default Scope</th></tr>
          ${roles.map(r=>`<tr>
            <td>${labels[r]}</td>
            <td>${counts[r]||0}</td>
            <td>${scopes[r]}</td>
          </tr>`).join('')}
        </table>
      </div>
      <div class="bo-card" style="margin-top:18px">
        <h3>Individual Permission Overrides</h3>
        ${overrides.length ? `
          <table class="admin-table">
            <tr><th>Team Member</th><th>Permission</th><th>Allowed</th></tr>
            ${overrides.map(x=>{
              const person=profiles.find(p=>p.id===x.user_id)||{};
              return `<tr>
                <td>${esc(name(person))}</td>
                <td>${esc(x.permission_key)}</td>
                <td>${x.allowed?'Yes':'No'}</td>
              </tr>`;
            }).join('')}
          </table>` : '<div style="opacity:.72">No individual permission overrides are configured. Access currently follows each user’s assigned role.</div>'}
      </div>
      <div class="owner-note" style="margin-top:18px">
        Role changes are managed from Team Accounts. This screen reports actual access assignments and any explicit user-level overrides; it does not display simulated permissions.
      </div>`;
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderTeam(main){
  try{
    const c=await sb();
    const {data,error}=await c.from('profiles')
      .select('id,first_name,last_name,email,role,status,resident_state')
      .order('created_at',{ascending:true});
    if(error)throw error;
    const rows=data||[];

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">TEAM & ROLES</div>
        <h2>People and permissions.</h2>
        <p>Live company user accounts.</p>
      </div></div>${banner}
      <div class="bo-card" style="margin-top:18px">
      ${rows.length?`
        <table class="admin-table">
          <tr><th>Name</th><th>Role</th><th>Status</th><th>State</th></tr>
          ${rows.map(x=>`<tr>
            <td>${esc(name(x))}</td>
            <td>${esc(x.role||'—')}</td>
            <td><span class="pill">${esc(x.status||'—')}</span></td>
            <td>${esc(x.resident_state||'—')}</td>
          </tr>`).join('')}
        </table>`:'No team accounts yet.'}
      </div>`;
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderOnboarding(main){
  try{
    const c=await sb();
    const [pr,ob]=await Promise.all([
      c.from('profiles').select('id,first_name,last_name,email,role,status'),
      c.from('onboarding_progress').select('user_id,step_key,completed,step_order')
    ]);
    [pr,ob].forEach(x=>{if(x.error)throw x.error});

    const profiles=pr.data||[], steps=ob.data||[];
    const grouped={};
    steps.forEach(x=>(grouped[x.user_id] ||= []).push(x));

    const people=profiles.filter(x=>grouped[x.id]);

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">ONBOARDING CONTROL</div>
        <h2>Agent launch status.</h2>
        <p>Live onboarding progress from company records.</p>
      </div></div>${banner}
      <div class="bo-card" style="margin-top:18px">
      ${people.length?`
        <table class="admin-table">
          <tr><th>Team Member</th><th>Completed</th><th>Total Steps</th><th>Progress</th></tr>
          ${people.map(p=>{
            const a=grouped[p.id]||[];
            const done=a.filter(x=>x.completed).length;
            const pct=a.length?Math.round(done/a.length*100):0;
            return `<tr><td>${esc(name(p))}</td><td>${done}</td><td>${a.length}</td><td>${pct}%</td></tr>`;
          }).join('')}
        </table>`:'No onboarding records yet.'}
      </div>`;
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderCourses(main){
  try{
    const c=await sb();
    const {data,error}=await c.from('courses')
      .select('id,title,category,state_code,version,status,created_at')
      .order('created_at',{ascending:false});
    if(error)throw error;
    const rows=data||[];

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">COURSE BUILDER</div>
        <h2>Training content.</h2>
        <p>Live courses stored in Allshield.</p>
      </div></div>${banner}
      <div class="bo-card" style="margin-top:18px">
        <h3>Courses</h3>
        ${rows.length?rows.map(x=>`
          <div class="resource">
            <span><strong>${esc(x.title)}</strong>
            <small style="display:block">${esc(x.category||'Course')} ${x.state_code?'• '+esc(x.state_code):''}</small></span>
            <span class="pill">${esc(x.status||'—')}</span>
          </div>`).join(''):'No courses yet.'}
      </div>`;
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderTests(main){
  try{
    const c=await sb();
    const [ex,pr]=await Promise.all([
      c.from('exam_attempts').select('user_id,exam_type,state_code,score_percent,created_at').order('created_at',{ascending:false}),
      c.from('profiles').select('id,first_name,last_name,email')
    ]);
    [ex,pr].forEach(x=>{if(x.error)throw x.error});
    const exams=ex.data||[], profiles=pr.data||[];
    const pm=Object.fromEntries(profiles.map(x=>[x.id,x]));
    const avg=exams.length?Math.round(exams.reduce((n,x)=>n+Number(x.score_percent||0),0)/exams.length):null;

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">TESTS & SCORING</div>
        <h2>Assessment results.</h2>
        <p>Live exam attempts and scores.</p>
      </div></div>${banner}
      <div class="stat-grid" style="margin-top:18px">
        <div class="stat"><div class="label">ATTEMPTS</div><div class="value">${exams.length}</div></div>
        <div class="stat"><div class="label">AVERAGE SCORE</div><div class="value">${avg===null?'—':avg+'%'}</div></div>
      </div>
      <div class="bo-card" style="margin-top:18px">
      ${exams.length?`
        <table class="admin-table">
          <tr><th>Team Member</th><th>Exam</th><th>State</th><th>Score</th></tr>
          ${exams.map(x=>`<tr>
            <td>${esc(name(pm[x.user_id]||{}))}</td>
            <td>${esc(x.exam_type||'Assessment')}</td>
            <td>${esc(x.state_code||'—')}</td>
            <td>${Number(x.score_percent||0)}%</td>
          </tr>`).join('')}
        </table>`:'No exam attempts yet.'}
      </div>`;
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderLicensing(main){
  try{
    const c=await sb();
    const [lr,pr]=await Promise.all([
      c.from('user_state_licenses').select('user_id,state_code,license_type,status,readiness_percent,expiration_date'),
      c.from('profiles').select('id,first_name,last_name,email')
    ]);
    [lr,pr].forEach(x=>{if(x.error)throw x.error});
    const rows=lr.data||[], pm=Object.fromEntries((pr.data||[]).map(x=>[x.id,x]));

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">LICENSING OVERSIGHT</div>
        <h2>License records.</h2>
        <p>Live state licensing and readiness data.</p>
      </div></div>${banner}
      <div class="bo-card" style="margin-top:18px">
      ${rows.length?`
        <table class="admin-table">
          <tr><th>Team Member</th><th>State</th><th>Type</th><th>Status</th><th>Readiness</th></tr>
          ${rows.map(x=>`<tr>
            <td>${esc(name(pm[x.user_id]||{}))}</td>
            <td>${esc(x.state_code||'—')}</td>
            <td>${esc(x.license_type||'—')}</td>
            <td>${esc(x.status||'—')}</td>
            <td>${x.readiness_percent==null?'—':Number(x.readiness_percent)+'%'}</td>
          </tr>`).join('')}
        </table>`:'No licensing records yet.'}
      </div>`;
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderDocuments(main){
  try{
    const c=await sb();
    const {data,error}=await c.from('document_templates')
      .select('title,category,version,status,requires_signature,created_at')
      .order('created_at',{ascending:false});
    if(error)throw error;
    const rows=data||[];

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">DOCUMENT CONTROL</div>
        <h2>Templates and signatures.</h2>
        <p>Live document templates configured for Allshield.</p>
      </div></div>${banner}
      <div class="bo-card" style="margin-top:18px">
      ${rows.length?rows.map(x=>`
        <div class="resource">
          <span><strong>${esc(x.title)}</strong>
          <small style="display:block">${esc(x.category||'Document')} • Version ${esc(x.version||1)}</small></span>
          <span class="pill">${esc(x.status||'—')}</span>
        </div>`).join(''):'No document templates yet.'}
      </div>`;
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderPromotions(main){
  try{
    const c=await sb();
    const [snap,pr]=await Promise.all([
      c.from('promotion_qualification_snapshots')
       .select('user_id,qualification_month,personal_enrollments,first_generation_enrollments,active_direct_agents,compliance_passed,sop_passed,qualifies,created_at')
       .order('created_at',{ascending:false}),
      c.from('profiles').select('id,first_name,last_name,email')
    ]);
    [snap,pr].forEach(x=>{if(x.error)throw x.error});
    const rows=snap.data||[], pm=Object.fromEntries((pr.data||[]).map(x=>[x.id,x]));

    main.innerHTML=`
      <div class="dashboard-head"><div>
        <div class="kicker">HIERARCHY & PROMOTIONS</div>
        <h2>Promotion qualification.</h2>
        <p>Live qualification snapshots only.</p>
      </div></div>${banner}
      <div class="bo-card" style="margin-top:18px">
      ${rows.length?`
        <table class="admin-table">
          <tr><th>Team Member</th><th>Month</th><th>Personal</th><th>Direct Agents</th><th>Qualifies</th></tr>
          ${rows.map(x=>`<tr>
            <td>${esc(name(pm[x.user_id]||{}))}</td>
            <td>${esc(x.qualification_month||'—')}</td>
            <td>${Number(x.personal_enrollments||0)}</td>
            <td>${Number(x.active_direct_agents||0)}</td>
            <td>${x.qualifies?'Yes':'No'}</td>
          </tr>`).join('')}
        </table>`:'No promotion qualification records yet.'}
      </div>`;
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

function kicker(main){
  return $('.kicker',main)?.textContent?.trim().toUpperCase()||'';
}

async function enhance(main,role){
  if(!main || main.dataset.liveBackofficeBusy==='1') return;

  const k=kicker(main);
  if(!k) return;

  main.dataset.liveBackofficeBusy='1';
  try{
    if(role==='admin'){
      if(k==='ALLSHIELD OPERATIONS') return await renderAdminDashboard(main);
      if(k==='TEAM & ROLES') return await renderTeam(main);
      if(k==='ONBOARDING CONTROL') return await renderOnboarding(main);
      if(k==='COURSE BUILDER') return await renderCourses(main);
      if(k==='TESTS & SCORING') return await renderTests(main);
      if(/LICENSING/.test(k)) return await renderLicensing(main);
      if(/DOCUMENT/.test(k)) return await renderDocuments(main);
      if(/HIERARCHY|PROMOTION/.test(k)) return await renderPromotions(main);
    }

    if(role==='owner'){
      if(k==='ROLES & PERMISSIONS') return await renderPermissions(main);
      if(k==='TEAM & ROLES' || k==='TEAM ACCOUNTS') return await renderTeam(main);
      if(/ONBOARDING/.test(k)) return await renderOnboarding(main);
      if(/TEST|SCORING/.test(k)) return await renderTests(main);
      if(/LICENSING/.test(k)) return await renderLicensing(main);
      if(/DOCUMENT/.test(k)) return await renderDocuments(main);
      if(/HIERARCHY|PROMOTION/.test(k)) return await renderPromotions(main);
    }
  } finally {
    main.dataset.liveBackofficeBusy='';
  }
}

function enhanceRole(role){
  const id=role==='admin'?'adminMain':'ownerMain';
  const main=document.getElementById(id);
  if(!main)return;
  Promise.resolve(enhance(main,role)).catch(e=>console.error('Live backoffice enhancement failed',role,e));
}

function start(){
  if(typeof window.registerAllshieldView!=='function') return setTimeout(start,60);
  const adminMain=()=>document.getElementById('adminMain');
  const ownerMain=()=>document.getElementById('ownerMain');

  window.registerAllshieldView('admin','dashboard',()=>renderAdminDashboard(adminMain()));
  window.registerAllshieldView('admin','team',()=>renderTeam(adminMain()));
  window.registerAllshieldView('admin','hierarchy',()=>renderPromotions(adminMain()));
  window.registerAllshieldView('admin','documents',()=>renderDocuments(adminMain()));

  window.registerAllshieldView('owner','permissions',()=>renderPermissions(ownerMain()));
  window.registerAllshieldView('owner','teamaccounts',()=>renderTeam(ownerMain()));
  window.registerAllshieldView('owner','hierarchy',()=>renderPromotions(ownerMain()));

  console.log('ALLSHIELD live backoffice canonical views registered');
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',start,{once:true});
}else{
  start();
}
})();
