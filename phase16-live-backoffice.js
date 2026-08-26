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
      c.from('profiles').select('id,first_name,last_name,email,username,role,status').order('created_at',{ascending:true}),
      c.from('user_permissions').select('id,user_id,permission_key,allowed')
    ]);
    [pr,up].forEach(x=>{if(x.error)throw x.error});
    const profiles=pr.data||[],overrides=up.data||[];
    const roles=['owner','admin','manager','team_lead','agent','staff'];
    const labels={owner:'Owner',admin:'Admin',manager:'Manager',team_lead:'Team Lead',agent:'Agent',staff:'Staff'};
    const scopes={owner:'Full platform control',admin:'Operations and administrative controls',manager:'Assigned team and management tools',team_lead:'Assigned team and coaching tools',agent:'Personal profile and assigned production tools',staff:'Assigned internal tools'};
    const counts=Object.fromEntries(roles.map(r=>[r,profiles.filter(x=>x.role===r&&x.status!=='terminated').length]));
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">ROLES & PERMISSIONS</div><h2>Live access control.</h2><p>Manage role-based access and explicit user-level permission overrides.</p></div></div>${banner}
      <div class="bo-card" style="margin-top:18px"><table class="rank-table"><tr><th>Role</th><th>Active People</th><th>Default Scope</th></tr>${roles.map(r=>`<tr><td>${labels[r]}</td><td>${counts[r]||0}</td><td>${scopes[r]}</td></tr>`).join('')}</table></div>
      <div class="bo-card" style="margin-top:18px"><h3>Add / Update Permission Override</h3><div class="form-grid"><div><label>Team Member</label><select id="permUser" class="mini-input">${profiles.map(x=>`<option value="${x.id}">${esc(name(x))} • ${esc(x.role)}</option>`).join('')}</select></div><div><label>Permission Key</label><input id="permKey" class="mini-input" placeholder="e.g. finance.view"></div><div><label>Allowed</label><select id="permAllowed" class="mini-input"><option value="true">Yes</option><option value="false">No</option></select></div></div><button id="permSave" class="btn btn-primary" style="margin-top:10px">Save Override</button></div>
      <div class="bo-card" style="margin-top:18px"><h3>Individual Permission Overrides</h3><div id="permList"></div></div>`;
    const refresh=async()=>{const {data,error}=await c.from('user_permissions').select('id,user_id,permission_key,allowed').order('permission_key');if(error)throw error;const rows=data||[];$('#permList',main).innerHTML=rows.length?`<table class="admin-table"><tr><th>Team Member</th><th>Permission</th><th>Allowed</th><th></th></tr>${rows.map(x=>{const person=profiles.find(p=>p.id===x.user_id)||{};return `<tr><td>${esc(name(person))}</td><td>${esc(x.permission_key)}</td><td>${x.allowed?'Yes':'No'}</td><td><button class="tiny-btn" data-perm-delete="${x.id}">Remove</button></td></tr>`}).join('')}</table>`:'<div style="opacity:.72">No individual permission overrides are configured.</div>';main.querySelectorAll('[data-perm-delete]').forEach(b=>b.onclick=async()=>{const {error}=await c.from('user_permissions').delete().eq('id',b.dataset.permDelete);if(error)return alert(error.message);await refresh();});};
    $('#permSave',main).onclick=async()=>{const user_id=$('#permUser',main).value,permission_key=$('#permKey',main).value.trim();if(!permission_key)return alert('Enter a permission key.');const allowed=$('#permAllowed',main).value==='true';const {error}=await c.from('user_permissions').upsert({user_id,permission_key,allowed},{onConflict:'user_id,permission_key'});if(error)return alert(error.message);$('#permKey',main).value='';await refresh();};
    await refresh();
  }catch(e){main.innerHTML=empty('Data unavailable: '+(e.message||e));}
}

async function renderTeam(main){
  try{
    const c=await sb();
    const [users,deps]=await Promise.all([window.allshieldListTeamUsers(),window.allshieldListDepartments()]);
    const leaders=users.filter(x=>['owner','admin','manager','team_lead'].includes(x.role)&&x.status!=='terminated');
    const fullName=x=>[x.first_name,x.last_name].filter(Boolean).join(' ')||x.username||x.email||'Account';
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">TEAM ACCOUNTS</div><h2>People, roles and reporting lines.</h2><p>Create and manage live Allshield user accounts, departments and manager assignments.</p></div></div>${banner}
      <div class="bo-card" style="margin-top:18px"><h3>Create Team Account</h3><div class="team-form-grid"><div><label>First Name</label><input id="teamFirstNew" class="mini-input"></div><div><label>Last Name</label><input id="teamLastNew" class="mini-input"></div><div><label>Username</label><input id="teamUsernameNew" class="mini-input"></div><div><label>Temporary Password</label><div style="display:flex;gap:8px"><input id="teamPasswordNew" class="mini-input"><button id="teamGeneratePassword" class="tiny-btn">Generate</button></div></div><div><label>Role</label><select id="teamRoleNew" class="mini-input"><option>agent</option><option>team_lead</option><option>manager</option><option>staff</option><option>admin</option></select></div><div><label>Status</label><select id="teamStatusNew" class="mini-input"><option>onboarding</option><option>invited</option><option>active</option><option>inactive</option></select></div><div><label>Resident State</label><input id="teamStateNew" maxlength="2" class="mini-input" placeholder="TX"></div><div><label>Department</label><select id="teamDepartmentNew" class="mini-input"><option value="">None</option>${deps.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div><div><label>Manager</label><select id="teamManagerNew" class="mini-input"><option value="">None</option>${leaders.map(x=>`<option value="${x.id}">${esc(fullName(x))} • ${esc(x.role)}</option>`).join('')}</select></div></div><button id="teamCreateNew" class="btn btn-primary" style="margin-top:12px">Create Account</button><div id="teamCreateMsg" style="margin-top:10px"></div></div>
      <div class="bo-card" style="margin-top:18px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h3 style="margin:0">Live Team Accounts</h3><input id="teamSearchLive" class="mini-input" style="max-width:300px" placeholder="Search"></div><div class="team-table-wrap" style="margin-top:12px"><table class="team-live-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>State</th><th>Department</th><th>Manager</th><th>Actions</th></tr></thead><tbody id="teamLiveRows"></tbody></table></div></div>`;
    const generated=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';let out='AS-';for(let i=0;i<12;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out;};
    $('#teamGeneratePassword',main).onclick=()=>{$('#teamPasswordNew',main).value=generated();};
    const rows=()=>{const q=($('#teamSearchLive',main).value||'').toLowerCase();$('#teamLiveRows',main).innerHTML=users.filter(x=>(fullName(x)+' '+(x.username||x.email||'')+' '+x.role+' '+x.status).toLowerCase().includes(q)).map(x=>{const owner=x.role==='owner';const mgr=users.find(m=>m.id===x.manager_id);return `<tr><td><input data-team-first="${x.id}" class="mini-input" value="${esc(x.first_name||'')}" style="min-width:105px"><input data-team-last="${x.id}" class="mini-input" value="${esc(x.last_name||'')}" style="min-width:105px;margin-top:4px"></td><td>${esc(x.username||((x.email||'').split('@')[0]))}</td><td><select data-team-role="${x.id}" class="mini-input" ${owner?'disabled':''}>${['owner','admin','manager','team_lead','agent','staff'].map(r=>`<option ${x.role===r?'selected':''}>${r}</option>`).join('')}</select></td><td><select data-team-status="${x.id}" class="mini-input" ${owner?'disabled':''}>${['invited','onboarding','active','inactive','terminated'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select></td><td><input data-team-state="${x.id}" class="mini-input" maxlength="2" value="${esc(x.resident_state||'')}"></td><td><select data-team-dept="${x.id}" class="mini-input"><option value="">None</option>${deps.map(d=>`<option value="${d.id}" ${x.department_id===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></td><td><select data-team-manager="${x.id}" class="mini-input" ${owner?'disabled':''}><option value="">None</option>${leaders.filter(l=>l.id!==x.id).map(l=>`<option value="${l.id}" ${x.manager_id===l.id?'selected':''}>${esc(fullName(l))}</option>`).join('')}</select></td><td><div class="team-actions">${owner?'<span class="pill">OWNER PROTECTED</span>':`<button class="tiny-btn" data-team-save="${x.id}">Save</button><button class="tiny-btn" data-team-reset="${x.id}">Reset Password</button><button class="tiny-btn" data-team-delete="${x.id}">Delete</button>`}</div></td></tr>`}).join('')||'<tr><td colspan="8">No matching accounts.</td></tr>';
      main.querySelectorAll('[data-team-save]').forEach(b=>b.onclick=async()=>{try{const id=b.dataset.teamSave;await window.allshieldManageTeamUser({action:'update',user_id:id,first_name:main.querySelector(`[data-team-first="${id}"]`).value,last_name:main.querySelector(`[data-team-last="${id}"]`).value,role:main.querySelector(`[data-team-role="${id}"]`).value,status:main.querySelector(`[data-team-status="${id}"]`).value,resident_state:main.querySelector(`[data-team-state="${id}"]`).value,department_id:main.querySelector(`[data-team-dept="${id}"]`).value||null,manager_id:main.querySelector(`[data-team-manager="${id}"]`).value||null});alert('Account updated.');await renderTeam(main);}catch(e){alert(e.message||e)}});
      main.querySelectorAll('[data-team-reset]').forEach(b=>b.onclick=async()=>{const p=prompt('Enter a new temporary password (minimum 8 characters):',generated());if(!p)return;try{await window.allshieldManageTeamUser({action:'reset_password',user_id:b.dataset.teamReset,password:p});alert('Temporary password updated.');}catch(e){alert(e.message||e)}});
      main.querySelectorAll('[data-team-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this team account?'))return;try{await window.allshieldManageTeamUser({action:'delete',user_id:b.dataset.teamDelete});await renderTeam(main);}catch(e){alert(e.message||e)}});
    };
    $('#teamSearchLive',main).oninput=rows;rows();
    $('#teamCreateNew',main).onclick=async()=>{try{const payload={action:'create',first_name:$('#teamFirstNew',main).value.trim(),last_name:$('#teamLastNew',main).value.trim(),username:$('#teamUsernameNew',main).value.trim(),password:$('#teamPasswordNew',main).value,role:$('#teamRoleNew',main).value,status:$('#teamStatusNew',main).value,resident_state:$('#teamStateNew',main).value.trim().toUpperCase()||null,department_id:$('#teamDepartmentNew',main).value||null,manager_id:$('#teamManagerNew',main).value||null};const d=await window.allshieldManageTeamUser(payload);$('#teamCreateMsg',main).textContent='Created '+d.username;await renderTeam(main);}catch(e){$('#teamCreateMsg',main).textContent='Error: '+(e.message||e);}};
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
    const [profilesQ,levelsQ,promosQ,snapsQ]=await Promise.all([
      c.from('profiles').select('id,first_name,last_name,email,username,role,status,manager_id').order('created_at'),
      c.from('promotion_levels').select('*').eq('active',true).order('level_order'),
      c.from('user_promotions').select('*').order('created_at',{ascending:false}),
      c.from('promotion_qualification_snapshots').select('*').order('created_at',{ascending:false})
    ]);
    [profilesQ,levelsQ,promosQ,snapsQ].forEach(x=>{if(x.error)throw x.error});
    const people=(profilesQ.data||[]).filter(x=>x.status!=='terminated'),levels=levelsQ.data||[],promos=promosQ.data||[],snaps=snapsQ.data||[];
    const pm=Object.fromEntries(people.map(x=>[x.id,x]));
    const who=x=>[x.first_name,x.last_name].filter(Boolean).join(' ')||x.username||x.email||'Account';
    const children=id=>people.filter(x=>x.manager_id===id);
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">HIERARCHY & PROMOTIONS</div><h2>Organization and promotion ladder.</h2><p>Live reporting lines, qualification snapshots and approved promotion levels.</p></div></div>${banner}
      <div class="bo-card" style="margin-top:18px"><h3>Organization</h3>${people.map(x=>`<div class="resource"><span><strong>${esc(who(x))}</strong><small style="display:block">${esc(x.role)} • Manager: ${esc(x.manager_id?who(pm[x.manager_id]||{}):'None')} • ${children(x.id).length} direct report(s)</small></span><span class="pill">${esc(x.status)}</span></div>`).join('')||'No team accounts.'}</div>
      <div class="bo-card" style="margin-top:18px"><h3>Promotion Ladder</h3>${levels.map(x=>`<div class="resource"><span><strong>${esc(x.level_order+'. '+x.name)}</strong><small style="display:block">${esc(JSON.stringify(x.requirements||{}))}</small></span><span class="pill">${esc(x.code)}</span></div>`).join('')||'No promotion levels configured.'}</div>
      <div class="bo-card" style="margin-top:18px"><h3>Record Promotion</h3><div class="form-grid"><div><label>Team Member</label><select id="promoUser" class="mini-input">${people.filter(x=>x.role!=='owner').map(x=>`<option value="${x.id}">${esc(who(x))} • ${esc(x.role)}</option>`).join('')}</select></div><div><label>Level</label><select id="promoLevel" class="mini-input">${levels.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div><div><label>Status</label><select id="promoStatus" class="mini-input"><option>approved</option><option>pending</option></select></div></div><button id="promoSave" class="btn btn-primary" style="margin-top:10px">Record Promotion</button></div>
      <div class="bo-card" style="margin-top:18px"><h3>Promotion History</h3><div id="promoHistory"></div></div>
      <div class="bo-card" style="margin-top:18px"><h3>Qualification Snapshots</h3>${snaps.length?`<table class="admin-table"><tr><th>Team Member</th><th>Month</th><th>Personal</th><th>1st Gen</th><th>Direct Agents</th><th>Compliance</th><th>SOP</th><th>Qualifies</th></tr>${snaps.slice(0,100).map(x=>`<tr><td>${esc(who(pm[x.user_id]||{}))}</td><td>${esc(x.qualification_month||'—')}</td><td>${Number(x.personal_enrollments||0)}</td><td>${Number(x.first_generation_enrollments||0)}</td><td>${Number(x.active_direct_agents||0)}</td><td>${x.compliance_passed?'Yes':'No'}</td><td>${x.sop_passed?'Yes':'No'}</td><td>${x.qualifies?'Yes':'No'}</td></tr>`).join('')}</table>`:'No qualification snapshots recorded.'}</div>`;
    const renderHistory=()=>{$('#promoHistory',main).innerHTML=promos.length?`<table class="admin-table"><tr><th>Team Member</th><th>Level</th><th>Status</th><th>Approved</th><th></th></tr>${promos.map(x=>{const l=levels.find(v=>v.id===x.level_id);return `<tr><td>${esc(who(pm[x.user_id]||{}))}</td><td>${esc(l?.name||'Unknown')}</td><td>${esc(x.status)}</td><td>${x.approved_at?new Date(x.approved_at).toLocaleString():'—'}</td><td>${x.status==='pending'?`<button class="tiny-btn" data-promo-approve="${x.id}">Approve</button>`:''}</td></tr>`}).join('')}</table>`:'No promotions recorded.';main.querySelectorAll('[data-promo-approve]').forEach(b=>b.onclick=async()=>{const {error}=await c.from('user_promotions').update({status:'approved',approved_by:(await c.auth.getUser()).data.user.id,approved_at:new Date().toISOString()}).eq('id',b.dataset.promoApprove);if(error)return alert(error.message);await renderPromotions(main);});};renderHistory();
    $('#promoSave',main).onclick=async()=>{const {data:u}=await c.auth.getUser();const status=$('#promoStatus',main).value;const {error}=await c.from('user_promotions').insert({user_id:$('#promoUser',main).value,level_id:$('#promoLevel',main).value,status,recommended_by:u.user.id,approved_by:status==='approved'?u.user.id:null,approved_at:status==='approved'?new Date().toISOString():null});if(error)return alert(error.message);await renderPromotions(main);};
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
