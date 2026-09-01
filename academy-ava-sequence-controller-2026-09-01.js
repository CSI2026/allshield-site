(()=>{
'use strict';
const VERSION='2026.09.01.003';
const sb=()=>window.allshieldSupabase;
const portal=()=>document.getElementById('agentPortal');
let pref=null;
let mode='solo';
let currentLessonId=null;
let nextLessonId=null;
let wrappedChoice=false;
let wrappedStart=false;
let wrappedFocus=false;
let wrappedStudy=false;
let wrappedMode=false;
let introPolicyReady=false;
let scanTimer=null;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function edge(body){const c=sb();if(!c)throw new Error('ALLSHIELD connection is not ready.');const {data,error}=await c.functions.invoke('academy-instructor',{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
function freshKey(id){return `as-ava-fresh-guided-start-v3-${id}`}
function legacyResumeKey(id){return `as-ava-video-resume-${id}`}
function sequenceResumeKey(id){return `as-ava-video-resume-v3-${id}`}
function focusKey(id){return `allshield-guided-focus-${id}`}
function setMode(value){mode=value==='guided'?'guided':'solo';window.ALLSHIELD_GUIDED_ASSISTANCE_ACTIVE=mode==='guided';document.body.dataset.asInstructorMode=mode}
function parseNextLessonId(){const btn=[...document.querySelectorAll('.as-guide-next button,.as-guide-next .as-guide-primary')].find(b=>/Start This Lesson|Continue This Lesson|Continue Lesson/i.test(String(b.textContent||'')));const raw=btn?.getAttribute('onclick')||'';const m=raw.match(/asGuidedStartLesson\(['\"]([^'\"]+)['\"]\)/);return m?.[1]||null}
function clearStaleResume(id){if(!id)return;try{localStorage.removeItem(legacyResumeKey(id));localStorage.removeItem(sequenceResumeKey(id))}catch{}}
function hideInstructorDocks(){for(const id of ['asInstructorMediaDock','asGuidedStatus']){const el=document.getElementById(id);if(el){el.classList.remove('show');el.style.display='none'}}}
function stopDetachedNarration(){const status=document.getElementById('asGuidedStatus'),txt=String(document.getElementById('asGuidedStatusText')?.textContent||'');if(status?.classList.contains('show')&&!/paused|finished|complete|ready/i.test(txt)&&typeof window.__asAvaOriginalGuidedPause==='function'){try{window.__asAvaOriginalGuidedPause()}catch{}}}
function welcomeVideo(){return document.getElementById('asAvaWelcomeVideo')}
function lessonVideoElement(){return document.getElementById('asAvaLessonVideo')}
function lessonVideo(){const v=lessonVideoElement();return v&&!v.ended?v:null}
function lessonVideoCard(){return lessonVideoElement()?.closest('.as-ava-video-card')||null}
function removeInstructorMode(){portal()?.classList.remove('as-ava-instructor-mode');const book=document.getElementById('asTextbook');if(book)book.removeAttribute('aria-hidden')}
function makeVideoPrimary(auto=true){const v=lessonVideo();if(!v||mode!=='guided')return false;stopDetachedNarration();hideInstructorDocks();const card=lessonVideoCard();if(card)card.style.display='';portal()?.classList.add('as-ava-instructor-mode');const book=document.getElementById('asTextbook');if(book)book.setAttribute('aria-hidden','true');if(auto&&v.paused)v.play().catch(()=>{});return true}
function makeSoloPrimary(){const v=lessonVideoElement();if(v){try{v.pause()}catch{}const card=lessonVideoCard();if(card)card.style.display='none'}stopDetachedNarration();hideInstructorDocks();removeInstructorMode()}
function firstSegmentLoaded(){const v=lessonVideoElement();if(!v)return false;const src=String(v.currentSrc||v.src||'');return /lesson-1-1-part-1\.mp4(?:\?|$)/.test(src)||/part-1\.mp4(?:\?|$)/.test(src)}
function markFreshHandled(){if(!currentLessonId)return;try{sessionStorage.removeItem(freshKey(currentLessonId))}catch{}}
function freshStartPending(){if(!currentLessonId)return false;try{return sessionStorage.getItem(freshKey(currentLessonId))==='1'}catch{return false}}
async function enforceLessonSequence(){if(!currentLessonId)return;const fresh=freshStartPending();for(let i=0;i<20;i++){
  if(document.querySelector('.as-focus'))return;
  const raw=lessonVideoElement();
  if(raw?.ended){stopDetachedNarration();hideInstructorDocks();removeInstructorMode();markFreshHandled();return}
  const v=lessonVideo();
  if(v){
    if(mode==='solo'){makeSoloPrimary();markFreshHandled();return}
    if(fresh){
      if(!firstSegmentLoaded()){
        clearStaleResume(currentLessonId);
        if(i<5){await sleep(100);continue}
      }
      const reset=()=>{try{if(firstSegmentLoaded()&&Number(v.currentTime||0)>0.35)v.currentTime=0}catch{}};
      if(v.readyState>=1)reset();else v.addEventListener('loadedmetadata',reset,{once:true});
    }
    makeVideoPrimary(true);
    markFreshHandled();
    return;
  }
  await sleep(100);
 }
 // If there is no real moving Ava lesson video, do not let audio-only narration
 // impersonate the professor experience the learner selected.
 if(mode==='guided'){
   stopDetachedNarration();
   hideInstructorDocks();
   removeInstructorMode();
 }
}

async function loadPreference(){try{const r=await edge({action:'faculty'});pref=r.preference||null;setMode(pref?.guided_enabled?'guided':'solo')}catch{pref=null;setMode('solo')}introPolicyReady=true;applyIntroPolicy()}
function wireWelcomeEnd(v){if(v.dataset.asSequenceEndWired==='1')return;v.dataset.asSequenceEndWired='1';v.addEventListener('ended',()=>{hideInstructorDocks();try{window.asInstructorMediaStop?.()}catch{}},{once:true})}
function applyIntroPolicy(){if(!introPolicyReady)return;const card=document.getElementById('asAvaWelcomeCard'),v=welcomeVideo();if(!card||!v)return;wireWelcomeEnd(v);if(pref?.introduction_seen_at){try{v.pause()}catch{}card.style.display='none';document.getElementById('asInstructorChoice')?.remove()}else{card.style.display=''}}

function wrapChoice(){if(wrappedChoice||typeof window.asInstructorChoice!=='function')return;const old=window.asInstructorChoice;window.asInstructorChoice=async chosen=>{
  const target=parseNextLessonId()||nextLessonId;
  setMode(chosen==='guided'?'guided':'solo');
  if(target){nextLessonId=target;clearStaleResume(target);try{sessionStorage.setItem(freshKey(target),'1')}catch{}}
  const out=await old(chosen);
  pref={...(pref||{}),guided_enabled:chosen==='guided',introduction_seen_at:new Date().toISOString()};
  hideInstructorDocks();
  document.getElementById('asAvaWelcomeCard')?.style?.setProperty('display','none');
  if(target&&typeof window.asGuidedStartLesson==='function')setTimeout(()=>window.asGuidedStartLesson(target),180);
  return out;
 };wrappedChoice=true}
function wrapMode(){if(wrappedMode||typeof window.asGuidedSetMode!=='function')return;const old=window.asGuidedSetMode;window.asGuidedSetMode=async on=>{
  setMode(on?'guided':'solo');
  const out=await old(on);
  pref={...(pref||{}),guided_enabled:!!on};
  if(on){setTimeout(enforceLessonSequence,80);setTimeout(enforceLessonSequence,320)}else makeSoloPrimary();
  return out;
 };wrappedMode=true}
function wrapStart(){if(wrappedStart||typeof window.asGuidedStartLesson!=='function')return;const old=window.asGuidedStartLesson;window.asGuidedStartLesson=async(id,...args)=>{
  currentLessonId=String(id||'');
  if(freshStartPending())clearStaleResume(currentLessonId);
  const out=await old(id,...args);
  setTimeout(enforceLessonSequence,80);
  return out;
 };wrappedStart=true}
function wrapFocus(){if(wrappedFocus||typeof window.asGuidedBeginFocus!=='function')return;const old=window.asGuidedBeginFocus;window.asGuidedBeginFocus=()=>{
  if(!currentLessonId)return old();
  // Skip the obsolete generic 15-second AI brief. Once focus begins, the next
  // teaching media is the real Ava instructor lesson.
  try{localStorage.setItem(focusKey(currentLessonId),'started')}catch{}
  return window.asGuidedStartLesson?.(currentLessonId);
 };wrappedFocus=true}
function wrapStudy(){if(wrappedStudy||typeof window.asGuidedOpenStudy!=='function')return;const old=window.asGuidedOpenStudy;window.asGuidedOpenStudy=async(...args)=>{currentLessonId=null;const out=await old(...args);setTimeout(()=>{nextLessonId=parseNextLessonId();applyIntroPolicy()},180);return out};wrappedStudy=true}

function scan(){wrapChoice();wrapMode();wrapStart();wrapFocus();wrapStudy();nextLessonId=parseNextLessonId()||nextLessonId;applyIntroPolicy();const raw=lessonVideoElement();if(raw?.ended){removeInstructorMode();hideInstructorDocks();return}if(raw){if(mode==='guided')makeVideoPrimary(false);else makeSoloPrimary()}else if(mode==='guided'&&currentLessonId&&document.getElementById('asTextbook')){stopDetachedNarration();hideInstructorDocks()}}
function boot(){scan();loadPreference();scanTimer=setInterval(scan,180);window.addEventListener('pagehide',()=>{if(scanTimer)clearInterval(scanTimer)});window.ALLSHIELD_AVA_SEQUENCE_VERSION=VERSION}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();