import { resolve4, resolveCname } from 'node:dns/promises';

const HOST='allshieldinsurancegroup.com';
const WWW='www.allshieldinsurancegroup.com';
const BASE=`https://${HOST}`;
const EXPECTED_A=['185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153'];
const EXPECTED_WWW='csi2026.github.io';
const REQUIRED_SCRIPTS=[
  'phase16-build-002.js',
  'backend.js',
  'phase16-crm.js',
  'phase16-owner-live-dashboard.js',
  'phase16-owner-support.js',
  'phase16-live-backoffice.js',
  'phase16-agent-academy-production.js',
  'phase16-academy-admin.js',
  'phase16-production-core.js',
  'phase16-ai-command-production.js',
  'phase16-agent-live-essentials.js',
  'phase16-social-production.js'
];
const BANNED_OVERLAYS=[
  'backoffice-live-completeness.js',
  'approved-owner-setup.js',
  'approved-b021-view-registry.js',
  'production-runtime.js',
  'brand-normalizer.js',
  'social-live-ui.js',
  'ai-live-ui.js'
];

const checks=[];
const fail=[];
const rec=(name,ok,detail)=>{checks.push({name,ok,detail});if(!ok)fail.push(`${name}: ${detail}`)};

async function fetchText(path){
  const join=path.includes('?')?'&':'?';
  const r=await fetch(`${BASE}${path}${join}smoke=${Date.now()}`,{redirect:'follow'});
  if(!r.ok) throw new Error(`${path} HTTP ${r.status}`);
  return {body:await r.text(),url:r.url,status:r.status};
}

try{
  const apex=(await resolve4(HOST)).sort();
  const missing=EXPECTED_A.filter(ip=>!apex.includes(ip));
  rec('Apex GitHub Pages A records',missing.length===0,missing.length?`missing ${missing.join(', ')}; got ${apex.join(', ')}`:`${apex.join(', ')}`);
}catch(e){rec('Apex GitHub Pages A records',false,`${e.code||e.name}: ${e.message}`)}

try{
  const cnames=(await resolveCname(WWW)).map(x=>x.replace(/\.$/,'').toLowerCase());
  rec('WWW GitHub Pages CNAME',cnames.includes(EXPECTED_WWW),cnames.join(', '));
}catch(e){rec('WWW GitHub Pages CNAME',false,`${e.code||e.name}: ${e.message}`)}

try{
  const home=await fetchText('/');
  rec('HTTPS homepage',home.status===200 && home.url.startsWith('https://'),`${home.status} ${home.url}`);
  rec('Allshield homepage identity',/Allshield Insurance Group/i.test(home.body),'company title/content present');
  rec('Approved B021 script chain',REQUIRED_SCRIPTS.every(f=>home.body.includes(f)),'all approved runtime scripts referenced');
  const activeBanned=BANNED_OVERLAYS.filter(f=>home.body.includes(f));
  rec('No post-B021 runtime overlays',activeBanned.length===0,activeBanned.length?activeBanned.join(', '):'none active');

  const build=await fetchText('/build-info.js');
  rec('Approved build id',build.body.includes('B2026.08.23.021'),'B2026.08.23.021');

  const cfg=await fetchText('/config.js');
  rec('Demo fallback disabled',/DEMO_FALLBACK:\s*false/.test(cfg.body),'config explicitly disables demo fallback');

  const ai=await fetchText('/phase16-ai-command-production.js');
  rec('AI command runtime',ai.body.includes('Live AI across Allshield'),'approved AI command marker present');

  const social=await fetchText('/phase16-social-production.js');
  rec('Social production runtime',social.body.includes('Brand + Profile AI') && social.body.includes('Connections + Queue'),'approved social workspace markers present');
}catch(e){rec('Live deployment request',false,`${e.name||'Error'}: ${e.message}`)}

const result={
  certification:'ALLSHIELD B2026.08.23.021 live deployment smoke',
  base_url:BASE,
  completed_at:new Date().toISOString(),
  status:fail.length?'FAIL':'PASS',
  passed:checks.filter(x=>x.ok).length,
  total:checks.length,
  checks,
  failures:fail
};
console.log(JSON.stringify(result,null,2));
process.exitCode=fail.length?1:0;
