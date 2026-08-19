(() => {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pct = (v) => Number.isFinite(Number(v)) ? `${Math.round(Number(v))}%` : '—';
  const fmtDate = (v) => v ? new Date(v).toLocaleString() : '—';
  let activeAgent = null;
  let activeData = null;

  function ownerOnly() {
    const p = window.currentAllshieldProfile;
    if (!p || p.role !== 'owner') throw new Error('Owner access required.');
  }

  function ensureModal() {
    let modal = document.getElementById('ownerViewAsModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'ownerViewAsModal';
    modal.className = 'view-as-modal';
    modal.innerHTML = `
      <div class="view-as-shell">
        <div class="view-as-top">
          <div><div class="kicker">OWNER SUPPORT MODE</div><h2 id="viewAsTitle">View As Agent</h2><p id="viewAsSub">Read-only support view using the selected agent's live records.</p></div>
          <div class="row-actions"><button class="tiny-btn" id="viewAsRefresh">Refresh</button><button class="btn btn-primary" id="viewAsClose">Exit View As</button></div>
        </div>
        <div id="viewAsTabs" class="view-as-tabs"></div>
        <div id="viewAsBody" class="view-as-body"><div class="bo-card">Loading agent data…</div></div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('viewAsClose').onclick = closeOwnerViewAs;
    document.getElementById('viewAsRefresh').onclick = () => activeAgent && ownerViewAsAgent(activeAgent.id, activeAgent.username);
    return modal;
  }

  async function getAgentBundle(userId) {
    ownerOnly();
    const sb = window.allshieldSupabase;
    if (!sb) throw new Error('Supabase is not connected.');
    const [profileR,onboardingR,licensesR,attemptsR,assignmentsR,coursesR,marketR,moduleR] = await Promise.all([
      sb.from('profiles').select('id,username,email,first_name,last_name,role,status,resident_state').eq('id',userId).single(),
      sb.from('onboarding_progress').select('step_key,step_order,completed,completed_at,metadata').eq('user_id',userId).order('step_order'),
      sb.from('user_state_licenses').select('state_code,license_type,is_resident,status,readiness_percent,license_number,expiration_date,metadata').eq('user_id',userId).order('state_code'),
      sb.from('exam_attempts').select('id,exam_type,state_code,score_percent,question_count,correct_count,attempt_payload,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(100),
      sb.from('course_assignments').select('id,course_id,assigned_at,completed_at,progress_percent').eq('user_id',userId).order('assigned_at',{ascending:false}),
      sb.from('courses').select('id,title,category,state_code,version,status,effective_at'),
      sb.from('marketplace_certifications').select('state_code,marketplace,plan_year,status,completed_at,verified_at,training_url,credential_reference').eq('user_id',userId).order('plan_year',{ascending:false}),
      sb.from('academy_module_progress').select('module_id,completed,completed_at,updated_at').eq('user_id',userId)
    ]);
    const results=[profileR,onboardingR,licensesR,attemptsR,assignmentsR,coursesR,marketR,moduleR];
    const err=results.find(r=>r.error)?.error;
    if (err) throw err;
    const courseMap = new Map((coursesR.data||[]).map(c=>[c.id,c]));
    const assignments=(assignmentsR.data||[]).map(a=>({...a,course:courseMap.get(a.course_id)||null}));
    return {profile:profileR.data,onboarding:onboardingR.data||[],licenses:licensesR.data||[],attempts:attemptsR.data||[],assignments,marketplace:marketR.data||[],moduleProgress:moduleR.data||[]};
  }

  function statusPill(v){ return `<span class="pill">${esc(v || '—')}</span>`; }
  function scoreClass(v){ const n=Number(v); return n>=85?'reqgood':n>=70?'pill':'reqbad'; }

  function renderDashboard(d) {
    const attempts=d.attempts;
    const scores=attempts.map(a=>Number(a.score_percent)).filter(Number.isFinite);
    const best=scores.length?Math.max(...scores):null;
    const latest=scores.length?scores[0]:null;
    const complete=d.onboarding.filter(x=>x.completed).length;
    const total=d.onboarding.length;
    const avgCourse=d.assignments.length?d.assignments.reduce((s,a)=>s+Number(a.progress_percent||0),0)/d.assignments.length:0;
    const readyLicenses=d.licenses.filter(l=>Number(l.readiness_percent||0)>=85 || ['licensed','ready','exam_ready'].includes(String(l.status||'').toLowerCase())).length;
    return `
      <div class="real-data-banner">LIVE AGENT DATA • READ-ONLY OWNER SUPPORT VIEW</div>
      <div class="stat-grid">
        <div class="stat"><div class="label">Latest Test</div><div class="value">${latest===null?'—':pct(latest)}</div></div>
        <div class="stat"><div class="label">Best Test</div><div class="value">${best===null?'—':pct(best)}</div></div>
        <div class="stat"><div class="label">Course Progress</div><div class="value">${pct(avgCourse)}</div></div>
        <div class="stat"><div class="label">Onboarding</div><div class="value">${total?`${complete}/${total}`:'—'}</div></div>
      </div>
      <div class="bo-grid" style="margin-top:18px">
        <div class="bo-card"><h3>Agent Profile</h3>
          <div class="requirement"><span>Name</span><strong>${esc(((d.profile.first_name||'')+' '+(d.profile.last_name||'')).trim()||d.profile.username)}</strong></div>
          <div class="requirement"><span>Username</span><strong>${esc(d.profile.username||'—')}</strong></div>
          <div class="requirement"><span>Status</span>${statusPill(d.profile.status)}</div>
          <div class="requirement"><span>Resident State</span><strong>${esc(d.profile.resident_state||'—')}</strong></div>
        </div>
        <div class="bo-card"><h3>Readiness Snapshot</h3>
          <div class="requirement"><span>Exam Attempts</span><strong>${attempts.length}</strong></div>
          <div class="requirement"><span>Assigned Courses</span><strong>${d.assignments.length}</strong></div>
          <div class="requirement"><span>Exam-ready / licensed tracks</span><strong>${readyLicenses}</strong></div>
          <div class="requirement"><span>Marketplace Records</span><strong>${d.marketplace.length}</strong></div>
        </div>
      </div>
      <div class="bo-card" style="margin-top:18px"><h3>Recent Test Activity</h3>${renderAttempts(d.attempts.slice(0,8))}</div>`;
  }

  function renderAttempts(rows) {
    if(!rows.length) return '<div class="activity">No exam attempts recorded yet.</div>';
    return `<div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Date</th><th>State</th><th>Exam</th><th>Score</th><th>Correct</th><th>Status</th></tr></thead><tbody>${rows.map(a=>{
      const score=Number(a.score_percent||0); const pass=score>=85;
      return `<tr><td>${esc(fmtDate(a.created_at))}</td><td>${esc(a.state_code||'—')}</td><td>${esc(a.exam_type||'practice')}</td><td><strong>${pct(score)}</strong></td><td>${esc(a.correct_count??'—')}/${esc(a.question_count??'—')}</td><td><span class="${pass?'reqgood':'reqbad'}">${pass?'Ready-range':'Needs work'}</span></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function renderLicensing(d) {
    return `<div class="bo-card"><h3>Licensing & State Readiness</h3>${d.licenses.length?`<div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>State</th><th>Type</th><th>Resident</th><th>Status</th><th>Readiness</th><th>Expiration</th></tr></thead><tbody>${d.licenses.map(l=>`<tr><td><strong>${esc(l.state_code)}</strong></td><td>${esc(l.license_type)}</td><td>${l.is_resident?'Yes':'No'}</td><td>${statusPill(l.status)}</td><td>${pct(l.readiness_percent)}</td><td>${esc(l.expiration_date||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="activity">No licensing records yet.</div>'}</div>`;
  }

  function renderCourses(d) {
    const courseRows=d.assignments.map(a=>`<tr><td>${esc(a.course?.title||'Course')}</td><td>${esc(a.course?.state_code||'National')}</td><td>${pct(a.progress_percent)}</td><td>${a.completed_at?'Complete':'In progress'}</td><td>${esc(fmtDate(a.assigned_at))}</td></tr>`).join('');
    return `<div class="bo-grid"><div class="bo-card"><h3>Assigned Courses</h3>${courseRows?`<div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Course</th><th>State</th><th>Progress</th><th>Status</th><th>Assigned</th></tr></thead><tbody>${courseRows}</tbody></table></div>`:'<div class="activity">No courses assigned.</div>'}</div><div class="bo-card"><h3>Practice Tests & Scores</h3>${renderAttempts(d.attempts)}</div></div>`;
  }

  function renderOnboarding(d) {
    return `<div class="bo-card"><h3>Agent Onboarding</h3><div class="checklist">${d.onboarding.length?d.onboarding.map(x=>`<div class="checkitem"><div style="width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:${x.completed?'rgba(55,190,120,.18)':'rgba(255,255,255,.06)'}">${x.completed?'✓':'•'}</div><div><strong>${esc(x.step_key.replaceAll('_',' '))}</strong><span>${x.completed?`Completed ${esc(fmtDate(x.completed_at))}`:'Not completed'}</span></div></div>`).join(''):'<div class="activity">No onboarding checklist initialized.</div>'}</div></div>`;
  }

  function renderMarketplace(d) {
    return `<div class="bo-card"><h3>CMS / Marketplace Certification</h3>${d.marketplace.length?`<div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>State</th><th>Marketplace</th><th>Plan Year</th><th>Status</th><th>Completed</th><th>Verified</th></tr></thead><tbody>${d.marketplace.map(m=>`<tr><td>${esc(m.state_code||'—')}</td><td>${esc(m.marketplace||'—')}</td><td>${esc(m.plan_year||'—')}</td><td>${statusPill(m.status)}</td><td>${esc(fmtDate(m.completed_at))}</td><td>${esc(fmtDate(m.verified_at))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="activity">No marketplace certification record yet.</div>'}</div>`;
  }

  function setView(tab) {
    if(!activeData) return;
    const body=document.getElementById('viewAsBody');
    document.querySelectorAll('#viewAsTabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    body.innerHTML = tab==='dashboard'?renderDashboard(activeData):tab==='licensing'?renderLicensing(activeData):tab==='courses'?renderCourses(activeData):tab==='onboarding'?renderOnboarding(activeData):renderMarketplace(activeData);
  }

  window.ownerViewAsAgent = async function(userId, username='agent') {
    try {
      ownerOnly();
      const modal=ensureModal();
      modal.classList.add('show');
      document.getElementById('viewAsBody').innerHTML='<div class="bo-card">Loading live agent dashboard…</div>';
      const data=await getAgentBundle(userId);
      if(!['agent','team_lead','manager'].includes(data.profile.role)) throw new Error('View As is available for field-agent profiles only.');
      activeAgent={id:userId,username:username||data.profile.username}; activeData=data;
      const name=((data.profile.first_name||'')+' '+(data.profile.last_name||'')).trim()||data.profile.username||username;
      document.getElementById('viewAsTitle').textContent=`View As: ${name}`;
      document.getElementById('viewAsSub').textContent='Read-only support mode. You are seeing this agent’s live progress, scores, licensing and certification data without changing their account.';
      const tabs=[['dashboard','Dashboard'],['licensing','Licensing'],['courses','Courses & Tests'],['onboarding','Onboarding'],['marketplace','CMS / Marketplace']];
      document.getElementById('viewAsTabs').innerHTML=tabs.map(([k,l])=>`<button class="tiny-btn" data-tab="${k}" onclick="window.ownerViewAsTab('${k}')">${l}</button>`).join('');
      setView('dashboard');
    } catch(e) {
      const modal=ensureModal(); modal.classList.add('show');
      document.getElementById('viewAsBody').innerHTML=`<div class="bo-card"><strong>Unable to open View As.</strong><p>${esc(e.message||e)}</p></div>`;
    }
  };
  window.ownerViewAsTab=setView;
  window.closeOwnerViewAs=function(){document.getElementById('ownerViewAsModal')?.classList.remove('show');activeAgent=null;activeData=null;};

  const originalRefresh=window.refreshTeamAccounts;
  if (typeof originalRefresh==='function') {
    window.refreshTeamAccounts=async function(){
      await originalRefresh();
      try{
        if(window.currentAllshieldProfile?.role!=='owner') return;
        const users=await window.allshieldListTeamUsers();
        const rows=[...document.querySelectorAll('#teamAccountRows tr[data-search]')];
        rows.forEach((row,i)=>{
          const u=users[i]; if(!u || !['agent','team_lead','manager'].includes(u.role)) return;
          const actions=row.querySelector('.team-actions'); if(!actions || actions.querySelector('[data-view-as]')) return;
          const btn=document.createElement('button');btn.className='tiny-btn';btn.dataset.viewAs='1';btn.textContent='View As';btn.onclick=()=>window.ownerViewAsAgent(u.id,u.username||'agent');actions.prepend(btn);
        });
      }catch(e){console.error('View As button injection failed',e)}
    };
  }

  const style=document.createElement('style');
  style.textContent=`
    .view-as-modal{position:fixed;inset:0;z-index:99999;background:rgba(2,8,16,.94);display:none;overflow:auto;padding:24px}.view-as-modal.show{display:block}
    .view-as-shell{max-width:1320px;margin:0 auto;background:#07111f;border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:24px;min-height:calc(100vh - 48px);box-shadow:0 30px 90px rgba(0,0,0,.45)}
    .view-as-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:18px}.view-as-top h2{margin:4px 0}.view-as-top p{color:#8fa2b8;max-width:780px}
    .view-as-tabs{display:flex;flex-wrap:wrap;gap:8px;padding:18px 0}.view-as-tabs .active{outline:2px solid rgba(58,154,255,.55);background:rgba(58,154,255,.16)}
    .view-as-body{padding-bottom:30px}@media(max-width:720px){.view-as-modal{padding:8px}.view-as-shell{padding:14px}.view-as-top{flex-direction:column}}
  `;
  document.head.appendChild(style);
})();
