import fs from 'node:fs';
const src=fs.readFileSync('supabase/functions/social-connection-admin/index.ts','utf8');
const ui=fs.readFileSync('social-connection-center.js','utf8');
const checks=[
  ['B045 marker',src.includes('B2026.08.29.045')],
  ['LinkedIn org admin scope',src.includes('r_organization_admin')],
  ['LinkedIn org read scope',src.includes('r_organization_social')],
  ['LinkedIn feed scopes',src.includes('r_organization_social_feed')&&src.includes('w_organization_social_feed')],
  ['LinkedIn org ACL discovery',src.includes('organizationAcls?q=roleAssignee')],
  ['LinkedIn company selection',src.includes('select_linkedin_org')&&ui.includes('sccLinkedInOrg')],
  ['LinkedIn org identity verification',src.includes('/rest/organizations/${orgId}')],
  ['YouTube upload scope',src.includes('youtube.upload')],
  ['YouTube comment scope',src.includes('youtube.force-ssl')],
  ['YouTube analytics scope',src.includes('yt-analytics.readonly')],
  ['YouTube analytics probe',src.includes('youtubeanalytics.googleapis.com/v2/reports')],
  ['YouTube analytics gates engagement',src.includes('engagement_ok=extra.analytics_ok===true')],
  ['UI B045 marker',ui.includes('B2026.08.29.045')]
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)bad++}if(bad)process.exit(1);
