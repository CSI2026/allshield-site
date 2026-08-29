import fs from 'node:fs';
const src=fs.readFileSync('supabase/functions/social-connection-admin/index.ts','utf8');
const ui=fs.readFileSync('social-connection-center.js','utf8');
const mig=fs.readFileSync('supabase/migrations/20260829_social_professional_engagement_scopes_b045.sql','utf8');
const checks=[
  ['B045 marker',src.includes('B2026.08.29.045')],
  ['dedicated engagement scope schema',mig.includes('required_engagement_scopes text[]')],
  ['YouTube engagement scopes versioned',mig.includes('yt-analytics.readonly')&&mig.includes('youtube.readonly')],
  ['LinkedIn engagement scopes versioned',mig.includes('r_organization_admin')&&mig.includes('r_organization_social')],
  ['runtime unions engagement scopes',src.includes('required_engagement_scopes||[]')],
  ['LinkedIn org admin scope',src.includes('r_organization_admin')],
  ['LinkedIn org read scope',src.includes('r_organization_social')],
  ['LinkedIn feed scopes',src.includes('r_organization_social_feed')&&src.includes('w_organization_social_feed')],
  ['LinkedIn org ACL discovery',src.includes('organizationAcls?q=roleAssignee')],
  ['LinkedIn company selection',src.includes('select_linkedin_org')&&ui.includes('sccLinkedInOrg')],
  ['LinkedIn org identity verification',src.includes('/rest/organizations/${orgId}')],
  ['LinkedIn engagement API probe',src.includes('organizationalEntityShareStatistics')&&src.includes('engagement_probe_ok')],
  ['LinkedIn engagement probe gates readiness',src.includes("platform==='linkedin'&&cap.engagement_metrics_supported")&&src.includes('extra.engagement_probe_ok===true')],
  ['YouTube upload scope',src.includes('youtube.upload')],
  ['YouTube comment scope',src.includes('youtube.force-ssl')],
  ['YouTube analytics scope',src.includes('yt-analytics.readonly')],
  ['YouTube analytics probe',src.includes('youtubeanalytics.googleapis.com/v2/reports')],
  ['YouTube analytics gates engagement',src.includes('extra.analytics_ok===true')],
  ['UI B045 marker',ui.includes('B2026.08.29.045')]
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)bad++}if(bad)process.exit(1);
