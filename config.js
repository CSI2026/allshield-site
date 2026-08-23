window.ALLSHIELD_CONFIG = {
  SUPABASE_URL: "https://xxeiddnfbdqxwuojuggy.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_-JRPOYo13dO2h35TFkvR5Q_csWn9NFE",
  DEMO_FALLBACK: false,
  INTERNAL_EMAIL_DOMAIN: "allshield.internal"
};

window.addEventListener("load", () => {
  const modules = [
    "./view-registry-bridge.js",
    "./support-context.js",
    "./build-info.js",
    "./public-live-fixes.js",
    "./live-platform.js",
    "./ops-platform.js",
    "./support-ops-overrides.js",
    "./recruiting-platform.js",
    "./crm-platform.js",
    "./support-crm-overrides.js",
    "./owner-control-platform.js",
    "./comp-user-platform.js",
    "./support-comp-overrides.js",
    "./agent-live-extras.js",
    "./support-agent-core.js",
    "./live-executive-dashboards.js",
    "./delegation-platform.js",
    "./comp-calculation-ui.js",
    "./launch-academy.js",
    "./academy-exam-ui-v2.js",
    "./mail-connector-ui.js",
    "./finance-import-ui.js",
    "./owner-view-as.js",
    "./owner-testing-overview.js",
    "./social-live-ui.js",
    "./ai-live-ui.js",
    "./brand-normalizer.js",
    "./production-hardening.js",
    "./build-history-ui.js",
    "./production-health.js",
    "./navigation-repair-v12.js"
  ];
  const loadNext = () => {
    const src = modules.shift();
    if (!src) return;
    const script = document.createElement("script");
    script.src = src;
    script.onload = loadNext;
    script.onerror = () => console.error("Unable to load Allshield module:", src);
    document.body.appendChild(script);
  };
  loadNext();
});
