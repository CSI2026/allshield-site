import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const invite=fs.readFileSync('supabase/functions/manage-team-user/index.ts','utf8');
const fail=message=>{throw new Error(message)};

for(const role of ['agent','admin','owner']){
  const block=index.match(new RegExp(`<div class="portal-login" id="${role}Login">([\\s\\S]*?)<\\/div>\\s*<\\/div>`))?.[1]||'';
  if(!block.includes('placeholder="Username"'))fail(`${role} login does not ask for Username`);
  if(!block.includes('autocomplete="username"'))fail(`${role} login is missing username autocomplete semantics`);
  if(/placeholder="[^"]*email/i.test(block))fail(`${role} login still asks for an email address`);
}

if(!index.includes("const portalLoginRoles=new Set(['agent','admin','owner'])"))fail('Portal deep-link role allowlist is missing');
if(!index.includes("new URLSearchParams(window.location.search).get('portal')"))fail('Portal query routing is missing');
if(!index.includes('showLogin(requestedPortal,false)'))fail('Direct portal routing does not open the selected login');
if(!invite.includes('https://allshieldinsurancegroup.com/?portal=agent'))fail('Agent invitation does not link directly to Agent Portal login');
if(!invite.includes('enter the Username shown above — not your email address'))fail('Agent invitation does not explain username login');

console.log('Portal login routing contract: PASS (direct Agent invite; Username on Agent/Admin/Owner)');
