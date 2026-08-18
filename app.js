function openLead(){document.getElementById('leadModal').classList.add('show')}
function closeLead(){document.getElementById('leadModal').classList.remove('show')}
function submitLead(){alert('Preview test successful. In production this will save to Supabase and trigger your automation.');closeLead()}
document.getElementById('leadModal').addEventListener('click',e=>{if(e.target.id==='leadModal')closeLead()})

function openPortalChooser(){document.getElementById('portalChooser').classList.add('show')}
function closePortalChooser(){document.getElementById('portalChooser').classList.remove('show')}
function hideSite(){
  document.querySelector('.shell').style.display='none';
  document.getElementById('leadModal').classList.remove('show');
  document.getElementById('portalChooser').classList.remove('show');
}
function showLogin(role){
  hideSite();
  document.getElementById(role+'Login').classList.add('show');
}
function enterPortal(role){
  document.getElementById('agentLogin').classList.remove('show');
  document.getElementById('adminLogin').classList.remove('show');
  document.getElementById('ownerLogin').classList.remove('show');
  document.getElementById(role+'Portal').classList.add('show');
}
function returnHome(){
  ['agentLogin','adminLogin','ownerLogin'].forEach(id=>document.getElementById(id).classList.remove('show'));
  ['agentPortal','adminPortal','ownerPortal'].forEach(id=>document.getElementById(id).classList.remove('show'));
  document.querySelector('.shell').style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
}


const agentViews = {
dashboard: document.getElementById('agentMain') ? document.getElementById('agentMain').innerHTML : '',
onboarding: `
<div class="dashboard-head"><div><div class="kicker">AGENT ONBOARDING</div><h2>Your launch checklist.</h2><p>Complete each required step before activation.</p></div><button class="btn btn-primary" onclick="saveChecklist()">Save Progress</button></div>
<div class="demo-note">Interactive demo: check items on/off and save them. Your browser will remember your progress.</div>
<div class="bo-card"><div class="checklist">
<label class="checkitem"><input type="checkbox" data-ob="profile"><div><strong>Complete Agent Profile</strong><span>Personal details, contact information and tax profile.</span></div></label>
<label class="checkitem"><input type="checkbox" data-ob="license"><div><strong>Upload Licensing Documents</strong><span>State license and required credentials.</span></div></label>
<label class="checkitem"><input type="checkbox" data-ob="standards"><div><strong>Review Agent Standards</strong><span>Read and acknowledge Allshield operating standards.</span></div></label>
<label class="checkitem"><input type="checkbox" data-ob="training"><div><strong>Complete Required Training</strong><span>Finish the assigned launch curriculum.</span></div></label>
<label class="checkitem"><input type="checkbox" data-ob="test"><div><strong>Pass Readiness Test</strong><span>Score 85% or better before activation.</span></div></label>
</div></div>`,
study: `
<div class="dashboard-head"><div><div class="kicker">STUDY CENTER</div><h2>Licensing & product curriculum.</h2><p>Choose a module to preview the lesson experience.</p></div></div>
<div class="bo-grid"><div class="bo-card"><h3>Current Course</h3>
<div class="module" onclick="openLesson('ACA Foundations','Eligibility, enrollment periods, household rules and verification basics.')"><strong>Module 1 — ACA Foundations</strong><div class="meta">18 minutes • completed</div></div>
<div class="module" onclick="openLesson('Compliance & Consent','Required disclosures, permission to contact and documentation standards.')"><strong>Module 2 — Compliance & Consent</strong><div class="meta">24 minutes • completed</div></div>
<div class="module" onclick="openLesson('Plan Selection','How to compare premiums, networks, deductibles and customer fit.')"><strong>Module 3 — Plan Selection</strong><div class="meta">32 minutes • in progress</div></div>
<div class="module" onclick="openLesson('Call Flow','A guided compliant structure for a professional enrollment conversation.')"><strong>Module 4 — Call Flow</strong><div class="meta">21 minutes • locked after Module 3</div></div>
</div><div class="bo-card" id="lessonPanel"><h3>Lesson Preview</h3><p style="color:#8fa2b8">Click a module to open its study guide here.</p></div></div>`,
tests: `
<div class="dashboard-head"><div><div class="kicker">PRACTICE TESTS</div><h2>Test your readiness.</h2><p>This demo scores your answer immediately.</p></div></div>
<div class="bo-card"><h3>ACA Practice Question</h3><p style="line-height:1.6">Which action should occur before discussing a specific customer's private enrollment details?</p>
<label class="quiz-option"><input type="radio" name="q1" value="a"> Discuss available plans immediately.</label>
<label class="quiz-option"><input type="radio" name="q1" value="b"> Verify identity/authorization and required consent.</label>
<label class="quiz-option"><input type="radio" name="q1" value="c"> Ask the customer to send payment information first.</label>
<div class="row-actions"><button class="btn btn-primary" onclick="gradeQuiz()">Submit Answer</button><button class="tiny-btn" onclick="resetQuiz()">Reset</button></div>
<div id="quizResult" class="quiz-result"></div></div>`,
documents: `
<div class="dashboard-head"><div><div class="kicker">DOCUMENTS & E-SIGN</div><h2>Sign inside the portal.</h2><p>Interactive signature-pad demo — no external app required.</p></div></div>
<div class="bo-grid"><div class="bo-card"><h3>Agent Standards Acknowledgment</h3><p style="color:#90a3b7;line-height:1.65">I acknowledge that I have reviewed the Allshield Agent Standards and agree to comply with required company and carrier procedures.</p>
<div class="canvas-wrap"><canvas id="sigpad" class="sigpad"></canvas></div>
<div class="row-actions"><button class="tiny-btn" onclick="clearSig()">Clear</button><button class="btn btn-primary" onclick="saveSig()">Sign & Complete</button></div></div>
<div class="bo-card"><h3>Your Documents</h3><div class="resource"><span>Agent Standards</span><span class="pill">Needs Signature</span></div><div class="resource"><span>Independent Contractor Agreement</span><span class="pill">Complete</span></div><div class="resource"><span>Compliance Acknowledgment</span><span class="pill">Complete</span></div></div></div>`,
training: `
<div class="dashboard-head"><div><div class="kicker">TRAINING ROOM</div><h2>Live training inside Allshield.</h2><p>Prototype of the native meeting experience.</p></div></div>
<div class="bo-card"><div style="aspect-ratio:16/9;border-radius:16px;background:linear-gradient(135deg,#0b2139,#07111f);display:grid;place-items:center;text-align:center;border:1px solid rgba(255,255,255,.08)"><div><div style="font-size:48px">◉</div><h3 style="font-size:28px;margin:12px 0 6px">Weekly Agent Training</h3><p style="color:#8fa2b8">Camera, microphone, chat, screen sharing and attendance would live here.</p><button class="btn btn-primary" onclick="toast('Demo room joined successfully.')">Join Demo Room</button></div></div></div>`,
achievements: `
<div class="dashboard-head"><div><div class="kicker">ACHIEVEMENTS</div><h2>Your Allshield milestones.</h2><p>Recognition follows progress and production.</p></div></div>
<div class="badge-grid">
<div class="badge-card"><div class="medal">🛡️</div><strong>Foundation</strong><p style="color:#8497ac;font-size:11px">Onboarding started</p></div>
<div class="badge-card"><div class="medal">📘</div><strong>Scholar</strong><p style="color:#8497ac;font-size:11px">5 modules completed</p></div>
<div class="badge-card"><div class="medal">🎯</div><strong>Ready</strong><p style="color:#8497ac;font-size:11px">85%+ practice score</p></div>
<div class="badge-card"><div class="medal">⭐</div><strong>Top Producer</strong><p style="color:#8497ac;font-size:11px">Locked</p></div>
</div>`,
production: `
<div class="dashboard-head"><div><div class="kicker">PRODUCTION</div><h2>Your performance.</h2><p>Example dashboard structure for personal production reporting.</p></div></div>
<div class="stat-grid"><div class="stat"><div class="label">This Month</div><div class="value">184</div></div><div class="stat"><div class="label">This Week</div><div class="value">47</div></div><div class="stat"><div class="label">Goal Pace</div><div class="value">92%</div></div><div class="stat"><div class="label">Team Rank</div><div class="value">#3</div></div></div>
<div class="bo-card" style="margin-top:18px"><h3>Recent Activity</h3><table class="admin-table"><tr><th>Date</th><th>Type</th><th>Status</th></tr><tr><td>Aug 17</td><td>Enrollment</td><td><span class="pill">Completed</span></td></tr><tr><td>Aug 17</td><td>Enrollment</td><td><span class="pill">Completed</span></td></tr><tr><td>Aug 16</td><td>Enrollment</td><td><span class="pill">Pending</span></td></tr></table></div>`,
resources: `
<div class="dashboard-head"><div><div class="kicker">RESOURCE LIBRARY</div><h2>Everything in one place.</h2><p>Searchable company documents, scripts and job aids.</p></div><input class="mini-input" style="max-width:260px" placeholder="Search resources..." oninput="filterResources(this.value)"></div>
<div class="bo-card" id="resourceList">
<div class="resource" data-res="aca quick reference eligibility"><span>ACA Quick Reference Guide</span><button class="tiny-btn" onclick="toast('Resource opened in demo.')">Open</button></div>
<div class="resource" data-res="compliance call consent"><span>Compliance Call Checklist</span><button class="tiny-btn" onclick="toast('Resource opened in demo.')">Open</button></div>
<div class="resource" data-res="agent standards policy"><span>Agent Standards Manual</span><button class="tiny-btn" onclick="toast('Resource opened in demo.')">Open</button></div>
<div class="resource" data-res="sales script customer"><span>Customer Conversation Guide</span><button class="tiny-btn" onclick="toast('Resource opened in demo.')">Open</button></div>
</div>`,
profile: `
<div class="dashboard-head"><div><div class="kicker">PROFILE & SETTINGS</div><h2>Your account.</h2><p>Demo fields save locally in this browser.</p></div></div>
<div class="bo-card"><div class="form-grid"><div><label>First Name</label><input id="pfFirst" class="mini-input" value="Calvin"></div><div><label>Last Name</label><input id="pfLast" class="mini-input" value="Williams"></div><div><label>Phone</label><input id="pfPhone" class="mini-input" placeholder="(555) 555-5555"></div><div><label>State</label><input id="pfState" class="mini-input" value="Texas"></div></div><div class="row-actions"><button class="btn btn-primary" onclick="saveProfile()">Save Profile</button></div></div>`
};

const adminViews = {
dashboard: document.getElementById('adminMain') ? document.getElementById('adminMain').innerHTML : '',
team: `
<div class="dashboard-head"><div><div class="kicker">TEAM & ROLES</div><h2>People and permissions.</h2><p>Add, review and change demo team roles.</p></div><button class="btn btn-primary" onclick="addDemoAgent()">Add Demo Agent</button></div>
<div class="bo-card"><table class="admin-table" id="teamTable"><tr><th>Name</th><th>Role</th><th>Status</th><th>Action</th></tr>
<tr><td>Jordan Miles</td><td>Agent</td><td><span class="pill">Active</span></td><td><button class="tiny-btn" onclick="toggleRole(this)">Change Role</button></td></tr>
<tr><td>Ashley Reed</td><td>Manager</td><td><span class="pill">Active</span></td><td><button class="tiny-btn" onclick="toggleRole(this)">Change Role</button></td></tr>
<tr><td>Marcus Hill</td><td>Agent</td><td><span class="pill">Onboarding</span></td><td><button class="tiny-btn" onclick="toggleRole(this)">Change Role</button></td></tr>
</table></div>`,
onboarding: `
<div class="dashboard-head"><div><div class="kicker">ONBOARDING CONTROL</div><h2>See every agent's launch status.</h2><p>Demo controls for approving steps and moving agents forward.</p></div></div>
<div class="action-grid">
<div class="action-card" onclick="toast('Jordan approved for activation.')"><h4>Jordan Miles</h4><p>100% complete • Ready for activation</p></div>
<div class="action-card" onclick="toast('Ashley reminder sent.')"><h4>Ashley Reed</h4><p>74% complete • Study track</p></div>
<div class="action-card" onclick="toast('Marcus onboarding opened.')"><h4>Marcus Hill</h4><p>48% complete • Documents pending</p></div>
</div>`,
courses: `
<div class="dashboard-head"><div><div class="kicker">COURSE BUILDER</div><h2>Create training inside Allshield.</h2><p>Interactive demo course creator.</p></div></div>
<div class="bo-grid"><div class="bo-card"><h3>New Module</h3><input id="courseTitle" class="mini-input" placeholder="Module title"><textarea id="courseBody" class="mini-input" style="height:120px;margin-top:10px" placeholder="Lesson content"></textarea><div class="row-actions"><button class="btn btn-primary" onclick="createCourse()">Add Module</button></div></div><div class="bo-card"><h3>Course Modules</h3><div id="courseList"><div class="resource"><span>ACA Foundations</span><span class="pill">Published</span></div><div class="resource"><span>Compliance & Consent</span><span class="pill">Published</span></div></div></div></div>`,
tests: `
<div class="dashboard-head"><div><div class="kicker">TESTS & SCORING</div><h2>Assessment control.</h2><p>Review scores and configure readiness thresholds.</p></div></div>
<div class="stat-grid"><div class="stat"><div class="label">Average</div><div class="value">86%</div></div><div class="stat"><div class="label">Passed</div><div class="value">41</div></div><div class="stat"><div class="label">Retest Needed</div><div class="value">2</div></div><div class="stat"><div class="label">Pass Mark</div><div class="value">85%</div></div></div>
<div class="bo-card" style="margin-top:18px"><table class="admin-table"><tr><th>Agent</th><th>Exam</th><th>Score</th><th>Status</th></tr><tr><td>Ashley Reed</td><td>ACA Readiness</td><td>91%</td><td><span class="pill">Passed</span></td></tr><tr><td>Marcus Hill</td><td>Compliance</td><td>78%</td><td><button class="tiny-btn" onclick="toast('Retest assigned to Marcus.')">Assign Retest</button></td></tr></table></div>`,
documents: `
<div class="dashboard-head"><div><div class="kicker">DOCUMENT CONTROL</div><h2>Templates and signatures.</h2><p>Manage what agents must read and sign.</p></div><button class="btn btn-primary" onclick="toast('Upload flow opened in demo.')">Upload Template</button></div>
<div class="bo-card"><div class="resource"><span>Agent Standards</span><span class="pill">48 assigned</span></div><div class="resource"><span>Independent Contractor Agreement</span><span class="pill">48 assigned</span></div><div class="resource"><span>Compliance Acknowledgment</span><span class="pill">46 signed</span></div></div>`,
meetings: `
<div class="dashboard-head"><div><div class="kicker">MEETINGS & TRAINING</div><h2>Live-room administration.</h2><p>Create sessions, enroll attendees and track participation.</p></div><button class="btn btn-primary" onclick="toast('New training room created.')">Create Training Room</button></div>
<div class="action-grid"><div class="action-card" onclick="toast('Weekly Agent Training opened.')"><h4>Weekly Agent Training</h4><p>Wednesday 6:00 PM • 18 registered</p></div><div class="action-card" onclick="toast('Manager Huddle opened.')"><h4>Manager Huddle</h4><p>Friday 9:00 AM • 6 registered</p></div></div>`,
production: `
<div class="dashboard-head"><div><div class="kicker">PRODUCTION</div><h2>Agency performance.</h2><p>Example executive rollup.</p></div></div>
<div class="stat-grid"><div class="stat"><div class="label">Monthly Enrollments</div><div class="value">2,184</div></div><div class="stat"><div class="label">Active Producers</div><div class="value">44</div></div><div class="stat"><div class="label">Avg / Agent</div><div class="value">49.6</div></div><div class="stat"><div class="label">Goal Attainment</div><div class="value">91%</div></div></div>`,
automations: `
<div class="dashboard-head"><div><div class="kicker">AUTOMATION CENTER</div><h2>Workflow control.</h2><p>Turn operating rules into automated actions.</p></div></div>
<div class="bo-card">
<label class="checkitem"><input type="checkbox" checked onchange="toast('Automation setting changed.')"><div><strong>Welcome Sequence</strong><span>Send new agents their login and onboarding checklist.</span></div></label>
<label class="checkitem"><input type="checkbox" checked onchange="toast('Automation setting changed.')"><div><strong>Training Reminder</strong><span>Notify agents 24 hours before required training.</span></div></label>
<label class="checkitem"><input type="checkbox" onchange="toast('Automation setting changed.')"><div><strong>Low Score Intervention</strong><span>Assign retraining automatically when a score falls below threshold.</span></div></label>
</div>`,
settings: `
<div class="dashboard-head"><div><div class="kicker">SYSTEM SETTINGS</div><h2>Platform configuration.</h2><p>Example settings that will ultimately persist in Supabase.</p></div></div>
<div class="bo-card"><div class="form-grid"><div><label>Agency Name</label><input class="mini-input" value="Allshield Insurance Group"></div><div><label>Default Passing Score</label><input class="mini-input" value="85%"></div><div><label>Support Email</label><input class="mini-input" value="support@allshield.example"></div><div><label>Portal Theme</label><select class="mini-input"><option>Allshield Dark</option><option>Light</option></select></div></div><div class="row-actions"><button class="btn btn-primary" onclick="toast('Settings saved in demo.')">Save Settings</button></div></div>`
};

function setActive(el){ if(!el)return; el.parentElement.querySelectorAll('.side-link').forEach(x=>x.classList.remove('active')); el.classList.add('active'); }
function showAgentView(view,el){ setActive(el); document.getElementById('agentMain').innerHTML=agentViews[view]; if(view==='onboarding')loadChecklist(); if(view==='documents')setTimeout(initSigPad,30); if(view==='profile')loadProfile(); }
function showAdminView(view,el){ setActive(el); document.getElementById('adminMain').innerHTML=adminViews[view]; }
function toast(msg){const t=document.getElementById('demoToast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function saveChecklist(){document.querySelectorAll('[data-ob]').forEach(c=>localStorage.setItem('ob_'+c.dataset.ob,c.checked?'1':'0'));toast('Onboarding progress saved locally.')}
function loadChecklist(){setTimeout(()=>document.querySelectorAll('[data-ob]').forEach(c=>c.checked=localStorage.getItem('ob_'+c.dataset.ob)==='1'),20)}
function openLesson(title,body){
  document.getElementById('lessonPanel').innerHTML =
    '<h3>'+title+'</h3>'+
    '<p style="color:#a8b8c9;line-height:1.75">'+body+'</p>'+
    '<div class="demo-note">This area will hold lesson text, video, downloads and completion controls.</div>'+
    '<button class="btn btn-primary" id="markLessonComplete">Mark Complete</button>';
  setTimeout(function(){
    var b=document.getElementById('markLessonComplete');
    if(b) b.onclick=function(){toast('Lesson marked complete.');};
  },0);
}
function gradeQuiz(){const v=document.querySelector('input[name=q1]:checked');const r=document.getElementById('quizResult');if(!v){r.className='quiz-result bad';r.textContent='Choose an answer first.';return}if(v.value==='b'){r.className='quiz-result good';r.textContent='Correct. Identity/authorization and required consent come first.'}else{r.className='quiz-result bad';r.textContent='Not quite. Review the compliance module and try again.'}}
function resetQuiz(){document.querySelectorAll('input[name=q1]').forEach(x=>x.checked=false);const r=document.getElementById('quizResult');r.className='quiz-result';r.textContent=''}
let drawing=false,ctx=null,canvas=null;
function initSigPad(){canvas=document.getElementById('sigpad');if(!canvas)return;const rect=canvas.getBoundingClientRect();canvas.width=Math.max(600,rect.width*2);canvas.height=300;ctx=canvas.getContext('2d');ctx.scale(canvas.width/rect.width,canvas.height/rect.height);ctx.strokeStyle='#07111f';ctx.lineWidth=2;ctx.lineCap='round';const pos=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return [p.clientX-r.left,p.clientY-r.top]};canvas.onmousedown=canvas.ontouchstart=e=>{drawing=true;const [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);e.preventDefault()};canvas.onmousemove=canvas.ontouchmove=e=>{if(!drawing)return;const [x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke();e.preventDefault()};window.onmouseup=window.ontouchend=()=>drawing=false}
function clearSig(){if(ctx&&canvas)ctx.clearRect(0,0,canvas.width,canvas.height)}
function saveSig(){toast('Signature captured in demo.')}
function filterResources(q){q=q.toLowerCase();document.querySelectorAll('#resourceList .resource').forEach(r=>r.style.display=r.dataset.res.includes(q)?'flex':'none')}
function saveProfile(){localStorage.setItem('pfFirst',document.getElementById('pfFirst').value);localStorage.setItem('pfLast',document.getElementById('pfLast').value);localStorage.setItem('pfPhone',document.getElementById('pfPhone').value);localStorage.setItem('pfState',document.getElementById('pfState').value);toast('Profile saved locally.')}
function loadProfile(){setTimeout(()=>['First','Last','Phone','State'].forEach(k=>{const e=document.getElementById('pf'+k),v=localStorage.getItem('pf'+k);if(e&&v)e.value=v}),20)}
function addDemoAgent(){const t=document.getElementById('teamTable');const r=t.insertRow(-1);r.innerHTML='<td>New Demo Agent</td><td>Agent</td><td><span class="pill">Invited</span></td><td><button class="tiny-btn" onclick="toggleRole(this)">Change Role</button></td>';toast('Demo agent added.')}
function toggleRole(btn){const c=btn.closest('tr').children[1];c.textContent=c.textContent==='Agent'?'Manager':'Agent';toast('Role changed in demo.')}
function createCourse(){const title=document.getElementById('courseTitle').value.trim();if(!title){toast('Enter a module title first.');return}const d=document.createElement('div');d.className='resource';d.innerHTML='<span>'+title+'</span><span class="pill">Draft</span>';document.getElementById('courseList').appendChild(d);document.getElementById('courseTitle').value='';document.getElementById('courseBody').value='';toast('Module added to course builder.')}


// ----- Phase 2 Allshield OS prototype -----
agentViews.study = `
<div class="dashboard-head"><div><div class="kicker">LICENSING ACADEMY</div><h2>Life & Health first. State-specific where it matters.</h2><p>Your national licensing foundation plus the states you are actively preparing to hold.</p></div><button class="btn btn-primary" onclick="toast('Study plan refreshed for your active state tracks.')">Refresh Study Plan</button></div>
<div class="demo-note">The licensing academy is not ACA-only. ACA becomes a product certification after the Life & Health licensing foundation.</div>
<div class="stat-grid">
  <div class="stat"><div class="label">National Core</div><div class="value">68%</div></div>
  <div class="stat"><div class="label">Illinois</div><div class="value">82%</div></div>
  <div class="stat"><div class="label">Texas</div><div class="value">61%</div></div>
  <div class="stat"><div class="label">Florida</div><div class="value">54%</div></div>
</div>
<div class="track-grid" style="margin-top:18px">
  <div class="track-card"><span class="state-chip">CORE</span><h4 style="margin-top:12px">Life & Health National Core</h4><p>Insurance fundamentals, policy provisions, life products, health products, ethics and core exam concepts.</p><button class="tiny-btn" onclick="openLesson('Life & Health National Core','This track houses the common licensing material used before state-specific law and regulation layers.')">Continue</button></div>
  <div class="track-card"><span class="state-chip">IL</span><h4 style="margin-top:12px">Illinois State Layer</h4><p>Resident-state rules, regulations and exam objectives tracked separately from the national core.</p><button class="tiny-btn" onclick="toast('Illinois state study track opened.')">Open Illinois</button></div>
  <div class="track-card"><span class="state-chip">TX</span><span class="state-chip">FL</span><h4 style="margin-top:12px">Additional State Licenses</h4><p>Texas and Florida are active target-state tracks. Each has its own readiness score and required material.</p><button class="tiny-btn" onclick="toast('Multi-state licensing dashboard opened.')">Manage States</button></div>
</div>
<div class="bo-card" id="lessonPanel" style="margin-top:18px"><h3>Study Guide</h3><p style="color:#8fa2b8">Choose a track to open lessons, flashcards, explanations and review material.</p></div>`;

agentViews.tests = `
<div class="dashboard-head"><div><div class="kicker">PRACTICE EXAM CENTER</div><h2>Randomized Life & Health readiness testing.</h2><p>Each practice exam is assembled from a reviewed question bank and tracks readiness by topic and state.</p></div><button class="btn btn-primary" onclick="toast('New randomized 100-question practice exam generated.')">Generate New Exam</button></div>
<div class="stat-grid"><div class="stat"><div class="label">Last Score</div><div class="value">88%</div></div><div class="stat"><div class="label">5-Test Average</div><div class="value">86%</div></div><div class="stat"><div class="label">Readiness</div><div class="value">Strong</div></div><div class="stat"><div class="label">Question Bank</div><div class="value">1,240</div></div></div>
<div class="bo-grid">
<div class="bo-card"><h3>Quick Practice Question</h3><p style="line-height:1.6">Which policy provision generally gives a policyowner a limited period to review a newly delivered policy and return it for a refund?</p>
<label class="quiz-option"><input type="radio" name="q1" value="a"> Grace period</label>
<label class="quiz-option"><input type="radio" name="q1" value="b"> Free-look provision</label>
<label class="quiz-option"><input type="radio" name="q1" value="c"> Reinstatement provision</label>
<div class="row-actions"><button class="btn btn-primary" onclick="gradeQuiz()">Submit Answer</button><button class="tiny-btn" onclick="resetQuiz()">Reset</button></div><div id="quizResult" class="quiz-result"></div></div>
<div class="bo-card"><h3>Readiness by Track</h3><div class="progress-row"><div class="row"><span>Life Insurance</span><span>91%</span></div><div class="bar"><span style="width:91%"></span></div></div><div class="progress-row"><div class="row"><span>Health Insurance</span><span>84%</span></div><div class="bar"><span style="width:84%"></span></div></div><div class="progress-row"><div class="row"><span>Illinois Law</span><span>82%</span></div><div class="bar"><span style="width:82%"></span></div></div><div class="progress-row"><div class="row"><span>Texas Law</span><span>61%</span></div><div class="bar"><span style="width:61%"></span></div></div><div class="progress-row"><div class="row"><span>Florida Law</span><span>54%</span></div><div class="bar"><span style="width:54%"></span></div></div></div>
</div>`;

agentViews.performance = `
<div class="dashboard-head"><div><div class="kicker">PERFORMANCE CENTER</div><h2>Know exactly where you stand.</h2><p>Personal sales stats, bonus progress and an anonymized company leaderboard.</p></div><button class="btn btn-primary" onclick="toast('Performance refreshed from the latest admin-entered production data.')">Refresh Stats</button></div>
<div class="stat-grid"><div class="stat"><div class="label">Company Rank</div><div class="value">#7 / 100</div></div><div class="stat"><div class="label">Weekly Sales</div><div class="value">47</div></div><div class="stat"><div class="label">Monthly Sales</div><div class="value">184</div></div><div class="stat"><div class="label">Bonus Progress</div><div class="value">92%</div></div></div>
<div class="bo-grid">
<div class="bo-card"><h3>Company Leaderboard</h3><table class="rank-table"><tr><th>Rank</th><th>Agent</th><th>Weekly</th><th>Monthly</th><th>Trend</th></tr>
<tr><td class="rank-num">1</td><td>S. Jones</td><td>63</td><td>241</td><td class="metric-up">▲ 4</td></tr>
<tr><td class="rank-num">2</td><td>M. Davis</td><td>59</td><td>228</td><td class="metric-up">▲ 1</td></tr>
<tr><td class="rank-num">3</td><td>A. Reed</td><td>56</td><td>216</td><td class="metric-mid">—</td></tr>
<tr><td class="rank-num">4</td><td>J. Miles</td><td>53</td><td>207</td><td class="metric-up">▲ 2</td></tr>
<tr><td class="rank-num">5</td><td>T. Brooks</td><td>51</td><td>199</td><td class="metric-mid">▼ 1</td></tr>
<tr class="rank-you"><td class="rank-num">7</td><td><strong>C. Williams — YOU</strong></td><td><strong>47</strong></td><td><strong>184</strong></td><td class="metric-up">▲ 3</td></tr></table></div>
<div class="bo-card"><h3>Promotion & Bonus Track</h3><div class="progress-row"><div class="row"><span>Weekly production target</span><span>47 / 50</span></div><div class="bar"><span style="width:94%"></span></div></div><div class="progress-row"><div class="row"><span>Monthly promotion target</span><span>184 / 200</span></div><div class="bar"><span style="width:92%"></span></div></div><div class="progress-row"><div class="row"><span>Quality requirement</span><span>Met</span></div><div class="bar"><span style="width:100%"></span></div></div><div class="owner-note" style="margin-top:16px">Names can be displayed as first initial + last name so agents get healthy competition without exposing unnecessary personal information.</div></div>
</div>`;

agentViews.meetings = `
<div class="dashboard-head"><div><div class="kicker">ALLSHIELD MEETING ROOMS</div><h2>Company calls without leaving the back office.</h2><p>National, office and leadership rooms designed for embedded open-source video, chat, screen sharing and recording.</p></div></div>
<div class="room-grid">
<div class="room-card" onclick="toast('National Team Call room opened in demo.')"><div class="room-icon">🌐</div><h4>National Team Call</h4><p>Company-wide meetings, major announcements, product launches and national training.</p></div>
<div class="room-card" onclick="toast('Office Room opened in demo.')"><div class="room-icon">🏢</div><h4>My Office</h4><p>Office-level coaching, daily huddles, workshops and team accountability calls.</p></div>
<div class="room-card" onclick="toast('Leadership Room opened in demo.')"><div class="room-icon">◆</div><h4>Leadership / Managers</h4><p>Restricted room for owners, admins, managers and team leads based on permissions.</p></div>
</div>
<div class="bo-card" style="margin-top:18px"><div style="aspect-ratio:16/9;border-radius:16px;background:linear-gradient(135deg,#0b2139,#07111f);display:grid;place-items:center;text-align:center;border:1px solid rgba(255,255,255,.08)"><div><div style="font-size:50px">◉</div><h3 style="font-size:28px;margin:12px 0 6px">Embedded Meeting Workspace</h3><p style="color:#8fa2b8;max-width:650px">Camera • microphone • participant grid • screen sharing • chat • moderator controls • attendance • recording permissions</p><button class="btn btn-primary" onclick="toast('Demo meeting joined.')">Join Demo Meeting</button></div></div></div>`;

adminViews.leaderboard = `
<div class="dashboard-head"><div><div class="kicker">RANKINGS & BONUSES</div><h2>Control production and incentives.</h2><p>Admins can enter or import production, manage bonus thresholds and publish the agent leaderboard.</p></div><button class="btn btn-primary" onclick="toast('Demo production entry opened.')">Enter Production</button></div>
<div class="stat-grid"><div class="stat"><div class="label">Ranked Agents</div><div class="value">100</div></div><div class="stat"><div class="label">Bonus Eligible</div><div class="value">18</div></div><div class="stat"><div class="label">Promotion Eligible</div><div class="value">7</div></div><div class="stat"><div class="label">Last Updated</div><div class="value" style="font-size:22px">Today</div></div></div>
<div class="bo-card" style="margin-top:18px"><h3>Published Leaderboard</h3><table class="rank-table"><tr><th>Rank</th><th>Agent Display</th><th>Weekly</th><th>Monthly</th><th>Bonus</th><th>Admin</th></tr><tr><td>1</td><td>S. Jones</td><td>63</td><td>241</td><td><span class="pill">Qualified</span></td><td><button class="tiny-btn" onclick="toast('Agent production editor opened.')">Edit</button></td></tr><tr><td>2</td><td>M. Davis</td><td>59</td><td>228</td><td><span class="pill">Qualified</span></td><td><button class="tiny-btn" onclick="toast('Agent production editor opened.')">Edit</button></td></tr><tr><td>7</td><td>C. Williams</td><td>47</td><td>184</td><td><span class="pill">92%</span></td><td><button class="tiny-btn" onclick="toast('Agent production editor opened.')">Edit</button></td></tr></table></div>`;

adminViews.meetings = `
<div class="dashboard-head"><div><div class="kicker">MEETING ROOM ADMINISTRATION</div><h2>Run every level of the organization.</h2><p>Create rooms, control access, attendance, recordings and meeting permissions.</p></div><button class="btn btn-primary" onclick="toast('New meeting room draft created.')">Create Room</button></div>
<div class="room-grid"><div class="room-card" onclick="toast('National room administration opened.')"><div class="room-icon">🌐</div><h4>National Team Call</h4><p>Everyone • owner/admin moderated • recording allowed.</p></div><div class="room-card" onclick="toast('Office room administration opened.')"><div class="room-icon">🏢</div><h4>Office Rooms</h4><p>Office-specific membership • manager moderated.</p></div><div class="room-card" onclick="toast('Leadership room administration opened.')"><div class="room-icon">◆</div><h4>Leadership / Managers</h4><p>Permission-restricted • leadership-only recording and files.</p></div></div>`;

const ownerViews = {
dashboard: document.getElementById('ownerMain') ? document.getElementById('ownerMain').innerHTML : '',
permissions: `
<div class="dashboard-head"><div><div class="kicker">ROLES & PERMISSIONS</div><h2>Control exactly what each level can see.</h2><p>Owner sits above Admin; managers and team leads receive scoped permissions; agents see only their own operational tools.</p></div></div>
<div class="bo-card"><table class="rank-table"><tr><th>Role</th><th>People</th><th>Scope</th><th>Control</th></tr><tr><td>Owner</td><td>1</td><td>Everything</td><td><span class="pill">Full Control</span></td></tr><tr><td>Admin</td><td>4</td><td>Operations + assigned system controls</td><td><button class="tiny-btn" onclick="toast('Admin permission matrix opened.')">Configure</button></td></tr><tr><td>Manager</td><td>8</td><td>Assigned office/team</td><td><button class="tiny-btn" onclick="toast('Manager permission matrix opened.')">Configure</button></td></tr><tr><td>Team Lead</td><td>12</td><td>Assigned team + coaching</td><td><button class="tiny-btn" onclick="toast('Team lead permission matrix opened.')">Configure</button></td></tr><tr><td>Agent</td><td>100</td><td>Personal profile + assigned tools</td><td><button class="tiny-btn" onclick="toast('Agent permission matrix opened.')">Configure</button></td></tr></table></div>`,
states: `
<div class="dashboard-head"><div><div class="kicker">STATE LICENSING MATRIX</div><h2>Build national without rebuilding the academy.</h2><p>Every agent has a resident state plus any number of additional target-state licensing tracks.</p></div><button class="btn btn-primary" onclick="toast('State rollout draft opened.')">Enable Another State</button></div>
<div class="track-grid"><div class="track-card"><span class="state-chip">IL</span><h4 style="margin-top:12px">Illinois</h4><p>Resident-state track active • 24 agents assigned.</p><button class="tiny-btn" onclick="toast('Illinois content matrix opened.')">Review Content</button></div><div class="track-card"><span class="state-chip">TX</span><h4 style="margin-top:12px">Texas</h4><p>Additional-state track active • 73 agents assigned.</p><button class="tiny-btn" onclick="toast('Texas content matrix opened.')">Review Content</button></div><div class="track-card"><span class="state-chip">FL</span><h4 style="margin-top:12px">Florida</h4><p>Additional-state track active • 68 agents assigned.</p><button class="tiny-btn" onclick="toast('Florida content matrix opened.')">Review Content</button></div></div>
<div class="owner-note" style="margin-top:18px">The national Life & Health core stays common. State law, regulations and exam-objective material is layered onto each agent's active states and scored separately.</div>`,
versions: `
<div class="dashboard-head"><div><div class="kicker">CONTENT VERSIONING</div><h2>Update without erasing history.</h2><p>Every course, test bank, policy and document can have published versions and effective dates.</p></div><button class="btn btn-primary" onclick="toast('New content version draft created.')">Create New Version</button></div>
<div class="version-card"><strong>Life & Health National Core</strong><div class="version-meta">v2.4 • Published Aug 1, 2026 • 640 agents have historical completions preserved</div></div><div class="version-card"><strong>Texas State Law Layer</strong><div class="version-meta">v1.8 • Published Jul 12, 2026 • next review in 72 days</div></div><div class="version-card"><strong>Florida State Law Layer</strong><div class="version-meta">v1.6 • Draft changes awaiting owner approval</div></div><div class="version-card"><strong>Agent Standards Agreement</strong><div class="version-meta">v3.1 • Existing signatures remain attached to the exact version each person signed</div></div>`,
updates: `
<div class="dashboard-head"><div><div class="kicker">PLATFORM UPDATE CENTER</div><h2>Your living worksheet for the business.</h2><p>Capture an idea, plan the change, test it, publish it and keep the existing system/data intact.</p></div><button class="btn btn-primary" onclick="addUpdateIdea()">Add Update Idea</button></div>
<div class="bo-grid"><div class="bo-card"><h3>Update Queue</h3><div id="updateQueue"><div class="task"><div class="dot"></div><div>State content quarterly review<small>Scheduled every 90 days</small></div></div><div class="task"><div class="dot"></div><div>Performance bonus tier #2<small>Owner review required</small></div></div><div class="task"><div class="dot"></div><div>Leadership meeting attendance report<small>Prototype approved</small></div></div></div></div><div class="bo-card"><h3>Safe Deployment Model</h3><p style="color:#a8b8c9;line-height:1.7">Draft → Review → Test → Publish. Database migrations are additive whenever possible, existing records are preserved, and rollbacks are planned before production changes.</p><button class="tiny-btn" onclick="toast('Demo change history opened.')">View Release History</button></div></div>`,
performance: `
<div class="dashboard-head"><div><div class="kicker">COMPANY PERFORMANCE</div><h2>Competition with controlled visibility.</h2><p>Owners decide ranking formulas, anonymization rules, bonus thresholds and promotion criteria.</p></div></div>
<div class="stat-grid"><div class="stat"><div class="label">Agents Ranked</div><div class="value">100</div></div><div class="stat"><div class="label">Top 10 Average</div><div class="value">54</div></div><div class="stat"><div class="label">Bonus Pool Eligible</div><div class="value">18</div></div><div class="stat"><div class="label">Data Entry Mode</div><div class="value" style="font-size:22px">Admin</div></div></div><div class="owner-note" style="margin-top:18px">Phase one can be manually updated by admins. Later, carrier or CRM feeds can automate production without redesigning the performance center.</div>`,
meetings: `
<div class="dashboard-head"><div><div class="kicker">MEETING GOVERNANCE</div><h2>Rooms by role, office and purpose.</h2><p>Owner-level control over who can create rooms, moderate, record, download recordings and view attendance.</p></div></div>
<div class="room-grid"><div class="room-card"><div class="room-icon">🌐</div><h4>National</h4><p>Owner/Admin moderators • all-team access.</p></div><div class="room-card"><div class="room-icon">🏢</div><h4>Office</h4><p>Managers moderate only their assigned office.</p></div><div class="room-card"><div class="room-icon">◆</div><h4>Leadership</h4><p>Owner-defined roles only • restricted archive.</p></div></div>`,
audit: `
<div class="dashboard-head"><div><div class="kicker">AUDIT & CHANGE HISTORY</div><h2>Know what changed, when and by whom.</h2><p>Operational history stays intact as the platform evolves.</p></div></div>
<div class="bo-card"><table class="rank-table"><tr><th>Time</th><th>User</th><th>Action</th><th>Object</th></tr><tr><td>Today 6:42 PM</td><td>Owner</td><td>Approved v1.6 draft</td><td>Florida State Layer</td></tr><tr><td>Today 4:15 PM</td><td>Admin A.</td><td>Updated weekly production</td><td>S. Jones</td></tr><tr><td>Yesterday</td><td>Manager J.</td><td>Assigned retraining</td><td>Agent #024</td></tr><tr><td>Aug 15</td><td>Owner</td><td>Changed bonus threshold</td><td>Promotion Tier 1</td></tr></table></div>`,
settings: `
<div class="dashboard-head"><div><div class="kicker">GLOBAL SETTINGS</div><h2>Company-wide system controls.</h2><p>Owner-only settings that sit above admin configuration.</p></div></div>
<div class="bo-card"><div class="form-grid"><div><label>Company Display Name</label><input class="mini-input" value="Allshield Insurance Group"></div><div><label>Leaderboard Privacy</label><select class="mini-input"><option>First initial + last name</option><option>Agent ID only</option><option>Full name</option></select></div><div><label>Quarterly Content Review</label><select class="mini-input"><option>Every 90 days</option><option>Every 60 days</option><option>Every 120 days</option></select></div><div><label>Default Readiness Threshold</label><input class="mini-input" value="85%"></div></div><div class="row-actions"><button class="btn btn-primary" onclick="toast('Owner settings saved in demo.')">Save Global Settings</button></div></div>`
};

function showOwnerView(view,el){ setActive(el); document.getElementById('ownerMain').innerHTML=ownerViews[view]; }
function addUpdateIdea(){ const q=document.getElementById('updateQueue'); if(!q)return; const d=document.createElement('div'); d.className='task'; d.innerHTML='<div class="dot"></div><div>New owner update idea<small>Draft • captured just now</small></div>'; q.appendChild(d); toast('Update idea added to the owner queue.'); }

// Override quiz grading for the Life & Health demo question.
function gradeQuiz(){
  const v=document.querySelector('input[name=q1]:checked'),r=document.getElementById('quizResult');
  if(!v){r.className='quiz-result bad';r.textContent='Choose an answer first.';return}
  if(v.value==='b'){r.className='quiz-result good';r.textContent='Correct. The free-look provision gives the policyowner a limited review period after delivery.'}
  else{r.className='quiz-result bad';r.textContent='Not quite. Review policy provisions, then try another randomized question.'}
}


function openCareer(){document.getElementById("careerModal").classList.add("show")}
function closeCareer(){document.getElementById("careerModal").classList.remove("show")}
function submitCareer(){if(!document.getElementById("careerName").value.trim()){toast("Enter your name first.");return}closeCareer();toast("Career interest captured in demo.")}
function togglePlatform(el){el.classList.toggle("on")}
ownerViews.states=`<div class="dashboard-head"><div><div class="kicker">NATIONAL LICENSING MATRIX</div><h2>All 50 states from day one.</h2><p>One Life & Health national core plus a versioned regulatory/content layer for every state.</p></div></div><div class="stat-grid"><div class="stat"><div class="label">States Supported</div><div class="value">50</div></div><div class="stat"><div class="label">National Core</div><div class="value">1</div></div><div class="stat"><div class="label">Example Launch States</div><div class="value">3</div></div><div class="stat"><div class="label">Architecture</div><div class="value" style="font-size:21px">National</div></div></div><div class="bo-card" style="margin-top:18px"><h3>50-State Library</h3><p style="color:#8fa2b8;font-size:12px">Texas, Florida and Illinois are highlighted only as examples. They are not system limits.</p><div class="statematrix"><div class="statebox ">AL</div><div class="statebox ">AK</div><div class="statebox ">AZ</div><div class="statebox ">AR</div><div class="statebox ">CA</div><div class="statebox ">CO</div><div class="statebox ">CT</div><div class="statebox ">DE</div><div class="statebox hot">FL</div><div class="statebox ">GA</div><div class="statebox ">HI</div><div class="statebox ">ID</div><div class="statebox hot">IL</div><div class="statebox ">IN</div><div class="statebox ">IA</div><div class="statebox ">KS</div><div class="statebox ">KY</div><div class="statebox ">LA</div><div class="statebox ">ME</div><div class="statebox ">MD</div><div class="statebox ">MA</div><div class="statebox ">MI</div><div class="statebox ">MN</div><div class="statebox ">MS</div><div class="statebox ">MO</div><div class="statebox ">MT</div><div class="statebox ">NE</div><div class="statebox ">NV</div><div class="statebox ">NH</div><div class="statebox ">NJ</div><div class="statebox ">NM</div><div class="statebox ">NY</div><div class="statebox ">NC</div><div class="statebox ">ND</div><div class="statebox ">OH</div><div class="statebox ">OK</div><div class="statebox ">OR</div><div class="statebox ">PA</div><div class="statebox ">RI</div><div class="statebox ">SC</div><div class="statebox ">SD</div><div class="statebox ">TN</div><div class="statebox hot">TX</div><div class="statebox ">UT</div><div class="statebox ">VT</div><div class="statebox ">VA</div><div class="statebox ">WA</div><div class="statebox ">WV</div><div class="statebox ">WI</div><div class="statebox ">WY</div></div></div>`;
ownerViews.marketing=`<div class="dashboard-head"><div><div class="kicker">CORPORATE MARKETING CENTER</div><h2>Create once. Publish where the company needs it.</h2><p>Owner-controlled corporate social publishing for authorized employees only—not agents.</p></div><button class="btn btn-primary" onclick="toast('AI generated 3 corporate content ideas.')">AI Content Ideas</button></div><div class="mktgrid"><div class="bo-card"><h3>Compose Post</h3><textarea id="mktcopy" class="mini-input" style="height:145px" placeholder="Company announcement, recognition, recruiting post..."></textarea><div class="row-actions"><button class="tiny-btn" onclick="document.getElementById('mktcopy').value='Welcome to the newest members of the Allshield team. We are excited to recognize another group of professionals beginning their journey with us.'">✦ AI Polish</button><button class="tiny-btn" onclick="toast('Media upload opened.')">Add Media</button></div><h4>Publish To</h4><div class="platforms"><button class="platform on" onclick="togglePlatform(this)">Facebook</button><button class="platform on" onclick="togglePlatform(this)">Instagram</button><button class="platform" onclick="togglePlatform(this)">LinkedIn</button><button class="platform" onclick="togglePlatform(this)">TikTok</button></div><button class="btn btn-primary" onclick="toast('Demo post published to selected corporate channels.')">Publish Selected</button></div><div class="bo-card"><h3>AI Marketing Brain</h3><div class="task"><div class="dot"></div><div>3 new hires this week<small>Suggested: welcome / growth post</small></div></div><div class="task"><div class="dot"></div><div>7 agents hit milestones<small>Suggested: recognition carousel</small></div></div><div class="task"><div class="dot"></div><div>National training Thursday<small>Suggested: recruiting culture clip</small></div></div><p style="color:#8fa2b8;font-size:12px;line-height:1.6">Nothing publishes automatically. Authorized corporate staff review, edit, approve and publish.</p></div></div>`;
ownerViews.media=`<div class="dashboard-head"><div><div class="kicker">OWNER MEDIA STUDIO</div><h2>Turn live meetings into permanent training assets.</h2><p>Recordings can be reviewed, cleaned up, categorized and assigned into learning paths.</p></div><button class="btn btn-primary" onclick="toast('Recording upload opened.')">Add Recording</button></div><div class="bo-card"><div class="mediaitem"><div><strong>National Training — Aug 14</strong><small style="display:block;color:#7f93aa">62 min • recorded meeting</small></div><button class="tiny-btn" onclick="toast('Media editor opened.')">Edit & Publish</button></div><div class="mediaitem"><div><strong>Leadership Coaching — Aug 12</strong><small style="display:block;color:#7f93aa">44 min • leadership only</small></div><button class="tiny-btn" onclick="toast('Permission editor opened.')">Permissions</button></div><div class="mediaitem"><div><strong>ACA Product Workshop</strong><small style="display:block;color:#7f93aa">38 min • training library</small></div><button class="tiny-btn" onclick="toast('Training assignment opened.')">Assign</button></div></div><div class="owner-note" style="margin-top:18px">Media access can be granted by role, department, or a specific named employee. Agents do not receive editing/publishing access.</div>`;
adminViews.marketing=`<div class="dashboard-head"><div><div class="kicker">MARKETING CENTER</div><h2>Delegated corporate access.</h2><p>This appears only for admins/employees whom the owner explicitly authorizes for corporate marketing.</p></div></div><div class="bo-card"><p style="color:#a8b8c9;line-height:1.7">Authorized marketing staff can draft, upload media, use AI assistance, preview, schedule and publish to connected Allshield company accounts. Agents have no access to this module.</p><button class="btn btn-primary" onclick="toast('Corporate composer opened in demo.')">Open Corporate Composer</button></div>`;

function openCareersPage(){
  document.querySelector('.shell').style.display='none';
  ['agentLogin','adminLogin','ownerLogin'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('show')});
  ['agentPortal','adminPortal','ownerPortal'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('show')});
  document.getElementById('careersPage').classList.add('show');
  window.scrollTo(0,0);
  setTimeout(()=>document.querySelectorAll('#careersPage .career-reveal').forEach(el=>careerObserver.observe(el)),50);
}
function closeCareersPage(){
  document.getElementById('careersPage').classList.remove('show');
  document.querySelector('.shell').style.display='block';
  window.scrollTo(0,0);
}
const careerObserver=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')});
},{threshold:.12});


ownerViews.files=`<div class="dashboard-head"><div><div class="kicker">OWNER FILE VAULT</div><h2>Your controlled company asset library.</h2><p>Private owner-level access to master logos, legal files, operating documents and future company assets.</p></div><button class="btn btn-primary" onclick="toast('Owner file upload opened in demo.')">Upload File</button></div>
<div class="folderbar"><div class="foldericon">▣</div><div><strong>Allshield Logo</strong><small style="display:block;color:#7f93aa;margin-top:3px">Brand Assets / Owner Access</small></div></div>
<div class="filevault-grid"><div class="filevault-card">
      <div class="filevault-preview"><img src="assets/brand-914a23072410.webp" alt="Full Vertical Logo"></div>
      <h4>Full Vertical Logo</h4><p>Complete logo lockup for approved full-brand applications.</p>
      <div class="row-actions"><button class="tiny-btn" onclick="toast('Asset preview opened.')">Preview</button><button class="tiny-btn" onclick="toast('Production download will come from secure Owner Storage.')">Download</button></div>
    </div><div class="filevault-card">
      <div class="filevault-preview"><img src="assets/brand-9c4aea9181ac.webp" alt="Shield Only"></div>
      <h4>Shield Only</h4><p>Armor mark for pins, hats, favicon, app icon, recognition and merchandise.</p>
      <div class="row-actions"><button class="tiny-btn" onclick="toast('Asset preview opened.')">Preview</button><button class="tiny-btn" onclick="toast('Production download will come from secure Owner Storage.')">Download</button></div>
    </div><div class="filevault-card">
      <div class="filevault-preview"><img src="assets/brand-a5d124700d54.webp" alt="Silver Wordmark Only"></div>
      <h4>Silver Wordmark Only</h4><p>ALLSHIELD / INSURANCE GROUP wordmark for independent brand applications.</p>
      <div class="row-actions"><button class="tiny-btn" onclick="toast('Asset preview opened.')">Preview</button><button class="tiny-btn" onclick="toast('Production download will come from secure Owner Storage.')">Download</button></div>
    </div></div>
<div class="owner-note" style="margin-top:18px">Production build: this vault will use private Supabase Storage. Owner permissions will control the master folder; individual folders can later be shared with specific employees, departments, or roles without exposing the entire owner library.</div>`;


agentViews.careerpath = `
<div class="dashboard-head"><div><div class="kicker">CAREER PATH</div><h2>Know your next level.</h2><p>Your dashboard turns promotion criteria into a visible roadmap.</p></div></div>
<div class="promotion-track">
  <div class="promotion-step current"><div class="lvl">01</div><small>CURRENT LEVEL</small><strong>Licensed Agent</strong></div>
  <div class="promotion-step"><div class="lvl">02</div><small>NEXT</small><strong>Senior Agent</strong></div>
  <div class="promotion-step"><div class="lvl">03</div><small>LEADERSHIP</small><strong>Team Lead</strong></div>
  <div class="promotion-step"><div class="lvl">04</div><small>MANAGEMENT</small><strong>Team Manager</strong></div>
  <div class="promotion-step"><div class="lvl">05</div><small>ADVANCEMENT</small><strong>Director</strong></div>
</div>
<div class="bo-grid">
<div class="bo-card"><h3>Senior Agent Qualification</h3>
<div class="requirement"><span>Required licensing & certifications</span><span class="reqgood">Complete</span></div>
<div class="requirement"><span>Production threshold</span><span class="reqgood">92%</span></div>
<div class="requirement"><span>Quality / compliance standard</span><span class="reqgood">Met</span></div>
<div class="requirement"><span>Leadership workshop</span><span class="reqwait">Pending</span></div>
<div class="requirement"><span>Manager approval</span><span class="reqwait">Locked</span></div>
</div>
<div class="bo-card"><h3>Why Promotion Matters</h3><p style="color:#93a6ba;line-height:1.7">Promotions can unlock recognition, new responsibilities, leadership access, bonus opportunities and additional tools. Exact compensation rules will be configured later inside the Owner Portal.</p><button class="btn btn-primary" onclick="toast('Promotion requirements opened.')">View Full Requirements</button></div>
</div>`;

adminViews.hierarchy = `
<div class="dashboard-head"><div><div class="kicker">HIERARCHY & PROMOTIONS</div><h2>See the organization as it grows.</h2><p>Admins can manage reporting structure and submit promotions for owner-defined approval.</p></div><button class="btn btn-primary" onclick="toast('Promotion request opened.')">Submit Promotion</button></div>
<div class="orgchart">
<div class="orgcol"><h4>Owner</h4><div class="orgperson">Calvin Williams</div></div>
<div class="orgcol"><h4>Admins</h4><div class="orgperson">Operations Admin</div><div class="orgperson">Onboarding Admin</div><div class="orgperson">Marketing Admin</div></div>
<div class="orgcol"><h4>Directors</h4><div class="orgperson">National Sales</div><div class="orgperson">Training</div></div>
<div class="orgcol"><h4>Managers</h4><div class="orgperson">Team Manager A</div><div class="orgperson">Team Manager B</div></div>
<div class="orgcol"><h4>Agents</h4><div class="orgperson">100 Active Agents</div><div class="orgperson">12 In Onboarding</div></div>
</div>
<div class="bo-card" style="margin-top:18px"><h3>Pending Promotion Reviews</h3><table class="admin-table"><tr><th>Team Member</th><th>Current</th><th>Proposed</th><th>Readiness</th><th>Action</th></tr><tr><td>A. Reed</td><td>Senior Agent</td><td>Team Lead</td><td>100%</td><td><button class="tiny-btn" onclick="toast('Promotion sent to owner approval.')">Recommend</button></td></tr><tr><td>J. Miles</td><td>Agent</td><td>Senior Agent</td><td>96%</td><td><button class="tiny-btn" onclick="toast('Promotion sent to owner approval.')">Recommend</button></td></tr></table></div>`;

ownerViews.hierarchy = `
<div class="dashboard-head"><div><div class="kicker">ORGANIZATION & PROMOTION LADDER</div><h2>Design the company hierarchy from the top down.</h2><p>Owner defines titles, reporting lines, promotion rules and which permissions unlock at every level.</p></div><button class="btn btn-primary" onclick="toast('New organization level opened.')">Add Level</button></div>
<div class="promotion-track">
<div class="promotion-step"><div class="lvl">01</div><small>ENTRY</small><strong>Licensed Agent</strong></div>
<div class="promotion-step"><div class="lvl">02</div><small>PERFORMANCE</small><strong>Senior Agent</strong></div>
<div class="promotion-step"><div class="lvl">03</div><small>LEADERSHIP</small><strong>Team Lead</strong></div>
<div class="promotion-step"><div class="lvl">04</div><small>MANAGEMENT</small><strong>Team Manager</strong></div>
<div class="promotion-step"><div class="lvl">05</div><small>EXECUTIVE</small><strong>Director</strong></div>
</div>
<div class="bo-grid">
<div class="bo-card"><h3>Owner Promotion Controls</h3>
<div class="requirement"><span>Require production threshold</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div>
<div class="requirement"><span>Require compliance / quality standard</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div>
<div class="requirement"><span>Require leadership course</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div>
<div class="requirement"><span>Require manager recommendation</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div>
<div class="requirement"><span>Require owner final approval</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div>
</div>
<div class="bo-card"><h3>Recognition Link</h3><p style="color:#93a6ba;line-height:1.7">Promotion levels can trigger recognition workflows: achievement badges, announcements, meeting recognition, physical shield-pin eligibility and future award fulfillment.</p><button class="tiny-btn" onclick="toast('Recognition rules opened.')">Configure Recognition</button></div>
</div>`;

ownerViews.media = `
<div class="dashboard-head"><div><div class="kicker">OWNER MEDIA STUDIO</div><h2>Turn live meetings into an institutional memory.</h2><p>Recordings move through a controlled workflow before they become permanent training assets.</p></div><button class="btn btn-primary" onclick="toast('Recording import opened.')">Import Recording</button></div>
<div class="mediaflow"><div><b>1. RECORD</b><span>National, office or leadership meeting</span></div><div><b>2. REVIEW</b><span>Trim, title, tag and clean up</span></div><div><b>3. APPROVE</b><span>Owner / authorized employee approval</span></div><div><b>4. PUBLISH</b><span>Training library, leadership archive or private folder</span></div></div>
<div class="bo-grid">
<div class="bo-card"><h3>Recent Recordings</h3>
<div class="resource"><span>National Training — Aug 14</span><button class="tiny-btn" onclick="toast('Recording editor opened.')">Edit</button></div>
<div class="resource"><span>Leadership Coaching — Aug 12</span><button class="tiny-btn" onclick="toast('Permission editor opened.')">Permissions</button></div>
<div class="resource"><span>ACA Product Workshop</span><button class="tiny-btn" onclick="toast('Convert-to-course flow opened.')">Convert to Training</button></div>
<div class="resource"><span>Manager Huddle — Aug 8</span><button class="tiny-btn" onclick="toast('Archive opened.')">Archive</button></div>
</div>
<div class="bo-card"><h3>Media Permissions</h3>
<table class="permission-matrix"><tr><th>Person / Role</th><th>Upload</th><th>Edit</th><th>Publish</th></tr>
<tr><td>Owner</td><td><span class="pill">Yes</span></td><td><span class="pill">Yes</span></td><td><span class="pill">Yes</span></td></tr>
<tr><td>Marketing Department</td><td><span class="pill">Yes</span></td><td><span class="pill">Yes</span></td><td><span class="pill">No</span></td></tr>
<tr><td>Keyana Williams</td><td><span class="pill">Yes</span></td><td><span class="pill">Yes</span></td><td><span class="pill">Yes</span></td></tr>
<tr><td>Managers</td><td><span class="pill">No</span></td><td><span class="pill">No</span></td><td><span class="pill">No</span></td></tr></table>
<div class="row-actions"><button class="tiny-btn" onclick="toast('Granular permission editor opened.')">Edit Access</button></div>
</div></div>`;

ownerViews.marketing = `
<div class="dashboard-head"><div><div class="kicker">CORPORATE MARKETING CENTER</div><h2>Your internal social-media command center.</h2><p>Corporate-only publishing with AI assistance, approvals and account-level controls. Agents do not use this module.</p></div><button class="btn btn-primary" onclick="toast('AI reviewed current company activity for content opportunities.')">✦ Generate Ideas</button></div>
<div class="bo-grid">
<div class="bo-card"><h3>Create Corporate Post</h3><textarea id="corpPost" class="mini-input" style="height:150px" placeholder="Write a company announcement, recruiting post, recognition post or campaign..."></textarea>
<div class="row-actions"><button class="tiny-btn" onclick="document.getElementById('corpPost').value='Congratulations to this week’s Allshield milestone achievers. We are proud to recognize the professionals continuing to grow, serve customers and raise the standard.'">AI Polish</button><button class="tiny-btn" onclick="toast('Media Studio picker opened.')">Add Media</button></div>
<h4>Publish to company accounts</h4><div class="platforms"><button class="platform on" onclick="togglePlatform(this)">Facebook</button><button class="platform on" onclick="togglePlatform(this)">Instagram</button><button class="platform" onclick="togglePlatform(this)">LinkedIn</button><button class="platform" onclick="togglePlatform(this)">TikTok</button></div>
<div class="row-actions"><button class="btn btn-primary" onclick="toast('Demo post approved and published to selected company accounts.')">Approve & Publish</button><button class="tiny-btn" onclick="toast('Scheduling calendar opened.')">Schedule</button></div>
</div>
<div class="bo-card"><h3>AI Marketing Brain</h3>
<div class="task"><div class="dot"></div><div>New hires joined this week<small>Suggested: welcome / growth announcement</small></div></div>
<div class="task"><div class="dot"></div><div>Agents reached recognition thresholds<small>Suggested: achievement carousel</small></div></div>
<div class="task"><div class="dot"></div><div>Training recording published<small>Suggested: culture / recruiting post</small></div></div>
<div class="task"><div class="dot"></div><div>New state rollout activated<small>Suggested: national expansion announcement</small></div></div>
<p style="color:#8498ac;font-size:12px;line-height:1.6">AI can suggest and draft. Nothing publishes without an authorized company employee approving it.</p>
</div></div>`;



const selectedStates=new Set(JSON.parse(localStorage.getItem('allshieldStates')||'[]'));

agentViews.licensing = `
<div class="dashboard-head"><div><div class="kicker">LICENSING CENTER</div><h2>Your national license roadmap.</h2><p>Select the states you are preparing for and track each one independently.</p></div><button class="btn btn-primary" onclick="saveStates()">Save State Plan</button></div>
<div class="bo-card"><h3>Resident State</h3><select id="residentState" class="mini-input" style="max-width:240px"><option>Illinois</option><option>Texas</option><option>Florida</option></select><h3 style="margin-top:22px">Additional Target States</h3><div class="state-select-grid"><button class='statepick' onclick="toggleState(this,'AL')">AL</button><button class='statepick' onclick="toggleState(this,'AK')">AK</button><button class='statepick' onclick="toggleState(this,'AZ')">AZ</button><button class='statepick' onclick="toggleState(this,'AR')">AR</button><button class='statepick' onclick="toggleState(this,'CA')">CA</button><button class='statepick' onclick="toggleState(this,'CO')">CO</button><button class='statepick' onclick="toggleState(this,'CT')">CT</button><button class='statepick' onclick="toggleState(this,'DE')">DE</button><button class='statepick' onclick="toggleState(this,'FL')">FL</button><button class='statepick' onclick="toggleState(this,'GA')">GA</button><button class='statepick' onclick="toggleState(this,'HI')">HI</button><button class='statepick' onclick="toggleState(this,'ID')">ID</button><button class='statepick' onclick="toggleState(this,'IL')">IL</button><button class='statepick' onclick="toggleState(this,'IN')">IN</button><button class='statepick' onclick="toggleState(this,'IA')">IA</button><button class='statepick' onclick="toggleState(this,'KS')">KS</button><button class='statepick' onclick="toggleState(this,'KY')">KY</button><button class='statepick' onclick="toggleState(this,'LA')">LA</button><button class='statepick' onclick="toggleState(this,'ME')">ME</button><button class='statepick' onclick="toggleState(this,'MD')">MD</button><button class='statepick' onclick="toggleState(this,'MA')">MA</button><button class='statepick' onclick="toggleState(this,'MI')">MI</button><button class='statepick' onclick="toggleState(this,'MN')">MN</button><button class='statepick' onclick="toggleState(this,'MS')">MS</button><button class='statepick' onclick="toggleState(this,'MO')">MO</button><button class='statepick' onclick="toggleState(this,'MT')">MT</button><button class='statepick' onclick="toggleState(this,'NE')">NE</button><button class='statepick' onclick="toggleState(this,'NV')">NV</button><button class='statepick' onclick="toggleState(this,'NH')">NH</button><button class='statepick' onclick="toggleState(this,'NJ')">NJ</button><button class='statepick' onclick="toggleState(this,'NM')">NM</button><button class='statepick' onclick="toggleState(this,'NY')">NY</button><button class='statepick' onclick="toggleState(this,'NC')">NC</button><button class='statepick' onclick="toggleState(this,'ND')">ND</button><button class='statepick' onclick="toggleState(this,'OH')">OH</button><button class='statepick' onclick="toggleState(this,'OK')">OK</button><button class='statepick' onclick="toggleState(this,'OR')">OR</button><button class='statepick' onclick="toggleState(this,'PA')">PA</button><button class='statepick' onclick="toggleState(this,'RI')">RI</button><button class='statepick' onclick="toggleState(this,'SC')">SC</button><button class='statepick' onclick="toggleState(this,'SD')">SD</button><button class='statepick' onclick="toggleState(this,'TN')">TN</button><button class='statepick' onclick="toggleState(this,'TX')">TX</button><button class='statepick' onclick="toggleState(this,'UT')">UT</button><button class='statepick' onclick="toggleState(this,'VT')">VT</button><button class='statepick' onclick="toggleState(this,'VA')">VA</button><button class='statepick' onclick="toggleState(this,'WA')">WA</button><button class='statepick' onclick="toggleState(this,'WV')">WV</button><button class='statepick' onclick="toggleState(this,'WI')">WI</button><button class='statepick' onclick="toggleState(this,'WY')">WY</button></div></div>
<div class="stat-grid" style="margin-top:18px"><div class="stat"><div class="label">National Core</div><div class="value">68%</div></div><div class="stat"><div class="label">Resident State</div><div class="value">82%</div></div><div class="stat"><div class="label">Target States</div><div class="value" id="targetStateCount">0</div></div><div class="stat"><div class="label">Overall Readiness</div><div class="value">Strong</div></div></div>`;

agentViews.onboarding = `
<div class="dashboard-head"><div><div class="kicker">ONBOARDING</div><h2>Your activation journey.</h2><p>Each step unlocks the next layer of the Allshield platform.</p></div><button class="btn btn-primary" onclick="advanceOnboarding()">Complete Current Step</button></div>
<div class="wizard"><div class="wizardsteps" id="onboardSteps">
<div class="wizardstep active">1. Profile & Identity</div><div class="wizardstep">2. Licensing & States</div><div class="wizardstep">3. Agreements & E-Sign</div><div class="wizardstep">4. Academy Assignment</div><div class="wizardstep">5. Compliance Review</div><div class="wizardstep">6. Readiness Exam</div><div class="wizardstep">7. Manager Activation</div>
</div><div class="wizardpanel" id="onboardPanel"><div class="kicker">STEP 1</div><h3 style="font-family:Georgia,serif;font-size:28px">Profile & Identity</h3><p style="color:#91a5ba;line-height:1.7">Complete your contact information, employment details and required identity fields. In production, required documents will be stored securely in Supabase Storage.</p><div class="form-grid"><input class="mini-input" placeholder="Legal first name"><input class="mini-input" placeholder="Legal last name"><input class="mini-input" placeholder="Phone"><input class="mini-input" placeholder="Resident state"></div></div></div>`;

agentViews.tests = `
<div class="dashboard-head"><div><div class="kicker">PRACTICE EXAM CENTER</div><h2>Randomized Life & Health exams.</h2><p>Questions, order and answer positions change each time. Scores roll into your readiness profile.</p></div><button class="btn btn-primary" onclick="buildExam()">Generate New Exam</button></div>
<div class="exam-shell"><div class="question-card" id="examQuestion"><div class="qnum">READY</div><div class="qtext">Generate a new practice exam to begin.</div></div><div class="exam-side"><h3 style="margin-top:0">Exam Progress</h3><div id="examProgress" class="qdots"></div><div class="row-actions"><button class="tiny-btn" onclick="nextQuestion()">Next Question</button><button class="tiny-btn" onclick="finishExam()">Finish Exam</button></div><div id="examScore" style="margin-top:14px;color:#8fd1ff"></div></div></div>`;

adminViews.licensing = `
<div class="dashboard-head"><div><div class="kicker">LICENSING OVERSIGHT</div><h2>See every agent's licensing plan.</h2><p>Resident state, additional states, readiness and missing requirements in one place.</p></div><button class="btn btn-primary" onclick="toast('Bulk state-assignment tool opened.')">Assign States</button></div>
<div class="bo-card"><table class="admin-table"><tr><th>Agent</th><th>Resident</th><th>Additional States</th><th>Readiness</th><th>Status</th></tr>
<tr><td>A. Reed</td><td>IL</td><td>TX, FL</td><td>91%</td><td><span class="pill">Ready</span></td></tr>
<tr><td>J. Miles</td><td>TX</td><td>FL, GA</td><td>84%</td><td><span class="pill">Review</span></td></tr>
<tr><td>M. Hill</td><td>FL</td><td>TX</td><td>72%</td><td><span class="pill">Studying</span></td></tr></table></div>`;

ownerViews.academy = `
<div class="dashboard-head"><div><div class="kicker">ACADEMY GOVERNANCE</div><h2>Control the national learning system.</h2><p>Owners govern the national core, state layers, question bank, versioning and review cycles.</p></div><button class="btn btn-primary" onclick="toast('New curriculum version draft created.')">Create Version</button></div>
<div class="pipeline"><div class="pipe"><strong>National Core</strong><span>Life + Health foundation</span></div><div class="pipe"><strong>50 State Layers</strong><span>Rules + regulations</span></div><div class="pipe"><strong>Question Bank</strong><span>1,240 reviewed items</span></div><div class="pipe"><strong>Practice Exams</strong><span>Randomized delivery</span></div><div class="pipe"><strong>Product Tracks</strong><span>ACA first, more later</span></div></div>
<div class="bo-grid" style="margin-top:18px"><div class="bo-card"><h3>Quarterly Review Cycle</h3><div class="requirement"><span>National Core</span><span class="reqgood">Current</span></div><div class="requirement"><span>Texas Layer</span><span class="reqgood">Current</span></div><div class="requirement"><span>Florida Layer</span><span class="reqwait">Review Due</span></div><div class="requirement"><span>Illinois Layer</span><span class="reqgood">Current</span></div></div><div class="bo-card"><h3>Content Accuracy Workflow</h3><p style="color:#91a5ba;line-height:1.7">Draft → source review → trainer review → owner approval → publish. Historical completions and scores remain attached to the exact version each agent used.</p><button class="tiny-btn" onclick="toast('Source review queue opened.')">Open Review Queue</button></div></div>`;

const examBank=[
{q:'Which provision gives a policyowner a limited period to return a newly delivered policy for a refund?',a:['Grace period','Free-look provision','Reinstatement provision','Waiver of premium'],c:1},
{q:'Which type of life insurance generally provides coverage for a specified period?',a:['Whole life','Universal life','Term life','Variable life'],c:2},
{q:'A deductible is best described as:',a:['The amount the insurer pays first','The amount the insured pays before benefits begin','A premium refund','A policy dividend'],c:1},
{q:'Which concept requires applicants to provide complete and truthful information on an application?',a:['Insurable interest','Utmost good faith','Subrogation','Coinsurance'],c:1},
{q:'Which health plan feature commonly requires members to use a defined network for the highest level of benefits?',a:['HMO/PPO network rules','Grace period','Contestability','Beneficiary designation'],c:0},
{q:'A beneficiary is the person or entity that:',a:['Sets premium rates','Receives policy proceeds','Approves underwriting','Owns the insurer'],c:1},
{q:'Coinsurance usually refers to:',a:['A fixed dollar copay','A percentage of covered expenses shared by the insured','The deductible only','The premium tax'],c:1},
{q:'Which party typically has the right to change a revocable beneficiary?',a:['The beneficiary','The policyowner','The insurer only','The agent'],c:1}
];
let currentExam=[],examIndex=0,examAnswers={};

function buildExam(){
  currentExam=[...examBank].sort(()=>Math.random()-.5).slice(0,6);
  currentExam=currentExam.map(x=>{let pairs=x.a.map((v,i)=>({v,i})).sort(()=>Math.random()-.5);return {q:x.q,a:pairs.map(p=>p.v),c:pairs.findIndex(p=>p.i===x.c)}});
  examIndex=0;examAnswers={};renderQuestion();renderDots();document.getElementById('examScore').textContent='';
}
function renderQuestion(){
  if(!currentExam.length)return;
  const x=currentExam[examIndex];
  document.getElementById('examQuestion').innerHTML='<div class="qnum">QUESTION '+(examIndex+1)+' OF '+currentExam.length+'</div><div class="qtext">'+x.q+'</div>'+x.a.map((v,i)=>'<label class="answer"><input type="radio" name="examAnswer" value="'+i+'" '+(examAnswers[examIndex]===i?'checked':'')+' onchange="examAnswers['+examIndex+']='+i+';renderDots()"> '+v+'</label>').join('');
}
function renderDots(){
  const p=document.getElementById('examProgress');if(!p)return;p.innerHTML=currentExam.map((_,i)=>'<div class="qdot '+(examAnswers[i]!==undefined?'done':'')+'">'+(i+1)+'</div>').join('');
}
function nextQuestion(){if(!currentExam.length)return;examIndex=Math.min(examIndex+1,currentExam.length-1);renderQuestion();}
function finishExam(){
  if(!currentExam.length)return;
  let score=currentExam.reduce((n,x,i)=>n+(examAnswers[i]===x.c?1:0),0);
  let pct=Math.round(score/currentExam.length*100);
  document.getElementById('examScore').innerHTML='<strong>'+pct+'%</strong><br><small>'+score+' of '+currentExam.length+' correct</small>';
  localStorage.setItem('lastExamScore',pct);
}
function toggleState(el,state){el.classList.toggle('on');el.classList.contains('on')?selectedStates.add(state):selectedStates.delete(state);document.getElementById('targetStateCount').textContent=selectedStates.size;}
function saveStates(){localStorage.setItem('allshieldStates',JSON.stringify([...selectedStates]));toast('State licensing plan saved locally in this prototype.');}
function hydrateStates(){document.querySelectorAll('.statepick').forEach(b=>{if(selectedStates.has(b.textContent))b.classList.add('on')});const c=document.getElementById('targetStateCount');if(c)c.textContent=selectedStates.size;}
let onboardingStep=parseInt(localStorage.getItem('onboardingStep')||'0');
function advanceOnboarding(){
  onboardingStep=Math.min(onboardingStep+1,6);localStorage.setItem('onboardingStep',onboardingStep);
  const steps=document.querySelectorAll('#onboardSteps .wizardstep');steps.forEach((s,i)=>{s.classList.toggle('done',i<onboardingStep);s.classList.toggle('active',i===onboardingStep)});
  const titles=['Profile & Identity','Licensing & States','Agreements & E-Sign','Academy Assignment','Compliance Review','Readiness Exam','Manager Activation'];
  const p=document.getElementById('onboardPanel');if(p)p.innerHTML='<div class="kicker">STEP '+(onboardingStep+1)+'</div><h3 style="font-family:Georgia,serif;font-size:28px">'+titles[onboardingStep]+'</h3><p style="color:#91a5ba;line-height:1.7">Interactive prototype step saved. Production will store completion state, timestamps, reviewer, version and required documents in Supabase.</p>';
}
const originalShowAgentView=showAgentView;
showAgentView=function(view,el){originalShowAgentView(view,el);setTimeout(()=>{if(view==='licensing')hydrateStates();if(view==='onboarding')advanceOnboarding();},10)};


agentViews.communications=`
<div class="dashboard-head"><div><div class="kicker">COMMUNICATIONS</div><h2>Your Allshield inbox.</h2><p>Company announcements, manager messages and assigned-team communication in one place.</p></div><button class="btn btn-primary" onclick="toast('New internal message opened.')">New Message</button></div>
<div class="comm-layout"><div class="comm-list">
<div class="thread active" onclick="openThread(this,'Manager Check-In')"><strong>Manager Check-In</strong><small>2 new messages • today</small></div>
<div class="thread" onclick="openThread(this,'National Announcement')"><strong>National Announcement</strong><small>Training update • yesterday</small></div>
<div class="thread" onclick="openThread(this,'Licensing Support')"><strong>Licensing Support</strong><small>Your Texas track • Aug 16</small></div>
</div><div class="comm-panel"><div class="kicker">INTERNAL THREAD</div><h3 id="threadTitle">Manager Check-In</h3><div id="threadMessages"><div class="message">Good work this week. Your production is trending up and you are close to your next milestone.</div><div class="message me">Thank you. I’m focusing on the remaining training requirement today.</div></div><div class="compose-row"><input id="msgInput" class="mini-input" placeholder="Write an internal message..."><button class="btn btn-primary" onclick="sendInternalMessage()">Send</button></div></div></div>`;

adminViews.communications=`
<div class="dashboard-head"><div><div class="kicker">COMMUNICATIONS CENTER</div><h2>Reach the right people without leaving Allshield.</h2><p>Send announcements by company, office, department, manager group or individual user.</p></div><button class="btn btn-primary" onclick="toast('Announcement composer opened.')">Create Announcement</button></div>
<div class="bo-grid"><div class="bo-card"><h3>Audience</h3><select class="mini-input"><option>All Agents</option><option>All Managers</option><option>Specific Office</option><option>Specific Department</option><option>Individual User</option></select><textarea class="mini-input" style="height:130px;margin-top:10px" placeholder="Write announcement..."></textarea><div class="row-actions"><button class="btn btn-primary" onclick="toast('Announcement sent internally.')">Send Internally</button><button class="tiny-btn" onclick="toast('Email notification queued in demo.')">Also Email</button></div></div><div class="bo-card"><h3>Recent Broadcasts</h3><div class="activity-feed"><div class="activity">National Training Reminder<small>Sent to 100 agents • 96% opened</small></div><div class="activity">Licensing Deadline Update<small>Sent to 12 onboarding agents</small></div><div class="activity">Recognition Announcement<small>Sent company-wide</small></div></div></div></div>`;

ownerViews.departments=`
<div class="dashboard-head"><div><div class="kicker">DEPARTMENTS & ACCESS</div><h2>Permissions by job, department or person.</h2><p>Owner controls exactly what each internal employee can see and do.</p></div><button class="btn btn-primary" onclick="toast('New department wizard opened.')">Add Department</button></div>
<div class="dept-grid">
<div class="dept-card"><h4>Onboarding</h4><p>New-hire setup, documents, licensing status and activation workflow.</p><div class="accessline"><span>Agent profiles</span><span class="pill">Edit</span></div><div class="accessline"><span>Marketing</span><span>None</span></div><button class="tiny-btn" onclick="toast('Onboarding permissions opened.')">Configure</button></div>
<div class="dept-card"><h4>Payroll / Finance</h4><p>Production-related records and future compensation administration.</p><div class="accessline"><span>Production</span><span class="pill">View</span></div><div class="accessline"><span>Academy</span><span>None</span></div><button class="tiny-btn" onclick="toast('Finance permissions opened.')">Configure</button></div>
<div class="dept-card"><h4>Corporate Marketing</h4><p>Media Studio, corporate social accounts, content drafts and brand assets.</p><div class="accessline"><span>Marketing Center</span><span class="pill">Edit</span></div><div class="accessline"><span>Agent records</span><span>Limited</span></div><button class="tiny-btn" onclick="toast('Marketing permissions opened.')">Configure</button></div>
<div class="dept-card"><h4>Training</h4><p>Courses, recordings, quizzes, live rooms and learning assignments.</p><div class="accessline"><span>Academy</span><span class="pill">Edit</span></div><div class="accessline"><span>Production</span><span>View</span></div><button class="tiny-btn" onclick="toast('Training permissions opened.')">Configure</button></div>
</div>
<div class="bo-card" style="margin-top:18px"><h3>Specific Person Override</h3><p style="color:#8fa2b8;line-height:1.6">You can grant or revoke access for a named employee without changing the entire department. Example: Keyana Williams can be given Media Studio publishing rights while other marketing employees can edit drafts but cannot publish.</p><button class="btn btn-primary" onclick="toast('Individual permission override opened.')">Manage Individual Access</button></div>`;

ownerViews.communications=`
<div class="dashboard-head"><div><div class="kicker">COMPANY COMMUNICATIONS</div><h2>Internal communication under owner control.</h2><p>Announcements, direct messaging and notification rules remain inside the Allshield operating system.</p></div><button class="btn btn-primary" onclick="toast('Owner broadcast composer opened.')">New Owner Broadcast</button></div>
<div class="stat-grid"><div class="stat"><div class="label">Unread Messages</div><div class="value">8</div></div><div class="stat"><div class="label">Broadcast Open Rate</div><div class="value">94%</div></div><div class="stat"><div class="label">Active Threads</div><div class="value">31</div></div><div class="stat"><div class="label">Email Fallback</div><div class="value" style="font-size:21px">Enabled</div></div></div>
<div class="bo-grid"><div class="bo-card"><h3>Owner Channels</h3><div class="resource"><span>Company-Wide Announcements</span><button class="tiny-btn" onclick="toast('Channel opened.')">Open</button></div><div class="resource"><span>Leadership Channel</span><button class="tiny-btn" onclick="toast('Channel opened.')">Open</button></div><div class="resource"><span>Department Heads</span><button class="tiny-btn" onclick="toast('Channel opened.')">Open</button></div></div><div class="bo-card"><h3>Notification Rules</h3><div class="requirement"><span>Critical announcements trigger email</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div><div class="requirement"><span>Training reminders trigger email</span><span class="toggle on" onclick="this.classList.toggle('on')"></span></div><div class="requirement"><span>Direct internal messages trigger email</span><span class="toggle" onclick="this.classList.toggle('on')"></span></div></div></div>`;

function openThread(el,title){el.parentElement.querySelectorAll('.thread').forEach(x=>x.classList.remove('active'));el.classList.add('active');document.getElementById('threadTitle').textContent=title;document.getElementById('threadMessages').innerHTML='<div class="message">This is the '+title+' internal thread.</div>'}
function sendInternalMessage(){const i=document.getElementById('msgInput');if(!i||!i.value.trim())return;const d=document.createElement('div');d.className='message me';d.textContent=i.value;document.getElementById('threadMessages').appendChild(d);i.value='';toast('Internal message sent in demo.')}


// ===== CORPORATE SOCIAL PUBLISHING SYSTEM =====
const socialChannels = ['Facebook','Instagram','LinkedIn','TikTok','YouTube','YouTube Shorts'];
const selectedSocialChannels = new Set(['Facebook','Instagram']);

function socialChannelGrid(){
  return socialChannels.map((name,i)=>{
    const abbr={'Facebook':'f','Instagram':'IG','LinkedIn':'in','TikTok':'TT','YouTube':'YT','YouTube Shorts':'S'}[name];
    const on=selectedSocialChannels.has(name)?'on':'';
    return `<div class="channel ${on}" onclick="toggleSocialChannel(this,'${name}')"><div class="badge">${abbr}</div><span>${name}</span></div>`;
  }).join('');
}
function toggleSocialChannel(el,name){
  el.classList.toggle('on');
  if(el.classList.contains('on')) selectedSocialChannels.add(name); else selectedSocialChannels.delete(name);
  updateSocialPreview();
}
function selectAllSocial(){
  socialChannels.forEach(x=>selectedSocialChannels.add(x));
  document.querySelectorAll('.channel').forEach(x=>x.classList.add('on'));
  updateSocialPreview();
}
function clearAllSocial(){
  selectedSocialChannels.clear();
  document.querySelectorAll('.channel').forEach(x=>x.classList.remove('on'));
  updateSocialPreview();
}
function aiRewrite(style){
  const el=document.getElementById('socialCopy');
  if(!el)return;
  const source=el.value.trim() || 'Allshield continues to grow as we build a national platform focused on protection, opportunity, technology and professional development.';
  const versions={
    polished:'Allshield Insurance Group continues to grow as we build a national platform centered on protection, opportunity, technology and professional development. We are excited about what is ahead.',
    energetic:'We’re building something different at Allshield. New opportunities. Better tools. Real development. A national platform designed to help people serve customers, grow professionally and build toward what’s next.',
    recruiting:'Looking for more than another insurance opportunity? Allshield is building a national environment around training, technology, support and a clear path to growth. Come see what we’re building.'
  };
  el.value=versions[style]||source;
  updateSocialPreview();
}
function updateSocialPreview(){
  const copy=(document.getElementById('socialCopy')||{}).value || 'Your post preview will appear here.';
  const p=document.getElementById('socialPreviewCopy'); if(p)p.textContent=copy;
  const c=document.getElementById('socialPreviewChannels'); if(c)c.textContent=[...selectedSocialChannels].join(' • ') || 'No channels selected';
}
function publishSocialPost(mode='publish'){
  const copy=(document.getElementById('socialCopy')||{}).value?.trim();
  const r=document.getElementById('socialPublishResult');
  if(!copy){toast('Add post copy before publishing.');return}
  if(!selectedSocialChannels.size){toast('Select at least one social channel.');return}
  if(r){
    const action=mode==='schedule'?'Scheduled':'Queued for publishing';
    r.textContent=`${action}: ${[...selectedSocialChannels].join(', ')}. Production build will send this through secure server-side platform connectors.`;
    r.classList.add('show');
  }
  toast(mode==='schedule'?'Post scheduled in demo.':'Post queued in demo.');
}
function saveSocialDraft(){localStorage.setItem('allshieldSocialDraft',(document.getElementById('socialCopy')||{}).value||'');toast('Social draft saved locally in this prototype.');}
function loadSocialDraft(){const e=document.getElementById('socialCopy');if(e){e.value=localStorage.getItem('allshieldSocialDraft')||'';updateSocialPreview();}}

ownerViews.social = `
<div class="dashboard-head"><div><div class="kicker">SOCIAL PUBLISHING</div><h2>One composer. Every company channel.</h2><p>Create once, choose your destinations, preview, approve and publish from the Allshield back office.</p></div><button class="btn btn-primary" onclick="selectAllSocial()">Select All Channels</button></div>
<div class="social-layout">
  <div class="social-card">
    <h3>Create Corporate Post</h3>
    <textarea id="socialCopy" class="mini-input" style="height:160px" oninput="updateSocialPreview()" placeholder="Write your company post..."></textarea>
    <div class="publish-toolbar">
      <button class="tiny-btn" onclick="aiRewrite('polished')">✦ AI Polish</button>
      <button class="tiny-btn" onclick="aiRewrite('energetic')">⚡ More Energy</button>
      <button class="tiny-btn" onclick="aiRewrite('recruiting')">◎ Recruiting Tone</button>
      <button class="tiny-btn" onclick="toast('Brand media picker opened.')">Add Image</button>
      <button class="tiny-btn" onclick="toast('Video picker opened.')">Add Video</button>
    </div>
    <h4>Publish To</h4>
    <div id="socialChannelGrid" class="channel-grid">${socialChannelGrid()}</div>
    <div class="publish-toolbar"><button class="tiny-btn" onclick="selectAllSocial()">Select All</button><button class="tiny-btn" onclick="clearAllSocial()">Clear</button></div>
    <div class="publish-toolbar">
      <button class="btn btn-primary" onclick="publishSocialPost('publish')">Approve & Publish</button>
      <button class="tiny-btn" onclick="publishSocialPost('schedule')">Schedule</button>
      <button class="tiny-btn" onclick="saveSocialDraft()">Save Draft</button>
    </div>
    <div id="socialPublishResult" class="publish-result"></div>
  </div>
  <div class="social-card">
    <h3>Live Preview</h3>
    <div class="post-preview-box">
      <div class="post-preview-head"><div class="post-preview-avatar">A</div><div><strong>Allshield Insurance Group</strong><small id="socialPreviewChannels" style="display:block;color:#74899f;margin-top:3px">Facebook • Instagram</small></div></div>
      <div id="socialPreviewCopy" class="post-preview-copy">Your post preview will appear here.</div>
    </div>
    <h3 style="margin-top:18px">Connected Accounts</h3>
    <div class="account-row"><span><i class="statusdot"></i>Facebook Company Page</span><span class="pill">Connected</span><button class="tiny-btn" onclick="toast('Facebook account settings opened.')">Manage</button></div>
    <div class="account-row"><span><i class="statusdot"></i>Instagram Business</span><span class="pill">Connected</span><button class="tiny-btn" onclick="toast('Instagram account settings opened.')">Manage</button></div>
    <div class="account-row"><span><i class="statusdot off"></i>LinkedIn Company Page</span><span>Not Connected</span><button class="tiny-btn" onclick="toast('LinkedIn connection flow opened.')">Connect</button></div>
    <div class="account-row"><span><i class="statusdot off"></i>TikTok Business</span><span>Not Connected</span><button class="tiny-btn" onclick="toast('TikTok connection flow opened.')">Connect</button></div>
    <div class="account-row"><span><i class="statusdot off"></i>YouTube Channel</span><span>Not Connected</span><button class="tiny-btn" onclick="toast('YouTube connection flow opened.')">Connect</button></div>
  </div>
</div>
<div class="bo-grid" style="margin-top:18px">
<div class="bo-card"><h3>Publishing Queue</h3><div class="queue-item"><strong>Agent Recognition Carousel</strong><div class="meta">Facebook • Instagram • scheduled tomorrow 9:00 AM</div></div><div class="queue-item"><strong>National Expansion Update</strong><div class="meta">LinkedIn • draft awaiting approval</div></div></div>
<div class="bo-card"><h3>AI Marketing Brain</h3><div class="activity-feed"><div class="activity">3 new hires detected<small>Suggested: welcome post</small></div><div class="activity">7 milestone achievers detected<small>Suggested: recognition carousel</small></div><div class="activity">Training recording published<small>Suggested: short-form clip</small></div></div></div>
</div>`;

adminViews.social = ownerViews.social;

// ===== VIDEO + YOUTUBE STUDIO =====
let selectedVideoFormats=new Set(['YouTube']);
function toggleVideoFormat(el,name){el.classList.toggle('on');if(el.classList.contains('on'))selectedVideoFormats.add(name);else selectedVideoFormats.delete(name);}
function selectAllVideoFormats(){['YouTube','YouTube Shorts','Facebook Video','Instagram Reels','TikTok'].forEach(x=>selectedVideoFormats.add(x));document.querySelectorAll('.format-btn').forEach(x=>x.classList.add('on'));}
function aiVideoMetadata(){
  const t=document.getElementById('videoTitle'),d=document.getElementById('videoDescription');
  if(t)t.value='Inside Allshield: Building a Better Agent Experience';
  if(d)d.value='A look inside the training, technology and support systems being built for the Allshield team. Learn more about our national vision and the opportunity ahead.';
  toast('AI generated title and description.');
}
function publishVideo(){
  if(!selectedVideoFormats.size){toast('Select at least one video destination.');return}
  const r=document.getElementById('videoPublishResult');
  if(r){r.textContent='Queued for: '+[...selectedVideoFormats].join(', ')+'. Production build will upload through secure server-side connectors and platform-specific publishing APIs.';r.classList.add('show')}
  toast('Video publish job queued in demo.');
}
ownerViews.video = `
<div class="dashboard-head"><div><div class="kicker">VIDEO & YOUTUBE STUDIO</div><h2>Edit once. Publish long-form or short-form.</h2><p>Upload raw footage or use an edited asset, prepare metadata, and send it to YouTube, YouTube Shorts, Reels, TikTok and other selected channels.</p></div><button class="btn btn-primary" onclick="toast('Video upload opened.')">Upload Video</button></div>
<div class="video-layout">
  <div class="video-editor">
    <div class="video-stage"><div><div class="play">▶</div><strong>Video Preview</strong><p style="color:#7890a8;font-size:11px">Raw or edited company video appears here.</p></div></div>
    <div class="video-tools"><div class="video-tool" onclick="toast('Trim tool opened.')">Trim</div><div class="video-tool" onclick="toast('Crop tool opened.')">Crop</div><div class="video-tool" onclick="toast('Caption generator opened.')">Auto Captions</div><div class="video-tool" onclick="toast('Clip generator opened.')">Create Short Clips</div></div>
    <h3>Video Details</h3>
    <input id="videoTitle" class="mini-input" placeholder="Video title">
    <textarea id="videoDescription" class="mini-input" style="height:110px;margin-top:9px" placeholder="Description"></textarea>
    <div class="publish-toolbar"><button class="tiny-btn" onclick="aiVideoMetadata()">✦ AI Title + Description</button><button class="tiny-btn" onclick="toast('Thumbnail generator opened.')">Generate Thumbnail</button><button class="tiny-btn" onclick="toast('Hashtag suggestions opened.')">Hashtags</button></div>
    <h4>Publish Formats</h4>
    <div class="format-switch">
      <button class="format-btn on" onclick="toggleVideoFormat(this,'YouTube')">YouTube</button>
      <button class="format-btn" onclick="toggleVideoFormat(this,'YouTube Shorts')">YouTube Shorts</button>
      <button class="format-btn" onclick="toggleVideoFormat(this,'Facebook Video')">Facebook Video</button>
      <button class="format-btn" onclick="toggleVideoFormat(this,'Instagram Reels')">Instagram Reels</button>
      <button class="format-btn" onclick="toggleVideoFormat(this,'TikTok')">TikTok</button>
    </div>
    <div class="publish-toolbar"><button class="btn btn-primary" onclick="publishVideo()">Publish Selected</button><button class="tiny-btn" onclick="selectAllVideoFormats()">Select All</button><button class="tiny-btn" onclick="toast('Video scheduled in demo.')">Schedule</button></div>
    <div id="videoPublishResult" class="publish-result"></div>
  </div>
  <div class="social-card">
    <h3>Video Library</h3>
    <div class="queue-item"><strong>National Training — Raw</strong><div class="meta">62 min • not edited</div><div class="publish-toolbar"><button class="tiny-btn" onclick="toast('Raw training opened in editor.')">Edit</button><button class="tiny-btn" onclick="toast('Raw training selected for direct share.')">Share Raw</button></div></div>
    <div class="queue-item"><strong>Leadership Coaching — Edited</strong><div class="meta">18 min • captions complete</div><div class="publish-toolbar"><button class="tiny-btn" onclick="toast('Edited video loaded.')">Open</button><button class="tiny-btn" onclick="toast('Edited video loaded for publishing.')">Publish</button></div></div>
    <div class="queue-item"><strong>Recruiting Clip #3</strong><div class="meta">0:42 • vertical short</div><div class="publish-toolbar"><button class="tiny-btn" onclick="toast('Short clip loaded.')">Open</button><button class="tiny-btn" onclick="toast('Short clip loaded for multi-channel publishing.')">Publish</button></div></div>
    <h3>Publishing Queue</h3>
    <div class="queue-item"><strong>Recruiting Clip</strong><div class="meta">YouTube Shorts • Instagram Reels • TikTok</div></div>
  </div>
</div>`;
adminViews.video = ownerViews.video;

// load social draft when page is opened
const _showOwnerViewSocial = showOwnerView;
showOwnerView=function(view,el){_showOwnerViewSocial(view,el);setTimeout(()=>{if(view==='social')loadSocialDraft();},20)};
const _showAdminViewSocial = showAdminView;
showAdminView=function(view,el){_showAdminViewSocial(view,el);setTimeout(()=>{if(view==='social')loadSocialDraft();},20)};


// ================= AI SYSTEM =================
const aiKnowledge = {
  agent:[
    'Life & Health licensing academy structure',
    'Assigned state study tracks',
    'Onboarding progress',
    'Practice test performance',
    'Personal production and ranking',
    'Allshield policies and resources'
  ],
  admin:[
    'Team readiness and onboarding',
    'Licensing oversight',
    'Course and test administration',
    'Production and rankings',
    'Internal communications',
    'Assigned department permissions'
  ],
  owner:[
    'Full platform structure',
    'All 50 state licensing architecture',
    'Company performance',
    'Permissions and departments',
    'Media and social publishing',
    'Version history and update roadmap'
  ]
};

function aiAnswer(role,prompt){
  const p=prompt.toLowerCase();
  if(p.includes('study')||p.includes('test')||p.includes('license')) return 'I would build a focused review plan from your weakest licensing topics, then generate randomized practice questions and explanations until your readiness trend is consistently above the owner-defined threshold.';
  if(p.includes('post')||p.includes('social')||p.includes('marketing')) return 'I can draft a corporate post, adjust tone for each platform, suggest a visual, generate hashtags, and prepare channel-specific versions for approval before publishing.';
  if(p.includes('video')||p.includes('edit')) return 'I can analyze a recording, suggest cuts, remove dead space, identify strong clips, generate captions, draft titles/descriptions, and prepare long-form plus vertical short-form versions for review.';
  if(p.includes('agent')||p.includes('team')) return 'I can summarize team activity, flag agents who may need help, surface promotion candidates, and draft targeted follow-up or coaching recommendations.';
  if(p.includes('update')||p.includes('version')) return 'I can compare a proposed change against the current platform structure, identify affected modules, create a safe update checklist, and preserve historical records through versioning.';
  return 'I can help with this inside the Allshield back office. I would use the data and permissions available to your role, then prepare a draft or action for human approval rather than making an irreversible change automatically.';
}
function sendAI(role){
  const input=document.getElementById('aiPrompt-'+role), chat=document.getElementById('aiChat-'+role);
  if(!input||!chat||!input.value.trim()) return;
  const q=input.value.trim();
  chat.innerHTML += `<div class="ai-msg user">${q}</div>`;
  input.value='';
  setTimeout(()=>{chat.innerHTML += `<div class="ai-msg">${aiAnswer(role,q)}</div>`;chat.scrollTop=chat.scrollHeight;},250);
}
function runAIAgent(name){
  const outputs={
    'video':'Video AI analyzed the selected recording.\n\nSuggested edits:\n• Remove 0:00–0:18 pre-roll\n• Cut 3:42–4:08 dead space\n• Create 3 vertical clips at 0:54, 11:26 and 24:10\n• Generate captions\n• Suggested title: “How Allshield Builds Agent Readiness”',
    'marketing':'Marketing AI found 4 opportunities:\n\n1. New-hire welcome post\n2. Weekly milestone recognition\n3. National training teaser\n4. Recruiting post based on current Careers messaging\n\nAll remain drafts until approved.',
    'academy':'Academy AI review complete.\n\nWeakest topics across current trainees:\n• Health policy provisions\n• State-specific replacement rules\n• Life insurance taxation\n\nRecommended action: assign targeted micro-lessons and generate 25-question remediation exams.',
    'operations':'Operations AI found 6 items requiring attention:\n\n• 3 onboarding files incomplete\n• 2 agents below readiness threshold\n• 1 manager approval overdue\n• No critical system errors detected.',
    'performance':'Performance AI found 5 promotion candidates and 3 agents whose weekly production dropped more than 20%. Recommended: manager coaching follow-up before changing status.',
    'compliance':'Compliance AI found no critical issues in the demo dataset. 4 acknowledgments are due for renewal next quarter.'
  };
  const o=document.getElementById('aiGlobalOutput');if(o)o.textContent=outputs[name]||'AI job complete.';
  toast('AI agent completed the demo task.');
}
function aiImproveText(targetId,type){
  const e=document.getElementById(targetId); if(!e)return;
  const v=e.value.trim()||'Draft content goes here.';
  if(type==='professional') e.value='Allshield Insurance Group is pleased to share this update with our growing team and community. '+v;
  if(type==='shorten') e.value=v.split(' ').slice(0,28).join(' ')+'…';
  if(type==='energy') e.value='Big things are happening at Allshield. '+v+' We’re excited about what comes next.';
  toast('AI updated the draft.');
}
function aiSuggestVideoEdits(){
  const o=document.getElementById('videoAIOutput'); if(o)o.textContent='Suggested edit plan:\n\n00:00–00:16 Remove setup chatter\n03:42–04:08 Remove pause\n08:18 Add chapter marker: “Licensing Mindset”\n11:26 Create 42-second vertical clip\n24:10 Create 55-second recruiting clip\nEnd: add Allshield outro card\n\nCaptions: recommended\nNoise cleanup: light\nAspect ratios: 16:9 + 9:16';
  toast('Video AI finished analysis.');
}

// Agent AI assistant
agentViews.ai=`
<div class="dashboard-head"><div><div class="kicker">ALLSHIELD AI ASSISTANT</div><h2>Your personal operating assistant.</h2><p>Study help, onboarding guidance, performance coaching and resource search—inside your portal.</p></div></div>
<div class="bo-grid">
<div class="ai-panel"><h3>Ask Allshield AI</h3><div class="ai-chat" id="aiChat-agent"><div class="ai-msg">I can help you study, understand your onboarding steps, review your performance, find resources or explain what you need for your next promotion.</div></div><div class="ai-input-row"><input id="aiPrompt-agent" class="mini-input" placeholder="Ask about licensing, training, performance..."><button class="btn btn-primary" onclick="sendAI('agent')">Ask</button></div></div>
<div class="ai-panel"><h3>What I Know About Your Work</h3><div class="ai-memory">${aiKnowledge.agent.map(x=>`<div class="ai-memory-item"><strong>${x}</strong><span>Available to your personal AI assistant</span></div>`).join('')}</div></div>
</div>`;

// Admin AI operations
adminViews.ai=`
<div class="dashboard-head"><div><div class="kicker">AI OPERATIONS</div><h2>AI assistance across daily administration.</h2><p>Summaries, coaching flags, licensing review, content support and workflow recommendations.</p></div><button class="btn btn-primary" onclick="runAIAgent('operations')">Run Operations Scan</button></div>
<div class="ai-command-grid">
<div class="ai-agent-card"><div class="ai-agent-icon">◎</div><h4>Operations Agent</h4><p>Scans onboarding, approvals and incomplete workflows.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('operations')">Run</button></div></div>
<div class="ai-agent-card"><div class="ai-agent-icon">▣</div><h4>Academy Agent</h4><p>Finds weak topics and recommends targeted training.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('academy')">Run</button></div></div>
<div class="ai-agent-card"><div class="ai-agent-icon">↗</div><h4>Performance Agent</h4><p>Surfaces trends, promotion candidates and coaching needs.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('performance')">Run</button></div></div>
</div>
<div class="bo-grid" style="margin-top:18px"><div class="ai-panel"><h3>Ask Operations AI</h3><div class="ai-chat" id="aiChat-admin"><div class="ai-msg">I can review the areas your admin role has permission to access and prepare recommendations for you.</div></div><div class="ai-input-row"><input id="aiPrompt-admin" class="mini-input" placeholder="Ask about team readiness, onboarding, training..."><button class="btn btn-primary" onclick="sendAI('admin')">Ask</button></div></div><div class="ai-panel"><h3>AI Output</h3><div id="aiGlobalOutput" class="ai-output">Run an AI agent to see its recommended actions.</div></div></div>`;

// Owner AI command center
ownerViews.ai=`
<div class="dashboard-head"><div><div class="kicker">AI COMMAND CENTER</div><h2>AI inside every layer of the company.</h2><p>Specialized assistants can analyze, draft, edit, summarize and recommend—while owner permissions control what can actually be published or changed.</p></div><button class="btn btn-primary" onclick="runAIAgent('operations')">Run Company Scan</button></div>
<div class="ai-command-grid">
<div class="ai-agent-card"><div class="ai-agent-icon">▶</div><h4>Video Editor AI</h4><p>Analyzes recordings, suggests cuts, creates clips, captions and publishing metadata.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('video')">Analyze Media</button><button class="tiny-btn" onclick="showOwnerView('video',document.querySelector('#ownerPortal .side-link[onclick*=video]'))">Open Studio</button></div></div>
<div class="ai-agent-card"><div class="ai-agent-icon">✦</div><h4>Marketing AI</h4><p>Drafts posts, platform variants, campaigns, captions and content opportunities.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('marketing')">Find Ideas</button><button class="tiny-btn" onclick="showOwnerView('social',document.querySelector('#ownerPortal .side-link[onclick*=social]'))">Open Publishing</button></div></div>
<div class="ai-agent-card"><div class="ai-agent-icon">▣</div><h4>Academy AI</h4><p>Finds weak topics, recommends lessons and supports question-bank development.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('academy')">Review Academy</button></div></div>
<div class="ai-agent-card"><div class="ai-agent-icon">↗</div><h4>Performance AI</h4><p>Surfaces trends, promotion candidates, bonus progress and coaching opportunities.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('performance')">Analyze Performance</button></div></div>
<div class="ai-agent-card"><div class="ai-agent-icon">◎</div><h4>Operations AI</h4><p>Reviews onboarding, permissions, approvals and business workflow health.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('operations')">Scan Operations</button></div></div>
<div class="ai-agent-card"><div class="ai-agent-icon">✓</div><h4>Compliance AI</h4><p>Flags expired acknowledgments, missing records and review-cycle items for human review.</p><div class="ai-agent-actions"><button class="tiny-btn" onclick="runAIAgent('compliance')">Run Review</button></div></div>
</div>
<div class="bo-grid" style="margin-top:18px">
<div class="ai-panel"><h3>Ask Owner AI</h3><div class="ai-chat" id="aiChat-owner"><div class="ai-msg">I have owner-level visibility in this prototype. Ask about operations, training, marketing, media, performance, states or platform updates.</div></div><div class="ai-input-row"><input id="aiPrompt-owner" class="mini-input" placeholder="Ask the Allshield operating system..."><button class="btn btn-primary" onclick="sendAI('owner')">Ask</button></div></div>
<div class="ai-panel"><h3>AI Workbench Output</h3><div id="aiGlobalOutput" class="ai-output">Choose an AI agent above to analyze an area of the business.</div></div>
</div>
<div class="owner-note" style="margin-top:18px">Production rule: AI can draft, analyze and prepare actions. Publishing, permissions, financial changes, compliance decisions and destructive updates stay behind human approval unless you explicitly configure a safe automation.</div>`;

// Add inline AI to existing Social Publishing view when it opens.
const _oldOwnerSocial = ownerViews.social;
ownerViews.social = _oldOwnerSocial.replace(
  '<textarea id="socialCopy"',
  '<div class="ai-box"><strong>✦ Marketing AI is active</strong><p>It can rewrite, shorten, generate platform-specific versions and suggest content based on company activity.</p></div><textarea id="socialCopy"'
).replace(
  '<button class="tiny-btn" onclick="aiRewrite(\'polished\')">✦ AI Polish</button>',
  '<button class="tiny-btn" onclick="aiRewrite(\'polished\')">✦ AI Polish</button><button class="tiny-btn" onclick="aiImproveText(\'socialCopy\',\'shorten\')">Shorten</button><button class="tiny-btn" onclick="aiImproveText(\'socialCopy\',\'energy\')">More Energy</button>'
);
adminViews.social=ownerViews.social;

// Add inline AI to video studio.
const _oldOwnerVideo = ownerViews.video;
ownerViews.video = _oldOwnerVideo.replace(
  '<div class="video-stage">',
  '<div class="ai-box"><strong>✦ Video Editor AI</strong><p>Analyze raw or edited footage, suggest cuts, generate clips, captions, titles and channel-specific versions.</p></div><div class="video-stage">'
).replace(
  '<div class="video-tools">',
  '<div class="publish-toolbar"><button class="btn btn-primary" onclick="aiSuggestVideoEdits()">Analyze with AI</button></div><div id="videoAIOutput" class="ai-output" style="margin-bottom:12px">Upload or select a video, then run AI analysis.</div><div class="video-tools">'
);
adminViews.video=ownerViews.video;
