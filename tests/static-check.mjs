import { readFile, readdir } from "node:fs/promises";
const required = ["index.html","styles.css","app.js","backend.js","config.js","team-accounts.js","live-platform.js","ops-platform.js","recruiting-platform.js","crm-platform.js","owner-control-platform.js","comp-user-platform.js","delegation-platform.js","comp-calculation-ui.js","launch-academy.js","academy-exam-ui-v2.js","mail-connector-ui.js","finance-import-ui.js"];
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
for (const ref of ["launch-academy.js","academy-exam-ui-v2.js","mail-connector-ui.js","finance-import-ui.js"]) {
  if (!config.includes(ref)) throw new Error(`Production module is not loaded: ${ref}`);
}
const assets = (await readdir("assets")).filter(name => name !== "manifest.json");
if (assets.length < 1) throw new Error("No extracted image assets found.");
console.log(`Static validation passed: ${assets.length} image assets, production modules loaded, no embedded images or browser secrets.`);
