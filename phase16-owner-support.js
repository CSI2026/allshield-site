(()=>{
const sb=window.allshieldSupabase;
if(!sb){console.error("Owner Support: Supabase unavailable");return;}

let supportSession=null;
window.allshieldSupportContext=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({
"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const agentName=p=>{
const n=`${p?.first_name||""} ${p?.last_name||""}`.trim();
return n||p?.username||p?.email||"Agent";
};

window.allshieldEffectiveUserId=async()=>{
if(window.allshieldSupportContext?.active)
return window.allshieldSupportContext.targetUserId;
const {data,error}=await sb.auth.getUser();
if(error)throw error;
return data?.user?.id||null;
};

async function ownerUser(){
const {data,error}=await sb.auth.getUser();
if(error)throw error;
return data?.user||null;
}

async function getAgent(id){
const {data,error}=await sb.from("profiles")
.select("id,username,email,first_name,last_name,role,status,resident_state")
.eq("id",id).single();
if(error)throw error;
if(!["agent","team_lead","manager"].includes(data.role))
throw new Error("View As is available for field agents only.");
return data;
}

async function beginSupport(profile){
  const owner=await ownerUser();
  if(!owner)throw new Error("Owner session unavailable.");

  const {data,error}=await sb.from("owner_support_sessions").insert({
    owner_id:owner.id,
    target_user_id:profile.id,
    reason:"Owner View As support",
    metadata:{username:profile.username||null,target_role:profile.role}
  }).select("id").single();

  if(error)throw error;
  supportSession=data.id;
}

async function audit(actionKey,details={}){
  if(!supportSession||!window.allshieldSupportContext?.active)return;

  const owner=await ownerUser();
  if(!owner)return;

  const {error}=await sb.from("owner_support_actions").insert({
    support_session_id:supportSession,
    owner_id:owner.id,
    target_user_id:window.allshieldSupportContext.targetUserId,
    action_key:actionKey,
    details
  });

  if(error)console.error("Support audit error:",error);
}

async function endSupport(){
  if(!supportSession)return;
  await sb.from("owner_support_sessions")
    .update({ended_at:new Date().toISOString()})
    .eq("id",supportSession);
  supportSession=null;
}

function ensureBanner(){
  let b=document.getElementById("ownerSupportBanner");
  if(b)return b;

  b=document.createElement("div");
  b.id="ownerSupportBanner";
  b.innerHTML='<div><strong id="ownerSupportAgent">OWNER SUPPORT MODE</strong><span>You remain signed in as Owner. Support actions are audited.</span></div><button class="btn btn-primary" onclick="exitOwnerViewAs()">Exit View As</button>';

  document.body.appendChild(b);

  const style=document.createElement("style");
  style.textContent='#ownerSupportBanner{position:fixed;left:0;right:0;top:0;z-index:1000000;display:none;align-items:center;justify-content:space-between;gap:18px;padding:10px 20px;background:#6937df;color:#fff;box-shadow:0 8px 25px rgba(0,0,0,.35)}#ownerSupportBanner.show{display:flex}#ownerSupportBanner div{display:flex;align-items:center;gap:14px;flex-wrap:wrap}#ownerSupportBanner span{font-size:12px;opacity:.9}.owner-support-active #agentPortal{padding-top:58px}';
  document.head.appendChild(style);

  return b;
}

window.ownerViewAsAgent=async function(userId){
  try{
    const profile=await getAgent(userId);
    await beginSupport(profile);

    window.allshieldSupportContext={
      active:true,
      targetUserId:profile.id,
      targetProfile:profile
    };

    document.body.classList.add("owner-support-active");

    const b=ensureBanner();
    document.getElementById("ownerSupportAgent").textContent=
      `Viewing as ${agentName(profile)} • Owner Support Mode`;
    b.classList.add("show");

    document.getElementById("ownerPortal")?.classList.remove("show");
    document.getElementById("adminPortal")?.classList.remove("show");
    document.getElementById("agentPortal")?.classList.add("show");

    const first=document.querySelector("#agentPortal .sidebar .side-link");
    if(first&&typeof window.showAgentView==="function"){
      window.showAgentView("dashboard",first);
    }

    await audit("view_as_started",{username:profile.username||null});
    window.scrollTo({top:0,behavior:"auto"});
  }catch(e){
    console.error(e);
    alert(e.message||String(e));
  }
};

window.exitOwnerViewAs=async function(){
  try{
    await audit("view_as_ended");
    await endSupport();
  }catch(e){
    console.error(e);
  }

  window.allshieldSupportContext=null;
  document.body.classList.remove("owner-support-active");
  document.getElementById("ownerSupportBanner")?.classList.remove("show");
  document.getElementById("agentPortal")?.classList.remove("show");
  document.getElementById("ownerPortal")?.classList.add("show");

  const first=document.querySelector("#ownerPortal .sidebar .side-link");
  if(first&&typeof window.showOwnerView==="function"){
    window.showOwnerView("dashboard",first);
  }
};

window.allshieldSaveOnboardingStep=async function(stepKey,completed,metadata={}){
  const userId=await window.allshieldEffectiveUserId();
  if(!userId)return false;

  const {error}=await sb.from("onboarding_progress").upsert({
    user_id:userId,
    step_key:stepKey,
    completed,
    completed_at:completed?new Date().toISOString():null,
    metadata
  },{
    onConflict:"user_id,step_key"
  });

  if(error)throw error;

  await audit("onboarding_step",{
    step_key:stepKey,
    completed
  });

  return true;
};

window.allshieldSaveExamAttempt=async function(payload){
  const userId=await window.allshieldEffectiveUserId();
  if(!userId)return false;

  const {error}=await sb.from("exam_attempts").insert({
    user_id:userId,
    exam_type:payload.examType||"practice",
    state_code:payload.stateCode||null,
    score_percent:payload.scorePercent,
    question_count:payload.questionCount,
    correct_count:payload.correctCount,
    attempt_payload:payload.attemptPayload||{}
  });

  if(error)throw error;

  await audit("exam_attempt",{
    exam_type:payload.examType||"practice",
    state_code:payload.stateCode||null,
    score_percent:payload.scorePercent
  });

  return true;
};

window.allshieldSaveStateLicense=async function(payload){
  const userId=await window.allshieldEffectiveUserId();
  if(!userId)return false;

  const row={
    user_id:userId,
    state_code:payload.stateCode,
    license_type:payload.licenseType||"Health",
    status:payload.status||"studying",
    readiness_percent:Number(payload.readinessPercent||0),
    is_resident:Boolean(payload.isResident)
  };

  const {error}=await sb
    .from("user_state_licenses")
    .upsert(row,{onConflict:"user_id,state_code,license_type"});

  if(error)throw error;

  await audit("state_license_update",{
    state_code:row.state_code,
    status:row.status,
    readiness_percent:row.readiness_percent
  });

  return true;
};

const testingView=`
<div class="dashboard-head">
  <div>
    <div class="kicker">AGENT TESTING OVERSIGHT</div>
    <h2>Testing, courses and exam readiness.</h2>
    <p>Live scores, attempts, course progress and state readiness. Use View As for complete agent-level support.</p>
  </div>
  <button class="btn btn-primary" onclick="loadOwnerTesting()">Refresh Testing</button>
</div>

<div class="real-data-banner">LIVE SUPABASE DATA • OWNER ONLY</div>

<div id="ownerTestingStats" class="stat-grid" style="margin-top:18px"></div>

<div class="bo-card" style="margin-top:18px;overflow:auto">
<table class="rank-table" style="width:100%">
<thead>
<tr>
<th>Agent</th>
<th>State</th>
<th>Latest</th>
<th>Best</th>
<th>Attempts</th>
<th>Course Progress</th>
<th>Readiness</th>
<th>Support</th>
</tr>
</thead>
<tbody id="ownerTestingRows">
<tr><td colspan="8">Loading live testing data…</td></tr>
</tbody>
</table>
</div>`;

if(typeof ownerViews!=="undefined"){
  ownerViews.testing=testingView;
}

window.loadOwnerTesting=async function(){
  const body=document.getElementById("ownerTestingRows");
  if(!body)return;

  body.innerHTML='<tr><td colspan="8">Loading live testing data…</td></tr>';

  try{
    const profilesRes=await sb.from("profiles")
      .select("id,username,email,first_name,last_name,role,status,resident_state")
      .in("role",["agent","team_lead","manager"])
      .order("last_name");

    if(profilesRes.error)throw profilesRes.error;

    const agents=(profilesRes.data||[])
      .filter(x=>x.status!=="terminated");

    if(!agents.length){
      body.innerHTML='<tr><td colspan="8">No field agents found.</td></tr>';
      return;
    }

    const ids=agents.map(x=>x.id);

    const [examRes,courseRes,licenseRes]=await Promise.all([
      sb.from("exam_attempts")
        .select("user_id,score_percent,state_code,created_at")
        .in("user_id",ids)
        .order("created_at",{ascending:false}),

      sb.from("course_assignments")
        .select("user_id,progress_percent,completed_at")
        .in("user_id",ids),

      sb.from("user_state_licenses")
        .select("user_id,state_code,status,readiness_percent")
        .in("user_id",ids)
    ]);

    if(examRes.error)throw examRes.error;
    if(courseRes.error)throw courseRes.error;
    if(licenseRes.error)throw licenseRes.error;

    const exams=examRes.data||[];
    const courses=courseRes.data||[];
    const licenses=licenseRes.data||[];

    let ready=0;
    let attempts=0;
    let scoreTotal=0;
    let scoreCount=0;

    body.innerHTML=agents.map(a=>{
      const ax=exams.filter(x=>x.user_id===a.id);
      const ac=courses.filter(x=>x.user_id===a.id);
      const al=licenses.filter(x=>x.user_id===a.id);

      attempts+=ax.length;

      ax.forEach(x=>{
        if(x.score_percent!==null){
          scoreTotal+=Number(x.score_percent);
          scoreCount++;
        }
      });

      const latest=ax.length?Number(ax[0].score_percent):null;
      const best=ax.length
        ?Math.max(...ax.map(x=>Number(x.score_percent||0)))
        :null;

      const progress=ac.length
        ?Math.round(ac.reduce((n,x)=>n+Number(x.progress_percent||0),0)/ac.length)
        :0;

      const readiness=al.length
        ?Math.round(al.reduce((n,x)=>n+Number(x.readiness_percent||0),0)/al.length)
        :0;

      if(readiness>=85)ready++;

      const state=a.resident_state||
        al.find(x=>x.state_code)?.state_code||
        "—";

      return `<tr>
        <td><strong>${esc(agentName(a))}</strong><br><small>${esc(a.username||a.email||"")}</small></td>
        <td>${esc(state)}</td>
        <td>${latest===null?"—":latest+"%"}</td>
        <td>${best===null?"—":best+"%"}</td>
        <td>${ax.length}</td>
        <td>${progress}%</td>
        <td>${readiness>=85?"Exam Ready":"In Progress"}<br><small>${readiness}%</small></td>
        <td><button class="tiny-btn" onclick="ownerViewAsAgent('${a.id}')">View As</button></td>
      </tr>`;
    }).join("");

    const stats=document.getElementById("ownerTestingStats");
    if(stats){
      const avg=scoreCount?Math.round(scoreTotal/scoreCount):null;

      stats.innerHTML=`
        <div class="stat"><div class="label">FIELD AGENTS</div><div class="value">${agents.length}</div></div>
        <div class="stat"><div class="label">EXAM READY</div><div class="value">${ready}</div></div>
        <div class="stat"><div class="label">TEST ATTEMPTS</div><div class="value">${attempts}</div></div>
        <div class="stat"><div class="label">AVERAGE SCORE</div><div class="value">${avg===null?"—":avg+"%"}</div></div>
      `;
    }
  }catch(e){
    console.error(e);
    body.innerHTML=`<tr><td colspan="8">Unable to load testing data: ${esc(e.message||e)}</td></tr>`;
  }
};

if(typeof window.registerAllshieldView==='function'){
  window.registerAllshieldView('owner','testing',async(main)=>{
    main.innerHTML=testingView;
    await window.loadOwnerTesting();
  });
}
ensureBanner();

})();
