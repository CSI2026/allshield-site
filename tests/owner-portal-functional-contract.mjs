import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const index=fs.readFileSync('index.html','utf8');
const ownerRoutes=[...index.matchAll(/showOwnerView\('([^']+)'/g)].map(m=>m[1]);
const unique=[...new Set(ownerRoutes)];
const expected=['dashboard','ai','permissions','teamaccounts','departments','communications','hierarchy','states','academy','testing','versions','updates','performance','meetings','marketing','social','video','media','brand','files','audit','buildhistory','settings'];
const missing=expected.filter(x=>!unique.includes(x));
const extra=unique.filter(x=>!expected.includes(x));
if(missing.length||extra.length) throw new Error(`Owner route mismatch missing=${missing} extra=${extra}`);
if(unique.length!==23) throw new Error(`Expected 23 unique Owner routes, got ${unique.length}`);

const sources=['phase16-owner-live-dashboard.js','phase16-ai-command-production.js','phase16-live-backoffice.js','phase16-academy-admin.js','phase16-owner-support.js','phase16-production-core.js','phase16-social-production.js'];
const combined=sources.map(f=>fs.readFileSync(f,'utf8')).join('\n');
for(const route of expected){
  if(!combined.includes(`'owner','${route}'`) && !combined.includes(`"owner","${route}"`)) throw new Error(`No canonical Owner handler: ${route}`);
}
for(const file of sources) execFileSync(process.execPath,['--check',file],{stdio:'inherit'});

const bannedOwnerPhrases=['Production build will','requires the live','Interactive prototype','not yet available'];
for(const phrase of bannedOwnerPhrases){if(combined.includes(phrase)) throw new Error(`Canonical Owner runtime contains unfinished placeholder: ${phrase}`)}
if(index.includes('brand-914a23072410')) throw new Error('Rejected internal logo is still active');
if(!index.includes('for(const key of Object.keys(host.dataset))')) throw new Error('Portal host stale-state reset is missing');

const live=fs.readFileSync('phase16-live-backoffice.js','utf8');
for(const marker of ['Create Account','Reset Password','Delete','Permission Override','Approve Promotion']) if(!live.includes(marker)) throw new Error(`Owner account/permission feature missing: ${marker}`);
const core=fs.readFileSync('phase16-production-core.js','utf8');
for(const marker of ['Create Department','Schedule Meeting','Company announcement center','Create Next Draft','Release','Publish','Archive','BRAND CENTER','Upload Video','Upload Asset']) if(!core.includes(marker)) throw new Error(`Owner core feature missing: ${marker}`);
const academy=fs.readFileSync('phase16-academy-admin.js','utf8');
for(const marker of ['STATE LICENSING MATRIX','All 50 states','50-STATE MATRIX']) if(!academy.includes(marker)) throw new Error(`State matrix feature missing: ${marker}`);
const social=fs.readFileSync('phase16-social-production.js','utf8');
for(const marker of ['Brand + Profile AI','Posts + Ads','Connections + Queue']) if(!social.includes(marker)) throw new Error(`Approved Social feature missing: ${marker}`);
const ai=fs.readFileSync('phase16-ai-command-production.js','utf8');
if(!ai.includes('Live AI across Allshield')) throw new Error('Approved AI Command Center missing');
console.log(JSON.stringify({status:'PASS',owner_routes:unique.length,canonical_handlers:expected.length,approved_social:true,approved_ai:true,stale_route_fix:true,rejected_logo_removed:true},null,2));
