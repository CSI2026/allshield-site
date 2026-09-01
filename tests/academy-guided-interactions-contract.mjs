import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const fail=message=>{throw new Error(message)};

const guided=read('academy-guided-path-2026-08-31.js');
const hotfix=read('academy-guided-path-hotfix-2026-08-31.js');
const reader=read('academy-textbook-reader-2026-09-01.js');
const media=read('academy-instructor-media-hotfix-2026-08-31.js');
const loader=read('academy-commercial-loader-2026-08-31.js');

for(const marker of ['asGuidedOpenLessonCheck','submit_lesson_check','asGuidedSubmitLessonCheck','asGuidedStartCheckpoint','submit_chapter_exam','asGuidedSubmitCheckpoint']){
  if(!guided.includes(marker))fail(`Guided Academy missing learner handoff: ${marker}`);
}
for(const marker of ['Finish Review','Page ${pageIndex+1} of ${pages.length}','normalizeHeading','asBookPrev','asBookNext','positionBook']){
  if(!reader.includes(marker))fail(`Digital textbook missing required interaction: ${marker}`);
}
for(const marker of ['installTextbookFinishHandoff','asGuidedOpenLessonCheck','as-book-finish-status','asGuidedRetryLesson','serializeActivityHeartbeats']){
  if(!hotfix.includes(marker))fail(`Academy handoff hardening missing: ${marker}`);
}
for(const marker of ['asInstructorMediaToggle','asInstructorMediaStop','Stop & Save','visibilitychange','pagehide','saveVideoPlace']){
  if(!media.includes(marker))fail(`Ava media control missing: ${marker}`);
}
if(!media.includes("ss.speak=function(u){if(guided())"))fail('Robotic browser speech is not blocked in guided Academy mode');
if(!loader.includes("rel='preload'")||!loader.includes("as='script'"))fail('Academy scripts are not preloaded for faster startup');
if(!hotfix.includes("if(document.getElementById('asTextbook'))"))fail('Finish Review has no visible blocked-state fallback');

console.log('Academy guided interaction contract: PASS (Ava → textbook → finish review → lesson check → checkpoint)');
