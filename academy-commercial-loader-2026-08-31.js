(()=>{
'use strict';
const VERSION='2026.09.01.004';

function loadTextbook(){
  if(document.getElementById('allshieldAcademyTextbookReader'))return;
  const t=document.createElement('script');
  t.id='allshieldAcademyTextbookReader';
  t.src=`./academy-textbook-reader-2026-09-01.js?v=${VERSION}`;
  t.async=false;
  document.body.appendChild(t);
}

function loadAvaMedia(){
  if(document.getElementById('allshieldAcademyAvaMedia')){setTimeout(loadTextbook,20);return;}
  const v=document.createElement('script');
  v.id='allshieldAcademyAvaMedia';
  v.src=`./academy-instructor-media-hotfix-2026-08-31.js?v=${VERSION}`;
  v.async=false;
  v.onload=()=>setTimeout(loadTextbook,15);
  document.body.appendChild(v);
}

function loadAiInstructor(){
  if(document.getElementById('allshieldAcademyAiInstructor')){setTimeout(loadAvaMedia,20);return;}
  const a=document.createElement('script');
  a.id='allshieldAcademyAiInstructor';
  a.src=`./academy-ai-instructor-2026-08-31.js?v=${VERSION}`;
  a.async=false;
  a.onload=()=>setTimeout(loadAvaMedia,15);
  document.body.appendChild(a);
}

function loadGuidedHotfix(){
  if(document.getElementById('allshieldAcademyGuidedHotfix')){setTimeout(loadAiInstructor,20);return;}
  const h=document.createElement('script');
  h.id='allshieldAcademyGuidedHotfix';
  h.src=`./academy-guided-path-hotfix-2026-08-31.js?v=${VERSION}`;
  h.async=false;
  h.onload=()=>setTimeout(loadAiInstructor,15);
  document.body.appendChild(h);
}

function loadGuidedAcademy(){
  if(document.getElementById('allshieldAcademyGuidedPath')){setTimeout(loadGuidedHotfix,20);return;}
  const g=document.createElement('script');
  g.id='allshieldAcademyGuidedPath';
  g.src=`./academy-guided-path-2026-08-31.js?v=${VERSION}`;
  g.async=false;
  g.onload=()=>setTimeout(loadGuidedHotfix,15);
  document.body.appendChild(g);
}

function loadMobileAcademy(){
  if(document.getElementById('allshieldAcademyMobileApp')){setTimeout(loadGuidedAcademy,25);return;}
  const m=document.createElement('script');
  m.id='allshieldAcademyMobileApp';
  m.src='./academy-mobile-app-2026-08-31.js?v=2026.08.31.001';
  m.async=false;
  m.onload=()=>setTimeout(loadGuidedAcademy,20);
  document.body.appendChild(m);
}

function loadClassroom(){
  if(document.getElementById('allshieldAcademyClassroomMode')){setTimeout(loadMobileAcademy,25);return;}
  const c=document.createElement('script');
  c.id='allshieldAcademyClassroomMode';
  c.src='./academy-classroom-mode-2026-08-31.js?v=2026.08.31.002';
  c.async=false;
  c.onload=()=>setTimeout(loadMobileAcademy,20);
  document.body.appendChild(c);
}

function loadCommercialAcademy(){
  if(document.getElementById('allshieldCommercialAcademyLearner')){setTimeout(loadClassroom,30);return;}
  const s=document.createElement('script');
  s.id='allshieldCommercialAcademyLearner';
  s.src='./academy-commercial-learner-2026-08-31.js?v=2026.08.31.001';
  s.async=false;
  s.onload=()=>setTimeout(loadClassroom,20);
  document.body.appendChild(s);
}

function waitForLegacy(){
  if(window.__allshieldProdAcademyInstalled){loadCommercialAcademy();return;}
  if(document.readyState==='complete'){setTimeout(loadCommercialAcademy,25);return;}
  setTimeout(waitForLegacy,25);
}

waitForLegacy();
})();