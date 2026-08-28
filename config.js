window.ALLSHIELD_CONFIG = {
  SUPABASE_URL: "https://xxeiddnfbdqxwuojuggy.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_-JRPOYo13dO2h35TFkvR5Q_csWn9NFE",
  DEMO_FALLBACK: false,
  INTERNAL_EMAIL_DOMAIN: "allshield.internal"
};

(()=>{
  const scripts=[
    ['allshieldBuildInfoLoader','./build-info.js?v=B2026.08.28.022'],
    ['allshieldBackofficeBuildRegistryLoader','./backoffice-build-registry-2026-08-28.js?v=2026.08.28.002'],
    ['allshieldRuntimeMutationGuardLoader','./runtime-mutation-guard-2026-08-27.js?v=2026.08.27.011'],
    ['allshieldProductionPolishLoader','./production-polish-2026-08-26.js?v=2026.08.26.010'],
    ['allshieldSocialConnectionReadinessLoader','./social-connection-readiness-2026-08-26.js?v=2026.08.26.011'],
    ['allshieldSocialOAuthPopupLoader','./social-oauth-popup-return-2026-08-26.js?v=2026.08.26.012'],
    ['allshieldSocialConnectGuardLoader','./social-connect-guard-2026-08-26.js?v=2026.08.26.013'],
    ['allshieldVideoStudioStabilityLoader','./video-studio-stability-2026-08-27.js?v=2026.08.27.003'],
    ['allshieldMobileCareerDomainFixLoader','./mobile-career-domain-fix-2026-08-27.js?v=2026.08.27.006'],
    ['allshieldCareersVideoExperienceLoader','./careers-video-experience-fix-2026-08-27.js?v=2026.08.27.010'],
    ['allshieldCareersProfessionalVideoLiveLoader','./careers-professional-video-live-2026-08-27.js?v=2026.08.27.011'],
    ['allshieldOnboardingRouterLoader','./onboarding-router-2026-08-27.js?v=2026.08.27.012'],
    ['allshieldEsignAgreementsLoader','./esign-agreements-2026-08-28.js?v=2026.08.28.004'],
    ['allshieldOnboardingEsignBridgeLoader','./onboarding-esign-bridge-2026-08-28.js?v=2026.08.28.004'],
    ['allshieldCareerLicenseNormalizerLoader','./career-application-license-normalizer-2026-08-27.js?v=2026.08.27.013']
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