(()=>{
'use strict';
const VERSION='2026.09.01.003';
let lastLessonId=null;
let poller=null;

function wrapLessonStart(){
  const current=window.asGuidedStartLesson;
  if(typeof current!=='function'||current.__allshieldGuidedHotfix)return;
  const wrapped=async function(id){
    if(id)lastLessonId=String(id);
    return current.apply(this,arguments);
  };
  wrapped.__allshieldGuidedHotfix=true;
  window.asGuidedStartLesson=wrapped;
  window.asGuidedRetryLesson=()=>lastLessonId?wrapped(lastLessonId):window.asGuidedOpenStudy?.();
}

function installNoFlashNavigation(){
  const current=window.showAgentView;
  if(typeof current!=='function'||current.__allshieldNoFlashAcademy)return;
  const wrapped=function(view,link){
    if(view==='study'&&typeof window.asGuidedOpenStudy==='function'){
      window.asGuidedOpenStudy();
      return;
    }
    if(view==='onboarding'&&typeof window.asGuidedRenderOnboarding==='function'){
      window.asGuidedRenderOnboarding();
      return;
    }
    return current.apply(this,arguments);
  };
  wrapped.__allshieldNoFlashAcademy=true;
  wrapped.__allshieldWrappedFrom=current;
  window.showAgentView=wrapped;
}

function repairRetryButtons(root=document){
  root.querySelectorAll?.('.as-guide button').forEach(btn=>{
    const text=String(btn.textContent||'').trim();
    if(text==='Review Lesson & Try Again')btn.setAttribute('onclick','asGuidedRetryLesson()');
  });
}

function serializeActivityHeartbeats(){
  const client=window.allshieldSupabase;
  const functions=client?.functions;
  if(!functions||typeof functions.invoke!=='function'||functions.invoke.__allshieldGuidedSerialized)return;
  const original=functions.invoke.bind(functions);
  let queue=Promise.resolve();
  const wrapped=function(name,options){
    const action=options?.body?.action;
    if(name==='academy-progress'&&action==='record_activity'){
      const run=()=>original(name,options);
      const task=queue.then(run,run);
      queue=task.then(()=>undefined,()=>undefined);
      return task;
    }
    return original(name,options);
  };
  wrapped.__allshieldGuidedSerialized=true;
  functions.invoke=wrapped;
}

function clearAcademyBootVeil(){
  if(!document.querySelector('#agentPortal .as-guide'))return;
  document.documentElement.classList.remove('as-academy-preboot');
  document.getElementById('asAcademyPrebootVeil')?.remove();
  window.ALLSHIELD_ACADEMY_GUIDED_READY=true;
}

function tick(){
  wrapLessonStart();
  installNoFlashNavigation();
  serializeActivityHeartbeats();
  repairRetryButtons(document);
  clearAcademyBootVeil();
}

function boot(){
  tick();
  if(poller)clearInterval(poller);
  poller=setInterval(tick,250);
  window.__allshieldGuidedHotfixVersion=VERSION;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
