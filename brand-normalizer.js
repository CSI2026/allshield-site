(() => {
  const APPROVED_LOGO = 'assets/brand-914a23072410.webp';
  window.ALLSHIELD_APPROVED_LOGO = APPROVED_LOGO;

  function normalize(root=document){
    root.querySelectorAll?.('img[src*="assets/brand-"]').forEach(img=>{
      if(img.getAttribute('src')!==APPROVED_LOGO) img.setAttribute('src',APPROVED_LOGO);
      img.dataset.allshieldApprovedLogo='true';
    });
    document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>link.setAttribute('href',APPROVED_LOGO));

    document.querySelectorAll('.logo-lockup').forEach(lock=>{
      const imgs=[...lock.querySelectorAll('img')];
      imgs.forEach((img,i)=>{img.src=APPROVED_LOGO;img.style.display=i===0?'block':'none';});
      lock.querySelectorAll('.logo-gap').forEach(x=>x.style.display='none');
      if(imgs[0]){imgs[0].style.maxWidth='360px';imgs[0].style.width='100%';imgs[0].style.height='auto';imgs[0].style.objectFit='contain';}
    });
    document.querySelectorAll('.career-lockup-fixed').forEach(lock=>{
      const imgs=[...lock.querySelectorAll('img')];
      imgs.forEach((img,i)=>{img.src=APPROVED_LOGO;img.style.display=i===0?'block':'none';});
      lock.querySelectorAll('.career-logo-gap').forEach(x=>x.style.display='none');
      if(imgs[0]){imgs[0].style.maxWidth='380px';imgs[0].style.width='100%';imgs[0].style.height='auto';imgs[0].style.objectFit='contain';}
    });
  }

  if(window.ownerViews){
    window.ownerViews.files=`
      <div class="dashboard-head"><div><div class="kicker">OWNER FILE VAULT</div><h2>Approved Allshield brand asset.</h2><p>The back office uses one approved logo everywhere. Alternate or legacy logo variants are not used in the live interface.</p></div></div>
      <div class="real-data-banner">APPROVED BRAND STANDARD</div>
      <div class="bo-card" style="margin-top:18px;max-width:720px">
        <h3>Allshield Insurance Group — Approved Logo</h3>
        <div class="filevault-preview" style="min-height:320px;display:grid;place-items:center"><img src="${APPROVED_LOGO}" alt="Approved Allshield Insurance Group logo" style="max-width:420px;width:100%;height:auto"></div>
        <p style="color:#8fa2b8;line-height:1.6">This is the canonical logo used on the public site, login screens, Agent Portal, Admin Portal, Owner Portal, careers pages and internal modules.</p>
      </div>`;
  }

  const run = () => { try { normalize(); } catch (e) { console.error('Brand normalization failed:', e); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
  window.addEventListener('load', run, {once:true});
  window.allshieldNormalizeBrand = run;
})();
