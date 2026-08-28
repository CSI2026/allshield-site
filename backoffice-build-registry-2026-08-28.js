(()=>{
  const VERSION='2026.08.28.003';
  window.ALLSHIELD_BACKOFFICE_BUILD_REGISTRY_VERSION=VERSION;

  const install=()=>{
    const info=window.ALLSHIELD_BUILD_INFO||{};
    const build=info.current_build||info.build_number||'B2026.08.28.023';
    const base=info.base_build||info.build_number||'B2026.08.23.021';
    const release=info.completion_release||'2026.08.28.006';
    window.ALLSHIELD_CURRENT_BUILD=build;
    window.ALLSHIELD_APPROVED_BASE_BUILD=base;

    if(!document.getElementById('allshieldBuildRegistryStyle')){
      const style=document.createElement('style');
      style.id='allshieldBuildRegistryStyle';
      style.textContent=`
        .as-build-registry{margin-left:auto;display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid rgba(110,168,255,.35);border-radius:999px;background:rgba(16,45,82,.55);font:600 11px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.04em;color:#d9e9ff;white-space:nowrap}
        .as-build-registry strong{color:#fff;font-weight:800}
        .as-build-registry .as-build-dot{width:7px;height:7px;border-radius:50%;background:#4ee28a;box-shadow:0 0 0 3px rgba(78,226,138,.12)}
        @media(max-width:700px){.as-build-registry{font-size:10px;padding:5px 8px;gap:6px}.as-build-registry .as-release,.as-build-registry .as-base{display:none}}
      `;
      document.head.appendChild(style);
    }

    ['adminPortal','ownerPortal'].forEach(id=>{
      const portal=document.getElementById(id);
      const top=portal?.querySelector('.portal-top');
      if(!top)return;
      let badge=top.querySelector('.as-build-registry');
      if(!badge){
        badge=document.createElement('div');
        badge.className='as-build-registry';
        const directButton=[...top.children].find(el=>el.tagName==='BUTTON');
        if(directButton)top.insertBefore(badge,directButton);
        else top.appendChild(badge);
      }
      badge.title=`Current production build: ${build} • Approved baseline: ${base} • Release ${release}`;
      badge.innerHTML=`<span class="as-build-dot"></span><span>LIVE BUILD</span><strong>${build}</strong><span class="as-base">• Base ${base}</span><span class="as-release">• ${release}</span>`;
    });
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  setTimeout(install,500);
})();