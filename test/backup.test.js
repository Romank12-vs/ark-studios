const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../www/js/backup.js');

const NOW = Date.UTC(2026, 10, 8, 12), DAY = 864e5, T = '2026-11-08';
const state = o => ({ clients: [{ id: 'c1', name: 'Priya' }], updatedAt: NOW,
  settings: { lastAutoBackupAt: 0, lastSharedBackupAt: 0, backupNudgeSnoozedUntil: 0 }, ...o });
const nameOf = iso => 'ark-studios-backup-' + iso + '.json';
const days = (from, n) => Array.from({ length: n }, (_, i) => nameOf(new Date(Date.parse(from) + i * DAY).toISOString().slice(0, 10)));
function fakeFs(files = [], refuse = []) {
  const fs = { files: [...files], texts: {}, log: [] };
  fs.write = async (name, text) => {
    fs.log.push(['write', name]);
    if (refuse.includes(name)) return false;
    if (!fs.files.includes(name)) fs.files.push(name);
    fs.texts[name] = text;
    return true;
  };
  fs.list = async () => { fs.log.push(['list', '']); return [...fs.files]; };
  fs.remove = async name => { fs.log.push(['remove', name]); fs.files = fs.files.filter(f => f !== name); return true; };
  return fs;
}

test('needs a backup only after a change, and only with clients', () => {
  assert.equal(B.needsAutoBackup(state()), true);
  assert.equal(B.needsAutoBackup(state({ settings: { lastAutoBackupAt: NOW } })), false);
  assert.equal(B.needsAutoBackup(state({ clients: [] })), false);
});
test('prunable keeps the newest 14 backups and ignores other files', () => {
  const names = [...days('2026-10-24', 16), 'ark-studios-backup-2026-11-08-2.json', 'notes.txt'];
  assert.deepEqual(B.prunable(names).sort(), ['ark-studios-backup-2026-10-24.json', 'ark-studios-backup-2026-10-25.json', 'ark-studios-backup-2026-10-26.json']);
  assert.deepEqual(B.prunable(days('2026-11-01', 5)), []);
});
test('weekly nudge', () => {
  const s = (o, c) => state({ clients: c === undefined ? [{}] : c, settings: { lastSharedBackupAt: 0, backupNudgeSnoozedUntil: 0, ...o } });
  assert.equal(B.nudgeDue(s({}), NOW), true);                                  // never shared: right away
  assert.equal(B.nudgeDue(s({}, []), NOW), false);                             // no data
  assert.equal(B.nudgeDue(s({ lastSharedBackupAt: NOW - 6 * DAY }), NOW), false);
  assert.equal(B.nudgeDue(s({ lastSharedBackupAt: NOW - 8 * DAY }), NOW), true);
  assert.equal(B.nudgeDue(s({ backupNudgeSnoozedUntil: NOW + DAY }), NOW), false);
});
test('autoBackup writes today’s file and keeps 14', async () => {
  const fs = fakeFs(days('2026-10-24', 15));
  assert.deepEqual(await B.autoBackup({ state: state(), now: NOW, today: T, fs }), { ok: true, at: NOW, name: 'ark-studios-backup-2026-11-08.json' });
  assert.equal(JSON.parse(fs.texts['ark-studios-backup-2026-11-08.json']).app, 'ark-studios');
  assert.equal(fs.files.filter(B.isBackupName).length, 14);
});
test('autoBackup falls back when today’s file can’t be overwritten', async () => {
  const fs = fakeFs([], ['ark-studios-backup-2026-11-08.json']);
  assert.equal((await B.autoBackup({ state: state(), now: NOW, today: T, fs })).name, 'ark-studios-backup-2026-11-08-2.json');
});
test('autoBackup reports a failed write and touches nothing else', async () => {
  const fs = fakeFs([], ['ark-studios-backup-2026-11-08.json', 'ark-studios-backup-2026-11-08-2.json']);
  assert.deepEqual(await B.autoBackup({ state: state(), now: NOW, today: T, fs }), { ok: false, at: NOW, name: null });
  assert.equal(fs.log.some(([op]) => op !== 'write'), false);
});
test('autoBackup does nothing when nothing changed or there is no data', async () => {
  const fs = fakeFs();
  assert.equal(await B.autoBackup({ state: state({ settings: { lastAutoBackupAt: NOW } }), now: NOW, today: T, fs }), null);
  assert.equal(await B.autoBackup({ state: state({ clients: [] }), now: NOW, today: T, fs }), null);
  assert.deepEqual(fs.log, []);
});
test('a failing folder listing never fails the backup', async () => {
  const fs = fakeFs(); fs.list = async () => null;
  assert.equal((await B.autoBackup({ state: state(), now: NOW, today: T, fs })).ok, true);
});
