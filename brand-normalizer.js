(() => {
  const APPROVED_SHIELD = 'assets/brand-9aa0ec99b3b0.webp';
  const APPROVED_WORDMARK = 'assets/brand-6553d9469f9e.webp';
  window.ALLSHIELD_APPROVED_LOGO = APPROVED_SHIELD;
  window.ALLSHIELD_APPROVED_WORDMARK = APPROVED_WORDMARK;

  // The homepage is the brand source of truth. Internal portal chrome uses the
  // same approved shield mark shown in the homepage navigation. Full lockups
  // are rendered with the homepage shield + wordmark pair.
  function normalizeInternalBrand(root=document){
    const selectors = [
      '.portal-login img[src*="assets/brand-"]',
      '.portal-page .portal-top img[src*="assets/brand-"]',
      '#ownerPortal .portal-top img',
      '#adminPortal .portal-top img',
      '#agentPortal .portal-top img'
    ];
    root.querySelectorAll?.(selectors.join(',')).forEach(img=>{
      if(img.getAttribute('src')!==APPROVED_SHIELD) img.setAttribute('src',APPROVED_SHIELD);
      img.dataset.allshieldApprovedLogo='true';
    });
  }

  if(window.ownerViews){
    window.ownerViews.files=`
      <div class="dashboard-head"><div><div class="kicker">OWNER FILE VAULT</div><h2>Approved Allshield brand standard.</h2><p>The public homepage is the only brand source of truth used by the back office.</p></div></div>
      <div class="real-data-banner">APPROVED HOMEPAGE BRAND</div>
      <div class="bo-card" style="margin-top:18px;max-width:760px">
        <h3>Allshield Insurance Group — Approved Logo</h3>
        <div class="filevault-preview" style="min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px">
          <img src="${APPROVED_SHIELD}" alt="Approved Allshield shield" style="max-width:280px;width:62%;height:auto">
          <img src="${APPROVED_WORDMARK}" alt="Approved Allshield Insurance Group wordmark" style="max-width:430px;width:88%;height:auto">
        </div>
        <p style="color:#8fa2b8;line-height:1.6">These are the same approved assets used by the homepage. No alternate internal logo is permitted.</p>
      </div>`;
  }

  const run = () => { try { normalizeInternalBrand(); } catch (e) { console.error('Internal brand normalization failed:', e); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
  window.addEventListener('load', run, {once:true});
  window.allshieldNormalizeBrand = run;
})();
