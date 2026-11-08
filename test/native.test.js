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
  N.tap();
  delete global.window;
  assert.deepEqual(calls, [{ style: 'LIGHT' }]);
});

test('tap falls back to vibrate on the web and never throws', () => {
  const calls = [];
  const original = globalThis.navigator;
  global.window = {};
  setNavigator({ vibrate: ms => calls.push(ms) });
  N.tap();
  delete global.window;
  setNavigator(original);
  assert.deepEqual(calls, [10]);
  assert.doesNotThrow(() => N.tap());
});
