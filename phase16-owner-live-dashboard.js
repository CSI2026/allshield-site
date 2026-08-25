(()=>{
const esc=v=>String(v??"")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;");

async function getSB(){
  for(let i=0;i<100;i++){
    if(window.allshieldSupabase)return window.allshieldSupabase;
    await new Promise(r=>setTimeout(r,50));
  }
  throw new Error("Supabase connection did not initialize.");
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
    const sb=await getSB();

    const {data,error}=await sb.functions.invoke("owner-dashboard",{
      body:{action:"dashboard"}
    });

    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||"Owner dashboard failed.");

    const m=data.metrics||{};

    stats.innerHTML=`
      <div class="stat">
        <div class="label">ACTIVE FIELD AGENTS</div>
        <div class="value">${m.active_agents ?? 0}</div>
      </div>

      <div class="stat">
        <div class="label">STATES REPRESENTED</div>
        <div class="value">${m.states_represented ?? 0}</div>
      </div>

      <div class="stat">
        <div class="label">LICENSING RECORDS</div>
        <div class="value">${m.licensing_records ?? 0}</div>
      </div>

      <div class="stat">
        <div class="label">EXAM READY</div>
        <div class="value">${m.exam_ready ?? 0}</div>
      </div>
    `;

    const recent=data.recent||[];

    activity.innerHTML=recent.length
      ?recent.map(x=>`
        <div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08)">
          <strong>${esc(x.title)}</strong>
          <div style="font-size:13px;opacity:.75">${esc(x.detail)}</div>
          <div style="font-size:11px;opacity:.55">
            ${x.date?new Date(x.date).toLocaleString():""}
          </div>
        </div>
      `).join("")
      :'<div style="opacity:.7">No live company activity recorded yet.</div>';

    const h=data.health||{};
    const checks=[
      ["Supabase",h.supabase],
      ["Profiles",h.profiles],
      ["Licensing",h.licensing],
      ["Academy",h.academy],
      ["Courses",h.courses],
      ["CRM",h.crm],
      ["Recruiting",h.recruiting],
      ["Audit",h.audit]
    ];

    health.innerHTML=`
      ${checks.map(x=>`
        <div style="padding:7px 0">
          ${x[1]?"✓":"✕"} ${esc(x[0])}
        </div>
      `).join("")}

      <div style="margin-top:16px;font-size:12px;opacity:.7">
        Exam attempts: ${m.exam_attempts ?? 0}<br>
        Course assignments: ${m.course_assignments ?? 0}<br>
        Coverage leads: ${m.coverage_leads ?? 0}<br>
        Career applications: ${m.career_applications ?? 0}<br>
        Average exam score:
        ${m.average_exam_score==null?"No attempts yet":m.average_exam_score+"%"}
      </div>
    `;

  }catch(e){
    console.error("LIVE OWNER DASHBOARD:",e);

    stats.innerHTML=`
      <div class="bo-card">
        Live dashboard error: ${esc(e.message||e)}
      </div>`;

    activity.innerHTML="Live activity unavailable.";
    health.innerHTML="Live system check unavailable.";
  }
};

function install(){
  if(typeof window.registerAllshieldView!=='function' || typeof ownerViews==='undefined'){
    setTimeout(install,80);
    return;
  }
  ownerViews.dashboard=`
    <div class="dashboard-head">
      <div><div class="kicker">ALLSHIELD OWNER CONTROL</div><h2>The whole company in one view.</h2><p>Live operations, licensing, training, CRM, recruiting and system health.</p></div>
      <button class="btn btn-primary" onclick="loadOwnerLiveDashboard()">Refresh Live Data</button>
    </div>
    <div class="real-data-banner">LIVE SUPABASE DATA • OWNER ONLY</div>
    <div id="ownerLiveStats" class="stat-grid" style="margin-top:18px"><div class="bo-card">Loading live company data...</div></div>
    <div class="bo-grid" style="margin-top:18px">
      <div class="bo-card"><h3>Recent Company Activity</h3><div id="ownerLiveActivity">Loading live activity...</div></div>
      <div class="bo-card"><h3>Live System Health</h3><div id="ownerLiveHealth">Checking live systems...</div></div>
    </div>`;
  window.registerAllshieldView('owner','dashboard',async(main)=>{
    main.innerHTML=ownerViews.dashboard;
    await window.loadOwnerLiveDashboard();
  });
}
install();
})();
