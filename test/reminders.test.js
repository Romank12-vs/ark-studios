const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../www/js/reminders.js');

const NOW = new Date(2026, 10, 8, 8, 0).getTime(); // Sunday 8 Nov 2026, 08:00 local
const at = (d, h, m) => new Date(2026, 10, d, h, m).getTime();
const T = '2026-11-08';
let n = 0;
const id = () => 'id' + (++n);
const client = o => ({ id: id(), name: 'Client', event: '', date: '', status: 'booked', phone: '', createdAt: 0, venue: '',
  performances: [], rehearsals: [], charges: [], payments: [], ...o });
const reh = o => ({ id: id(), date: T, time: '', mins: 90, place: 'Studio', perfIds: [], status: 'planned', attendance: {}, notes: '', ...o });
const songs = (total, ready) => [{ id: id(), title: 'Group', songs: Array.from({ length: total }, (_, i) => ({
  id: id(), title: 'Song ' + i, steps: i < ready ? { final: true, edit: true, choreo: true, teach: true, practice: true } : {} })) }];
const perf = (pid, title) => ({ id: pid, title, performers: [], songs: [] });
const settings = o => ({ rehearsal: false, leadMins: 60, digest: false, digestTime: '09:00', ...o });
const state = (clients, rem) => ({ clients, settings: { reminders: settings(rem) } });

test('nothing when both reminders are off', () => {
  const c = client({ rehearsals: [reh({ time: '18:30' })], date: T });
  assert.deepEqual(R.planNotifications(state([c], {}), NOW), []);
});

test('rehearsal reminder at start minus lead time', () => {
  const c = client({ name: 'Priya & Arjun', performances: [perf('p1', 'Cousins group')] });
  const r = reh({ date: '2026-11-08', time: '18:30', place: 'Studio', perfIds: ['p1'] });
  c.rehearsals = [r];
  const plan = R.planNotifications(state([c], { rehearsal: true, leadMins: 60 }), NOW);
  assert.deepEqual(plan, [{ id: R.rehearsalNotifId(c.id, r.id), at: at(8, 17, 30), title: '6:30 pm rehearsal · Priya & Arjun',
    body: 'Cousins group · Studio', extra: { kind: 'rehearsal', clientId: c.id, rehearsalId: r.id } }]);
});

test('skips past, untimed, done, cancelled and out-of-range rehearsals', () => {
  const past = reh({ date: '2026-11-08', time: '08:30' });
  const untimed = reh({ date: '2026-11-09', time: '' });
  const done = reh({ date: '2026-11-09', time: '10:00', status: 'done' });
  const off = reh({ date: '2026-11-09', time: '11:00', status: 'cancelled' });
  const far = reh({ date: '2026-11-22', time: '18:00' });
  const ok = reh({ date: '2026-11-21', time: '18:00' });
  const c = client({ rehearsals: [past, untimed, done, off, far, ok] });
  const gone = client({ status: 'cancelled', rehearsals: [reh({ date: '2026-11-09', time: '12:00' })] });
  const plan = R.planNotifications(state([c, gone], { rehearsal: true }), NOW);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].at, at(21, 17, 0));
});

test('venue rehearsals show the venue', () => {
  const c = client({ venue: 'The Grand', rehearsals: [reh({ date: '2026-11-09', time: '10:00', place: 'Venue' })] });
  const plan = R.planNotifications(state([c], { rehearsal: true }), NOW);
  assert.equal(plan[0].body, 'All performances · The Grand');
});

test('summary: one rehearsal, many rehearsals, untimed', () => {
  const one = client({ name: 'Priya & Arjun', rehearsals: [reh({ time: '18:30' })] });
  assert.equal(R.summaryFor(state([one], {}), T), '6:30 pm rehearsal with Priya & Arjun');
  const two = client({ name: 'Priya & Arjun', rehearsals: [reh({ time: '18:30' }), reh({ time: '10:00' })] });
  assert.equal(R.summaryFor(state([two], {}), T), '2 rehearsals today');
  const untimed = client({ name: 'Priya & Arjun', rehearsals: [reh({ time: '' })] });
  assert.equal(R.summaryFor(state([untimed], {}), T), 'Rehearsal with Priya & Arjun');
});

test('summary: events within 7 days with songs not ready', () => {
  const mk = date => client({ event: 'Priya’s sangeet', date, performances: songs(3, 1) });
  assert.equal(R.summaryFor(state([mk('2026-11-11')], {}), T), 'Priya’s sangeet in 3 days, 2 songs not ready');
  assert.equal(R.summaryFor(state([mk('2026-11-09')], {}), T), 'Priya’s sangeet tomorrow, 2 songs not ready');
  assert.equal(R.summaryFor(state([mk('2026-11-08')], {}), T), 'Priya’s sangeet today, 2 songs not ready');
  assert.equal(R.summaryFor(state([mk('2026-11-16')], {}), T), '');
});

test('summary: balances due on events within 3 days or past', () => {
  const done = client({ name: 'Mehta family', status: 'done', date: '2026-10-20', charges: [{ amount: 30000 }] });
  assert.equal(R.summaryFor(state([done], {}), T), '₹30,000 due from Mehta family');
  const booked = client({ name: 'Shah', date: '2026-11-11', charges: [{ amount: 10000 }] });
  const enq = client({ name: 'Rao', status: 'enquiry', date: '2026-11-12', charges: [{ amount: 5000 }] });
  const nodate = client({ name: 'Nodate', charges: [{ amount: 5000 }] });
  assert.equal(R.summaryFor(state([done, booked, enq, nodate], {}), T), '₹40,000 due from 2 clients');
});

test('summary joins three items and counts the rest', () => {
  const a = client({ name: 'A', rehearsals: [reh({ time: '10:00' }), reh({ time: '12:00' })], date: '2026-11-11', performances: songs(3, 1) });
  const b = client({ name: 'B', date: '2026-11-13', performances: songs(2, 1) });
  const d = client({ name: 'Mehta', status: 'done', date: '2026-10-20', charges: [{ amount: 100 }] });
  assert.equal(R.summaryFor(state([a, b, d], {}), T),
    '2 rehearsals today · A in 3 days, 2 songs not ready · B in 5 days, 1 song not ready · +1 more');
});

test('morning summary only on days with something to report', () => {
  const c = client({ name: 'Priya & Arjun', rehearsals: [reh({ date: '2026-11-10', time: '18:00' })] });
  const plan = R.planNotifications(state([c], { digest: true, digestTime: '09:00' }), NOW);
  assert.deepEqual(plan, [{ id: 20261110, at: at(10, 9, 0), title: 'Today · Tue, 10 Nov', body: '6 pm rehearsal with Priya & Arjun', extra: { kind: 'summary', date: '2026-11-10' } }]);
});

test('today’s summary is skipped once its time has passed', () => {
  const c = client({ name: 'P', rehearsals: [reh({ date: T, time: '18:00' }), reh({ date: '2026-11-09', time: '18:00' })] });
  const plan = R.planNotifications(state([c], { digest: true, digestTime: '07:30' }), NOW);
  assert.deepEqual(plan.map(p => p.id), [20261109]);
});

test('an invalid summary time never breaks the plan', () => {
  const r = reh({ date: '2026-11-09', time: '18:00' });
  const c = client({ name: 'P', rehearsals: [r] });
  const plan = R.planNotifications(state([c], { rehearsal: true, digest: true, digestTime: '25:99' }), NOW);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].extra.kind, 'rehearsal');
  assert.ok(plan.every(p => Number.isFinite(p.at)));
});

test('a balance due on a past event is in every morning’s summary', () => {
  const c = client({ name: 'Mehta', status: 'done', date: '2026-10-20', charges: [{ amount: 100 }] });
  const plan = R.planNotifications(state([c], { digest: true, digestTime: '09:00' }), NOW);
  assert.equal(plan.length, 14);
  assert.equal(plan[0].id, 20261108);
  assert.equal(plan[13].id, 20261121);
});

test('never more than 64, soonest first', () => {
  const rs = [];
  for (let d = 8; d <= 21; d++) for (let h = 10; h < 15; h++) rs.push(reh({ date: '2026-11-' + String(d).padStart(2, '0'), time: h + ':00' }));
  const c = client({ rehearsals: rs });
  const plan = R.planNotifications(state([c], { rehearsal: true, leadMins: 30 }), NOW);
  assert.equal(plan.length, 64);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i].at >= plan[i - 1].at);
});

test('ids are stable and never collide across kinds', () => {
  const a = R.rehearsalNotifId('c1', 'r1');
  assert.equal(a, R.rehearsalNotifId('c1', 'r1'));
  assert.notEqual(a, R.rehearsalNotifId('c1', 'r2'));
  assert.ok(Number.isInteger(a) && a >= 1e8 && a < 2e9);
  assert.equal(R.summaryNotifId('2026-11-08'), 20261108);
});
