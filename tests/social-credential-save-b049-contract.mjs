import fs from 'node:fs';
const edge=fs.readFileSync('supabase/functions/social-connection-admin/index.ts','utf8');
const ui=fs.readFileSync('social-connection-center.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const edgeVersion=(edge.match(/BUILD='(B\d{4}\.\d{2}\.\d{2}\.(\d+))'/)||[]);
const uiVersion=(ui.match(/VERSION='(B\d{4}\.\d{2}\.\d{2}\.(\d+))'/)||[]);
const checks=[
 ['B049-or-later edge behavior',Number(edgeVersion[2]||0)>=49],
 ['Vault primary',edge.includes("if(!m.get(n)){const e=Deno.env.get(n);if(e)m.set(n,e)}")],
 ['No env override',!edge.includes("for(const n of d.credential_names){const e=Deno.env.get(n);if(e)m.set(n,e)}")],
 ['Vault status',edge.includes('vault_configured')&&edge.includes('credential_status')],
 ['Save verifies Vault',edge.includes('Credentials saved and verified in Supabase Vault.')],
 ['UI B049-or-later',Number(uiVersion[2]||0)>=49],
 ['UI Vault saved',ui.includes('VAULT SAVED')],
 ['Drawer persists',ui.includes('OPEN_DRAWER=key')],
 ['Production loads current social center',Boolean(uiVersion[1])&&index.includes(`social-connection-center.js?v=${uiVersion[1]}`)]
];let f=0;for(const [n,o] of checks){console.log(`${o?'PASS':'FAIL'} ${n}`);if(!o)f++;}if(f)process.exit(1);console.log(`${checks.length}/${checks.length} PASS`);
