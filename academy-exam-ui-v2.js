(() => {
  const sb = window.allshieldSupabase;
  if (!sb) return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = n => `${Math.round(Number(n || 0))}%`;
  async function callAcademy(action,payload={}){
    const {data,error}=await sb.auth.getSession(); if(error) throw error;
    const token=data?.session?.access_token; if(!token) throw new Error('Your session has expired. Sign in again.');
    const cfg=window.ALLSHIELD_CONFIG||{};
    const res=await fetch(`${cfg.SUPABASE_URL}/functions/v1/academy-exam`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});
    const out=await res.json().catch(()=>({error:'Academy service returned an invalid response.'})); if(!res.ok||out.error) throw new Error(out.error||`Academy service error ${res.status}`); return out;
  }
  if(window.agentViews){
    window.agentViews.tests=`<div class="dashboard-head"><div><div class="kicker">STATE EXAM PREP</div><h2>Validated readiness testing.</h2><p>Use diagnostics to establish a baseline, topic quizzes to remediate weak areas, and full simulations to earn Exam Ready status.</p></div></div><div class="real-data-banner">LIVE • Server graded • Answers remain server-side • Exam Ready requires 3 consecutive full simulations at 85%+ and 75%+ in every measured topic.</div><div class="row-actions" style="margin:16px 0"><button class="btn btn-primary" onclick="startLivePracticeExam('diagnostic')">Diagnostic</button><button class="btn secondary" onclick="startLivePracticeExam('topic')">Topic Quiz</button><button class="btn secondary" onclick="startLivePracticeExam('full')">Full Simulation</button></div><div id="liveExam"><div class="bo-card">Choose a testing mode when you are ready.</div></div><div id="liveAttemptHistory" class="bo-card" style="margin-top:18px"></div>`;
  }
  let activeExam=null;
  window.startLivePracticeExam=async(mode='diagnostic')=>{try{
    let topic=null; if(mode==='topic') topic=prompt('Enter the topic/objective key shown in your state exam map (for example: state, policies, provisions, health_general):')||null;
    activeExam=await callAcademy('start',{mode,topic});
    const el=document.getElementById('liveExam'); if(!el)return;
    el.innerHTML=`<div class="bo-card"><h3>${esc(mode==='full'?'Full Simulation':mode==='topic'?'Topic Quiz':'Diagnostic')}</h3><p>${esc(activeExam.notice||'')}</p><p><b>${activeExam.questions.length}</b> validated questions • Pass mark ${activeExam.pass_mark}%</p><form>${activeExam.questions.map((q,i)=>`<div class="module"><strong>${i+1}. ${esc(q.prompt)}</strong>${Object.entries(q.answers||{}).map(([k,v])=>`<label class="quiz-option"><input type="radio" name="q_${q.id}" value="${esc(k)}"> ${esc(v)}</label>`).join('')}</div>`).join('')}<button type="button" class="btn btn-primary" onclick="submitLivePracticeExam()">Submit ${esc(mode==='full'?'Simulation':'Test')}</button></form></div>`;
  }catch(e){alert(e.message||e)}};
  window.submitLivePracticeExam=async()=>{if(!activeExam)return;const responses=activeExam.questions.map(q=>({id:q.id,answer:document.querySelector(`input[name="q_${q.id}"]:checked`)?.value||''}));if(responses.some(r=>!r.answer)){alert('Answer every question before submitting.');return}try{
    const result=await callAcademy('submit',{session_id:activeExam.session_id,responses}); const el=document.getElementById('liveExam');
    const weak=Array.isArray(result.weak_topics)&&result.weak_topics.length?`<h4>Focus next</h4>${result.weak_topics.map(x=>`<div class="requirement"><span>${esc(x.topic)}</span><b>${pct(x.percent)}</b></div>`).join('')}`:'<p>No measured topic fell below the remediation threshold.</p>';
    el.innerHTML=`<div class="bo-card"><h3>${result.passed?'Passed':'Keep Practicing'}</h3><div class="value" style="font-size:42px">${pct(result.score_percent)}</div><p>${result.correct_count} of ${result.question_count} correct • Pass mark ${result.pass_mark}%</p>${weak}<div class="real-data-banner">${result.exam_ready?'EXAM READY • Readiness gate satisfied':'Exam Ready not yet earned. Continue the prescribed study/testing path.'}</div></div>`;
    activeExam=null; if(typeof window.allshieldRefreshLaunchAcademy==='function') window.allshieldRefreshLaunchAcademy();
  }catch(e){alert(e.message||e)}};
})();