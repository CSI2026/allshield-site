window.ALLSHIELD_CONFIG = {
  SUPABASE_URL: "https://xxeiddnfbdqxwuojuggy.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_-JRPOYo13dO2h35TFkvR5Q_csWn9NFE",
  DEMO_FALLBACK: false,
  INTERNAL_EMAIL_DOMAIN: "allshield.internal"
};

window.addEventListener("DOMContentLoaded", () => {
  const script = document.createElement("script");
  script.src = "./live-platform.js";
  script.defer = true;
  document.body.appendChild(script);
});
