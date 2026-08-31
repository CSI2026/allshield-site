import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const index=read('index.html');
const config=read('config.js');
const router=read('onboarding-router-2026-08-27.js');
const academy=read('phase16-agent-academy-production.js');
const edge=read('supabase/functions/agent-onboarding/index.ts');
const fail=message=>{throw new Error(message)};

for(const label of ['1 Get Licensed','2 Study & Complete Tasks','3 Practice & Take Tests','AI Study Help','My Account']){
  if(!index.includes(label))fail(`Simplified Agent navigation is missing: ${label}`);
}
const sidebar=index.match(/<div class="portal-page" id="agentPortal">[\s\S]*?<aside class="sidebar">([\s\S]*?)<\/aside>/)?.[1]||'';
for(const oldLabel of ['Performance & Rankings','Meeting Rooms','Achievements','Career Path']){
  if(sidebar.includes(oldLabel))fail(`New-agent sidebar still exposes: ${oldLabel}`);
}
if(!config.includes('onboarding-router-2026-08-27.js?v=2026.08.31.015'))fail('Current guided licensing runtime is not cache-busted');
if(!index.includes("if(role==='agent') window.showAgentView?.('onboarding',first)"))fail('Agent first screen is not the guided licensing journey');
for(const marker of ['Choose the state and license you want','Study and complete each task','Practice and take the readiness test','Submit license']){
  if(!router.includes(marker))fail(`Guided licensing journey is missing: ${marker}`);
}
if(!academy.includes('Study & complete your tasks.')||!academy.includes('Practice & Take a Test'))fail('Academy does not provide a clear next action');
if(!edge.includes('authorization,x-client-info,content-type,apikey'))fail('Agent onboarding Edge Function CORS does not allow Supabase browser headers');
if(!edge.includes('if(pathway==="self_select")')||!edge.includes('"agent_state_selection"'))fail('First state choice does not initialize the pre-licensing route');

console.log('Agent licensing journey contract: PASS (state → study tasks → tests → license)');
