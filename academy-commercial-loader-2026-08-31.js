(()=>{
'use strict';
const VERSION='2026.09.01.006';
const scripts=[
  ['allshieldCommercialAcademyLearner',`./academy-commercial-learner-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyClassroomMode',`./academy-classroom-mode-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyMobileApp',`./academy-mobile-app-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyGuidedPath',`./academy-guided-path-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyGuidedHotfix',`./academy-guided-path-hotfix-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyAiInstructor',`./academy-ai-instructor-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyAvaMedia',`./academy-instructor-media-hotfix-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyTextbookReader',`./academy-textbook-reader-2026-09-01.js?v=${VERSION}`]
];

function loadOne(id,src){
  return new Promise(resolve=>{
    const existing=document.getElementById(id);
    if(existing){resolve();return}
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    s.async=false;
    s.onload=resolve;
    s.onerror=()=>{console.error(`ALLSHIELD Academy failed to load ${id}`);resolve()};
    (document.body||document.documentElement).appendChild(s);
  });
}

async function loadAcademy(){
  if(window.ALLSHIELD_ACADEMY_LOADING)return window.ALLSHIELD_ACADEMY_LOADING;
  window.ALLSHIELD_ACADEMY_LOADING=(async()=>{
    for(const [id,src] of scripts)await loadOne(id,src);
    window.ALLSHIELD_ACADEMY_LOADER_READY=true;
    return true;
  })();
  return window.ALLSHIELD_ACADEMY_LOADING;
}

function startWhenCoreReady(){
  if(window.__allshieldProdAcademyInstalled||document.readyState==='complete'){
    loadAcademy();
    return;
  }
  requestAnimationFrame(startWhenCoreReady);
}

startWhenCoreReady();
})();