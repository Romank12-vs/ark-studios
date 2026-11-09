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

// Web version (iPhone, browsers): no store and no APK, so the app checks the deployed version.js itself.
const MIN = 60000;
const script = v => `/* ARK Studios version */\nvar APP_VERSION = '${v}';\n`;
const served = (text, ok = true) => async () => ({ ok, text: async () => text });

test('versionFromScript reads APP_VERSION from version.js', () => {
  assert.equal(U.versionFromScript(require('node:fs').readFileSync('www/js/version.js', 'utf8')), require('../www/js/version.js').APP_VERSION);
  assert.equal(U.versionFromScript(script('1.3.0')), '1.3.0');
  for (const bad of ['', '<html>Not found</html>', "var APP_VERSION = '1.3';", undefined]) assert.equal(U.versionFromScript(bad), null);
});

test('checkWebUpdate offers a newer deployed version, fetched past every cache', async () => {
  const calls = [];
  const fetchFn = async (url, opts) => { calls.push([url, opts]); return { ok: true, text: async () => script('1.3.0') }; };
  assert.deepEqual(await U.checkWebUpdate({ now, current: '1.2.0', fetchFn }), { checkedAt: now, version: '1.3.0' });
  assert.deepEqual(calls, [[U.WEB_VERSION_URL, { cache: 'no-store' }]]);
  assert.equal(U.WEB_VERSION_URL, 'js/version.js');
});

test('checkWebUpdate offers nothing for the same or an older version, or on failure', async () => {
  const run = fetchFn => U.checkWebUpdate({ now, current: '1.2.0', fetchFn });
  assert.deepEqual(await run(served(script('1.2.0'))), { checkedAt: now, version: null });
  assert.deepEqual(await run(served(script('1.1.0'))), { checkedAt: now, version: null });
  assert.deepEqual(await run(served(script('1.3.0'), false)), { checkedAt: now, version: null });
  assert.deepEqual(await run(served('<html>offline page</html>')), { checkedAt: now, version: null });
  assert.deepEqual(await run(() => Promise.reject(new Error('offline'))), { checkedAt: now, version: null });
});

test('checkWebUpdate checks at most every 10 minutes', async () => {
  let called = false;
  const fetchFn = async () => { called = true; return { ok: true, text: async () => script('1.3.0') }; };
  assert.equal(await U.checkWebUpdate({ now, lastCheckAt: now - 10 * MIN + 1, current: '1.2.0', fetchFn }), null);
  assert.equal(called, false);
  assert.deepEqual(await U.checkWebUpdate({ now, lastCheckAt: now - 10 * MIN, current: '1.2.0', fetchFn }), { checkedAt: now, version: '1.3.0' });
});
