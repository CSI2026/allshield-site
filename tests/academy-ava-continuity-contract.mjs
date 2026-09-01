import fs from 'node:fs';
import vm from 'node:vm';
const read=f=>fs.readFileSync(f,'utf8');
const fail=m=>{throw new Error(m)};
const hotfix=read('academy-ava-continuity-hotfix-2026-09-01.js');
const welcome=read('academy-ava-welcome-v2-2026-09-01.js');
const media=read('academy-instructor-media-hotfix-2026-08-31.js');
const loader=read('academy-commercial-loader-2026-08-31.js');
const runtime=read('runtime-mutation-guard-2026-08-27.js');
const canonical='welcome-canonical-v3.mp4';

for(const [name,src] of [['continuity',hotfix],['welcome',welcome],['media',media],['loader',loader],['runtime',runtime]]){
  try{new vm.Script(src,{filename:name})}catch(e){fail(`${name} JavaScript does not parse: ${e.message}`)}
}
for(const marker of [
  canonical,
  'asAvaHardStop',
  'asGuidedExit',
  'showAgentView',
  'asInstructorMediaStop',
  'asAvaLessonVideo',
  'as-ava-instructor-mode #asTextbook',
  '__asAvaOriginalGuidedPause',
  'installAudioRegistry',
  'tracked',
  'pauseVisibleMedia',
  'hideDocks'
]) if(!hotfix.includes(marker)) fail(`Ava continuity hotfix missing: ${marker}`);
if(!welcome.includes(canonical)) fail('Welcome override is not using canonical original Ava video');
if(!media.includes(canonical)) fail('Base Ava media source is not canonical');
if(!loader.includes('academy-ava-continuity-hotfix-2026-09-01.js')) fail('Ava continuity hotfix is not in production loader');
if(loader.indexOf('academy-ava-continuity-hotfix-2026-09-01.js') < loader.indexOf('academy-premium-guided-2026-09-01.js')) fail('Ava continuity must load after Premium Guided');
if(loader.indexOf('academy-ava-continuity-hotfix-2026-09-01.js') > loader.indexOf('academy-exam-experience-2026-09-01.js')) fail('Ava continuity must load before exam experience');
if(!loader.includes("2026.09.01.016")||!runtime.includes("2026.09.01.016")) fail('Academy cache version not bumped for canonical base Ava audit');
console.log('Academy Ava continuity contract: PASS (canonical Ava at base + moving-video priority + hard Exit stop)');
