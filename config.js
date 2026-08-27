window.ALLSHIELD_CONFIG = {
  SUPABASE_URL: "https://xxeiddnfbdqxwuojuggy.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_-JRPOYo13dO2h35TFkvR5Q_csWn9NFE",
  DEMO_FALLBACK: false,
  INTERNAL_EMAIL_DOMAIN: "allshield.internal"
};

(()=>{
  const scripts=[
    ['allshieldProductionPolishLoader','./production-polish-2026-08-26.js?v=2026.08.26.010'],
    ['allshieldSocialConnectionReadinessLoader','./social-connection-readiness-2026-08-26.js?v=2026.08.26.011'],
    ['allshieldSocialOAuthPopupLoader','./social-oauth-popup-return-2026-08-26.js?v=2026.08.26.012'],
    ['allshieldSocialConnectGuardLoader','./social-connect-guard-2026-08-26.js?v=2026.08.26.013'],
    ['allshieldVideoSizzleRoutingLoader','./video-sizzle-routing-2026-08-27.js?v=2026.08.27.005'],
    ['allshieldVideoStudioStabilityLoader','./video-studio-stability-2026-08-27.js?v=2026.08.27.003']
  ];
  for(const [id,src] of scripts){
    if(document.getElementById(id)) continue;
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    s.async=false;
    document.head.appendChild(s);
  }
})();
