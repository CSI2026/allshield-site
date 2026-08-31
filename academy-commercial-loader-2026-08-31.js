(()=>{
'use strict';
function loadClassroom(){
  if(document.getElementById('allshieldAcademyClassroomMode'))return;
  const c=document.createElement('script');
  c.id='allshieldAcademyClassroomMode';
  c.src='./academy-classroom-mode-2026-08-31.js?v=2026.08.31.002';
  c.async=false;
  document.body.appendChild(c);
}
function loadCommercialAcademy(){
  if(document.getElementById('allshieldCommercialAcademyLearner')){setTimeout(loadClassroom,80);return;}
  const s=document.createElement('script');
  s.id='allshieldCommercialAcademyLearner';
  s.src='./academy-commercial-learner-2026-08-31.js?v=2026.08.31.001';
  s.async=false;
  s.onload=()=>setTimeout(loadClassroom,40);
  document.body.appendChild(s);
}
function waitForLegacy(){
  if(window.__allshieldProdAcademyInstalled){loadCommercialAcademy();return;}
  if(document.readyState==='complete'){setTimeout(loadCommercialAcademy,100);return;}
  setTimeout(waitForLegacy,100);
}
waitForLegacy();
})();
