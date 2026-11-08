const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = f => fs.readFileSync(f, 'utf8');
const css = () => read('www/css/app.css');

test('safe-top combines env and Capacitor\'s variable', () => {
  assert.match(css(), /--safe-top:\s*max\(env\(safe-area-inset-top,\s*0px\),\s*var\(--safe-area-inset-top,\s*0px\)\)/);
  assert.match(css(), /--safe-bottom:\s*max\(env\(safe-area-inset-bottom,\s*0px\),\s*var\(--safe-area-inset-bottom,\s*0px\)\)/);
});

test('no Bricolage anywhere', () => {
  const files = fs.readdirSync('www', { recursive: true }).map(String);
  for (const f of files.filter(p => /\.(html|css|js|json|webmanifest)$/.test(p))) assert.doesNotMatch(read(path.join('www', f)), /Bricolage/i, f);
  assert.equal(fs.readdirSync('www/fonts').filter(f => /bricolage/i.test(f)).length, 0);
});

test('no text below 13px', () => {
  for (const [, value, unit] of css().matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) {
    const px = unit === 'rem' ? Number(value) * 16 : Number(value);
    assert.ok(px >= 13, `font-size ${value}${unit} is below 13px`);
  }
});

test('system font for the interface', () => {
  assert.match(css(), /--font-ui:\s*-apple-system/);
  assert.match(css(), /body\{[^}]*font-family:var\(--font-ui\)[^}]*font-size:17px/);
});
