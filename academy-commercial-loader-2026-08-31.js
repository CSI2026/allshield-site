(()=>{
'use strict';
const VERSION='2026.09.01.017';
const scripts=[
  ['allshieldAcademyGuidedPath',`./academy-guided-path-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyGuidedHotfix',`./academy-guided-path-hotfix-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyAvaMedia',`./academy-instructor-media-hotfix-2026-08-31.js?v=${VERSION}`],
  ['allshieldAcademyAvaWelcomeV2',`./academy-ava-welcome-v2-2026-09-01.js?v=${VERSION}`],
  ['allshieldAcademyTextbookReader',`./academy-textbook-reader-2026-09-01.js?v=${VERSION}`],
  ['allshieldAcademyPremiumGuided',`./academy-premium-guided-2026-09-01.js?v=${VERSION}`],
  ['allshieldAcademyAvaContinuity',`./academy-ava-continuity-hotfix-2026-09-01.js?v=${VERSION}`],
  ['allshieldAcademyAvaSequence',`./academy-ava-sequence-controller-2026-09-01.js?v=${VERSION}`],
  ['allshieldAcademyGuidedClassroom',`./academy-guided-classroom-2026-09-01.js?v=${VERSION}`],
  ['allshieldAcademyExamExperience',`./academy-exam-experience-2026-09-01.js?v=${VERSION}`]
];
function preloadAll(){for(const [id,src] of scripts){const pid=`${id}Preload`;if(document.getElementById(pid)||document.getElementById(id))continue;const l=document.createElement('link');l.id=pid;l.rel='preload';l.as='script';l.href=src;l.fetchPriority='high';document.head.appendChild(l)}}
function loadOne(id,src){return new Promise(resolve=>{const existing=document.getElementById(id);if(existing){resolve();return}const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>{console.error(`ALLSHIELD Academy failed to load ${id}`);resolve()};(document.body||document.documentElement).appendChild(s)})}
async function loadAcademy(){if(window.ALLSHIELD_ACADEMY_LOADING)return window.ALLSHIELD_ACADEMY_LOADING;window.ALLSHIELD_ACADEMY_LOADING=(async()=>{preloadAll();for(const [id,src] of scripts)await loadOne(id,src);window.ALLSHIELD_ACADEMY_LOADER_READY=true;window.dispatchEvent(new CustomEvent('allshield-academy-ready'));return true})();return window.ALLSHIELD_ACADEMY_LOADING}
function startWhenCoreReady(){preloadAll();if(window.__allshieldProdAcademyInstalled){loadAcademy();return}if(document.readyState!=='loading'){requestAnimationFrame(()=>{if(window.__allshieldProdAcademyInstalled)loadAcademy();else setTimeout(startWhenCoreReady,16)});return}document.addEventListener('DOMContentLoaded',startWhenCoreReady,{once:true})}
preloadAll();startWhenCoreReady();
})();