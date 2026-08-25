(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sb = () => window.allshieldSupabase;
  let cache = null;
  let exam = null;
  let examIndex = 0;
  let answers = {};

  async function invoke(name, body){
    const c = sb();
    if(!c) throw new Error('Supabase is not connected.');
    const {data,error} = await c.functions.invoke(name,{body});
    if(error) throw error;
    if(data?.error) throw new Error(data.error);
    return data;
  }

  function host(){ return document.getElementById('agentMain'); }
  function loading(title){ const h=host(); if(h) h.innerHTML=`<div class="dashboard-head"><div><div class="kicker">ALLSHIELD ACADEMY</div><h2>${esc(title)}</h2><p>Loading your live Allshield records…</p></div></div>`; }
  function err(title,e){ const h=host(); if(h) h.innerHTML=`<div class="dashboard-head"><div><div class="kicker">ALLSHIELD ACADEMY</div><h2>${esc(title)}</h2><p>${esc(e?.message||e)}</p></div></div>`; }

  async function data(refresh=false){
    if(cache && !refresh) return cache;
    cache = await invoke('academy-progress',{action:'dashboard'});
    return cache;
  }

  function statusPill(done){ return `<span class="pill">${done?'Complete':'Pending'}</span>`; }
  function bodyHtml(b){
    if(!b) return '';
    const summary=esc(b.summary||'');
    const notice=esc(b.notice||b.launch_note||'');
    const topics=Array.isArray(b.topics)?`<ul style="line-height:1.7;color:#b7c6d5">${b.topics.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
    return `${summary?`<p style="color:#d6e1ec;line-height:1.7">${summary}</p>`:''}${topics}${notice?`<div style="margin-top:12px;padding:12px;border:1px solid rgba(143,209,255,.2);border-radius:10px;color:#8fa2b8;font-size:13px">${notice}</div>`:''}`;
  }

  async function renderOnboarding(){
    loading('Your onboarding');
    try{
      const d=await data(true); const h=host(); if(!h)return;
      const steps=d.onboarding||[];
      const complete=steps.filter(x=>x.completed).length;
      const pct=steps.length?Math.round(complete/steps.length*100):0;
      h.innerHTML=`
      <div class="dashboard-head"><div><div class="kicker">ONBOARDING</div><h2>Your launch checklist.</h2><p>Live progress saved to your Allshield account.</p></div><div class="pill">${pct}% COMPLETE</div></div>
      <div class="bo-grid">
        <div class="bo-card"><h3>Progress</h3><div class="stat"><div class="label">COMPLETED STEPS</div><div class="value">${complete}/${steps.length||0}</div></div></div>
        <div class="bo-card"><h3>Resident State</h3><div class="stat"><div class="label">STATE</div><div class="value">${esc(d.profile?.resident_state||'—')}</div></div></div>
      </div>
      <div class="bo-card" style="margin-top:18px"><h3>Required Steps</h3>${steps.length?steps.map(s=>`<div class="activity"><strong>${esc((s.step_key||'').replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase()))}</strong><small>${s.completed?'Completed':'Not yet complete'}</small>${statusPill(s.completed)}</div>`).join(''):'No onboarding steps are assigned yet.'}</div>
      <div class="row-actions" style="margin-top:18px"><button class="btn btn-primary" onclick="showAgentView('study',null)">Continue Training</button><button class="tiny-btn" onclick="showAgentView('tests',null)">Practice Exams</button></div>`;
    }catch(e){err('Your onboarding',e)}
  }

  async function renderStudy(){
    loading('Assigned training');
    try{
      const d=await data(true); const h=host(); if(!h)return;
      const as=d.assignments||[];
      h.innerHTML=`<div class="dashboard-head"><div><div class="kicker">MY COURSES</div><h2>Assigned training.</h2><p>Your course progress is stored live in Allshield.</p></div></div>
      ${as.length?as.map((a,ai)=>`<div class="bo-card" style="margin-bottom:18px"><div class="dashboard-head"><div><h3 style="margin:0">${esc(a.course?.title||'Course')}</h3><p>${esc(a.course?.state_code?`State: ${a.course.state_code}`:'Allshield core training')}</p></div><span class="pill">${Number(a.progress_percent||0)}%</span></div>
      <div>${(a.modules||[]).map((m,mi)=>`<details style="border-top:1px solid rgba(255,255,255,.08);padding:14px 0" ${mi===0?'open':''}><summary style="cursor:pointer;font-weight:700">${m.progress?.completed?'✓ ':''}${esc(m.module_order+'. '+m.title)}</summary><div style="padding:12px 4px">${bodyHtml(m.body)}<div class="row-actions"><button class="tiny-btn" onclick="allshieldSetModuleComplete('${esc(m.id)}',${m.progress?.completed?'false':'true'})">${m.progress?.completed?'Mark Incomplete':'Mark Complete'}</button></div></div></details>`).join('')}</div></div>`).join(''):'<div class="bo-card"><h3>No courses assigned yet</h3><p>Your state and foundation courses will appear here after your account setup is complete.</p></div>'}`;
    }catch(e){err('Assigned training',e)}
  }

  window.allshieldSetModuleComplete=async function(moduleId,completed){
    try{ await invoke('academy-progress',{action:'set_module_complete',module_id:moduleId,completed}); cache=null; await renderStudy(); }
    catch(e){ alert(e?.message||e); }
  };

  async function renderTests(){
    loading('Practice exams');
    try{
      const d=await data(true); const h=host(); if(!h)return;
      const state=d.profile?.resident_state||d.licenses?.[0]?.state_code||'';
      const exams=d.exams||[];
      h.innerHTML=`<div class="dashboard-head"><div><div class="kicker">EXAM PREP</div><h2>Practice & readiness exams.</h2><p>Questions come from the validated state question bank. Scoring is deterministic; AI is used only for coaching and explanation.</p></div></div>
      <div class="bo-grid"><div class="bo-card"><h3>Start Exam</h3><p>Resident state: <strong>${esc(state||'Not set')}</strong></p><div class="row-actions"><button class="btn btn-primary" onclick="allshieldStartExam('diagnostic')" ${state?'':'disabled'}>40-Question Diagnostic</button><button class="tiny-btn" onclick="allshieldStartExam('full')" ${state?'':'disabled'}>Full Simulation</button></div></div>
      <div class="bo-card"><h3>Recent Attempts</h3>${exams.length?exams.slice(0,5).map(x=>`<div class="activity"><strong>${esc((x.exam_type||'exam').toUpperCase())} — ${esc(x.state_code||'')}</strong><small>${Number(x.score_percent||0).toFixed(1)}% • ${new Date(x.created_at).toLocaleDateString()}</small></div>`).join(''):'No exam attempts yet.'}</div></div>`;
    }catch(e){err('Practice exams',e)}
  }

  window.allshieldStartExam=async function(mode){
    try{
      const d=await data(); const state=d.profile?.resident_state||d.licenses?.[0]?.state_code;
      if(!state) throw new Error('Resident state is required before starting an exam.');
      const r=await invoke('academy-exam',{action:'start',mode,state_code:state});
      exam=r; examIndex=0; answers={}; renderExamQuestion();
    }catch(e){ alert(e?.message||e); }
  };

  function renderExamQuestion(){
    const h=host(); if(!h||!exam)return;
    const q=exam.questions[examIndex];
    const opts = Array.isArray(q.answers) ? q.answers : Object.entries(q.answers||{}).map(([key,value])=>({key,value}));
    const normalized = opts.map((x,i)=> typeof x==='string'?{key:String.fromCharCode(65+i),value:x}:({key:x.key??String.fromCharCode(65+i),value:x.value??x.text??String(x)}));
    h.innerHTML=`<div class="dashboard-head"><div><div class="kicker">${esc(exam.mode?.toUpperCase()||'EXAM')}</div><h2>${esc(exam.state_code)} Practice Exam</h2><p>Question ${examIndex+1} of ${exam.question_count}</p></div></div>
    <div class="bo-card"><h3>${esc(q.prompt)}</h3><div style="margin-top:16px">${normalized.map(o=>`<label class="answer" style="display:block;margin:10px 0"><input type="radio" name="prodExamAnswer" value="${esc(o.key)}" ${answers[q.id]===o.key?'checked':''} onchange="allshieldChooseAnswer('${esc(q.id)}','${esc(o.key)}')"> ${esc(o.key)}. ${esc(o.value)}</label>`).join('')}</div>
    <div class="row-actions" style="margin-top:18px"><button class="tiny-btn" onclick="allshieldExamPrev()" ${examIndex===0?'disabled':''}>Previous</button><button class="tiny-btn" onclick="allshieldExamNext()" ${examIndex>=exam.question_count-1?'disabled':''}>Next</button><button class="btn btn-primary" onclick="allshieldSubmitExam()">Submit Exam</button></div></div>`;
  }
  window.allshieldChooseAnswer=(id,key)=>{answers[id]=key;};
  window.allshieldExamPrev=()=>{ if(examIndex>0){examIndex--;renderExamQuestion();} };
  window.allshieldExamNext=()=>{ if(examIndex<exam.question_count-1){examIndex++;renderExamQuestion();} };
  window.allshieldSubmitExam=async function(){
    try{
      if(!exam)return;
      const missing=exam.questions.filter(q=>answers[q.id]===undefined);
      if(missing.length) throw new Error(`Answer all ${exam.question_count} questions before submitting. ${missing.length} remain.`);
      const responses=exam.questions.map(q=>({id:q.id,answer:answers[q.id]}));
      const r=await invoke('academy-exam',{action:'submit',session_id:exam.session_id,state_code:exam.state_code,responses});
      try{ await invoke('academy-progress',{action:'sync_readiness'}); }catch(_syncErr){}
      cache=null;
      const h=host();
      let coaching='';
      try{
        const prompt=`Create concise study coaching from this verified exam result. State: ${r.state_code}. Score: ${r.score_percent}%. Passed: ${r.passed}. Weak topics: ${(r.weak_topics||[]).join(', ')||'none'}. Topic scores: ${JSON.stringify(r.topic_scores||{})}. Do not change the score or claim a different correct answer. Give the learner a prioritized study plan.`;
        const ai=await invoke('ai-assistant',{action:'assist',prompt}); coaching=ai.text||'';
      }catch(_e){ coaching='AI coaching is unavailable right now. Your verified score and topic results are still saved.'; }
      if(h)h.innerHTML=`<div class="dashboard-head"><div><div class="kicker">EXAM RESULT</div><h2>${Number(r.score_percent).toFixed(1)}%</h2><p>${r.passed?'Passed this simulation.':'Keep studying and retest.'}</p></div></div><div class="bo-grid"><div class="bo-card"><h3>Verified Result</h3><p>${r.correct_count} of ${r.question_count} correct.</p><p>Weak topics: ${esc((r.weak_topics||[]).join(', ')||'None')}</p><p>Exam ready: <strong>${r.exam_ready?'YES':'NOT YET'}</strong></p></div><div class="bo-card"><h3>AI Study Coach</h3><p style="white-space:pre-wrap;line-height:1.7">${esc(coaching)}</p></div></div><div class="row-actions" style="margin-top:18px"><button class="btn btn-primary" onclick="showAgentView('study',null)">Return to Courses</button><button class="tiny-btn" onclick="showAgentView('tests',null)">Exam History</button></div>`;
      exam=null;
    }catch(e){ alert(e?.message||e); }
  };

  const install=()=>{
    if(typeof window.registerAllshieldView!=='function') return setTimeout(install,50);
    if(window.__allshieldProdAcademyInstalled) return;
    window.__allshieldProdAcademyInstalled=true;
    window.registerAllshieldView('agent','onboarding',()=>renderOnboarding());
    window.registerAllshieldView('agent','study',()=>renderStudy());
    window.registerAllshieldView('agent','tests',()=>renderTests());
  };
  install();
})();
