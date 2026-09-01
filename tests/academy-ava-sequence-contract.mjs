import fs from 'node:fs';
const read=f=>fs.readFileSync(f,'utf8');
const fail=m=>{throw new Error(m)};
const seq=read('academy-ava-sequence-controller-2026-09-01.js');
const loader=read('academy-commercial-loader-2026-08-31.js');
const guided=read('academy-guided-path-2026-08-31.js');
const media=read('academy-instructor-media-hotfix-2026-08-31.js');

try{new Function(seq)}catch(e){fail(`Ava sequence controller does not parse: ${e.message}`)}
for(const marker of [
  'as-ava-fresh-guided-start-v3-',
  'as-ava-video-resume-',
  'clearStaleResume',
  'asInstructorChoice',
  'asGuidedStartLesson',
  'asGuidedBeginFocus',
  'lesson-1-1-part-1',
  'makeVideoPrimary',
  'makeSoloPrimary',
  'introduction_seen_at'
]) if(!seq.includes(marker)) fail(`Ava sequence controller missing ${marker}`);

if(!loader.includes('academy-ava-sequence-controller-2026-09-01.js')) fail('Ava sequence controller is not in the production loader');
if(loader.indexOf('academy-ava-sequence-controller-2026-09-01.js') < loader.indexOf('academy-ava-continuity-hotfix-2026-09-01.js')) fail('Sequence controller must load after Ava continuity');
if(loader.indexOf('academy-ava-sequence-controller-2026-09-01.js') > loader.indexOf('academy-exam-experience-2026-09-01.js')) fail('Sequence controller must load before the exam experience');
if(!guided.includes('renderLessonIntro')) fail('Expected legacy lesson intro hook is missing; audit the bypass contract');
if(!seq.includes("localStorage.setItem(focusKey(currentLessonId),'started')")) fail('Focus handoff does not bypass the generic lesson brief deterministically');
if(!media.includes('instructor_video_urls')) fail('Real Ava lesson playlist support is missing');

console.log('Academy Ava sequence contract: PASS (intro → choice → focus → Ava segment 1 → segment 2 → segment 3 → review)');
