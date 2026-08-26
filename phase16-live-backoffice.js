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
  main.dataset.permissionsLive='1';
  try{
    const c=await sb();
    const [pr,up]=await Promise.all([c.from('profiles').select('id,first_name,last_name,username,email,role,status').order('created_at',{ascending:true}),c.from('user_permissions').select('id,user_id,permission_key,allowed').order('permission_key')]);
    [pr,up].forEach(x=>{if(x.error)throw x.error}); const profiles=pr.data||[],overrides=up.data||[];
    const roles=['owner','admin','manager','team_lead','agent','staff'];
    const labels={owner:'Owner',admin:'Admin',manager:'Manager',team_lead:'Team Lead',agent:'Agent',staff:'Staff'};
    const scopes={owner:'Full platform control',admin:'Operations and administrative controls',manager:'Assigned team and management tools',team_lead:'Assigned team and coaching tools',agent:'Personal production, training and assigned tools',staff:'Assigned internal tools'};
    const counts=Object.fromEntries(roles.map(r=>[r,profiles.filter(x=>x.role===r&&x.status!=='terminated').length]));
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">ROLES & PERMISSIONS</div><h2>Live access control.</h2><p>Role assignments plus explicit user-level permission overrides.</p></div><button id="permRefresh" class="tiny-btn">Refresh</button></div>${banner}
    <div class="bo-card" style="margin-top:18px"><table class="rank-table"><tr><th>Role</th><th>People</th><th>Default Scope</th></tr>${roles.map(r=>`<tr><td>${labels[r]}</td><td>${counts[r]||0}</td><td>${scopes[r]}</td></tr>`).join('')}</table></div>
    <div class="bo-card" style="margin-top:18px"><h3>Add / Update Permission Override</h3><div class="form-grid"><select id="permUser" class="mini-input"><option value="">Choose team member</option>${profiles.map(x=>`<option value="${x.id}">${esc(name(x))} • ${esc(x.role)}</option>`).join('')}</select><input id="permKey" class="mini-input" placeholder="permission key, e.g. finance.view"><select id="permAllowed" class="mini-input"><option value="true">Allowed</option><option value="false">Denied</option></select></div><button id="permSave" class="btn btn-primary" style="margin-top:10px">Save Override</button></div>
    <div class="bo-card" style="margin-top:18px"><h3>Individual Permission Overrides</h3>${overrides.length?`<table class="admin-table"><tr><th>Team Member</th><th>Permission</th><th>Allowed</th><th></th></tr>${overrides.map(x=>{const person=profiles.find(p=>p.id===x.user_id)||{};return `<tr><td>${esc(name(person))}</td><td>${esc(x.permission_key)}</td><td>${x.allowed?'Yes':'No'}</td><td><button class="tiny-btn" data-perm-delete="${x.id}">Remove</button></td></tr>`}).join('')}</table>`:'<div style="opacity:.72">No individual permission overrides are configured.</div>'}</div>`;
    const reload=()=>{delete main.dataset.permissionsLive;return renderPermissions(main)};$('#permRefresh',main).onclick=reload;
    $('#permSave',main).onclick=async()=>{try{const user_id=$('#permUser',main).value,permission_key=$('#permKey',main).value.trim();if(!user_id||!permission_key)throw new Error('Choose a user and enter a permission key.');const allowed=$('#permAllowed',main).value==='true';const {error}=await c.from('user_permissions').upsert({user_id,permission_key,allowed},{onConflict:'user_id,permission_key'});if(error)throw error;window.toast?.('Permission override saved.');reload();}catch(e){window.toast?.('Permission save failed: '+(e.message||e));}};
    main.querySelectorAll('[data-perm-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this permission override?'))return;const {error}=await c.from('user_permissions').delete().eq('id',b.dataset.permDelete);if(error)return window.toast?.(error.message);reload();});
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderTeam(main){
  main.dataset.teamAccountsLive='1';
  try{
    const c=await sb();
    const [users,deps]=await Promise.all([window.allshieldListTeamUsers?window.allshieldListTeamUsers():c.from('profiles').select('id,username,first_name,last_name,email,role,status,resident_state,department_id,manager_id,created_at').then(x=>{if(x.error)throw x.error;return x.data||[]}),window.allshieldListDepartments?window.allshieldListDepartments():c.from('departments').select('id,name,slug').then(x=>{if(x.error)throw x.error;return x.data||[]})]);
    const managers=(users||[]).filter(x=>['owner','admin','manager','team_lead'].includes(x.role)&&x.status!=='terminated');
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">TEAM ACCOUNTS</div><h2>Real account management.</h2><p>Create, edit, organize and secure Allshield user accounts.</p></div><button id="teamRefresh" class="tiny-btn">Refresh</button></div>${banner}
    <div class="bo-card" style="margin-top:18px"><h3>Create Team Account</h3><div class="team-form-grid"><input id="teamFirst" class="mini-input" placeholder="First name"><input id="teamLast" class="mini-input" placeholder="Last name"><input id="teamUsername" class="mini-input" placeholder="Username"><div style="display:grid;grid-template-columns:1fr auto;gap:8px"><input id="teamPassword" class="mini-input" placeholder="Temporary password"><button id="teamGenerate" class="tiny-btn">Generate</button></div><select id="teamRole" class="mini-input"><option value="agent">Agent</option><option value="team_lead">Team Lead</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="admin">Admin</option></select><select id="teamStatus" class="mini-input"><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="invited">Invited</option><option value="inactive">Inactive</option></select><input id="teamState" class="mini-input" maxlength="2" placeholder="Resident state, e.g. TX"><select id="teamDepartment" class="mini-input"><option value="">No Department</option>${(deps||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select><select id="teamManager" class="mini-input"><option value="">No Manager</option>${managers.map(m=>`<option value="${m.id}">${esc(name(m))} • ${esc(m.role)}</option>`).join('')}</select></div><div class="row-actions"><button id="teamCreate" class="btn btn-primary">Create Account</button></div><div id="teamCreateResult" class="publish-result"></div></div>
    <div id="teamEditPanel" class="bo-card" style="margin-top:18px;display:none"><h3>Edit Team Account</h3><input id="teamEditId" type="hidden"><div class="team-form-grid"><input id="teamEditFirst" class="mini-input" placeholder="First name"><input id="teamEditLast" class="mini-input" placeholder="Last name"><select id="teamEditRole" class="mini-input"><option value="agent">Agent</option><option value="team_lead">Team Lead</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="admin">Admin</option></select><select id="teamEditStatus" class="mini-input"><option value="invited">Invited</option><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option></select><input id="teamEditState" class="mini-input" maxlength="2" placeholder="Resident state"><select id="teamEditDepartment" class="mini-input"><option value="">No Department</option>${(deps||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select><select id="teamEditManager" class="mini-input"><option value="">No Manager</option>${managers.map(m=>`<option value="${m.id}">${esc(name(m))} • ${esc(m.role)}</option>`).join('')}</select></div><div class="row-actions"><button id="teamEditCancel" class="tiny-btn">Cancel</button><button id="teamEditSave" class="btn btn-primary">Save Account</button></div></div>
    <div class="bo-card" style="margin-top:18px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h3>Team Accounts</h3><input id="teamSearch" class="mini-input" style="max-width:320px" placeholder="Search accounts"></div><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>State</th><th>Department</th><th>Manager</th><th>Actions</th></tr></thead><tbody id="teamAccountRows">${(users||[]).map(u=>{const nm=name(u),username=u.username||String(u.email||'').split('@')[0],dept=u.departments?.name||(deps||[]).find(d=>d.id===u.department_id)?.name||'—',mgr=(users||[]).find(x=>x.id===u.manager_id);return `<tr data-search="${esc((nm+' '+username+' '+u.role+' '+u.status+' '+dept).toLowerCase())}"><td>${esc(nm)}</td><td>${esc(username)}</td><td><span class="rolebadge">${esc(u.role)}</span></td><td>${esc(u.status)}</td><td>${esc(u.resident_state||'—')}</td><td>${esc(dept)}</td><td>${mgr?esc(name(mgr)):'—'}</td><td><div class="team-actions">${u.role==='owner'?'<span class="pill">Protected</span>':`<button class="tiny-btn" data-team-edit="${u.id}">Edit</button><button class="tiny-btn" data-team-reset="${u.id}" data-team-user="${esc(username)}">Reset Password</button><button class="tiny-btn" data-team-delete="${u.id}" data-team-user="${esc(username)}">Delete</button>`}</div></td></tr>`}).join('')||'<tr><td colspan="8">No accounts found.</td></tr>'}</tbody></table></div></div>`;
    const reload=()=>{delete main.dataset.teamAccountsLive;return renderTeam(main)};$('#teamRefresh',main).onclick=reload;
    $('#teamGenerate',main).onclick=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';let out='AS-';for(let i=0;i<12;i++)out+=chars[Math.floor(Math.random()*chars.length)];$('#teamPassword',main).value=out;};
    $('#teamSearch',main).oninput=()=>{const q=$('#teamSearch',main).value.toLowerCase();main.querySelectorAll('#teamAccountRows tr[data-search]').forEach(r=>r.style.display=r.dataset.search.includes(q)?'':'none');};
    $('#teamCreate',main).onclick=async()=>{const r=$('#teamCreateResult',main);try{const payload={action:'create',username:$('#teamUsername',main).value.trim(),password:$('#teamPassword',main).value,first_name:$('#teamFirst',main).value.trim(),last_name:$('#teamLast',main).value.trim(),role:$('#teamRole',main).value,status:$('#teamStatus',main).value,resident_state:$('#teamState',main).value.trim().toUpperCase()||null,department_id:$('#teamDepartment',main).value||null,manager_id:$('#teamManager',main).value||null};const d=await window.allshieldManageTeamUser(payload);r.textContent='Account created: '+d.username;r.classList.add('show');await reload();}catch(e){r.textContent='Error: '+(e.message||e);r.classList.add('show');}};
    const closeEditor=()=>{$('#teamEditPanel',main).style.display='none';$('#teamEditId',main).value='';};
    $('#teamEditCancel',main).onclick=closeEditor;
    main.querySelectorAll('[data-team-edit]').forEach(b=>b.onclick=()=>{const x=(users||[]).find(u=>u.id===b.dataset.teamEdit);if(!x)return;$('#teamEditId',main).value=x.id;$('#teamEditFirst',main).value=x.first_name||'';$('#teamEditLast',main).value=x.last_name||'';$('#teamEditRole',main).value=x.role;$('#teamEditStatus',main).value=x.status;$('#teamEditState',main).value=x.resident_state||'';$('#teamEditDepartment',main).value=x.department_id||'';$('#teamEditManager',main).value=x.manager_id||'';$('#teamEditPanel',main).style.display='block';$('#teamEditPanel',main).scrollIntoView({behavior:'smooth',block:'center'});});
    $('#teamEditSave',main).onclick=async()=>{try{const user_id=$('#teamEditId',main).value;if(!user_id)throw new Error('Choose an account to edit.');await window.allshieldManageTeamUser({action:'update',user_id,first_name:$('#teamEditFirst',main).value.trim(),last_name:$('#teamEditLast',main).value.trim(),role:$('#teamEditRole',main).value,status:$('#teamEditStatus',main).value,resident_state:$('#teamEditState',main).value.trim().toUpperCase()||null,department_id:$('#teamEditDepartment',main).value||null,manager_id:$('#teamEditManager',main).value||null});window.toast?.('Account updated.');closeEditor();reload();}catch(e){alert(e.message||e)}};
    main.querySelectorAll('[data-team-reset]').forEach(b=>b.onclick=async()=>{const pw=prompt('New temporary password for '+b.dataset.teamUser+' (minimum 8 characters):');if(!pw)return;try{await window.allshieldManageTeamUser({action:'reset_password',user_id:b.dataset.teamReset,password:pw});window.toast?.('Temporary password updated.');}catch(e){alert(e.message||e)}});
    main.querySelectorAll('[data-team-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete '+b.dataset.teamUser+'? This removes the authentication account and profile.'))return;try{await window.allshieldManageTeamUser({action:'delete',user_id:b.dataset.teamDelete});window.toast?.('Account deleted.');reload();}catch(e){alert(e.message||e)}});
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
  main.dataset.promotionsLive='1';
  try{
    const c=await sb(); const {data:auth}=await c.auth.getUser();const actor=auth?.user?.id;
    const [pr,lev,snap,prom]=await Promise.all([c.from('profiles').select('id,first_name,last_name,username,email,role,status').order('created_at'),c.from('promotion_levels').select('*').order('level_order'),c.from('promotion_qualification_snapshots').select('*').order('created_at',{ascending:false}).limit(200),c.from('user_promotions').select('*').order('created_at',{ascending:false}).limit(100)]);
    [pr,lev,snap,prom].forEach(x=>{if(x.error)throw x.error});const people=(pr.data||[]).filter(x=>x.status!=='terminated'),levels=lev.data||[],snaps=snap.data||[],promos=prom.data||[];
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">ORGANIZATION & PROMOTION LADDER</div><h2>Leadership path and qualification control.</h2><p>View the promotion ladder, current qualification snapshots and approved promotion records.</p></div><button id="promoRefresh" class="tiny-btn">Refresh</button></div>${banner}
    <div class="promotion-track">${levels.map(l=>`<div class="promotion-step"><div class="lvl">${Number(l.level_order||0)}</div><strong>${esc(l.name)}</strong><p style="font-size:11px;color:#8497ac">${esc(JSON.stringify(l.requirements||{}))}</p><small>${l.active?'ACTIVE':'INACTIVE'}</small></div>`).join('')}</div>
    <div class="bo-card" style="margin-top:18px"><h3>Approve Promotion</h3><div class="form-grid"><select id="promoUser" class="mini-input"><option value="">Choose team member</option>${people.filter(x=>x.role!=='owner').map(x=>`<option value="${x.id}">${esc(name(x))} • ${esc(x.role)}</option>`).join('')}</select><select id="promoLevel" class="mini-input"><option value="">Choose promotion level</option>${levels.filter(x=>x.active).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div><button id="promoApprove" class="btn btn-primary" style="margin-top:10px">Approve Promotion</button></div>
    <div class="bo-card" style="margin-top:18px"><h3>Latest Qualification Snapshots</h3><table class="admin-table"><tr><th>Team Member</th><th>Month</th><th>Personal</th><th>1st Gen</th><th>Direct Agents</th><th>Compliance</th><th>SOP</th><th>Qualifies</th></tr>${snaps.slice(0,100).map(x=>{const person=people.find(p=>p.id===x.user_id)||{};return `<tr><td>${esc(name(person))}</td><td>${esc(x.qualification_month||'—')}</td><td>${Number(x.personal_enrollments||0)}</td><td>${Number(x.first_generation_enrollments||0)}</td><td>${Number(x.active_direct_agents||0)}</td><td>${x.compliance_passed?'✓':'○'}</td><td>${x.sop_passed?'✓':'○'}</td><td>${x.qualifies?'YES':'NO'}</td></tr>`}).join('')||'<tr><td colspan="8">No qualification snapshots yet.</td></tr>'}</table></div>
    <div class="bo-card" style="margin-top:18px"><h3>Promotion History</h3>${promos.length?`<table class="admin-table"><tr><th>Team Member</th><th>Level</th><th>Status</th><th>Approved</th></tr>${promos.map(x=>{const person=people.find(p=>p.id===x.user_id)||{},level=levels.find(l=>l.id===x.level_id)||{};return `<tr><td>${esc(name(person))}</td><td>${esc(level.name||'—')}</td><td>${esc(x.status)}</td><td>${x.approved_at?new Date(x.approved_at).toLocaleString():'—'}</td></tr>`}).join('')}</table>`:'No promotion records yet.'}</div>`;
    const reload=()=>{delete main.dataset.promotionsLive;return renderPromotions(main)};$('#promoRefresh',main).onclick=reload;
    $('#promoApprove',main).onclick=async()=>{try{const user_id=$('#promoUser',main).value,level_id=$('#promoLevel',main).value;if(!user_id||!level_id)throw new Error('Choose a team member and promotion level.');const {error}=await c.from('user_promotions').insert({user_id,level_id,status:'approved',recommended_by:actor,approved_by:actor,approved_at:new Date().toISOString()});if(error)throw error;window.toast?.('Promotion approved.');reload();}catch(e){window.toast?.('Promotion failed: '+(e.message||e));}};
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
