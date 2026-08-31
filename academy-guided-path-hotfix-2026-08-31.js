(()=>{
'use strict';
const VERSION='2026.08.31.001';
let lastLessonId=null;

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

function repairRetryButtons(root=document){
  root.querySelectorAll?.('.as-guide button').forEach(btn=>{
    const text=String(btn.textContent||'').trim();
    if(text==='Review Lesson & Try Again'){
      btn.setAttribute('onclick','asGuidedRetryLesson()');
    }
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

function boot(){
  wrapLessonStart();
  serializeActivityHeartbeats();
  repairRetryButtons();
  const observer=new MutationObserver(records=>{
    for(const r of records){
      for(const node of r.addedNodes){
        if(node.nodeType!==1)continue;
        repairRetryButtons(node);
      }
    }
    wrapLessonStart();
    serializeActivityHeartbeats();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.__allshieldGuidedHotfixVersion=VERSION;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
