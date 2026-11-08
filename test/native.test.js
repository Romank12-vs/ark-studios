const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../www/js/native.js');

test('back: sheet first, then history, then exit', () => {
  assert.equal(N.backAction({ sheetOpen: true, stackLen: 1 }), 'closeSheet');
  assert.equal(N.backAction({ sheetOpen: true, stackLen: 3 }), 'closeSheet');
  assert.equal(N.backAction({ sheetOpen: false, stackLen: 3 }), 'back');
  assert.equal(N.backAction({ sheetOpen: false, stackLen: 1 }), 'exit');
});

test('bar style follows theme', () => {
  assert.equal(N.barStyleFor('light'), 'LIGHT'); // dark icons on a light bar
  assert.equal(N.barStyleFor('dark'), 'DARK');   // light icons on a dark bar
  assert.equal(N.barStyleFor('auto'), 'DEFAULT');
});

test('not native under Node', () => assert.equal(N.isNative(), false));

const setNavigator = v => Object.defineProperty(globalThis, 'navigator', { value: v, configurable: true, writable: true });

test('tap uses Capacitor Haptics in the app', () => {
  const calls = [];
  global.window = { Capacitor: { isNativePlatform: () => true, Plugins: { Haptics: { impact: o => calls.push(o) } } } };
  N.tap(1e13);
  delete global.window;
  assert.deepEqual(calls, [{ style: 'LIGHT' }]);
});

test('tap falls back to vibrate on the web and never throws', () => {
  const calls = [];
  const original = globalThis.navigator;
  global.window = {};
  setNavigator({ vibrate: ms => calls.push(ms) });
  N.tap(2e13);
  delete global.window;
  setNavigator(original);
  assert.deepEqual(calls, [10]);
  assert.doesNotThrow(() => N.tap());
});

test('a second tap within 150 ms does not buzz again', () => {
  const calls = [], t = 3e13;
  global.window = { Capacitor: { isNativePlatform: () => true, Plugins: { Haptics: { impact: o => calls.push(o) } } } };
  N.tap(t); N.tap(t + 100); N.tap(t + 300);
  delete global.window;
  assert.equal(calls.length, 2);
});

async function withPlugins(plugins, fn){
  global.window = { Capacitor: { isNativePlatform: () => true, Plugins: plugins } };
  try{ return await fn(); }finally{ delete global.window; }
}

test('writeDocument writes UTF-8 into Documents and creates the folder', async () => {
  const calls = [];
  const ok = await withPlugins({ Filesystem: { writeFile: async o => { calls.push(o); return { uri: 'file:///x' }; } } },
    () => N.writeDocument('ARK Studios/a.json', '{}'));
  assert.equal(ok, true);
  assert.deepEqual(calls, [{ path: 'ARK Studios/a.json', data: '{}', directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }]);
});
test('listDocuments returns file names', async () => {
  const names = await withPlugins({ Filesystem: { readdir: async () => ({ files: [{ name: 'a.json', type: 'file' }, { name: 'b.json' }] }) } },
    () => N.listDocuments('ARK Studios'));
  assert.deepEqual(names, ['a.json', 'b.json']);
});
test('document helpers fail soft', async () => {
  const boom = async () => { throw new Error('EACCES'); };
  assert.equal(await withPlugins({ Filesystem: { writeFile: boom } }, () => N.writeDocument('x', '')), false);
  assert.equal(await withPlugins({ Filesystem: { readdir: boom } }, () => N.listDocuments('x')), null);
  assert.equal(await withPlugins({ Filesystem: { deleteFile: boom } }, () => N.deleteDocument('x')), false);
  assert.equal(await N.writeDocument('x', ''), false);
  assert.equal(await N.listDocuments('x'), null);
});
test('onPause listens for the app going to the background', async () => {
  const events = [];
  await withPlugins({ App: { addListener: e => events.push(e) } }, async () => N.onPause(() => {}));
  assert.deepEqual(events, ['pause']);
});
