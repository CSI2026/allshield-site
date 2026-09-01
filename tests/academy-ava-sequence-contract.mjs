import fs from 'node:fs';
const read=f=>fs.readFileSync(f,'utf8');
const fail=m=>{throw new Error(m)};
const seq=read('academy-ava-sequence-controller-2026-09-01.js');
const loader=read('academy-commercial-loader-2026-08-31.js');
const guided=read('academy-guided-path-2026-08-31.js');
const media=read('academy-instructor-media-hotfix-2026-08-31.js');

try{new Function(seq);new Function(media)}catch(e){fail(`Ava Academy JavaScript does not parse: ${e.message}`)}
for(const marker of [
  'as-ava-fresh-guided-start-v3-',
  'as-ava-video-resume-',
  'clearStaleResume',
  'clearCurrentBookResume',
  'as-book-page:',
  'asInstructorChoice',
  'asGuidedStartLesson',
  'asGuidedBeginFocus',
  'lesson-1-1-part-1',
  'Lesson 1.1 · Part 1 of 3 — Your license path',
  'Lesson 1.1 · Part 2 of 3 — How the Texas exam works',
  'Lesson 1.1 · Part 3 of 3 — What happens after you pass',
  'makeVideoPrimary',
  'makeSoloPrimary',
  'introduction_seen_at'
]) if(!seq.includes(marker)) fail(`Ava sequence controller missing ${marker}`);

if(!media.includes('welcome-canonical-v3.mp4')) fail('Base Ava media layer still points at a non-canonical welcome video');
if(media.includes("instructors/ava/welcome.mp4'")) fail('Legacy Ava welcome.mp4 must not be the base instructor source');
for(const marker of ['Your license path','How the Texas exam works','What happens after you pass']) if(!media.includes(marker)) fail(`Base Ava media labels missing: ${marker}`);
if(!loader.includes('academy-ava-sequence-controller-2026-09-01.js')) fail('Ava sequence controller is not in the production loader');
if(loader.indexOf('academy-ava-sequence-controller-2026-09-01.js') < loader.indexOf('academy-ava-continuity-hotfix-2026-09-01.js')) fail('Sequence controller must load after Ava continuity');
if(loader.indexOf('academy-ava-sequence-controller-2026-09-01.js') > loader.indexOf('academy-exam-experience-2026-09-01.js')) fail('Sequence controller must load before the exam experience');
if(!guided.includes('renderLessonIntro')) fail('Expected legacy lesson intro hook is missing; audit the bypass contract');
if(!seq.includes("localStorage.setItem(focusKey(currentLessonId),'started')")) fail('Focus handoff does not bypass the generic lesson brief deterministically');
if(!media.includes('instructor_video_urls')) fail('Real Ava lesson playlist support is missing');

console.log('Academy Ava sequence contract: PASS (canonical intro → choice → focus → labeled Ava parts 1/2/3 → review page 1)');
