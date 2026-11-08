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
