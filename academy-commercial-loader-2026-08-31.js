(()=>{
'use strict';
function loadCommercialAcademy(){
  if(document.getElementById('allshieldCommercialAcademyLearner'))return;
  const s=document.createElement('script');
  s.id='allshieldCommercialAcademyLearner';
  s.src='./academy-commercial-learner-2026-08-31.js?v=2026.08.31.001';
  s.async=false;
  document.body.appendChild(s);
}
function waitForLegacy(){
  if(window.__allshieldProdAcademyInstalled){loadCommercialAcademy();return;}
  if(document.readyState==='complete'){setTimeout(loadCommercialAcademy,100);return;}
  setTimeout(waitForLegacy,100);
}
waitForLegacy();
})();
