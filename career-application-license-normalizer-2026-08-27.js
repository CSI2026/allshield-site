(()=>{
'use strict';
const VERSION='2026.08.27.013';
function inject(){
  if(document.getElementById('allshieldCareerLicenseNormalizer013'))return;
  const s=document.createElement('style');
  s.id='allshieldCareerLicenseNormalizer013';
  s.textContent=`
    #careerModal{z-index:650!important}
    #careerModal .modal-card{position:relative;z-index:651}
  `;
  document.head.appendChild(s);
}
function normalize(){
  const modal=document.getElementById('careerModal');
  if(!modal)return;
  if(modal.dataset.recruitingV9==='1'){
    const licensed=modal.querySelector('.career-path-option[data-path="licensed"]');
    const unlicensed=modal.querySelector('.career-path-option[data-path="unlicensed"]');
    if(licensed){licensed.innerHTML='<strong>Licensed</strong><span>I already hold an active insurance license.</span>';licensed.setAttribute('aria-label','Licensed');}
    if(unlicensed){unlicensed.innerHTML='<strong>Not Licensed</strong><span>I need to complete the Life & Health licensing path.</span>';unlicensed.setAttribute('aria-label','Not Licensed');}
    const studying=modal.querySelector('#careerStudying');
    const studyingWrap=studying?.closest('div');
    if(studyingWrap)studyingWrap.remove();
    const hidden=modal.querySelector('#careerLicensingStatus');
    if(hidden){
      const path=modal.dataset.path||'licensed';
      hidden.value=path==='licensed'?'licensed':'not_licensed';
    }
  }else{
    const select=modal.querySelector('select');
    if(select&&!select.id){
      select.innerHTML='<option value="not_licensed">Not Licensed</option><option value="licensed">Licensed</option>';
      select.dataset.asSimpleLicense='1';
    }
  }
}
function wrapOpenCareer(){
  const current=window.openCareer;
  if(typeof current!=='function'||current.__allshieldLicenseNormalizer013)return false;
  const wrapped=function(...args){
    const out=current.apply(this,args);
    normalize();
    setTimeout(normalize,0);
    return out;
  };
  wrapped.__allshieldLicenseNormalizer013=true;
  window.openCareer=wrapped;
  return true;
}
function install(){
  inject();normalize();wrapOpenCareer();
  setTimeout(()=>{normalize();wrapOpenCareer();},1000);
  setTimeout(()=>{normalize();wrapOpenCareer();},3500);
  window.ALLSHIELD_CAREER_LICENSE_NORMALIZER_VERSION=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();