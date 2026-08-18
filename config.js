window.ALLSHIELD_CONFIG = {
  SUPABASE_URL: "https://xxeiddnfbdqxwuojuggy.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_-JRPOYo13dO2h35TFkvR5Q_csWn9NFE",
  DEMO_FALLBACK: false,
  INTERNAL_EMAIL_DOMAIN: "allshield.internal"
};

window.addEventListener("load", () => {
  const modules = ["./live-platform.js", "./ops-platform.js", "./recruiting-platform.js", "./crm-platform.js", "./owner-control-platform.js", "./comp-user-platform.js"];
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
