(() => {
  const sb = window.allshieldSupabase;
  if (!sb) return;

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pct = (n) => `${Math.round(Number(n || 0))}%`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : "—";

  async function currentUser(){
    const { data } = await sb.auth.getUser();
    return data.user;
  }

  async function callAcademy(action, payload={}){
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Your session has expired. Sign in again.");
    const cfg = window.ALLSHIELD_CONFIG || {};
    const res = await fetch(`${cfg.SUPABASE_URL}/functions/v1/academy-exam`, {
      method: "POST",
      headers: { "Content-Type":"application/json", apikey: cfg.SUPABASE_PUBLISHABLE_KEY, Authorization:`Bearer ${token}` },
      body: JSON.stringify({ action, ...payload })
    });
    const raw = await res.text();
    let data={}; try{ data=raw?JSON.parse(raw):{} }catch{ data={error:raw} }
    if(!res.ok || data.error) throw new Error(data.error || `Academy service error ${res.status}`);
    return data;
  }

  function installProductionLogins(){
    [["agentLogin","agent"],["adminLogin","admin"],["ownerLogin","owner"]].forEach(([id,role])=>{
      const card=document.getElementById(id); if(!card)return;
      const user=card.querySelector('input:not([type="password"])');
      const button=card.querySelector('button.btn-primary');
      if(user) user.placeholder="Username";
      if(button){ button.textContent=`Enter ${role[0].toUpperCase()+role.slice(1)} Portal`; button.onclick=()=>window.productionLogin(role); }
    });
  }

  if (window.agentViews) {
    agentViews.onboarding = `
      <div class="dashboard-head"><div><div class="kicker">AGENT ONBOARDING</div><h2>Your live launch checklist.</h2><p>Progress saves directly to Allshield.</p></div></div>
      <div class="real-data-banner">LIVE SUPABASE DATA</div><div class="bo-card"><div id="liveOnboarding">Loading…</div></div>`;
    agentViews.licensing = `
      <div class="dashboard-head"><div><div class="kicker">LICENSING CENTER</div><h2>Your state licensing tracks.</h2><p>Track resident and additional state readiness.</p></div><button class="btn btn-primary" onclick="addLiveStateTrack()">Add State Track</button></div>
      <div class="real-data-banner">LIVE SUPABASE DATA • State requirements must be verified against current regulator and carrier rules.</div><div id="liveLicensing" class="bo-grid"></div>`;
    agentViews.study = `
      <div class="dashboard-head"><div><div class="kicker">LICENSING ACADEMY</div><h2>Your assigned learning path.</h2><p>Versioned internal readiness courses and completion tracking.</p></div></div>
      <div class="real-data-banner">LIVE SUPABASE DATA • Internal readiness material is not a substitute for state-required prelicensing education.</div><div id="liveAcademy"></div>`;
    agentViews.tests = `
      <div class="dashboard-head"><div><div class="kicker">PRACTICE TESTS</div><h2>Server-graded readiness practice.</h2><p>Answer keys stay server-side and every attempt is recorded.</p></div><button class="btn btn-primary" onclick="startLivePracticeExam()">Start Practice Test</button></div>
      <div class="real-data-banner">LIVE SUPABASE DATA • Pass mark: 85%</div><div id="liveExam"><div class="bo-card">Start a practice test when you are ready.</div></div><div id="liveAttemptHistory" class="bo-card" style="margin-top:18px"></div>`;
    agentViews.production = `
      <div class="dashboard-head"><div><div class="kicker">PRODUCTION</div><h2>Your verified performance.</h2><p>Production entries are entered by authorized leadership and displayed here live.</p></div></div>
      <div id="liveAgentProduction">Loading…</div>`;
  }

  if (window.adminViews) {
    adminViews.courses = `
      <div class="dashboard-head"><div><div class="kicker">ACADEMY CONTROL</div><h2>Published course catalog.</h2><p>Versioned courses and modules available to assigned team members.</p></div></div><div id="liveAdminCourses">Loading…</div>`;
    adminViews.tests = `
      <div class="dashboard-head"><div><div class="kicker">TESTS & SCORING</div><h2>Live readiness results.</h2><p>Review recorded attempts and pass rates.</p></div></div><div id="liveAdminTests">Loading…</div>`;
    adminViews.production = `
      <div class="dashboard-head"><div><div class="kicker">PRODUCTION CONTROL</div><h2>Record and review production.</h2><p>Authorized production entries feed agent and executive dashboards.</p></div></div>
      <div class="bo-grid"><div class="bo-card"><h3>Add Production Entry</h3><select id="prodUser" class="mini-input"></select><div class="form-grid" style="margin-top:10px"><div><label>Period Start</label><input id="prodStart" type="date" class="mini-input"></div><div><label>Period End</label><input id="prodEnd" type="date" class="mini-input"></div><div><label>Sales Count</label><input id="prodSales" type="number" min="0" class="mini-input" value="0"></div><div><label>Quality Score</label><input id="prodQuality" type="number" min="0" max="100" step="0.01" class="mini-input"></div></div><div class="row-actions"><button class="btn btn-primary" onclick="saveLiveProductionEntry()">Save Entry</button></div></div><div class="bo-card"><h3>Production Summary</h3><div id="prodSummary">Loading…</div></div></div><div id="liveAdminProduction" class="bo-card" style="margin-top:18px"></div>`;
  }

  async function loadLiveOnboarding(){
    const u=await currentUser(); if(!u)return;
    const {data,error}=await sb.from("onboarding_progress").select("step_key,step_order,completed,completed_at,metadata").eq("user_id",u.id).order("step_order");
    const el=document.getElementById("liveOnboarding"); if(!el)return;
    if(error){el.textContent=error.message;return}
    const labels={profile:"Complete Agent Profile",license:"Licensing Documents / Track",standards:"Review Agent Standards",training:"Complete Required Training",test:"Pass Readiness Test"};
    el.innerHTML=(data||[]).map(s=>`<label class="checkitem"><input type="checkbox" ${s.completed?"checked":""} onchange="setLiveOnboarding('${esc(s.step_key)}',this.checked)"><div><strong>${esc(labels[s.step_key]||s.step_key)}</strong><span>${s.completed?`Completed ${fmtDate(s.completed_at)}`:"Required before activation"}</span></div></label>`).join("")||"No onboarding steps assigned.";
  }
  window.setLiveOnboarding=async(step,completed)=>{ try{await window.allshieldSaveOnboardingStep(step,completed,{source:"agent_portal"}); await loadLiveOnboarding(); toast("Onboarding progress saved.");}catch(e){alert(e.message||e)} };

  async function loadLiveLicensing(){
    const u=await currentUser(); if(!u)return;
    const {data,error}=await sb.from("user_state_licenses").select("id,state_code,license_type,is_resident,status,readiness_percent,license_number,expiration_date").eq("user_id",u.id).order("is_resident",{ascending:false});
    const el=document.getElementById("liveLicensing"); if(!el)return;
    if(error){el.textContent=error.message;return}
    el.innerHTML=(data||[]).map(l=>`<div class="bo-card"><h3>${esc(l.state_code)} ${l.is_resident?'<span class="pill">Resident</span>':''}</h3><div class="requirement"><span>Status</span><span>${esc(l.status)}</span></div><div class="requirement"><span>Readiness</span><span>${pct(l.readiness_percent)}</span></div><div class="requirement"><span>License #</span><span>${esc(l.license_number||"Not recorded")}</span></div><div class="requirement"><span>Expiration</span><span>${esc(l.expiration_date||"—")}</span></div></div>`).join("")||'<div class="bo-card">No state tracks yet.</div>';
  }
  window.addLiveStateTrack=async()=>{const s=prompt("Enter the 2-letter state code:");if(!s)return;const code=s.trim().toUpperCase();if(!/^[A-Z]{2}$/.test(code)){alert("Enter a valid 2-letter state code.");return}try{await window.allshieldSaveTargetStates([code]);await loadLiveLicensing();toast(`${code} licensing track added.`)}catch(e){alert(e.message||e)}};

  async function loadLiveAcademy(){
    const u=await currentUser(); if(!u)return;
    const [aRes,pRes]=await Promise.all([
      sb.from("course_assignments").select("id,progress_percent,completed_at,courses(id,title,category,state_code,version,status,course_modules(id,module_order,title,body))").eq("user_id",u.id),
      sb.from("academy_module_progress").select("module_id,completed,completed_at").eq("user_id",u.id)
    ]);
    const el=document.getElementById("liveAcademy");if(!el)return;
    if(aRes.error||pRes.error){el.textContent=(aRes.error||pRes.error).message;return}
    const done=new Set((pRes.data||[]).filter(x=>x.completed).map(x=>x.module_id));
    el.innerHTML=(aRes.data||[]).map(a=>{const c=a.courses;const mods=[...(c?.course_modules||[])].sort((x,y)=>x.module_order-y.module_order);return `<div class="bo-card" style="margin-bottom:18px"><div class="dashboard-head"><div><h3>${esc(c?.title||"Course")}</h3><p>Version ${esc(c?.version||1)} • ${pct(a.progress_percent)} complete</p></div></div>${mods.map(m=>`<div class="module"><strong>${m.module_order}. ${esc(m.title)}</strong><div class="meta">${esc(m.body?.summary||"")}</div><div style="margin-top:8px">${(m.body?.topics||[]).map(t=>`<div class="task"><div class="dot"></div><div>${esc(t)}</div></div>`).join("")}</div><div class="row-actions"><button class="tiny-btn" ${done.has(m.id)?"disabled":""} onclick="completeLiveModule('${m.id}','${a.id}')">${done.has(m.id)?"Completed":"Mark Complete"}</button></div></div>`).join("")}</div>`}).join("")||'<div class="bo-card">No academy courses assigned yet.</div>';
  }
  window.completeLiveModule=async(moduleId,assignmentId)=>{try{const u=await currentUser();await sb.from("academy_module_progress").upsert({user_id:u.id,module_id:moduleId,completed:true,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"user_id,module_id"});const {data:a}=await sb.from("course_assignments").select("courses(course_modules(id))").eq("id",assignmentId).single();const mods=a?.courses?.course_modules||[];const {data:p}=await sb.from("academy_module_progress").select("module_id,completed").eq("user_id",u.id).in("module_id",mods.map(m=>m.id));const count=(p||[]).filter(x=>x.completed).length;const progress=mods.length?Math.round((count/mods.length)*100):0;await sb.from("course_assignments").update({progress_percent:progress,completed_at:progress===100?new Date().toISOString():null}).eq("id",assignmentId);if(progress===100)await window.allshieldSaveOnboardingStep("training",true,{source:"academy_course"});await loadLiveAcademy();toast("Module completion saved.")}catch(e){alert(e.message||e)}};

  let liveExam=null;
  window.startLivePracticeExam=async()=>{try{liveExam=await callAcademy("start");const el=document.getElementById("liveExam");el.innerHTML=`<div class="bo-card"><p>${esc(liveExam.notice)}</p><form id="liveExamForm">${liveExam.questions.map((q,i)=>`<div class="module"><strong>${i+1}. ${esc(q.prompt)}</strong>${Object.entries(q.answers||{}).map(([k,v])=>`<label class="quiz-option"><input type="radio" name="q_${q.id}" value="${esc(k)}"> ${esc(v)}</label>`).join("")}</div>`).join("")}<button type="button" class="btn btn-primary" onclick="submitLivePracticeExam()">Submit Test</button></form></div>`}catch(e){alert(e.message||e)}};
  window.submitLivePracticeExam=async()=>{if(!liveExam)return;const responses=liveExam.questions.map(q=>({id:q.id,answer:document.querySelector(`input[name="q_${q.id}"]:checked`)?.value||""}));if(responses.some(r=>!r.answer)){alert("Answer every question before submitting.");return}try{const result=await callAcademy("submit",{responses,state_code:liveExam.state_code});document.getElementById("liveExam").innerHTML=`<div class="bo-card"><h3>${result.passed?"Passed":"Keep Practicing"}</h3><div class="value" style="font-size:42px">${pct(result.score_percent)}</div><p>${result.correct_count} of ${result.question_count} correct • Pass mark ${result.pass_mark}%</p></div>`;liveExam=null;await loadAttemptHistory();toast("Practice attempt recorded.")}catch(e){alert(e.message||e)}};
  async function loadAttemptHistory(){const u=await currentUser();if(!u)return;const {data,error}=await sb.from("exam_attempts").select("score_percent,question_count,correct_count,state_code,created_at").eq("user_id",u.id).order("created_at",{ascending:false}).limit(10);const el=document.getElementById("liveAttemptHistory");if(!el)return;if(error){el.textContent=error.message;return}el.innerHTML='<h3>Recent Attempts</h3>'+((data||[]).map(x=>`<div class="requirement"><span>${fmtDate(x.created_at)} ${esc(x.state_code||"")}</span><span class="pill">${pct(x.score_percent)}</span></div>`).join("")||'<p>No attempts yet.</p>')}

  async function loadAgentProduction(){const u=await currentUser();if(!u)return;const {data,error}=await sb.from("production_entries").select("period_start,period_end,sales_count,quality_score,source").eq("user_id",u.id).order("period_start",{ascending:false});const el=document.getElementById("liveAgentProduction");if(!el)return;if(error){el.textContent=error.message;return}const rows=data||[];const total=rows.reduce((s,r)=>s+Number(r.sales_count||0),0);const q=rows.filter(r=>r.quality_score!=null);const avg=q.length?q.reduce((s,r)=>s+Number(r.quality_score),0)/q.length:0;el.innerHTML=`<div class="stat-grid"><div class="stat"><div class="label">Recorded Sales</div><div class="value">${total}</div></div><div class="stat"><div class="label">Avg. Quality</div><div class="value">${q.length?pct(avg):"—"}</div></div><div class="stat"><div class="label">Periods</div><div class="value">${rows.length}</div></div></div><div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Period</th><th>Sales</th><th>Quality</th><th>Source</th></tr>${rows.map(r=>`<tr><td>${esc(r.period_start)} → ${esc(r.period_end)}</td><td>${r.sales_count}</td><td>${r.quality_score==null?"—":pct(r.quality_score)}</td><td>${esc(r.source)}</td></tr>`).join("")||'<tr><td colspan="4">No production recorded yet.</td></tr>'}</table></div>`}

  async function loadAdminCourses(){const {data,error}=await sb.from("courses").select("id,title,category,state_code,version,status,course_modules(id,title,module_order)").order("created_at",{ascending:false});const el=document.getElementById("liveAdminCourses");if(!el)return;if(error){el.textContent=error.message;return}el.innerHTML=(data||[]).map(c=>`<div class="bo-card" style="margin-bottom:14px"><h3>${esc(c.title)}</h3><p>${esc(c.category)} • Version ${c.version} • ${esc(c.status)}</p><div class="requirement"><span>Modules</span><span>${c.course_modules?.length||0}</span></div></div>`).join("")||"No courses yet."}
  async function loadAdminTests(){const {data,error}=await sb.from("exam_attempts").select("score_percent,state_code,created_at,profiles(first_name,last_name,username)").order("created_at",{ascending:false}).limit(50);const el=document.getElementById("liveAdminTests");if(!el)return;if(error){el.textContent=error.message;return}const rows=data||[];const avg=rows.length?rows.reduce((s,r)=>s+Number(r.score_percent),0)/rows.length:0;const passed=rows.filter(r=>Number(r.score_percent)>=85).length;el.innerHTML=`<div class="stat-grid"><div class="stat"><div class="label">Attempts</div><div class="value">${rows.length}</div></div><div class="stat"><div class="label">Average</div><div class="value">${rows.length?pct(avg):"—"}</div></div><div class="stat"><div class="label">Passed</div><div class="value">${passed}</div></div></div><div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Agent</th><th>State</th><th>Score</th><th>Date</th></tr>${rows.map(r=>`<tr><td>${esc(((r.profiles?.first_name||"")+" "+(r.profiles?.last_name||"")).trim()||r.profiles?.username||"—")}</td><td>${esc(r.state_code||"—")}</td><td>${pct(r.score_percent)}</td><td>${fmtDate(r.created_at)}</td></tr>`).join("")||'<tr><td colspan="4">No attempts yet.</td></tr>'}</table></div>`}
  async function loadAdminProduction(){const [pRes,eRes]=await Promise.all([sb.from("profiles").select("id,first_name,last_name,username,role").in("role",["agent","team_lead","manager"]).order("last_name"),sb.from("production_entries").select("id,user_id,period_start,period_end,sales_count,quality_score,source,profiles(first_name,last_name,username)").order("period_start",{ascending:false}).limit(100)]);const select=document.getElementById("prodUser");if(select&&!pRes.error)select.innerHTML=(pRes.data||[]).map(p=>`<option value="${p.id}">${esc(((p.first_name||"")+" "+(p.last_name||"")).trim()||p.username)}</option>`).join("");const el=document.getElementById("liveAdminProduction");if(el){if(eRes.error){el.textContent=eRes.error.message}else{const rows=eRes.data||[];el.innerHTML='<h3>Recent Production</h3><table class="admin-table"><tr><th>Agent</th><th>Period</th><th>Sales</th><th>Quality</th></tr>'+rows.map(r=>`<tr><td>${esc(((r.profiles?.first_name||"")+" "+(r.profiles?.last_name||"")).trim()||r.profiles?.username||"—")}</td><td>${esc(r.period_start)} → ${esc(r.period_end)}</td><td>${r.sales_count}</td><td>${r.quality_score==null?"—":pct(r.quality_score)}</td></tr>`).join("")+'</table>';const total=rows.reduce((s,r)=>s+Number(r.sales_count||0),0);const summary=document.getElementById("prodSummary");if(summary)summary.innerHTML=`<div class="requirement"><span>Entries</span><span>${rows.length}</span></div><div class="requirement"><span>Total recorded sales</span><span>${total}</span></div>`}}}
  window.saveLiveProductionEntry=async()=>{try{const user=await currentUser();const row={user_id:document.getElementById("prodUser").value,period_start:document.getElementById("prodStart").value,period_end:document.getElementById("prodEnd").value,sales_count:Number(document.getElementById("prodSales").value||0),quality_score:document.getElementById("prodQuality").value===""?null:Number(document.getElementById("prodQuality").value),source:"manual_admin",entered_by:user.id};if(!row.user_id||!row.period_start||!row.period_end)throw new Error("Select an agent and both period dates.");const {error}=await sb.from("production_entries").insert(row);if(error)throw error;await loadAdminProduction();toast("Production entry saved.")}catch(e){alert(e.message||e)}};

  const oldAgent=window.showAgentView;
  if(oldAgent) window.showAgentView=function(view,el){oldAgent(view,el);setTimeout(()=>{if(view==="onboarding")loadLiveOnboarding();if(view==="licensing")loadLiveLicensing();if(view==="study")loadLiveAcademy();if(view==="tests")loadAttemptHistory();if(view==="production")loadAgentProduction();},20)};
  const oldAdmin=window.showAdminView;
  if(oldAdmin) window.showAdminView=function(view,el){oldAdmin(view,el);setTimeout(()=>{if(view==="courses")loadAdminCourses();if(view==="tests")loadAdminTests();if(view==="production")loadAdminProduction();},20)};

  installProductionLogins();
})();
