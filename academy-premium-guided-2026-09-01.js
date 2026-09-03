(()=>{
'use strict';
const VERSION='2026.09.03.001';
const sb=()=>window.allshieldSupabase;
let pref=null,guided=false,wrappedStart=false;
async function edge(body){const c=sb();if(!c)throw new Error('ALLSHIELD connection is not ready.');const {data,error}=await c.functions.invoke('academy-instructor',{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
function stopGenericNarration(){try{window.speechSynthesis?.cancel()}catch{}document.querySelectorAll('.as-guided-reading').forEach(el=>el.classList.remove('as-guided-reading'));document.getElementById('asGuidedStatus')?.classList.remove('show')}
function styles(){if(document.getElementById('asPremiumGuidedStyles'))return;const s=document.createElement('style');s.id='asPremiumGuidedStyles';s.textContent=`
.as-instructor-choice{max-width:760px;margin:18px auto 26px;background:#fff;border:1px solid #dce5eb;border-radius:18px;padding:25px 26px;box-shadow:0 14px 38px rgba(29,52,67,.08)}.as-instructor-choice .k{font-size:10px;letter-spacing:.14em;font-weight:950;color:#2475a7}.as-instructor-choice h3{font-family:Georgia,'Times New Roman',serif;color:#17384f;font-size:27px;margin:7px 0 9px}.as-instructor-choice p{color:#607483;line-height:1.65}.as-instructor-choice-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:17px}.as-instructor-choice button{min-height:52px;border-radius:12px;font-weight:900;cursor:pointer}.as-choice-solo{border:1px solid #cbd7df;background:#fff;color:#365268}.as-choice-guided{border:0;background:#1f70a6;color:#fff;box-shadow:0 8px 18px rgba(31,112,166,.16)}
@media(max-width:680px){.as-instructor-choice{margin:12px 4px 18px;padding:20px 17px}.as-instructor-choice-actions{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
async function setGuided(on){guided=!!on;stopGenericNarration();try{const r=await edge({action:'set_guided',enabled:guided});pref=r.preference}catch{};return guided}
window.asGuidedSetMode=on=>setGuided(!!on);
window.asGuidedPauseResume=()=>window.asInstructorMediaToggle?.();
window.asGuidedSpeed=()=>{};
async function choice(mode){await setGuided(mode==='guided');try{await edge({action:'mark_introduction_seen'})}catch{}document.getElementById('asInstructorChoice')?.remove()}
window.asInstructorChoice=choice;
function showChoice(){if(document.getElementById('asInstructorChoice'))return;const anchor=document.getElementById('asAvaWelcomeCard')||document.querySelector('.as-guide-next');if(!anchor)return;const c=document.createElement('section');c.id='asInstructorChoice';c.className='as-instructor-choice';c.innerHTML='<div class="k">YOUR LEARNING STYLE</div><h3>How would you like to continue?</h3><p>Choose the written course or continue with Ava as your on-screen instructor. Generic browser narration is not used.</p><div class="as-instructor-choice-actions"><button class="as-choice-solo" onclick="asInstructorChoice(\'solo\')">Read on my own</button><button class="as-choice-guided" onclick="asInstructorChoice(\'guided\')">Continue with Ava</button></div>';anchor.after(c);c.scrollIntoView({behavior:'smooth',block:'center'})}
function wireWelcome(){const v=document.getElementById('asAvaWelcomeVideo');if(!v||v.dataset.asPremiumChoice==='1')return;v.dataset.asPremiumChoice='1';v.addEventListener('ended',showChoice);if(pref&&!pref.introduction_seen_at&&v.ended)showChoice()}
async function initPref(){try{const r=await edge({action:'faculty'});pref=r.preference||null;guided=!!pref?.guided_enabled}catch{pref=null;guided=false}}
function wrapStart(){if(wrappedStart||typeof window.asGuidedStartLesson!=='function')return;const old=window.asGuidedStartLesson;window.asGuidedStartLesson=async(id,...args)=>{stopGenericNarration();return await old(id,...args)};wrappedStart=true}
function scan(){wrapStart();wireWelcome();document.querySelectorAll('.as-guided-tools,#asAiLessonTools,.as-ai-mini').forEach(el=>el.remove());if(guided)stopGenericNarration()}
async function boot(){styles();stopGenericNarration();await initPref();scan();setInterval(scan,350);window.addEventListener('pagehide',stopGenericNarration)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ALLSHIELD_PREMIUM_GUIDED_VERSION=VERSION;
})();
