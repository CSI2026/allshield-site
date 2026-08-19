import { readFile, readdir } from "node:fs/promises";
const required = ["index.html","styles.css","app.js","backend.js","config.js","team-accounts.js","live-platform.js","ops-platform.js","recruiting-platform.js","crm-platform.js","owner-control-platform.js","comp-user-platform.js","delegation-platform.js","comp-calculation-ui.js","launch-academy.js","academy-exam-ui-v2.js","mail-connector-ui.js","finance-import-ui.js","owner-view-as.js","owner-testing-overview.js","social-live-ui.js","ai-live-ui.js","brand-normalizer.js"];
for (const file of required) await readFile(file);
for (const file of required) {
  const text = await readFile(file, "utf8");
  if (/data:image\//i.test(text)) throw new Error(`Embedded image remains in browser source: ${file}`);
  if (/sb_secret_/i.test(text) || /SUPABASE_SERVICE_ROLE_KEY/i.test(text)) throw new Error(`Privileged Supabase credential marker found in browser source: ${file}`);
  if (/IONOS_EMAIL_PASSWORD/i.test(text)) throw new Error(`IONOS mailbox secret reference found in browser source: ${file}`);
}
const html = await readFile("index.html", "utf8");
for (const ref of ["./styles.css","./app.js","./backend.js","./config.js","./team-accounts.js"]) {
  if (!html.includes(ref)) throw new Error(`Missing HTML reference: ${ref}`);
}
if (!html.includes("Team Accounts")) throw new Error("Owner Team Accounts navigation is missing.");
const config = await readFile("config.js", "utf8");
for (const ref of ["launch-academy.js","academy-exam-ui-v2.js","mail-connector-ui.js","finance-import-ui.js","owner-view-as.js","owner-testing-overview.js","social-live-ui.js","ai-live-ui.js","brand-normalizer.js"]) {
  if (!config.includes(ref)) throw new Error(`Production module is not loaded: ${ref}`);
}
const viewAs = await readFile("owner-view-as.js","utf8");
if (!viewAs.includes("View As") || !viewAs.includes("exam_attempts") || !viewAs.includes("marketplace_certifications")) throw new Error("Owner View As support mode is incomplete.");
const testing = await readFile("owner-testing-overview.js","utf8");
if (!testing.includes("Agent Testing & Scores") || !testing.includes("exam_attempts") || !testing.includes("ownerViewAsAgent")) throw new Error("Owner testing overview is incomplete.");
const social = await readFile("social-live-ui.js","utf8");
if (!social.includes("social_posts") || !social.includes("social_accounts") || !social.includes("queued")) throw new Error("Live social state handling is incomplete.");
const ai = await readFile("ai-live-ui.js","utf8");
if (!ai.includes("/functions/v1/ai-assistant") || !ai.includes("rewrite_social")) throw new Error("Live AI UI is not wired to the backend.");
const brand = await readFile("brand-normalizer.js","utf8");
if (!brand.includes("brand-914a23072410.webp") || !brand.includes("MutationObserver")) throw new Error("Approved-logo enforcement is incomplete.");
const assets = (await readdir("assets")).filter(name => name !== "manifest.json");
if (!assets.includes("brand-914a23072410.webp")) throw new Error("Approved logo asset is missing.");
console.log(`Static validation passed: ${assets.length} image assets, production modules loaded, Owner testing/View As/social/AI/brand enforcement present, no embedded images or browser secrets.`);
