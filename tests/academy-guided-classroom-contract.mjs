import fs from 'node:fs';
import vm from 'node:vm';

const classroom=fs.readFileSync('academy-guided-classroom-2026-09-01.js','utf8');
const loader=fs.readFileSync('academy-commercial-loader-2026-08-31.js','utf8');

new vm.Script(classroom,{filename:'academy-guided-classroom-2026-09-01.js'});

const checks=[
  ['loader includes classroom layer',loader.includes('allshieldAcademyGuidedClassroom')&&loader.includes('academy-guided-classroom-2026-09-01.js')],
  ['desktop two-column classroom',classroom.includes('grid-template-columns:minmax(320px,.92fr) minmax(430px,1.08fr)')],
  ['mobile classroom stacks',classroom.includes('@media(max-width:900px)')&&classroom.includes('grid-template-columns:1fr')],
  ['follow-along panel exists',classroom.includes('Guided Classroom · Follow Along')],
  ['current teaching section is highlighted',classroom.includes('AVA IS TEACHING THIS')&&classroom.includes('syncHighlight')],
  ['lesson blocks are sourced from live course content',classroom.includes('.as-objectives,.as-lesson-section,.as-callout,.as-check-lock')],
  ['video progress drives section position',classroom.includes('currentTime')&&classroom.includes('duration')&&classroom.includes('timeupdate')],
  ['guided off removes classroom',classroom.includes('if(on)setTimeout(activate,160);else removeClassroom()')],
  ['exit removes classroom',classroom.includes('window.asGuidedExit')&&classroom.includes('removeClassroom()')],
  ['navigation away removes classroom',classroom.includes("if(view!=='study')removeClassroom()")],
  ['no browser speech synthesis used',!classroom.includes('speechSynthesis')]
];

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){
  console.error('Guided classroom contract failed:');
  for(const [name] of failed)console.error(` - ${name}`);
  process.exit(1);
}
console.log(`Guided classroom contract passed (${checks.length} checks).`);
