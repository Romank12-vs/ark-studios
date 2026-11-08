const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../www/js/core.js');
const v1 = require('./fixtures/v1-state.json');
const v2 = require('./fixtures/v2-state.json');

test('dates', () => {
  assert.equal(C.addDays('2026-02-27', 2), '2026-03-01');
  assert.equal(C.daysLeft(C.todayISO()), 0);
  assert.equal(C.daysLeft(C.addDays(C.todayISO(), 3)), 3);
  assert.equal(C.daysLeft(''), null);
  assert.equal(C.fmtTime('18:30'), '6:30 pm');
  assert.equal(C.fmtTime('09:00'), '9 am');
});

test('durations keep the existing dot-as-colon behaviour', () => {
  assert.equal(C.parseDur('3:45'), 225);
  assert.equal(C.parseDur('2.30'), 150);
  assert.equal(C.parseDur('4'), 240);
  assert.equal(C.fmtDur(225), '3:45');
  assert.equal(C.fmtDur(0), '');
});

test('money and phone', () => {
  assert.equal(C.money(150000), '₹1,50,000');
  assert.equal(C.num('₹45,000'), 45000);
  assert.equal(C.waNumber('98765 43210'), '919876543210');
  assert.equal(C.waNumber('098765 43210'), '919876543210');
  assert.equal(C.waNumber('+44 7700 900123'), '447700900123');
});

test('song progress and totals', () => {
  assert.equal(C.nextIdx({ steps: {} }), 0);
  assert.equal(C.nextIdx({ steps: { final: true, edit: true } }), 2);
  assert.equal(C.nextIdx({ steps: { final: true, edit: true, choreo: true, teach: true, practice: true } }), 5);
  assert.deepEqual(
    C.totals({ charges: [{ amount: 45000 }, { amount: 3500 }], payments: [{ amount: 15000 }] }),
    { total: 48500, paid: 15000, bal: 33500 }
  );
});

test('normalize: empty, v1 migration, v2 kept', () => {
  const e = C.normalize(null);
  assert.equal(e.v, 2);
  assert.deepEqual(e.clients, []);
  assert.equal(e.settings.lang, 'hinglish');

  const a = C.normalize(v1);
  assert.equal(a.settings.templates.update, v1.settings.templates.full);
  assert.equal('finalize' in a.settings.templates, false);

  const b = C.normalize(v2);
  assert.equal(b.clients[0].name, 'Priya & Arjun');
  assert.equal(b.clients[0].charges[0].amount, 45000);
  assert.equal(b.clients[0].performances[0].songs[0].steps.edit, true);
  assert.equal(b.settings.templates.update, 'Custom {client}');
  assert.equal(b.updatedAt, 1762560000000);
});

test('backups: old and new markers restore, junk is rejected', () => {
  assert.equal(C.parseBackup('{"app":"taal","clients":[]}').clients.length, 0);
  assert.equal(C.parseBackup('{"app":"ark-studios","clients":[{"name":"A"}]}').clients[0].name, 'A');
  assert.throws(() => C.parseBackup('hello'), /not-a-backup/);
  assert.throws(() => C.parseBackup('{"clients":"x"}'), /not-a-backup/);
  assert.throws(() => C.parseBackup(''), /not-a-backup/);
  assert.equal(C.backupFileName('2026-11-08'), 'ark-studios-backup-2026-11-08.json');
});

test('next step labels', () => {
  const s = steps => ({ steps });
  assert.equal(C.nextStepKey(s({})), 'final');
  assert.equal(C.nextStepLabel(s({ final: true, edit: true, choreo: true })), 'Teach next');
  assert.equal(C.nextStepDoneLabel(s({ final: true, edit: true, choreo: true })), 'Taught');
  const ready = s({ final: true, edit: true, choreo: true, teach: true, practice: true });
  assert.equal(C.nextStepKey(ready), null);
  assert.equal(C.nextStepLabel(ready), 'Ready');
  assert.equal(C.nextStepDoneLabel(ready), null);
});
