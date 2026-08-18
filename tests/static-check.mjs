import { readFile, readdir } from "node:fs/promises";
const required = ["index.html","styles.css","app.js","backend.js","config.js","team-accounts.js"];
for (const file of required) await readFile(file);
for (const file of required) {
  const text = await readFile(file, "utf8");
  if (/data:image\//i.test(text)) throw new Error(`Embedded image remains in browser source: ${file}`);
  if (/sb_secret_/i.test(text) || /service_role/i.test(text)) throw new Error(`Privileged Supabase credential marker found in browser source: ${file}`);
}
const html = await readFile("index.html", "utf8");
for (const ref of ["./styles.css","./app.js","./backend.js","./config.js","./team-accounts.js"]) {
  if (!html.includes(ref)) throw new Error(`Missing HTML reference: ${ref}`);
}
if (!html.includes("Team Accounts")) throw new Error("Owner Team Accounts navigation is missing.");
const assets = (await readdir("assets")).filter(name => name !== "manifest.json");
if (assets.length < 1) throw new Error("No extracted image assets found.");
console.log(`Static validation passed: ${assets.length} image assets, no embedded images or browser secrets.`);
