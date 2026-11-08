const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Internal identifiers that keep the old name on purpose (see spec 4.3).
const INTERNAL = /taal-v2|taal-choreo-v1|TaalCore/g;

for (const f of ['www/index.html', 'www/manifest.webmanifest', 'HOW-TO-INSTALL.md']) {
  test(`no user-visible Taal in ${f}`, () => {
    assert.doesNotMatch(fs.readFileSync(f, 'utf8').replace(INTERNAL, ''), /taal/i);
  });
}

test('manifest names', () => {
  const m = JSON.parse(fs.readFileSync('www/manifest.webmanifest', 'utf8'));
  assert.equal(m.name, 'ARK Studios: choreography studio');
  assert.equal(m.short_name, 'ARK Studios');
});

test('version', () => assert.equal(require('../www/js/version.js').APP_VERSION, '1.0.0'));

test('android app name and id', () => {
  assert.match(fs.readFileSync('android/app/src/main/res/values/strings.xml', 'utf8'), /<string name="app_name">ARK Studios<\/string>/);
  assert.match(fs.readFileSync('android/app/build.gradle', 'utf8'), /applicationId "com\.arkstudios\.app"/);
});
