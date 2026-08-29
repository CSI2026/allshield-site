import fs from 'node:fs';
const src=fs.readFileSync('supabase/functions/social-connection-admin/index.ts','utf8');
const ui=fs.readFileSync('social-connection-center.js','utf8');
const mig=fs.readFileSync('supabase/migrations/20260829_social_x_professional_b046.sql','utf8');
const checks=[
 ['B047 edge marker',src.includes("B2026.08.29.047")],
 ['B047 UI marker',ui.includes("B2026.08.29.047")],
 ['X engagement enabled',mig.includes('engagement_metrics_supported = true')],
 ['X comments enabled',mig.includes('comment_read_supported = true')&&mig.includes('comment_reply_supported = true')],
 ['X scopes least privilege',mig.includes("array['tweet.read','users.read']")&&mig.includes("array['tweet.read','users.read','tweet.write']")],
 ['X identity probe',src.includes("api.x.com/2/users/me?user.fields=id,name,username")],
 ['X authored-post metrics probe',src.includes('/tweets?max_results=5&tweet.fields=created_at,public_metrics')&&src.includes('engagement_probe_ok')],
 ['X mentions probe',src.includes('/mentions?max_results=5&tweet.fields=created_at,public_metrics')&&src.includes('mentions_probe_ok')],
 ['X engagement fails closed',src.includes("platform==='x'&&cap.engagement_metrics_supported")&&src.includes('extra.engagement_probe_ok===true')],
 ['X comment read fails closed',src.includes("platform==='x'&&cap.comment_read_supported")&&src.includes('extra.mentions_probe_ok===true')],
 ['X reply permission fails closed',src.includes("platform==='x'&&cap.comment_reply_supported")&&src.includes('extra.mentions_probe_ok===true')],
 ['X OAuth scopes preserved',src.includes('tweet.read users.read tweet.write offline.access')]
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)bad++}console.log(`B047 cumulative X contract: ${checks.length-bad}/${checks.length} PASS`);if(bad)process.exit(1);
