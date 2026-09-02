import fs from 'node:fs';

const source=fs.readFileSync('supabase/functions/academy-ava-ingest/index.ts','utf8');
const fail=m=>{throw new Error(m)};

const required=[
  'const contiguous: any[] = [];',
  'if (String(seg.status) !== "ready" || !seg.media_url) break;',
  'contiguous.push(seg);',
  'content.instructor_video_urls = contiguous.map',
  'content.instructor_video_segments = contiguous.map',
  '.order("segment_order", { ascending: true })',
  'status: "ready"',
  'status: "ingest_failed"'
];
for(const marker of required) if(!source.includes(marker)) fail(`Ava ingest ordering contract missing: ${marker}`);

const orderSelect=source.indexOf('.order("segment_order", { ascending: true })');
const orderBreak=source.indexOf('if (String(seg.status) !== "ready" || !seg.media_url) break;');
const publish=source.indexOf('content.instructor_video_urls = contiguous.map');
if(!(orderSelect>=0&&orderBreak>orderSelect&&publish>orderBreak)) fail('Ava ingest must order segments, stop at first non-ready segment, then publish the contiguous prefix');

if(source.includes('filter(Boolean)')) fail('Ava ingest must not collapse missing segment slots with filter(Boolean)');
if(!source.includes('allowedHeyGenUrl')) fail('Ava ingest must validate provider media host');
if(!source.includes('job mismatch')) fail('Ava ingest must validate provider job identity');

console.log('Academy Ava ingest ordering contract: PASS');
