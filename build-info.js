(() => {
  const BUILD = {
    number: 'B2026.08.19.001',
    label: 'Owner Support & Runtime Integrity',
    released_at: '2026-08-19T11:45:00Z',
    channel: 'production'
  };
  window.ALLSHIELD_BUILD = BUILD;

  function badge(){
    let el=document.getElementById('allshieldBuildBadge');
    if(el)return el;
    el=document.createElement('div');
    el.id='allshieldBuildBadge';
    el.title=`${BUILD.label} • ${BUILD.released_at}`;
    el.innerHTML=`<span>ALLSHIELD</span><strong>${BUILD.number}</strong>`;
    document.body.appendChild(el);
    return el;
  }
  function place(){
    const el=badge();
    const anyPortal=['agentPortal','adminPortal','ownerPortal'].some(id=>document.getElementById(id)?.classList.contains('show'));
    el.classList.toggle('show',anyPortal);
  }
  const style=document.createElement('style');
  style.textContent=`#allshieldBuildBadge{position:fixed;right:18px;bottom:16px;z-index:99998;display:none;align-items:center;gap:8px;padding:7px 10px;border-radius:999px;background:rgba(7,17,31,.92);border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 30px rgba(0,0,0,.25);font:11px/1.1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#8fa2b8;backdrop-filter:blur(10px)}#allshieldBuildBadge.show{display:flex}#allshieldBuildBadge strong{color:#fff;letter-spacing:.04em}#allshieldBuildBadge span{font-size:9px;letter-spacing:.14em;color:#62b7f4}`;
  document.head.appendChild(style);
  document.addEventListener('click',()=>setTimeout(place,0));
  window.addEventListener('load',place);
  const obs=new MutationObserver(place);if(document.body)obs.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class']});
})();