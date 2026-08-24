import { readFile, writeFile } from 'node:fs/promises';

const path='index.html';
let html=await readFile(path,'utf8');

const liveHost=(id,title)=>`<main class="portal-main" id="${id}">
      <div class="dashboard-head"><div><div class="kicker">ALLSHIELD LIVE PLATFORM</div><h2>${title}</h2><p>Loading verified production data from Allshield.</p></div></div>
      <div class="real-data-banner">LIVE DATA ONLY</div>
      <div class="bo-card">Connecting to the live platform…</div>
    </main>`;

html=html.replace(/<main class="portal-main" id="agentMain">[\s\S]*?<\/main>/,liveHost('agentMain','Agent Dashboard'));
html=html.replace(/<main class="portal-main" id="adminMain">[\s\S]*?<\/main>/,liveHost('adminMain','Executive Dashboard'));
html=html.replace(/<main class="portal-main" id="ownerMain">[\s\S]*?<\/main>/,liveHost('ownerMain','Owner Command Center'));

html=html
  .replaceAll('assets/brand-3b28c3fa225d.webp','assets/brand-914a23072410.webp')
  .replaceAll("onclick=\"enterPortal('agent')\">Enter Demo Agent Portal","onclick=\"productionLogin('agent')\">Enter Agent Portal")
  .replaceAll("onclick=\"enterPortal('admin')\">Enter Demo Admin Portal","onclick=\"productionLogin('admin')\">Enter Admin Portal")
  .replaceAll("onclick=\"enterPortal('owner')\">Enter Demo Owner Portal","onclick=\"productionLogin('owner')\">Enter Owner Portal")
  .replace('This is a working homepage preview. Submit to test the interaction.','Tell us what you need and an Allshield representative can follow up.')
  .replace('Full-control access for authorized Allshield ownership.','Secure full-control access for authorized Allshield ownership.')
  .replace('Authorized Allshield leadership and administration only.','Secure access for authorized Allshield leadership and administration only.')
  .replace('Secure access to your Allshield back office.','Secure access to your live Allshield back office.');

const forbidden=[
  'Enter Demo Agent Portal','Enter Demo Admin Portal','Enter Demo Owner Portal',
  'GOOD EVENING, CALVIN','Jordan Miles','Ashley Reed','Marcus Hill','Taylor Brooks',
  '<div class="value">72%</div>','<div class="value">48</div>','<div class="value">100</div>',
  'working homepage preview'
];
for(const marker of forbidden){
  if(html.includes(marker)) throw new Error(`Legacy portal marker remains in index.html: ${marker}`);
}

await writeFile(path,html);
console.log('Production index shell cleaned: legacy portal samples removed.');
