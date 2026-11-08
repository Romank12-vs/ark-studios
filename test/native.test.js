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
