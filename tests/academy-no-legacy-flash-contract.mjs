import fs from 'node:fs';
import assert from 'node:assert/strict';

const preboot=fs.readFileSync('phase16-build-002.js','utf8');
const hotfix=fs.readFileSync('academy-guided-path-hotfix-2026-08-31.js','utf8');
const loader=fs.readFileSync('academy-commercial-loader-2026-08-31.js','utf8');

assert.match(preboot,/ALLSHIELD_ACADEMY_PREBOOT_VERSION/,'Agent portal must install the Academy preboot controller.');
assert.match(preboot,/asAcademyPrebootVeil/,'Pre-licensing route must have a first-paint veil.');
assert.match(preboot,/Pre-Licensing\|Continue My Study Tasks\|Choose & Start Studying\|Licensing state selected/,'Preboot must recognize legacy pre-licensing output and keep it covered.');
assert.match(preboot,/ensureAcademyBootstrap\(\)/,'Academy loader must begin during early page boot.');

assert.match(hotfix,/view==='study'.*asGuidedOpenStudy/s,'Study navigation must route directly to guided study.');
assert.match(hotfix,/view==='onboarding'.*asGuidedRenderOnboarding/s,'Get Licensed navigation must route directly to guided onboarding.');
assert.match(hotfix,/__allshieldNoFlashAcademy/,'No-flash navigation wrapper must be idempotent.');

assert.match(loader,/academy-guided-path-hotfix-2026-08-31\.js\?v=\$\{VERSION\}/,'Commercial loader must cache-bust the no-flash hotfix.');
assert.match(loader,/academy-textbook-reader-2026-09-01\.js\?v=\$\{VERSION\}/,'Commercial loader must preserve the horizontal textbook reader.');

console.log('Academy no-legacy-flash contract passed.');
