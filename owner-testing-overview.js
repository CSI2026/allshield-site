(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  if(window.ownerViews){
    window.ownerViews.agenttesting=`
      <div class="dashboard-head"><div><div class="kicker">AGENT TESTING OVERSIGHT</div><h2>Live testing, course and exam-readiness visibility.</h2><p>See every field agent's latest score, best score, attempt count, course progress and state readiness. Open View As for the agent-level support dashboard.</p></div><button class="btn btn-primary" onclick="loadOwnerTestingOverview()">Refresh Testing</button></div>
      <div class="real-data-banner">LIVE SUPABASE DATA • OWNER ONLY</div>
      <div class="stat-grid" id="ownerTestingStats" style="margin-top:18px"></div>
      <div class="bo-card" style="margin-top:18px"><div class="team-table-wrap"><table class="team-live-table"><thead><tr><th>Agent</th><th>State</th><th>Latest</th><th>Best</th><th>Attempts</th><th>Course Progress</th><th>Readiness</th><th>Support</th></tr></thead><tbody id="ownerTestingRows"><tr><td colspan="8">Loading live testing data…</td></tr></tbody></table></div></div>`;
  }

  window.loadOwnerTestingOverview=async function(){
    const body=document.getElementById('ownerTestingRows'),stats=document.getElementById('ownerTestingStats');
    if(!body)return;
    if(window.currentAllshieldProfile?.role!=='owner'){body.innerHTML='<tr><td colspan="8">Owner access required.</td></tr>';return;}
    const sb=window.allshieldSupabase;if(!sb){body.innerHTML='<tr><td colspan="8">Supabase is not connected.</td></tr>';return;}
    try{
      const [pR,aR,lR,cR]=await Promise.all([
        sb.from('profiles').select('id,username,first_name,last_name,role,status,resident_state').in('role',['agent','team_lead','manager']).order('last_name'),
        sb.from('exam_attempts').select('user_id,state_code,score_percent,created_at').order('created_at',{ascending:false}).limit(5000),
        sb.from('user_state_licenses').select('user_id,state_code,status,readiness_percent'),
        sb.from('course_assignments').select('user_id,progress_percent,completed_at')
      ]);
      const err=[pR,aR,lR,cR].find(r=>r.error)?.error;if(err)throw err;
      const attempts=aR.data||[],licenses=lR.data||[],courses=cR.data||[];
      let readyCount=0,totalAttempts=attempts.length,scoreSum=0,scoreN=0;
      attempts.forEach(a=>{const n=Number(a.score_percent);if(Number.isFinite(n)){scoreSum+=n;scoreN++;}});
      const rows=(pR.data||[]).map(p=>{
        const pa=attempts.filter(a=>a.user_id===p.id);const scores=pa.map(a=>Number(a.score_percent)).filter(Number.isFinite);
        const latest=scores.length?scores[0]:null,best=scores.length?Math.max(...scores):null;
        const pc=courses.filter(c=>c.user_id===p.id);const courseAvg=pc.length?pc.reduce((s,c)=>s+Number(c.progress_percent||0),0)/pc.length:null;
        const pl=licenses.filter(l=>l.user_id===p.id);const maxReady=pl.length?Math.max(...pl.map(l=>Number(l.readiness_percent||0))):0;
        const examReady=(best!==null&&best>=85&&maxReady>=85);if(examReady)readyCount++;
        const state=p.resident_state||pa[0]?.state_code||pl[0]?.state_code||'—';const name=((p.first_name||'')+' '+(p.last_name||'')).trim()||p.username||'Agent';
        return `<tr><td><strong>${esc(name)}</strong><div class="meta">${esc(p.username||'')}</div></td><td>${esc(state)}</td><td>${latest===null?'—':Math.round(latest)+'%'}</td><td>${best===null?'—':Math.round(best)+'%'}</td><td>${pa.length}</td><td>${courseAvg===null?'—':Math.round(courseAvg)+'%'}</td><td><span class="${examReady?'reqgood':'reqbad'}">${examReady?'Exam Ready':'In Progress'}</span><div class="meta">State readiness ${Math.round(maxReady)}%</div></td><td><button class="tiny-btn" onclick="ownerViewAsAgent('${p.id}','${esc(p.username||'agent')}')">View As</button></td></tr>`;
      });
      body.innerHTML=rows.join('')||'<tr><td colspan="8">No field agents found.</td></tr>';
      if(stats)stats.innerHTML=`<div class="stat"><div class="label">Field Agents</div><div class="value">${(pR.data||[]).length}</div></div><div class="stat"><div class="label">Exam Ready</div><div class="value">${readyCount}</div></div><div class="stat"><div class="label">Test Attempts</div><div class="value">${totalAttempts}</div></div><div class="stat"><div class="label">Average Score</div><div class="value">${scoreN?Math.round(scoreSum/scoreN)+'%':'—'}</div></div>`;
    }catch(e){body.innerHTML=`<tr><td colspan="8">${esc(e.message||e)}</td></tr>`;}
  };

  function injectNav(){
    const side=document.querySelector('#ownerPortal .sidebar');if(!side||side.querySelector('[data-owner-testing]'))return;
    const link=document.createElement('div');link.className='side-link';link.dataset.ownerTesting='1';link.innerHTML='✓ Agent Testing & Scores';link.onclick=function(){window.showOwnerView('agenttesting',this)};
    const academy=[...side.querySelectorAll('.side-link')].find(x=>(x.textContent||'').includes('Academy Governance'));
    if(academy)academy.insertAdjacentElement('afterend',link);else side.appendChild(link);
  }
  injectNav();document.addEventListener('DOMContentLoaded',injectNav);setTimeout(injectNav,500);
  const oldShow=window.showOwnerView;
  if(typeof oldShow==='function')window.showOwnerView=function(view,el){oldShow(view,el);if(view==='agenttesting')setTimeout(()=>window.loadOwnerTestingOverview(),20)};
})();
