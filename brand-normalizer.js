(() => {
  const APPROVED_LOGO = 'assets/brand-914a23072410.webp';
  window.ALLSHIELD_APPROVED_LOGO = APPROVED_LOGO;

  // Important: the public website and Careers page intentionally use separate
  // shield + wordmark assets to create the approved visual lockup. Do not rewrite
  // those images. Normalization is limited to authenticated/internal surfaces.
  function normalizeInternalBrand(root=document){
    const selectors = [
      '.portal-login img[src*="assets/brand-"]',
      '.portal-page img[src*="assets/brand-"]',
      '.modal-card img[src*="assets/brand-"]',
      '#ownerPortal img[src*="assets/brand-"]',
      '#adminPortal img[src*="assets/brand-"]',
      '#agentPortal img[src*="assets/brand-"]'
    ];
    root.querySelectorAll?.(selectors.join(',')).forEach(img=>{
      if(img.getAttribute('src')!==APPROVED_LOGO) img.setAttribute('src',APPROVED_LOGO);
      img.dataset.allshieldApprovedLogo='true';
    });
  }

  if(window.ownerViews){
    window.ownerViews.files=`
      <div class="dashboard-head"><div><div class="kicker">OWNER FILE VAULT</div><h2>Approved Allshield brand asset.</h2><p>The back office uses the approved internal logo while the public site preserves its approved shield-and-wordmark composition.</p></div></div>
      <div class="real-data-banner">APPROVED BRAND STANDARD</div>
      <div class="bo-card" style="margin-top:18px;max-width:720px">
        <h3>Allshield Insurance Group — Approved Internal Logo</h3>
        <div class="filevault-preview" style="min-height:320px;display:grid;place-items:center"><img src="${APPROVED_LOGO}" alt="Approved Allshield Insurance Group logo" style="max-width:420px;width:100%;height:auto"></div>
        <p style="color:#8fa2b8;line-height:1.6">Public-facing shield and wordmark assets are preserved exactly as designed. Internal authenticated surfaces use this canonical asset.</p>
      </div>`;
  }

  const run = () => { try { normalizeInternalBrand(); } catch (e) { console.error('Internal brand normalization failed:', e); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
  window.addEventListener('load', run, {once:true});
  window.allshieldNormalizeBrand = run;
})();
