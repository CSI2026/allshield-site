import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const expected={
  'backend.js':'6bdcdf7b0291127f77be3376f1a96a25b17411cb3d210f7db7bb95e7f793c055',
  'build-info.js':'ffcd229c92e51c37fe7d574b1b11d1ce729c35e2117fc1313ac1661281167f74',
  'config.js':'565325a7a6801ae27d9b8719b13346cb85ed687188ac3c9cf2bad74189f65540',
  'index.html':'2dd72bb0a86e8d27a15de29ff144a79b1f235cb78393ef635c2ec4735a4374eb',
  'phase16-academy-admin.js':'a6d257b50693788bbcbf04a152fff2af5d8243c18e5a7496612a419350301e80',
  'phase16-agent-academy-production.js':'93e1259795e970aed1401266ba81daa0e6fcda337903d5d572608063d7aa6d9e',
  'phase16-agent-live-essentials.js':'f858e88987a8f63ace808d9ae27a409f1663a58b2f2cdd76c26d0d45085bf692',
  'phase16-ai-command-production.js':'69b37664106e52e2c89516cf0cc4e1fbf9b676c1bca47c2cbbea13ad98d3f237',
  'phase16-build-002.js':'af8b9c86619def98abc70ed1b319402d8ec2c7a5c48609e52ba5aecb774c7c39',
  'phase16-crm.js':'d67b843d77c563f1d105bed7ab2ba6d8f89dd6bcc569593778a6f78aa1857d57',
  'phase16-live-backoffice.js':'2902b7532d646bcc1760292d84c46a81cc9666a27cf5c3497e37ff21a8f5d1f3',
  'phase16-owner-live-dashboard.js':'e4d6d08965527da54f1763ea312436d137bcc8f78e69c9bcb9b75bc735d0b121',
  'phase16-owner-support.js':'d826e926433b44b222ca1d0f549ab5f871e96db66dc782834cba066559d84628',
  'phase16-production-core.js':'3e42d90e1e1ee18595429ad17b7c44e506988f9915921da0ab48a61105f2ca52',
  'phase16-social-production.js':'592f534997bf00457da6fe8ce4e2ffb1b64c3ccc23ac8bce773d4453d2f98216'
};
const index=fs.readFileSync('index.html','utf8');
for(const [file,hash] of Object.entries(expected)){
  const got=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(got!==hash) throw new Error(`${file} does not match approved B021 runtime`);
  if(file.endsWith('.js')) execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
}
const required=['phase16-build-002.js','backend.js','phase16-crm.js','phase16-owner-live-dashboard.js','phase16-owner-support.js','phase16-live-backoffice.js','phase16-agent-academy-production.js','phase16-academy-admin.js','phase16-production-core.js','phase16-ai-command-production.js','phase16-agent-live-essentials.js','phase16-social-production.js'];
for(const f of required) if(!index.includes(f)) throw new Error(`Approved runtime missing from index: ${f}`);
const banned=['backoffice-live-completeness.js','approved-owner-setup.js','approved-b021-view-registry.js','production-runtime.js','brand-normalizer.js','social-live-ui.js','ai-live-ui.js'];
for(const f of banned) if(index.includes(f)) throw new Error(`Unapproved runtime active: ${f}`);
if(!fs.readFileSync('build-info.js','utf8').includes('B2026.08.23.021')) throw new Error('Wrong build id');
if(!fs.readFileSync('config.js','utf8').includes('DEMO_FALLBACK: false')) throw new Error('Demo fallback must remain disabled');
console.log('B2026.08.23.021 production contract: PASS');
