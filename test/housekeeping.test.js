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

test('closing a sheet puts the page back where it was (the iPhone keyboard scrolls it)', () => {
  const open = /function openSheet\([^)]*\)\{[\s\S]*?\n\}/.exec(html)[0];
  assert.match(open, /if\(!sheet\.open\)\{sheetY=window\.scrollY;navs0=navs;sheet\.showModal\(\)\}/);
  assert.match(html, /sheet\.addEventListener\('close',\(\)=>\{[^}]*restoreScroll\(\)/);
  assert.match(html, /if\(scroll\)\{navs\+\+;window\.scrollTo\(0,0\)\}/, 'moving to another screen must win over the restore');
});

test('Add performance sits at the top of a filled Songs tab, and a new one is scrolled into view', () => {
  const tab = /function songsTab\(c\)\{[\s\S]*?\n\}/.exec(html)[0];
  assert.equal((tab.match(/data-act="newPerf"/g) || []).length, 2, 'one button at the top, one at the end');
  // revealPerf must run after closeSheet: it retargets the scroll that the sheet's close event restores.
  assert.match(html, /save\(\);closeSheet\(\);render\(false\);if\(np\) revealPerf\(np\)/);
});
