(()=>{
'use strict';
const VERSION='2026.09.01.005';
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

function dedupeGuidedRenderer(name,marker){
  const current=window[name];
  if(typeof current!=='function'||current[marker])return;
  let inFlight=null;
  const wrapped=function(){
    if(inFlight)return inFlight;
    try{
      const result=current.apply(this,arguments);
      if(result&&typeof result.then==='function'){
        inFlight=Promise.resolve(result).finally(()=>{inFlight=null});
        return inFlight;
      }
      return result;
    }catch(err){inFlight=null;throw err}
  };
  wrapped[marker]=true;
  wrapped.__allshieldWrappedFrom=current;
  window[name]=wrapped;
}

function stabilizeGuidedRenders(){
  dedupeGuidedRenderer('asGuidedRenderOnboarding','__allshieldStableOnboarding');
  dedupeGuidedRenderer('asGuidedOpenStudy','__allshieldStableStudy');
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

function textbookStatus(message){
  const book=document.getElementById('asTextbook');
  if(!book)return;
  let note=book.querySelector('.as-book-finish-status');
  if(!note){
    note=document.createElement('div');
    note.className='as-book-finish-status';
    note.setAttribute('role','status');
    note.style.cssText='max-width:850px;margin:8px auto 0;padding:11px 13px;border:1px solid #efd48d;border-radius:11px;background:#fff8e6;color:#715918;font:800 12px/1.45 Inter,system-ui,sans-serif;text-align:center;';
    const top=book.querySelector('.as-textbook-top');
    top?.insertAdjacentElement('afterend',note);
  }
  note.textContent=message;
  note.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function installTextbookFinishHandoff(){
  const current=window.asBookNext;
  if(typeof current!=='function'||current.__allshieldFinishHandoff)return;
  const wrapped=function(){
    const book=document.getElementById('asTextbook');
    const pages=book?.querySelectorAll('.as-textbook-page')||[];
    const countText=book?.querySelector('.as-textbook-count')?.textContent||'';
    const match=countText.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
    const onLast=!!match&&Number(match[1])===Number(match[2]);
    if(!book||!onLast)return current.apply(this,arguments);

    const check=book.querySelector('#asKnowledgeButton');
    const copy=book.querySelector('#asKnowledgeCopy');
    if(typeof window.asGuidedOpenLessonCheck==='function'){
      window.asGuidedOpenLessonCheck();
      setTimeout(()=>{
        if(document.getElementById('asTextbook')){
          textbookStatus(String(copy?.textContent||'Your review is complete, but the required active study time is still finishing. Stay on the lesson until the knowledge check unlocks.'));
        }
      },80);
      return;
    }
    if(check&&!check.disabled){check.click();return}
    textbookStatus(String(copy?.textContent||'Your review is complete, but the knowledge check is not unlocked yet.'));
  };
  wrapped.__allshieldFinishHandoff=true;
  wrapped.__allshieldWrappedFrom=current;
  window.asBookNext=wrapped;
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
  stabilizeGuidedRenders();
  installNoFlashNavigation();
  installTextbookFinishHandoff();
  serializeActivityHeartbeats();
  repairRetryButtons(document);
  clearAcademyBootVeil();
}

function boot(){
  tick();
  if(poller)clearInterval(poller);
  poller=setInterval(tick,350);
  window.__allshieldGuidedHotfixVersion=VERSION;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();