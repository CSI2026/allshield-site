import { readFile } from 'node:fs/promises';

const files=['index.html','app.js'];
const forbidden=[
  /Enter Demo (Agent|Admin|Owner) Portal/i,
  /GOOD EVENING, CALVIN/i,
  /Jordan Miles/i,
  /Ashley Reed/i,
  /Marcus Hill/i,
  /Taylor Brooks/i,
  /Interactive demo/i,
  /Example dashboard structure/i,
  /working homepage preview/i,
  /saved locally in this browser/i,
  /New Demo Agent/i,
  /Demo agent added/i,
  /Signature captured in demo/i,
  /Role changed in demo/i
];

for(const file of files){
  const text=await readFile(file,'utf8');
  for(const pattern of forbidden){
    if(pattern.test(text)) throw new Error(`Legacy sample portal content found in ${file}: ${pattern}`);
  }
}

const html=await readFile('index.html','utf8');
for(const id of ['agentMain','adminMain','ownerMain']){
  const match=html.match(new RegExp(`<main class="portal-main" id="${id}">([\\s\\S]*?)<\\/main>`));
  if(!match) throw new Error(`Missing production portal host: ${id}`);
  if(!/LIVE DATA ONLY|Loading verified production data/i.test(match[1])) throw new Error(`Portal host ${id} is not a neutral live-data shell.`);
}

console.log('Legacy portal sample regression check passed.');
