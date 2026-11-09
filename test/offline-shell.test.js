const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// The web version must work offline after a single visit, so every local file the page needs at
// startup has to be pre-cached by the service worker (its runtime cache only fills on later loads).
const sw = fs.readFileSync('www/sw.js', 'utf8');
const shell = new Set(JSON.parse(('[' + /const SHELL = \[([^\]]*)\]/.exec(sw)[1] + ']').replace(/'/g, '"'))
  .map(p => p.replace(/^\.\//, '')));

const html = fs.readFileSync('www/index.html', 'utf8');
const css = fs.readFileSync('www/fonts/fonts.css', 'utf8');
const local = u => !/^(https?:|data:|\/\/)/.test(u);
const needed = [
  ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]),
  ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1]),
  ...[...css.matchAll(/url\(([^)]+)\)/g)].map(m => 'fonts/' + m[1].replace(/['"]/g, '')),
].filter(local);

test('every startup file is pre-cached', () => {
  assert.ok(needed.length >= 8, 'expected scripts, styles and fonts to be found');
  for (const f of needed) assert.ok(shell.has(f), `${f} missing from SHELL in www/sw.js`);
});

test('every pre-cached file exists', () => {
  for (const f of shell) if (f !== '') assert.ok(fs.existsSync('www/' + f), `www/${f} does not exist`);
});

// GitHub Pages lets browsers reuse files for 10 minutes; revalidating means "Update" always loads the new release.
test('the worker revalidates with the server instead of trusting the browser cache', () => {
  assert.match(sw, /fetch\(req,\s*\{\s*cache:\s*'no-cache'\s*\}\)/);
});
