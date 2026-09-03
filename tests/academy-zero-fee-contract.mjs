import fs from 'node:fs';

const fail = message => { console.error(message); process.exit(1); };
const premium = fs.readFileSync('academy-premium-guided-2026-09-01.js', 'utf8');
const media = fs.readFileSync('academy-instructor-media-hotfix-2026-08-31.js', 'utf8');
const sequence = fs.readFileSync('academy-ava-sequence-controller-2026-09-01.js', 'utf8');
const liveAvatar = fs.readFileSync('supabase/functions/academy-live-avatar/index.ts', 'utf8');
const instructor = fs.readFileSync('supabase/functions/academy-instructor/index.ts', 'utf8');

for (const [name, source] of [['premium', premium], ['guided path', fs.readFileSync('academy-guided-path-2026-08-31.js', 'utf8')]]) {
  for (const forbidden of ['SpeechSynthesisUtterance', 'speechSynthesis.speak']) {
    if (source.includes(forbidden)) fail(`${name} still contains generic narration: ${forbidden}`);
  }
}
if (premium.includes("action:'guided_audio'")) fail('Guided Academy still requests generated audio');
if (!media.includes('ss.speak=function')) fail('Media layer no longer blocks generic narration');
if (!sequence.includes('Never substitute browser narration')) fail('Sequence controller does not enforce Ava-only instruction');
for (const forbidden of ['api.liveavatar.com', 'LIVEAVATAR_API_KEY', 'LIVEAVATAR_AVATAR_ID', '/sessions/token']) {
  if (liveAvatar.includes(forbidden)) fail(`LiveAvatar gateway still contains paid-provider dependency: ${forbidden}`);
}
for (const marker of ['disabled: true', 'billing_mode: "no_new_fees"', 'ava_video_only']) {
  if (!liveAvatar.includes(marker)) fail(`Disabled LiveAvatar gateway missing ${marker}`);
}
if (instructor.includes('api.openai.com/v1/audio/speech')) fail('Academy instructor still contains a metered narration request');
for (const marker of ['METERED_NARRATION_DISABLED_NO_FEE_POLICY', 'narration_delivery: "ava_video_only"', 'billing_mode: "no_new_fees"']) {
  if (!instructor.includes(marker)) fail(`Academy instructor no-fee policy missing ${marker}`);
}

console.log('Academy zero-fee contract: PASS (Ava video only; generic and metered narration disabled)');
