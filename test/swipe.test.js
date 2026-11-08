const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../www/js/swipe.js');

const W = 76;
const d = o => S.swipeDecision({ dx: 0, dy: 0, vx: 0, width: W, open: false, end: false, ...o });

test('small moves do nothing', () => assert.deepEqual(d({ dx: -5, dy: 3 }), { axis: null, offset: 0, state: 'closed' }));
test('vertical drags scroll', () => assert.deepEqual(d({ dx: -30, dy: 40, end: true }), { axis: 'y', offset: 0, state: 'closed' }));
test('diagonal but mostly vertical drags scroll, even on an open row', () =>
  assert.deepEqual(d({ dx: -20, dy: -21, open: true, end: true }), { axis: 'y', offset: -W, state: 'open' }));
test('follows the finger and clamps', () => {
  assert.equal(d({ dx: -30, dy: 5 }).offset, -30);
  assert.equal(d({ dx: -30, dy: 5 }).state, 'moving');
  assert.equal(d({ dx: -200, dy: 5 }).offset, -W);
  assert.equal(d({ dx: 40, dy: 0 }).offset, 0);
});
test('settles open past half or on a flick', () => {
  assert.deepEqual(d({ dx: -50, dy: 5, vx: -0.1, end: true }), { axis: 'x', offset: -W, state: 'open' });
  assert.deepEqual(d({ dx: -20, dy: 2, vx: -0.8, end: true }), { axis: 'x', offset: -W, state: 'open' });
  assert.deepEqual(d({ dx: -20, dy: 2, vx: -0.1, end: true }), { axis: 'x', offset: 0, state: 'closed' });
});
test('an open row closes when swiped right', () => assert.deepEqual(d({ dx: 50, dy: 4, vx: 0.6, open: true, end: true }), { axis: 'x', offset: 0, state: 'closed' }));
test('a cancelled gesture puts the row back where it started', () => {
  assert.deepEqual(d({ dx: -60, dy: 2, vx: -1, end: true, cancel: true }), { axis: null, offset: 0, state: 'closed' });
  assert.deepEqual(d({ dx: 60, dy: 2, vx: 1, end: true, cancel: true, open: true }), { axis: null, offset: -W, state: 'open' });
});
test('no open row: a press may start a drag', () =>
  assert.deepEqual(S.pressPlan({ hasOpen: false, sameRow: false, onAction: false }), { closeNow: false, closeOnTap: false, swallowClick: false, drag: true }));
test('open row: a press elsewhere only closes it', () =>
  assert.deepEqual(S.pressPlan({ hasOpen: true, sameRow: false, onAction: false }), { closeNow: true, closeOnTap: false, swallowClick: true, drag: false }));
test('open row: a tap on its front closes it, a drag still works', () =>
  assert.deepEqual(S.pressPlan({ hasOpen: true, sameRow: true, onAction: false }), { closeNow: false, closeOnTap: true, swallowClick: false, drag: true }));
test('open row: its action button runs normally', () =>
  assert.deepEqual(S.pressPlan({ hasOpen: true, sameRow: true, onAction: true }), { closeNow: false, closeOnTap: false, swallowClick: false, drag: false }));
