const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../scripts/version.js');

test('versionCode', () => {
  assert.equal(V.versionCode('v1.0.0'), 10000);
  assert.equal(V.versionCode('v1.2.3'), 10203);
  assert.ok(V.versionCode('v1.10.0') > V.versionCode('v1.9.9'));
  for (const bad of ['v1.0', '1.0.0-beta', 'v1.100.0', 'v1.0.100', 'main']) assert.throws(() => V.versionCode(bad), /bad-tag/);
});

test('versionName and tagMatches', () => {
  assert.equal(V.versionName('v1.2.3'), '1.2.3');
  assert.equal(V.tagMatches('v1.0.0', '1.0.0'), true);
  assert.equal(V.tagMatches('v1.0.1', '1.0.0'), false);
});
