import fs from 'node:fs';
const read=f=>fs.readFileSync(f,'utf8');
const fail=m=>{throw new Error(m)};
const premium=read('academy-premium-guided-2026-09-01.js');
const loader=read('academy-commercial-loader-2026-08-31.js');
const media=read('academy-instructor-media-hotfix-2026-08-31.js');

try{ new Function(premium); }catch(e){ fail(`Premium Guided Academy JavaScript does not parse: ${e.message}`); }

for(const marker of [
  'Read on my own',
  'Continue with Ava · Guided',
  "action:'set_guided'",
  "action:'guided_audio'",
  'asGuidedPauseResume',
  'as-guided-reading',
  'as-guided-speed',
  "action:'save_resume'",
  "activity_type:'listen'",
  ':has(.as-qprompt)',
  '.as-book-callout.alert',
  '.as-book-term'
]) if(!premium.includes(marker)) fail(`Premium Guided Academy missing: ${marker}`);

if(premium.includes('speechSynthesis')) fail('Premium Guided Academy must never use browser speech synthesis');
if(!loader.includes('academy-premium-guided-2026-09-01.js')) fail('Premium Guided Academy is not in the production loader');
if(loader.indexOf('academy-premium-guided-2026-09-01.js') < loader.indexOf('academy-textbook-reader-2026-09-01.js')) fail('Premium layer must load after the textbook reader');
if(loader.indexOf('academy-premium-guided-2026-09-01.js') > loader.indexOf('academy-exam-experience-2026-09-01.js')) fail('Premium layer must load before the exam experience');
if(!media.includes('asInstructorMediaToggle')||!media.includes('Stop & Save')) fail('Ava video pause/save controls are missing');

console.log('Academy premium guided contract: PASS (integrated book + optional Ava Guided Assistance + premium assessments)');
