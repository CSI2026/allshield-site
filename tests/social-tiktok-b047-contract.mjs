import fs from 'node:fs';
const src=fs.readFileSync('supabase/functions/social-connection-admin/index.ts','utf8');
const ui=fs.readFileSync('social-connection-center.js','utf8');
const mig=fs.readFileSync('supabase/migrations/20260829_social_tiktok_professional_b047.sql','utf8');
const privacy=fs.readFileSync('social-privacy.html','utf8');
const terms=fs.readFileSync('social-terms.html','utf8');
const checks=[
  ['B047 source marker',src.includes("B2026.08.29.047")],
  ['B047 UI marker',ui.includes("B2026.08.29.047")],
  ['TikTok account creation link',src.includes('https://www.tiktok.com/signup')],
  ['TikTok developer portal link',src.includes('https://developers.tiktok.com/')],
  ['TikTok secure credentials',src.includes('TIKTOK_CLIENT_KEY')&&src.includes('TIKTOK_CLIENT_SECRET')],
  ['TikTok current OAuth scopes',src.includes('user.info.basic,user.info.stats,video.list,video.publish,video.upload')],
  ['TikTok account stats probe',src.includes('follower_count,following_count,likes_count,video_count')&&src.includes('stats_probe_ok')],
  ['TikTok video metrics probe',src.includes('/v2/video/list/?fields=id,create_time,title,like_count,comment_count,share_count,view_count')&&src.includes('video_metrics_probe_ok')],
  ['TikTok creator eligibility probe',src.includes('/v2/post/publish/creator_info/query/')&&src.includes('creator_info_ok')],
  ['TikTok token auto refresh',src.includes('refreshTikTokTokenIfNeeded')&&src.includes("grant_type:'refresh_token'")],
  ['TikTok posting audit gate',src.includes("posting_audit_status==='approved'")&&src.includes('public_post_ready')],
  ['TikTok app review tracker',mig.includes('social_provider_approval_status')&&ui.includes('sccTikTokAppReview')],
  ['TikTok engagement capability',mig.includes("required_engagement_scopes = array['user.info.stats','video.list']")],
  ['TikTok comments fail closed',mig.includes('comment_read_supported = false')&&mig.includes('comment_reply_supported = false')],
  ['Privacy URL exists',privacy.includes('ALLSHIELD Social Integration Privacy Notice')],
  ['Terms URL exists',terms.includes('ALLSHIELD Social Integration Terms of Use')],
  ['Provider secrets stay server-side',!ui.includes('TIKTOK_CLIENT_SECRET')||ui.includes('Save Securely')],
  ['Production loader updated',fs.readFileSync('index.html','utf8').includes('social-connection-center.js?v=B2026.08.29.047')]
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)bad++}console.log(`B047 TikTok contract: ${checks.length-bad}/${checks.length} PASS`);if(bad)process.exit(1);
