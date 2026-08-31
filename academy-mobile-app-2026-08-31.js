(()=>{
'use strict';
const MOBILE_MAX=820;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isMobile=()=>window.matchMedia(`(max-width:${MOBILE_MAX}px)`).matches;
const portal=()=>document.getElementById('agentPortal');
const inAcademy=()=>!!portal()?.classList.contains('as-classroom-active');
const isExamScreen=()=>!!document.querySelector('#agentPortal.as-classroom-active .as-exam-paper');

function injectMeta(){
  const vp=document.querySelector('meta[name="viewport"]');
  if(vp&&!String(vp.content||'').includes('viewport-fit=cover')) vp.content='width=device-width,initial-scale=1.0,viewport-fit=cover';
  let theme=document.getElementById('asAcademyThemeColor');
  if(!theme){theme=document.createElement('meta');theme.id='asAcademyThemeColor';theme.name='theme-color';document.head.appendChild(theme)}
  theme.content=inAcademy()&&isMobile()?'#ffffff':'#07111f';
  if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
    const m=document.createElement('meta');m.name='apple-mobile-web-app-capable';m.content='yes';document.head.appendChild(m);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')){
    const m=document.createElement('meta');m.name='apple-mobile-web-app-status-bar-style';m.content='default';document.head.appendChild(m);
  }
}

function injectStyles(){
  if(document.getElementById('asAcademyMobileAppStyles'))return;
  const s=document.createElement('style');s.id='asAcademyMobileAppStyles';s.textContent=`
#asAcademyMobileDock,#asAcademyProgressSheet{display:none}
@media(max-width:820px){
  body.as-classroom-body{background:#f6f8fb!important;overflow-x:hidden;-webkit-text-size-adjust:100%}
  #agentPortal.as-classroom-active{min-height:100dvh!important;background:#f6f8fb!important;padding-bottom:calc(82px + env(safe-area-inset-bottom))!important}
  #agentPortal.as-classroom-active .mobile-app-tabbar{display:none!important}
  #agentPortal.as-classroom-active .portal-main{padding:0!important;min-height:100dvh!important;background:#f6f8fb!important}
  #agentPortal.as-classroom-active .as-classroom-wrap{min-height:100dvh!important;padding-bottom:calc(86px + env(safe-area-inset-bottom))!important;background:#f6f8fb!important}

  /* App header */
  #agentPortal.as-classroom-active .as-class-header{position:sticky!important;top:0!important;z-index:330!important;padding-top:env(safe-area-inset-top);background:rgba(255,255,255,.97)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid #dde5ec!important;box-shadow:0 3px 14px rgba(31,55,73,.06)!important}
  #agentPortal.as-classroom-active .as-class-header-inner{min-height:64px!important;padding:9px 15px!important;display:grid!important;grid-template-columns:minmax(0,1fr) 68px!important;gap:12px!important;align-items:center!important}
  #agentPortal.as-classroom-active .as-class-brand{font-size:10px!important;letter-spacing:.09em!important;color:#1f6fa9!important}
  #agentPortal.as-classroom-active .as-class-course{font-size:11px!important;line-height:1.25!important;color:#657686!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  #agentPortal.as-classroom-active .as-class-progressbox{display:block!important;min-width:0!important}
  #agentPortal.as-classroom-active .as-class-progress-label{font-size:9px!important;margin-bottom:5px!important;gap:5px!important;color:#657686!important}
  #agentPortal.as-classroom-active .as-class-progress{height:6px!important;background:#e7edf2!important}
  #agentPortal.as-classroom-active .as-class-actions{display:none!important}

  /* Reading becomes a clean phone classroom, not a desktop card */
  #agentPortal.as-classroom-active .as-class-page,#agentPortal.as-classroom-active .as-exam-page{max-width:none!important;width:100%!important;margin:0!important;padding:0 0 calc(106px + env(safe-area-inset-bottom))!important;background:#fff!important}
  #agentPortal.as-classroom-active .as-class-paper,#agentPortal.as-classroom-active .as-exam-paper{width:100%!important;max-width:none!important;margin:0!important;padding:26px 18px 34px!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important}
  #agentPortal.as-classroom-active .as-class-eyebrow{font-size:10px!important;letter-spacing:.1em!important;margin-bottom:7px!important}
  #agentPortal.as-classroom-active .as-class-title{font-size:29px!important;line-height:1.14!important;margin:7px 0 9px!important;letter-spacing:-.025em!important}
  #agentPortal.as-classroom-active .as-class-subtitle{font-size:16px!important;line-height:1.55!important;margin-bottom:17px!important}
  #agentPortal.as-classroom-active .as-class-meta{font-size:12px!important;line-height:1.5!important;padding-bottom:15px!important;margin-bottom:22px!important}
  #agentPortal.as-classroom-active .as-class-section{margin:27px 0!important}
  #agentPortal.as-classroom-active .as-class-section h3{font-size:21px!important;line-height:1.28!important;margin-bottom:9px!important}
  #agentPortal.as-classroom-active .as-class-section p{font-size:17px!important;line-height:1.75!important;color:#243546!important}
  #agentPortal.as-classroom-active .as-class-objectives,#agentPortal.as-classroom-active .as-class-example,#agentPortal.as-classroom-active .as-class-tip,#agentPortal.as-classroom-active .as-class-memory{padding:15px 16px!important;margin:19px 0!important;border-radius:10px!important}
  #agentPortal.as-classroom-active .as-class-objectives li{font-size:15px!important;line-height:1.55!important;margin:8px 0!important}
  #agentPortal.as-classroom-active .as-class-example p,#agentPortal.as-classroom-active .as-class-tip p,#agentPortal.as-classroom-active .as-class-memory p{font-size:15px!important;line-height:1.62!important}
  #agentPortal.as-classroom-active .as-class-term{grid-template-columns:1fr!important;gap:5px!important;padding:13px 0!important}
  #agentPortal.as-classroom-active .as-class-term b{font-size:15px!important}
  #agentPortal.as-classroom-active .as-class-term span{font-size:14px!important;line-height:1.55!important}
  #agentPortal.as-classroom-active .as-class-helper{display:none!important}
  #agentPortal.as-classroom-active .as-class-footer{gap:8px!important;flex-wrap:wrap!important;margin-top:28px!important;padding-top:18px!important}
  #agentPortal.as-classroom-active .as-class-footer>div:empty{display:none!important}
  #agentPortal.as-classroom-active .as-class-footer .as-class-btn{flex:1 1 140px!important}

  /* Thumb-friendly questions */
  #agentPortal.as-classroom-active .as-check-intro{text-align:left!important;padding:0 0 14px!important}
  #agentPortal.as-classroom-active .as-check-intro h2{font-size:27px!important;line-height:1.2!important}
  #agentPortal.as-classroom-active .as-check-card{padding-top:20px!important}
  #agentPortal.as-classroom-active .as-check-count{font-size:10px!important}
  #agentPortal.as-classroom-active .as-check-prompt{font-size:19px!important;line-height:1.42!important;margin:10px 0 17px!important}
  #agentPortal.as-classroom-active .as-check-option,#agentPortal.as-classroom-active .as-exam-choice{min-height:56px!important;padding:14px 14px!important;margin:9px 0!important;border-radius:12px!important;font-size:16px!important;line-height:1.45!important;display:flex!important;align-items:flex-start!important;gap:10px!important;touch-action:manipulation!important}
  #agentPortal.as-classroom-active .as-check-option input,#agentPortal.as-classroom-active .as-exam-choice input{width:20px!important;height:20px!important;min-width:20px!important;margin:1px 0 0!important;accent-color:#1f6fa9!important}
  #agentPortal.as-classroom-active .as-check-option:has(input:checked),#agentPortal.as-classroom-active .as-exam-choice:has(input:checked){border-color:#1f6fa9!important;background:#eef6fb!important;box-shadow:0 0 0 2px rgba(31,111,169,.08)!important}
  #agentPortal.as-classroom-active .as-check-nav,#agentPortal.as-classroom-active .as-exam-controls{position:sticky!important;bottom:calc(79px + env(safe-area-inset-bottom))!important;z-index:300!important;margin:24px -18px -34px!important;padding:11px 18px 12px!important;background:rgba(255,255,255,.98)!important;border-top:1px solid #dde5ec!important;box-shadow:0 -8px 24px rgba(31,55,73,.08)!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:9px!important}
  #agentPortal.as-classroom-active .as-check-nav .as-class-btn,#agentPortal.as-classroom-active .as-exam-controls .as-class-btn{width:100%!important;min-height:50px!important;font-size:14px!important;border-radius:12px!important}
  #agentPortal.as-classroom-active .as-class-btn{min-height:46px!important;padding:11px 14px!important;border-radius:11px!important;font-size:14px!important;touch-action:manipulation!important}
  #agentPortal.as-classroom-active .as-review-item{padding:16px 0!important}
  #agentPortal.as-classroom-active .as-review-item strong{font-size:15px!important;line-height:1.4!important}
  #agentPortal.as-classroom-active .as-review-item p{font-size:14px!important;line-height:1.55!important}

  /* Course contents becomes a full-screen app sheet */
  .as-drawer-backdrop{z-index:700!important;background:rgba(18,35,49,.35)!important}
  .as-drawer{width:100%!important;max-width:none!important;height:calc(100dvh - env(safe-area-inset-top))!important;margin-top:env(safe-area-inset-top)!important;border-radius:22px 22px 0 0!important;box-shadow:0 -18px 50px rgba(25,44,58,.2)!important}
  .as-drawer-head{padding:18px 16px 13px!important}
  .as-drawer-body{padding:10px 14px calc(95px + env(safe-area-inset-bottom))!important}
  .as-drawer-chapter{padding:15px 0!important}
  .as-drawer-chapter-title{font-size:14px!important;line-height:1.35!important}
  .as-drawer-lesson{min-height:46px!important;padding:10px 8px!important;font-size:14px!important;line-height:1.35!important}

  /* Dedicated Academy app dock */
  #asAcademyMobileDock{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:680;height:66px;padding:5px;border-radius:21px;border:1px solid #d8e0e7;background:rgba(255,255,255,.98);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 12px 34px rgba(35,55,72,.18)}
  #asAcademyMobileDock button{appearance:none;border:0;background:transparent;color:#71808e;border-radius:16px;min-width:0;padding:4px 1px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:inherit;cursor:pointer;touch-action:manipulation}
  #asAcademyMobileDock button .as-app-icon{font-size:18px;line-height:1;color:#456274}
  #asAcademyMobileDock button .as-app-label{font-size:9px;line-height:1.05;font-weight:850;white-space:nowrap}
  #asAcademyMobileDock button.active{background:#eaf4fb;color:#155b8c}
  #asAcademyMobileDock button.active .as-app-icon{color:#155b8c}
  #agentPortal.as-mobile-testing #asAcademyMobileDock button[data-as-nav="contents"]{opacity:.35;pointer-events:none}

  /* Progress sheet */
  #asAcademyProgressSheet{display:flex;position:fixed;inset:0;z-index:760;background:rgba(18,35,49,.38);align-items:flex-end;justify-content:center;padding-top:env(safe-area-inset-top)}
  #asAcademyProgressSheet .as-progress-sheet-card{width:100%;max-height:88dvh;overflow:auto;background:#fff;color:#172033;border-radius:24px 24px 0 0;padding:12px 18px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(24,43,57,.22)}
  #asAcademyProgressSheet .as-sheet-handle{width:38px;height:4px;border-radius:999px;background:#cbd5dd;margin:0 auto 17px}
  #asAcademyProgressSheet .as-sheet-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:17px}
  #asAcademyProgressSheet h2{font-family:Georgia,"Times New Roman",serif;font-size:27px;line-height:1.1;margin:0;color:#17324a}
  #asAcademyProgressSheet .as-sheet-close{appearance:none;border:1px solid #d6e0e8;background:#fff;color:#17324a;width:42px;height:42px;border-radius:12px;font-size:20px}
  #asAcademyProgressSheet .as-progress-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
  #asAcademyProgressSheet .as-progress-stat{padding:15px;border:1px solid #dce5ed;border-radius:14px;background:#f8fafc}
  #asAcademyProgressSheet .as-progress-stat small{display:block;color:#728291;font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
  #asAcademyProgressSheet .as-progress-stat strong{font-family:Georgia,"Times New Roman",serif;color:#17324a;font-size:25px}
  #asAcademyProgressSheet .as-progress-next{margin-top:14px;border:1px solid #d8e5ee;background:#eef6fb;border-radius:14px;padding:15px;color:#29485f;line-height:1.5}
  #asAcademyProgressSheet .as-sheet-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:15px}
  #asAcademyProgressSheet .as-sheet-actions button{min-height:50px;border-radius:12px;font-weight:800;font-size:14px}
  #asAcademyProgressSheet .as-sheet-primary{border:0;background:#1f6fa9;color:#fff}
  #asAcademyProgressSheet .as-sheet-secondary{border:1px solid #cbd7e1;background:#fff;color:#17324a}
}
`;
  document.head.appendChild(s);
}

function ensureDock(){
  if(!portal())return;
  let dock=document.getElementById('asAcademyMobileDock');
  if(!dock){
    dock=document.createElement('nav');dock.id='asAcademyMobileDock';dock.setAttribute('aria-label','Academy navigation');
    dock.innerHTML=`
      <button type="button" data-as-nav="study" onclick="asMobileAcademyGoStudy()"><span class="as-app-icon">▤</span><span class="as-app-label">Study</span></button>
      <button type="button" data-as-nav="tests" onclick="asMobileAcademyGoTests()"><span class="as-app-icon">✓</span><span class="as-app-label">Test</span></button>
      <button type="button" data-as-nav="progress" onclick="asMobileAcademyProgress()"><span class="as-app-icon">◉</span><span class="as-app-label">Progress</span></button>
      <button type="button" data-as-nav="contents" onclick="asMobileAcademyContents()"><span class="as-app-icon">☰</span><span class="as-app-label">Contents</span></button>
      <button type="button" data-as-nav="exit" onclick="asMobileAcademyExit()"><span class="as-app-icon">⌂</span><span class="as-app-label">Exit</span></button>`;
    portal().appendChild(dock);
  }
  updateDock();
}

function updateDock(){
  const p=portal();if(!p)return;
  const exam=isExamScreen();p.classList.toggle('as-mobile-testing',exam);
  const testCenter=/Exam Center|Practice Examination|Exam Result|Chapter Exam|Chapter Result/i.test(String(document.querySelector('#agentMain')?.textContent||''));
  document.querySelectorAll('#asAcademyMobileDock button').forEach(b=>b.classList.remove('active'));
  const key=(exam||testCenter)?'tests':'study';
  document.querySelector(`#asAcademyMobileDock button[data-as-nav="${key}"]`)?.classList.add('active');
  injectMeta();
}

function confirmLeaveTest(){
  if(!isExamScreen())return true;
  return window.confirm('Leave this test screen? Any answers you have not submitted may be lost.');
}
window.asMobileAcademyGoStudy=()=>{if(!confirmLeaveTest())return;window.showAgentView?.('study',null)};
window.asMobileAcademyGoTests=()=>{if(isExamScreen())return;window.showAgentView?.('tests',null)};
window.asMobileAcademyContents=()=>{if(isExamScreen())return;window.asClassroomContents?.()};
window.asMobileAcademyExit=()=>{if(!confirmLeaveTest())return;window.asClassroomExit?.()};

async function dashboard(){
  const c=window.allshieldSupabase;if(!c)throw new Error('ALLSHIELD connection is not ready.');
  const {data,error}=await c.functions.invoke('academy-progress',{body:{action:'dashboard'}});if(error)throw error;if(data?.error)throw new Error(data.error);return data;
}
function closeProgress(){document.getElementById('asAcademyProgressSheet')?.remove()}
window.asMobileAcademyCloseProgress=closeProgress;
window.asMobileAcademyProgress=async()=>{
  if(document.getElementById('asAcademyProgressSheet'))return;
  const root=document.createElement('div');root.id='asAcademyProgressSheet';root.onclick=e=>{if(e.target===root)closeProgress()};
  root.innerHTML=`<div class="as-progress-sheet-card"><div class="as-sheet-handle"></div><div class="as-sheet-head"><div><div style="font-size:10px;letter-spacing:.1em;font-weight:900;color:#1f6fa9;text-transform:uppercase;margin-bottom:5px">ALLSHIELD Academy</div><h2>My progress</h2></div><button class="as-sheet-close" onclick="asMobileAcademyCloseProgress()" aria-label="Close">×</button></div><p style="color:#6a7b89">Loading your course progress…</p></div>`;
  document.body.appendChild(root);
  try{
    const d=await dashboard(),t=d.commercial_course,s=t?.summary||{},lic=(d.licenses||[]).find(x=>String(x.state_code||'').toUpperCase()===String(d.profile?.resident_state||'').toUpperCase())||(d.licenses||[])[0],exams=d.exams||[],last=exams[0],ready=!!lic?.metadata?.exam_ready;
    const next=(()=>{for(const ch of t?.chapters||[]){for(const l of ch.lessons||[])if(l.unlocked&&!l.completed)return `Chapter ${ch.chapter_order}: ${l.title}`;if(ch.chapter_exam_unlocked&&!ch.passed)return `Chapter ${ch.chapter_order} exam: ${ch.title}`}return ready?'You are marked Exam Ready.':'Continue exam simulations and remediation.'})();
    root.querySelector('.as-progress-sheet-card').innerHTML=`<div class="as-sheet-handle"></div><div class="as-sheet-head"><div><div style="font-size:10px;letter-spacing:.1em;font-weight:900;color:#1f6fa9;text-transform:uppercase;margin-bottom:5px">ALLSHIELD Academy</div><h2>My progress</h2></div><button class="as-sheet-close" onclick="asMobileAcademyCloseProgress()" aria-label="Close">×</button></div><div class="as-progress-grid"><div class="as-progress-stat"><small>Course</small><strong>${Math.round(Number(s.progress_percent||0))}%</strong></div><div class="as-progress-stat"><small>Lessons</small><strong>${Number(s.completed_lessons||0)}/${Number(s.lesson_count||0)}</strong></div><div class="as-progress-stat"><small>Chapters</small><strong>${Number(s.passed_chapters||0)}/${Number(s.chapter_count||0)}</strong></div><div class="as-progress-stat"><small>Last Test</small><strong>${last?.score_percent!=null?Math.round(Number(last.score_percent))+'%':'—'}</strong></div></div><div class="as-progress-next"><strong>${ready?'Exam Ready':'Next step'}</strong><br>${esc(next)}</div><div class="as-sheet-actions"><button class="as-sheet-primary" onclick="asMobileAcademyCloseProgress();asMobileAcademyGoStudy()">Continue Study</button><button class="as-sheet-secondary" onclick="asMobileAcademyCloseProgress();asMobileAcademyGoTests()">Practice Test</button></div>`;
  }catch(e){root.querySelector('.as-progress-sheet-card').innerHTML=`<div class="as-sheet-handle"></div><div class="as-sheet-head"><h2>My progress</h2><button class="as-sheet-close" onclick="asMobileAcademyCloseProgress()">×</button></div><p style="color:#6a7b89">${esc(e.message||e)}</p>`}
};

function sync(){
  injectStyles();injectMeta();
  if(isMobile()&&inAcademy())ensureDock();
  updateDock();
}
const obs=new MutationObserver(()=>{clearTimeout(window.__asAcademyMobileSyncTimer);window.__asAcademyMobileSyncTimer=setTimeout(sync,30)});
function install(){
  injectStyles();injectMeta();
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(sync,120),{passive:true});
  sync();window.__allshieldAcademyMobileAppInstalled=true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
