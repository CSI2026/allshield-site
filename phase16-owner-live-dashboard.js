(()=>{
'use strict';
const VERSION='2026.08.28.003';
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

async function getSB(){
  for(let i=0;i<100;i++){
    if(window.allshieldSupabase)return window.allshieldSupabase;
    await new Promise(r=>setTimeout(r,50));
  }
  throw new Error("Supabase connection did not initialize.");
}

async function ownerEdge(action,payload={}){
  const sb=await getSB();
  const {data,error}=await sb.functions.invoke('owner-dashboard',{body:{action,...payload}});
  if(error)throw error;
  if(!data?.ok)throw new Error(data?.error||'Owner dashboard request failed.');
  return data;
}

function injectStyle(){
  if(document.getElementById('ownerDashboardQueueStyle'))return;
  const s=document.createElement('style');s.id='ownerDashboardQueueStyle';s.textContent=`
  .owner-dashboard-stat{color:inherit;text-align:left;width:100%;cursor:pointer;font:inherit;transition:.18s}
  .owner-dashboard-stat:hover{transform:translateY(-2px);border-color:rgba(123,202,255,.5);background:#10223a}
  .owner-dashboard-stat small{display:block;color:#7f93aa;margin-top:7px;font-size:10px}
  .owner-queue-table{width:100%;border-collapse:collapse}.owner-queue-table th,.owner-queue-table td{padding:12px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left;font-size:12px}.owner-queue-table th{color:#8095ab}
  .owner-agent-link{border:0;background:transparent;color:#78c6ff;font-weight:800;cursor:pointer;padding:0;text-align:left}.owner-agent-link:hover{text-decoration:underline}
  @media(max-width:850px){.owner-queue-wrap{overflow:auto}.owner-queue-table{min-width:760px}}
  `;document.head.appendChild(s);
}

function ownerStat(label,value,kind,sub){
  return `<button class="stat owner-dashboard-stat" type="button" onclick="openOwnerDashboardQueue('${kind}')"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><small>${esc(sub)}</small></button>`;
}

window.loadOwnerLiveDashboard=async function(){
  const stats=document.getElementById("ownerLiveStats");
  const activity=document.getElementById("ownerLiveActivity");
  const health=document.getElementById("ownerLiveHealth");
  if(!stats||!activity||!health)return;
  stats.innerHTML='<div class="bo-card">Loading live company data...</div>';
  activity.innerHTML='Loading live activity...';
  health.innerHTML='Checking live systems...';
  try{
    const data=await ownerEdge('dashboard');
    const m=data.metrics||{};
    stats.innerHTML=[
      ownerStat('ACTIVE FIELD AGENTS',m.active_agents??0,'active_agents','Open exact active agent records'),
      ownerStat('STATES REPRESENTED',m.states_represented??0,'states','Open exact represented states'),
      ownerStat('LICENSING RECORDS',m.licensing_records??0,'licensing_records','Open exact agent licensing records'),
      ownerStat('EXAM READY',m.exam_ready??0,'exam_ready','Open exact readiness-qualified records')
    ].join('');

    const recent=data.recent||[];
    activity.innerHTML=recent.length?recent.map(x=>`<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08)"><strong>${esc(x.title)}</strong><div style="font-size:13px;opacity:.75">${esc(x.detail)}</div><div style="font-size:11px;opacity:.55">${x.date?new Date(x.date).toLocaleString():""}</div></div>`).join(""):'<div style="opacity:.7">No live company activity recorded yet.</div>';

    const h=data.health||{};
    const checks=[["Supabase",h.supabase],["Profiles",h.profiles],["Licensing",h.licensing],["Academy",h.academy],["Courses",h.courses],["CRM",h.crm],["Recruiting",h.recruiting],["Audit",h.audit]];
    health.innerHTML=`${checks.map(x=>`<div style="padding:7px 0">${x[1]?"✓":"✕"} ${esc(x[0])}</div>`).join("")}<div style="margin-top:16px;font-size:12px;opacity:.7">Exam attempts: ${m.exam_attempts??0}<br>Course assignments: ${m.course_assignments??0}<br>Coverage leads: ${m.coverage_leads??0}<br>Career applications: ${m.career_applications??0}<br>Average exam score: ${m.average_exam_score==null?"No attempts yet":m.average_exam_score+"%"}</div>`;
  }catch(e){
    console.error("LIVE OWNER DASHBOARD:",e);
    stats.innerHTML=`<div class="bo-card">Live dashboard error: ${esc(e.message||e)}</div>`;
    activity.innerHTML="Live activity unavailable.";
    health.innerHTML="Live system check unavailable.";
  }
};

window.openOwnerDashboardQueue=function(kind){window.__ownerDashboardQueueKind=kind;window.showOwnerView?.('dashboardqueue',null)};
window.openOwnerDashboardAgent=function(id){if(typeof window.openAgentMasterProfile==='function')window.openAgentMasterProfile(id,'owner');else window.showOwnerView?.('teamaccounts',null)};

async function renderOwnerQueue(main){
  const kind=window.__ownerDashboardQueueKind||'active_agents';
  const labels={active_agents:'Active Field Agents',states:'States Represented',licensing_records:'Licensing Records',exam_ready:'Exam Ready'};
  main.innerHTML='<div class="bo-card">Loading Owner dashboard queue…</div>';
  try{
    const d=await ownerEdge('queue',{kind}),rows=d.rows||[];
    let table='';
    if(kind==='active_agents'){
      table=`<table class="owner-queue-table"><thead><tr><th>Agent</th><th>Role</th><th>Status</th><th>Resident State</th></tr></thead><tbody>${rows.map(x=>`<tr><td><button class="owner-agent-link" onclick="openOwnerDashboardAgent('${esc(x.id)}')">${esc(x.display_name)}</button><br><small>${esc(x.email||'')}</small></td><td>${esc(x.role||'—')}</td><td>${esc(x.status||'—')}</td><td>${esc(x.resident_state||'—')}</td></tr>`).join('')||'<tr><td colspan="4">No active field agents.</td></tr>'}</tbody></table>`;
    }else if(kind==='states'){
      table=`<table class="owner-queue-table"><thead><tr><th>State</th><th>Agents</th><th>Licensing Records</th><th>Readiness Qualified</th><th>Active Licenses</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.state_code)}</strong></td><td>${esc(x.agent_count)}</td><td>${esc(x.licensing_records)}</td><td>${esc(x.ready_records)}</td><td>${esc(x.active_records)}</td></tr>`).join('')||'<tr><td colspan="5">No represented states.</td></tr>'}</tbody></table>`;
    }else{
      table=`<table class="owner-queue-table"><thead><tr><th>Agent</th><th>State</th><th>License Type</th><th>Status</th><th>Readiness</th><th>Expiration</th></tr></thead><tbody>${rows.map(x=>`<tr><td><button class="owner-agent-link" onclick="openOwnerDashboardAgent('${esc(x.user_id)}')">${esc(x.display_name)}</button></td><td>${esc(x.state_code||'—')}</td><td>${esc(x.license_type||'—')}</td><td>${esc(x.status||'—')}</td><td>${Math.round(Number(x.readiness_percent||0))}%</td><td>${x.expiration_date?new Date(x.expiration_date).toLocaleDateString():'—'}</td></tr>`).join('')||'<tr><td colspan="6">No matching licensing records.</td></tr>'}</tbody></table>`;
    }
    main.innerHTML=`<div class="dashboard-head"><div><div class="kicker">OWNER WORK QUEUE</div><h2>${esc(labels[kind]||kind)}</h2><p>${rows.length} exact record${rows.length===1?'':'s'} behind this dashboard destination.</p></div><button class="btn" onclick="showOwnerView('dashboard',null)">← Dashboard</button></div><div class="real-data-banner">LIVE SUPABASE DATA • COUNT AND DESTINATION SHARE ONE SOURCE</div><div class="bo-card owner-queue-wrap" style="margin-top:18px">${table}</div>`;
  }catch(e){main.innerHTML=`<div class="bo-card"><h3>Unable to load Owner queue</h3><p>${esc(e.message||e)}</p><button class="btn" onclick="showOwnerView('dashboard',null)">← Dashboard</button></div>`}
}

function install(){
  injectStyle();
  if(typeof window.registerAllshieldView!=='function'||typeof ownerViews==='undefined'){setTimeout(install,80);return;}
  ownerViews.dashboard=`<div class="dashboard-head"><div><div class="kicker">ALLSHIELD OWNER CONTROL</div><h2>The whole company in one view.</h2><p>Live operations, licensing, training, CRM, recruiting and system health.</p></div><button class="btn btn-primary" onclick="loadOwnerLiveDashboard()">Refresh Live Data</button></div><div class="real-data-banner">LIVE SUPABASE DATA • OWNER ONLY • CLICK A TILE FOR ITS EXACT RECORDS</div><div id="ownerLiveStats" class="stat-grid" style="margin-top:18px"><div class="bo-card">Loading live company data...</div></div><div class="bo-grid" style="margin-top:18px"><div class="bo-card"><h3>Recent Company Activity</h3><div id="ownerLiveActivity">Loading live activity...</div></div><div class="bo-card"><h3>Live System Health</h3><div id="ownerLiveHealth">Checking live systems...</div></div></div>`;
  window.registerAllshieldView('owner','dashboard',async(main)=>{main.innerHTML=ownerViews.dashboard;await window.loadOwnerLiveDashboard();});
  window.registerAllshieldView('owner','dashboardqueue',renderOwnerQueue);
  window.ALLSHIELD_OWNER_DASHBOARD_VERSION=VERSION;
}
install();
})();
