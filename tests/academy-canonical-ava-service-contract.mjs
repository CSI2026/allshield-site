import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('supabase/functions/academy-instructor/index.ts','utf8');
const fail=m=>{throw new Error(m)};

for(const marker of [
  'Emery_public_6',
  '330290724a1b470fb63153f34d4c0183',
  'canonical-frame.webp',
  'welcome-canonical-v3.mp4',
  'canonical: true',
  'action === "segments"',
  'academy_instructor_segments'
]) if(!source.includes(marker)) fail(`Canonical Ava instructor service missing: ${marker}`);

for(const stale of [
  'ee45a16b921b442ba3275621d963bb31',
  'public-avatars/Saoirse'
]) if(source.includes(stale)) fail(`Stale Ava identity remains in instructor service: ${stale}`);

if(!source.includes('.eq("status", "ready")')) fail('Instructor segment API must expose ready media only');
if(!source.includes('Course not assigned')) fail('Instructor service must enforce course assignment');

console.log('Academy canonical Ava instructor service contract: PASS');
