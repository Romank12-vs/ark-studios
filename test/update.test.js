const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../www/js/update.js');

const DAY = 86400000;
const now = 1762600000000;

test('constants', () => {
  assert.equal(U.APK_URL, 'https://github.com/Romank12-vs/ark-studios/releases/latest/download/ARK-Studios.apk');
  assert.equal(U.RELEASES_API, 'https://api.github.com/repos/Romank12-vs/ark-studios/releases/latest');
});

test('parseVersion', () => {
  assert.deepEqual(U.parseVersion('v1.2.3'), [1, 2, 3]);
  assert.deepEqual(U.parseVersion('1.2.3'), [1, 2, 3]);
  for (const bad of ['1.2', 'v1.0.0-beta', 'garbage', undefined, null]) assert.equal(U.parseVersion(bad), null);
});

test('isNewer', () => {
  assert.equal(U.isNewer('v1.0.1', '1.0.0'), true);
  assert.equal(U.isNewer('v1.10.0', '1.9.0'), true);
  assert.equal(U.isNewer('v1.0.0', '1.0.0'), false);
  assert.equal(U.isNewer('v0.9.9', '1.0.0'), false);
  assert.equal(U.isNewer('garbage', '1.0.0'), false);
});

test('shouldCheck: at most once a day', () => {
  assert.equal(U.shouldCheck(undefined, now), true);
  assert.equal(U.shouldCheck(now - DAY + 1, now), false);
  assert.equal(U.shouldCheck(now - DAY, now), true);
});

test('bannerFor', () => {
  assert.deepEqual(U.bannerFor({ tag_name: 'v1.1.0' }, '1.0.0'), { version: '1.1.0', url: U.APK_URL });
  assert.equal(U.bannerFor({ tag_name: 'v1.1.0' }, '1.0.0', '1.1.0'), null);
  assert.equal(U.bannerFor({ message: 'API rate limit exceeded' }, '1.0.0'), null);
  assert.equal(U.bannerFor(null, '1.0.0'), null);
});

test('checkForUpdate is silent on failure and skips when checked today', async () => {
  const base = { now, current: '1.0.0', lastCheckAt: undefined };
  assert.deepEqual(await U.checkForUpdate({ ...base, fetchFn: () => Promise.reject(new Error('offline')) }), { checkedAt: now, banner: null });
  assert.deepEqual(await U.checkForUpdate({ ...base, fetchFn: async () => ({ ok: false, json: async () => ({}) }) }), { checkedAt: now, banner: null });
  assert.deepEqual(
    await U.checkForUpdate({ ...base, fetchFn: async () => ({ ok: true, json: async () => ({ tag_name: 'v1.1.0' }) }) }),
    { checkedAt: now, banner: { version: '1.1.0', url: U.APK_URL } }
  );
  let called = false;
  assert.equal(await U.checkForUpdate({ ...base, lastCheckAt: now - 1000, fetchFn: async () => { called = true; } }), null);
  assert.equal(called, false);
});
