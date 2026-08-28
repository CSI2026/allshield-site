import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const read=f=>fs.readFileSync(f,'utf8');
const index=read('index.html');
const core=read('phase16-production-core.js');
const back=read('phase16-live-backoffice.js');
const agentOps=read('agent-operations-core-2026-08-28.js');
const academy=read('phase16-academy-admin.js');
const ai=read('phase16-ai-command-production.js');
const social=fs.readFileSync('phase16-social-production.js');
const build=read('build-info.js');
const responsive=fs.existsSync('responsive.css')?read('responsive.css'):'';
const responsiveUi=fs.existsSync('responsive-ui.js')?read('responsive-ui.js'):'';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=m=>{throw new Error(m)};
const expected=['dashboard','ai','permissions','teamaccounts','departments','communications','hierarchy','states','academy','testing','versions','updates','performance','meetings','marketing','social','video','media','brand','files','audit','buildhistory','settings'];
const routes=[...new Set([...index.matchAll(/showOwnerView\('([^']+)'/g)].map(m=>m[1]))];
if(expected.some(x=>!routes.includes(x))||routes.length!==23) fail(`Owner route mismatch: ${routes.join(',')}`);
if(index.includes('brand-914a23072410')) fail('Rejected legacy brand asset remains active');
if(!index.includes('for(const key of Object.keys(host.dataset))')||!index.includes('host.dataset.currentView=view')) fail('Stale tab-state router guard missing');
if(!index.includes('agent-operations-core-2026-08-28.js?v=2026.08.28.002')) fail('Canonical Agent Operations Core loader missing');
const featureMarkers={
  core:['Schedule / Edit Meeting','Communication Registry','Schedule For','Preview','Approve','Release','Department structure and assignments','Create Draft Version','Long-form YouTube','Mid-form YouTube','Short-form Video','YouTube Shorts','Generate Full AI Production Package','Script + Storyboard','AI Clips + Voice','Metadata + Thumbnail','Publish + Library','video_projects','video_project_assets','video_publish_jobs','video-studio-ai','youtube-oauth','youtube-publish','Approved Allshield brand system.'],
  agentOps:['TEAM ACCOUNTS','Create Agent Account','Generate','Create Account & Send Invite','MASTER AGENT PROFILE','Admin-Only Agent Communications','AGENT EMAIL COMMUNICATIONS','ONE AGENT • ONE MASTER FILE','registerAllshieldView(\'owner\',\'teamaccounts\'','registerAllshieldView(\'owner\',\'agentprofile\'','registerAllshieldView(\'owner\',\'agentcommunications\''],
  back:['Add / Update Permission Override','Organization and promotion ladder.','Record Promotion'],
  academy:['STATE LICENSING MATRIX','All 50 states.','US_STATES'],
  ai:['Run Company Scan','Ask Live AI','Recent AI Activity','Video Editor AI','Marketing AI','Operations AI','Performance AI','Compliance AI','ai-command-center','allshieldAICompanyScan','allshieldAIOpenWorkspace']
};
for(const m of featureMarkers.core) if(!core.includes(m)) fail(`Owner production feature missing: ${m}`);
for(const m of featureMarkers.agentOps) if(!agentOps.includes(m)) fail(`Agent Operations feature missing: ${m}`);
for(const m of featureMarkers.back) if(!back.includes(m)) fail(`Owner access/team feature missing: ${m}`);
for(const m of featureMarkers.academy) if(!academy.includes(m)) fail(`Owner licensing feature missing: ${m}`);
for(const m of featureMarkers.ai) if(!ai.includes(m)) fail(`Live AI feature missing: ${m}`);
if(agentOps.includes("registerAllshieldView('owner','communications',main=>renderCommunications")) fail('Agent Operations must not replace Owner Company Communications');
if(sha(social)!=='592f534997bf00457da6fe8ce4e2ffb1b64c3ccc23ac8bce773d4453d2f98216') fail('Social Publishing changed from approved B021');
if(!responsive.includes('@media (max-width:1100px)')||!responsive.includes('.mobile-portal-menu')||!responsive.includes('.portal-page.mobile-nav-open .sidebar')) fail('Responsive portal CSS is incomplete');
if(!responsiveUi.includes('mobile-nav-open')||!responsiveUi.includes('aria-expanded')||!responsiveUi.includes('allshieldCloseMobilePortalNav')) fail('Responsive portal navigation is incomplete');
if(!build.includes("build_number:'B2026.08.23.021'")) fail('Build metadata lost approved B021 baseline');
const all=[core,back,agentOps,academy,read('phase16-owner-live-dashboard.js'),read('phase16-owner-support.js'),ai,read('phase16-social-production.js')].join('\n');
for(const r of expected){const re=new RegExp(`registerAllshieldView\\(['\"]owner['\"],['\"]${r}['\"]`);if(!re.test(all)) fail(`Canonical Owner handler missing: ${r}`)}
for(const f of ['backend.js','build-info.js','config.js','phase16-build-002.js','phase16-crm.js','phase16-owner-live-dashboard.js','phase16-owner-support.js','phase16-live-backoffice.js','agent-operations-core-2026-08-28.js','phase16-agent-academy-production.js','phase16-academy-admin.js','phase16-production-core.js','phase16-ai-command-production.js','phase16-agent-live-essentials.js','phase16-social-production.js','responsive-ui.js']) execFileSync(process.execPath,['--check',f],{stdio:'inherit'});
console.log('Owner Portal completion contract: PASS (23/23 routes; Agent Operations Core canonical; Company Communications preserved; live AI; responsive portal; approved B021 baseline preserved)');
