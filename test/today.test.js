const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../www/js/today.js');

const T = '2026-11-08'; // a Sunday
let n = 0;
const id = () => 'id' + (++n);
const client = o => ({ id: id(), name: 'Client', event: '', date: '', status: 'booked', phone: '', createdAt: 0,
  performances: [], rehearsals: [], charges: [], payments: [], ...o });
const reh = o => ({ id: id(), date: T, time: '', mins: 90, place: 'Studio', perfIds: [], status: 'planned', attendance: {}, notes: '', ...o });
const songs = (total, ready) => [{ id: id(), title: 'Group', songs: Array.from({ length: total }, (_, i) => ({
  id: id(), title: 'Song ' + i, steps: i < ready ? { final: true, edit: true, choreo: true, teach: true, practice: true } : {} })) }];
const state = clients => ({ clients });

test('empty state', () => {
  assert.deepEqual(D.todayAgenda(state([]), T), { items: [], next: null });
  assert.deepEqual(D.needsAttention(state([]), T), []);
});

test('agenda: events first, then rehearsals by time, untimed last, cancelled skipped', () => {
  const evening = reh({ time: '18:30' }), untimed = reh({ time: '' }), morning = reh({ time: '09:00' }), off = reh({ time: '07:00', status: 'cancelled' });
  const later = reh({ date: '2026-11-11', time: '10:00' }), sooner = reh({ date: '2026-11-09', time: '15:00' });
  const skipped = reh({ date: '2026-11-09', time: '08:00', status: 'cancelled' });
  const c = client({ name: 'Priya', date: T, rehearsals: [evening, untimed, morning, off, later, sooner, skipped] });
  const a = D.todayAgenda(state([c]), T);
  assert.deepEqual(a.items.map(i => i.kind === 'event' ? 'event' : i.rehearsal.time || 'untimed'), ['event', '09:00', '18:30', 'untimed']);
  assert.equal(a.next.rehearsal, sooner);
  assert.equal(a.next.client, c);
});

test('stale planned rehearsal in the last 14 days', () => {
  const c = client({ name: 'Priya', rehearsals: [reh({ date: '2026-11-03' }), reh({ date: '2026-10-20' }), reh({ date: '2026-11-05', status: 'done' })] });
  const rows = D.needsAttention(state([c]), T);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'rehearsal');
  assert.equal(rows[0].title, "Mark Tuesday's rehearsal done?");
  assert.equal(rows[0].detail, 'Priya');
  assert.equal(rows[0].tone, 'muted');
});

test('events coming up with unready songs', () => {
  const far = client({ event: "Priya's sangeet", date: '2026-11-24', performances: songs(6, 1) });
  const rows = D.needsAttention(state([far]), T);
  assert.deepEqual(rows.map(r => [r.kind, r.title, r.detail, r.tone]), [['songs', "Priya's sangeet · 16 days", '5 songs not ready', 'gold']]);
  const near = client({ name: 'Neha', date: '2026-11-12', performances: songs(2, 1) });
  assert.deepEqual(D.needsAttention(state([near]), T).map(r => [r.title, r.detail, r.tone]), [['Neha · 4 days', '1 song not ready', 'warn']]);
  assert.equal(D.needsAttention(state([client({ date: '2026-11-12' })]), T).length, 0); // no songs
  assert.equal(D.needsAttention(state([client({ performances: songs(3, 0) })]), T).length, 0); // no date
});

test('balances due', () => {
  const pay = (total, paid) => ({ charges: [{ id: id(), label: 'Package', amount: total }], payments: paid ? [{ id: id(), date: T, amount: paid, mode: 'UPI', note: '' }] : [] });
  const done = client({ name: 'Sneha', status: 'done', date: '2026-10-01', ...pay(25000, 0) });
  assert.deepEqual(D.needsAttention(state([done]), T).map(r => [r.kind, r.title, r.detail, r.tone]), [['due', 'Sneha', '₹25,000 due', 'warn']]);
  assert.equal(D.needsAttention(state([client({ date: '2026-12-08', ...pay(30000, 0) })]), T).length, 0);
  assert.equal(D.needsAttention(state([client({ date: '2026-11-06', ...pay(30000, 10000) })]), T)[0].detail, '₹20,000 due');
  assert.equal(D.needsAttention(state([client({ date: '2026-11-06', ...pay(30000, 30000) })]), T).length, 0);
});

test('open enquiries: dated soonest first, undated last, past ones skipped', () => {
  const undated = client({ name: 'Undated', status: 'enquiry' });
  const dated = client({ name: 'Dated', status: 'enquiry', date: '2026-12-20' });
  const past = client({ name: 'Past', status: 'enquiry', date: '2026-10-01' });
  const rows = D.needsAttention(state([undated, past, dated]), T);
  assert.deepEqual(rows.map(r => [r.kind, r.title, r.detail, r.tone]), [['enquiry', 'Dated', 'Enquiry · follow up', 'gold'], ['enquiry', 'Undated', 'Enquiry · follow up', 'gold']]);
});

test('groups in order, at most five rows', () => {
  const stale = client({ name: 'S', rehearsals: [reh({ date: '2026-11-02' }), reh({ date: '2026-11-04' })] });
  const songA = client({ name: 'A', date: '2026-11-10', performances: songs(1, 0) });
  const songB = client({ name: 'B', date: '2026-11-11', performances: songs(1, 0) });
  const dueA = client({ name: 'DA', status: 'done', charges: [{ id: id(), label: 'x', amount: 100 }] });
  const dueB = client({ name: 'DB', status: 'done', charges: [{ id: id(), label: 'x', amount: 200 }] });
  const enqA = client({ name: 'EA', status: 'enquiry' }), enqB = client({ name: 'EB', status: 'enquiry' });
  const rows = D.needsAttention(state([enqA, dueA, songB, stale, enqB, dueB, songA]), T);
  assert.deepEqual(rows.map(r => r.kind), ['rehearsal', 'rehearsal', 'songs', 'songs', 'due']);
  assert.deepEqual(rows.slice(0, 4).map(r => r.title.startsWith('Mark') ? r.rehearsalId && 'reh' : r.title), ['reh', 'reh', 'A · 2 days', 'B · 3 days']);
});

test('cancelled clients never appear', () => {
  const c = client({ status: 'cancelled', date: T, performances: songs(2, 0), rehearsals: [reh({ time: '10:00' }), reh({ date: '2026-11-03' })],
    charges: [{ id: id(), label: 'x', amount: 500 }] });
  assert.deepEqual(D.todayAgenda(state([c]), T), { items: [], next: null });
  assert.deepEqual(D.needsAttention(state([c]), T), []);
});

test('song warnings start three weeks out', () => {
  const at = date => D.needsAttention(state([client({ date, performances: songs(1, 0) })]), T).length;
  assert.equal(at('2026-11-29'), 1); // 21 days
  assert.equal(at('2026-11-30'), 0); // 22 days
});
