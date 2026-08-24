import { readFile } from 'node:fs/promises';

const html = await readFile('index.html','utf8');
const config = await readFile('config.js','utf8');
const moduleFiles = [...config.matchAll(/"\.\/(.+?\.js)"/g)].map(m=>m[1]);
const files = ['team-accounts.js', ...moduleFiles];
const source = (await Promise.all(files.map(async f=>({f,text:await readFile(f,'utf8')})))).filter(x=>x.f!=='app.js');
const combined = source.map(x=>`\n/* ${x.f} */\n${x.text}`).join('\n');

const portalViews = {};
for (const role of ['agent','admin','owner']) {
  const re = new RegExp(`show${role[0].toUpperCase()+role.slice(1)}View\\('([^']+)'`, 'g');
  portalViews[role] = [...new Set([...html.matchAll(re)].map(m=>m[1]))];
}

function hasConcreteOverride(role, view){
  const variants = [
    `${role}Views.${view}`,
    `window.${role}Views.${view}`,
    `${role}Views['${view}']`,
    `${role}Views["${view}"]`,
    `${view}:`,
  ];
  if (variants.slice(0,4).some(v=>combined.includes(v))) return true;
  // Object.assign-style registrations are accepted only when the target registry and key are in the same file.
  return source.some(({text}) => text.includes(`window.${role}Views`) && text.includes(`Object.assign`) && new RegExp(`\\b${view}\\s*:`).test(text));
}

const missing=[];
for (const [role,views] of Object.entries(portalViews)) {
  for (const view of views) if(!hasConcreteOverride(role,view)) missing.push(`${role}:${view}`);
}

if(missing.length) throw new Error(`Back-office sidebar views still using base placeholder/fallback instead of a concrete live module: ${missing.join(', ')}`);

for (const marker of ['LIVE SUPABASE DATA','loadOwnerLiveDashboard','loadAdminLiveDashboard','loadLiveAgentDashboard']) {
  if(!combined.includes(marker)) throw new Error(`Back-office live marker missing: ${marker}`);
}

console.log(`Back-office live contract passed: ${portalViews.agent.length} agent, ${portalViews.admin.length} admin, ${portalViews.owner.length} owner sidebar views have concrete live overrides.`);
