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

test('tab bar has one column per tab', () => {
  const tabs = (/const TABS=\[(.*?)\];/.exec(read('www/index.html'))[1].match(/\['/g) || []).length;
  const cols = Number(/nav\.tabs div\{[^}]*repeat\((\d+),1fr\)/.exec(css())[1]);
  assert.equal(cols, tabs);
});

test('sheet header stays visible while a long sheet scrolls', () => {
  assert.match(css(), /\.sheet-head\{[^}]*position:sticky/);
});
test('segbar sits right under the 60 px top bar', () => {
  assert.match(css(), /--topbar-h:\s*60px/);
  assert.match(css(), /\.topbar\{[^}]*min-height:var\(--topbar-h\)/);
  assert.match(css(), /\.segbar\{[^}]*top:calc\(var\(--safe-top\) \+ var\(--topbar-h\)\)/);
});
test('no styles left for removed elements', () => {
  for (const re of [/\.b-due\b/, /\.eq i\.full/, /\.stage\b/, /\.hero \.btns/, /\.song(?![\w-])/, /\.x(?![\w-])/]) assert.doesNotMatch(css(), re);
});

test('chips keep their text width in a scrolling row instead of shrinking into circles', () => {
  // .chip has min-width:44px for tapping, which replaces the flex item's "no smaller than its text"
  // minimum, so the 9 message chips were squeezed to 44x44 on a phone.
  assert.match(css(), /\.chip\{[^}]*flex:none/);
});
