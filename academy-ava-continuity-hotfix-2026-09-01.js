(()=>{
'use strict';
const VERSION='2026.09.01.002';
const CANONICAL_WELCOME='https://xxeiddnfbdqxwuojuggy.supabase.co/storage/v1/object/public/academy-media/instructors/ava/welcome-canonical-v3.mp4';
const portal=()=>document.getElementById('agentPortal');
const tracked=new Set();
let wrappedExit=false,wrappedShow=false,wrappedMode=false,wrappedChoice=false,wrappedPause=false;

function styles(){if(document.getElementById('asAvaContinuityStyles'))return;const s=document.createElement('style');s.id='asAvaContinuityStyles';s.textContent=`
#agentPortal.as-ava-instructor-mode #asTextbook{display:none!important}
body:not(.as-guided-body) #asGuidedStatus,body:not(.as-guided-body) #asInstructorMediaDock{display:none!important}
`;document.head.appendChild(s)}

function installAudioRegistry(){if(window.__asAvaNativeAudio||typeof window.Audio!=='function')return;const Native=window.Audio;window.__asAvaNativeAudio=Native;function AcademyAudio(...args){const a=new Native(...args);if(portal()?.classList.contains('as-guided-active')){tracked.add(a);const clean=()=>{if(a.ended||a.error)tracked.delete(a)};a.addEventListener('ended',clean,{once:true});a.addEventListener('error',clean,{once:true})}return a}AcademyAudio.prototype=Native.prototype;try{Object.setPrototypeOf(AcademyAudio,Native)}catch{}window.Audio=AcademyAudio}

function statusInfo(){const d=document.getElementById('asGuidedStatus'),t=document.getElementById('asGuidedStatusText');return{dock:d,text:String(t?.textContent||''),showing:!!d?.classList.contains('show')}}
function pauseDetachedPremium(){const s=statusInfo();if(s.showing&&!/paused|finished|complete|ready/i.test(s.text)&&typeof window.__asAvaOriginalGuidedPause==='function'){try{window.__asAvaOriginalGuidedPause()}catch{}}for(const a of [...tracked]){try{a.pause();a.currentTime=0;a.src=''}catch{}tracked.delete(a)}if(s.dock){s.dock.classList.remove('show');s.dock.style.display='none'}}
function hideDocks(){for(const id of ['asGuidedStatus','asInstructorMediaDock']){const el=document.getElementById(id);if(el){el.classList.remove('show');el.style.display='none'}}}
function pauseVisibleMedia(){document.querySelectorAll('#agentPortal video,#agentPortal audio').forEach(m=>{try{m.pause()}catch{}})}
function hardStop(){pauseDetachedPremium();try{window.asInstructorMediaStop?.()}catch{}pauseVisibleMedia();hideDocks();document.querySelectorAll('.as-guided-reading').forEach(el=>el.classList.remove('as-guided-reading'));portal()?.classList.remove('as-ava-instructor-mode')}
window.asAvaHardStop=hardStop;

function canonicalWelcome(){const v=document.getElementById('asAvaWelcomeVideo');if(!v)return;if(v.dataset.asCanonicalAva==='1')return;const wasPlaying=!v.paused&&!v.ended;try{v.pause()}catch{}v.dataset.asCanonicalAva='1';v.src=CANONICAL_WELCOME;v.load();if(wasPlaying)setTimeout(()=>v.play().catch(()=>{}),80)}

function lessonVideo(){const v=document.getElementById('asAvaLessonVideo');return v&&!v.ended?v:null}
function guidedEnabled(){return !!document.querySelector('.as-guided-toggle.on')||statusInfo().showing}
function quietPremiumNarration(){const s=statusInfo();if(s.showing&&!/paused|finished|complete|ready/i.test(s.text)&&typeof window.__asAvaOriginalGuidedPause==='function'){try{window.__asAvaOriginalGuidedPause()}catch{}}for(const a of [...tracked]){try{a.pause()}catch{}}if(s.dock){s.dock.classList.remove('show');s.dock.style.display='none'}}
function takeVideoPrimary(autoplay=false){const v=lessonVideo();if(!v||!guidedEnabled())return false;quietPremiumNarration();portal()?.classList.add('as-ava-instructor-mode');const book=document.getElementById('asTextbook');if(book)book.setAttribute('aria-hidden','true');if(autoplay&&v.paused)v.play().catch(()=>{});return true}

function wrapPause(){if(wrappedPause||typeof window.asGuidedPauseResume!=='function')return;const old=window.asGuidedPauseResume;window.__asAvaOriginalGuidedPause=old;window.asGuidedPauseResume=()=>{const v=lessonVideo();if(v){quietPremiumNarration();if(v.paused)v.play().catch(()=>{});else v.pause();return}return old()};wrappedPause=true}
function wrapMode(){if(wrappedMode||typeof window.asGuidedSetMode!=='function')return;const old=window.asGuidedSetMode;window.asGuidedSetMode=async on=>{const out=await old(on);if(on){setTimeout(()=>takeVideoPrimary(true),150);setTimeout(()=>takeVideoPrimary(false),360)}else{quietPremiumNarration();const v=lessonVideo();if(v&&!v.paused)v.pause();hideDocks()}return out};wrappedMode=true}
function wrapChoice(){if(wrappedChoice||typeof window.asInstructorChoice!=='function')return;const old=window.asInstructorChoice;window.asInstructorChoice=async mode=>{const out=await old(mode);if(mode==='guided'){setTimeout(()=>takeVideoPrimary(true),170);setTimeout(()=>takeVideoPrimary(false),380)}else hardStop();return out};wrappedChoice=true}
function wrapExit(){if(wrappedExit||typeof window.asGuidedExit!=='function')return;const old=window.asGuidedExit;window.asGuidedExit=(...a)=>{hardStop();return old(...a)};wrappedExit=true}
function wrapShow(){if(wrappedShow||typeof window.showAgentView!=='function')return;const old=window.showAgentView;window.showAgentView=function(view,...a){if(view!=='study')hardStop();return old.call(this,view,...a)};wrappedShow=true}

function scan(){styles();installAudioRegistry();canonicalWelcome();wrapPause();wrapMode();wrapChoice();wrapExit();wrapShow();const active=portal()?.classList.contains('as-guided-active');if(!active){hideDocks();return}const v=lessonVideo();if(v&&guidedEnabled()){const s=statusInfo();if(s.showing&&!/paused|finished|complete|ready/i.test(s.text))quietPremiumNarration();portal()?.classList.add('as-ava-instructor-mode')}}
function boot(){styles();installAudioRegistry();scan();setInterval(scan,250);document.addEventListener('click',e=>{if(e.target?.closest?.('.as-guide-exit'))hardStop()},true);window.addEventListener('pagehide',hardStop);window.addEventListener('beforeunload',hardStop)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ALLSHIELD_AVA_CONTINUITY_VERSION=VERSION;
})();