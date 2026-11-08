const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('www/index.html', 'utf8');

const KEYS = ['lastUpdateCheckAt', 'updateDismissedVersion', 'lastAutoBackupAt', 'lastSharedBackupAt', 'backupNudgeSnoozedUntil', 'backupFailDay'];
test('housekeeping settings are stored with quietSave', () => {
  for (const k of KEYS) for (const m of html.matchAll(new RegExp(`\\.${k}=`, 'g'))) {
    const call = /\b(quietSave|save)\(/.exec(html.slice(m.index));
    assert.equal(call && call[1], 'quietSave', `${k} must be stored with quietSave(), not save()`);
  }
});
test('save stamps updatedAt, quietSave does not', () => {
  assert.match(html, /function save\(\)\{state\.updatedAt=Date\.now\(\);quietSave\(\)/);
  assert.doesNotMatch(/function quietSave\(\)\{[^}]*\}/.exec(html)[0], /updatedAt/);
});
