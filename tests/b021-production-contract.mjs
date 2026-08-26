import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const read=f=>fs.readFileSync(f,'utf8');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const index=read('index.html');
const expectedRoutes=['dashboard','ai','permissions','teamaccounts','departments','communications','hierarchy','states','academy','testing','versions','updates','performance','meetings','marketing','social','video','media','brand','files','audit','buildhistory','settings'];
const routes=[...new Set([...index.matchAll(/showOwnerView\('([^']+)'/g)].map(m=>m[1]))];
const miss=expectedRoutes.filter(x=>!routes.includes(x));
if(miss.length||routes.length!==expectedRoutes.length) throw new Error(`Owner navigation contract failed. missing=${miss.join(',')} count=${routes.length}`);
if(!index.includes('for(const key of Object.keys(host.dataset))')) throw new Error('Canonical router does not clear stale portal-host state.');
if(index.includes('brand-914a23072410')) throw new Error('Rejected legacy internal logo is active.');
const files=['phase16-owner-live-dashboard.js','phase16-ai-command-production.js','phase16-live-backoffice.js','phase16-academy-admin.js','phase16-owner-support.js','phase16-production-core.js','phase16-social-production.js'];
const combined=files.map(read).join('\n');
for(const route of expectedRoutes) if(!combined.includes(`'owner','${route}'`)&&!combined.includes(`"owner","${route}"`)) throw new Error(`Missing canonical Owner renderer: ${route}`);
for(const f of files) execFileSync(process.execPath,['--check',f],{stdio:'inherit'});
for(const phrase of ['Production build will','requires the live','Interactive prototype','not yet available']) if(combined.includes(phrase)) throw new Error(`Unfinished canonical Owner source: ${phrase}`);
const preserved={
 'phase16-ai-command-production.js':'69b37664106e52e2c89516cf0cc4e1fbf9b676c1bca47c2cbbea13ad98d3f237',
 'phase16-social-production.js':'592f534997bf00457da6fe8ce4e2ffb1b64c3ccc23ac8bce773d4453d2f98216',
 'phase16-owner-live-dashboard.js':'e4d6d08965527da54f1763ea312436d137bcc8f78e69c9bcb9b75bc735d0b121',
 'phase16-owner-support.js':'d826e926433b44b222ca1d0f549ab5f871e96db66dc782834cba066559d84628'
};
for(const [f,h] of Object.entries(preserved)) if(sha(f)!==h) throw new Error(`Approved B021 module changed unexpectedly: ${f}`);
const live=read('phase16-live-backoffice.js');
for(const m of ['Create Account','Edit Team Account','Reset Password','Permission Override','Approve Promotion']) if(!live.includes(m)) throw new Error(`Owner account/access feature absent: ${m}`);
const core=read('phase16-production-core.js');
for(const m of ['Create Department','Schedule Meeting','Company announcement center','Create Next Draft Version','Create Draft','Upload Asset','Upload Video','BRAND CENTER','OWNER FILE VAULT','AUDIT & CHANGE HISTORY','BUILD & RELEASE CONTROL']) if(!core.includes(m)) throw new Error(`Owner production feature absent: ${m}`);
const academy=read('phase16-academy-admin.js');
if(!academy.includes('STATE LICENSING MATRIX')||!academy.includes('50-STATE MATRIX')) throw new Error('50-state Owner licensing matrix is missing.');
const social=read('phase16-social-production.js');
for(const m of ['Brand + Profile AI','Posts + Ads','Connections + Queue']) if(!social.includes(m)) throw new Error(`Approved Social tab missing: ${m}`);
const ai=read('phase16-ai-command-production.js');
if(!ai.includes('Live AI across Allshield')) throw new Error('Approved AI Command Center is missing.');
if(!/DEMO_FALLBACK:\s*false/.test(read('config.js'))) throw new Error('Demo fallback is not disabled.');
console.log(JSON.stringify({status:'PASS',baseline:'B2026.08.23.021',owner_routes:23,canonical_handlers:23,approved_ai_preserved:true,approved_social_preserved:true,owner_feature_completion:true},null,2));
