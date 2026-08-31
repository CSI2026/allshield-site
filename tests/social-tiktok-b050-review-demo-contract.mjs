import fs from 'node:fs';
const edge=fs.readFileSync('supabase/functions/social-connection-admin/index.ts','utf8');
const ui=fs.readFileSync('social-connection-center.js','utf8');
const build=fs.readFileSync('build-info.js','utf8');
const checks=[
 ['B050 edge',edge.includes("B2026.08.30.050")],
 ['real draft init',edge.includes('/v2/post/publish/inbox/video/init/')&&edge.includes("required=mode==='direct'?'video.publish':'video.upload'")],
 ['real direct init',edge.includes('/v2/post/publish/video/init/')],
 ['creator info',edge.includes('/v2/post/publish/creator_info/query/')],
 ['real file transfer',edge.includes("method:'PUT'")&&edge.includes('Content-Range')],
 ['private only direct post',edge.includes("privacy_level:'SELF_ONLY'")&&edge.includes("levels.includes('SELF_ONLY')")],
 ['status probe',edge.includes('/v2/post/publish/status/fetch/')],
 ['size safety',edge.includes('5*1024*1024')],
 ['UI review demo',ui.includes('TIKTOK SANDBOX REVIEW DEMO')&&ui.includes('Upload Draft Test')&&ui.includes('Private Direct Post Test')],
 ['truthful live certification',
   build.includes("tiktok_sandbox_draft_upload:'LIVE USER TEST PASS — REAL PUBLISH ID'")&&
   build.includes("tiktok_sandbox_private_direct_post:'LIVE USER TEST PASS — SELF_ONLY REAL PUBLISH ID'")&&
   !build.includes("tiktok_public_posting_audit_gate:'APPROVED")&&
   !build.includes("tiktok_app_review:'APPROVED")
 ]
];
let fail=0;
for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}
console.log(`${checks.length-fail}/${checks.length} PASS`);
if(fail)process.exit(1);
