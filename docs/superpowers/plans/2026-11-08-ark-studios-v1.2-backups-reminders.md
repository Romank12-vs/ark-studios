# ARK Studios v1.2 (backups and reminders) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Android app saves a daily backup file to `Documents/ARK Studios`, nudges once a week to send a backup off the phone, and sends rehearsal reminders and a morning summary. It also fixes the v1.1 leftovers.

**Architecture:** Two new classic-script modules follow the existing split between a pure *planning* part and a thin *effect* part. `www/js/backup.js` holds the backup policy plus a writer that takes an injected file adapter. `www/js/reminders.js` holds the notification planner. `www/js/native.js` stays the only file that touches Capacitor and gains Documents file helpers, `onPause` and a `notifications` wrapper over `@capacitor/local-notifications`. `www/index.html` wires them to the app's lifecycle, adds the Today banner and Settings → Reminders, and stores housekeeping fields with a new `quietSave()` that leaves `state.updatedAt` alone.

**Tech Stack:** Vanilla JS without a bundler, the Node 22+ built-in test runner, Capacitor 8.6.0 with `@capacitor/filesystem` 8.1.5, `@capacitor/share` 8.0.3, `@capacitor/app` 8.1.2, and the new `@capacitor/local-notifications` **8.3.1**.

**Spec:** `docs/superpowers/specs/2026-11-08-ark-studios-android-app-design.md`, sections 6.1 and 6.2. Both are labelled "v1.1" there and ship as v1.2 (see the Releases row in section 3).

## Global Constraints

- Backup folder `Documents/ARK Studios`. File name `ark-studios-backup-YYYY-MM-DD.json` (existing `backupFileName`). Keep the newest **14**. The file holds the same JSON as "Save backup file": `{"app":"ark-studios", ...state}`.
- The weekly nudge appears when there are clients and `lastSharedBackupAt` is more than **7 days** old. **Never shared counts as due**, so it appears on the first launch of v1.2 (owner's choice). **Later** snoozes it for 7 days.
- Reminders: at most **64** notifications covering the next **14 days**. Lead times are 30 min, 1 hr and 2 hr. Defaults: `{rehearsal: false, leadMins: 60, digest: false, digestTime: '09:00'}`. Alarms are exact and allow-while-idle. Declare `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM`.
- Copy is fixed by the spec. The banner reads "Send this week’s backup to Google Drive or WhatsApp?". The failure toast reads "Auto-backup failed. Save a backup from Settings." (at most once a day). A rehearsal notification has the title "6:30 pm rehearsal · Priya & Arjun" and the body "Cousins group · Studio". On the web, Settings shows "Reminders work in the Android app."
- Notification permission is requested only when the owner turns a reminder on. Background re-planning must never open a permission prompt or a settings screen.
- Housekeeping fields (`lastUpdateCheckAt`, `updateDismissedVersion`, `lastAutoBackupAt`, `lastSharedBackupAt`, `backupNudgeSnoozedUntil`, `backupFailDay`) are stored with `quietSave()`, never `save()`. Otherwise every resume would look like a data change.
- `localStorage` key `taal-v2` and `state.v = 2` stay unchanged. User data must never be lost. A backup never overwrites a file with an empty state.
- Exact pinned versions only. Fonts and scripts stay local, and every new startup file goes into `SHELL` in `www/sw.js`.
- Copy style: sentence case, curly apostrophes (’), and "·" as the separator, as in v1.1.
- Work on branch `v1.2-backups-reminders`. Commits use the repo-local identity and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Run gh as `GH_TOKEN="$(gh auth token --user Romank12-vs)" gh …`. Prepend `/c/Program Files/nodejs` to PATH in Git Bash.
- Never write the owner's employer name into any file or commit. The executor gets it from session memory as `WORK_ORG` and checks before any push (Task 11).
- Nothing is pushed to `main`, merged or tagged without the owner's explicit go-ahead.

## Review Focus

1. **A wipe or a near-empty state overwriting today's good backup.** After "Delete all data" the app is backgrounded. Today's file must keep the last real data. → Task 5: `autoBackup` skips states with no clients.
2. **The day of a reinstall.** Today's file exists but belongs to the uninstalled copy, and Android refuses to overwrite it. The backup must still be written. → Task 5: falls back to `…-YYYY-MM-DD-2.json`.
3. **Reminders that look on but can never fire.** This happens when a backup restored on a new phone has the switches on, or when notifications are blocked later in Android settings. The switches must turn off with a toast, never stay on silently. → Task 10: `syncAction` tests.
4. **Housekeeping marking data as changed.** The update check, "Not now", backup stamps and the nudge must not bump `updatedAt`. If they did, backups would run on every resume and could feed back into themselves. → Task 1: guard test over `index.html`.
5. **Tapping an old notification for a rehearsal or client that was since deleted.** The app must open the client, or Today, without crashing. → Task 10: `tapTarget` tests.

Known platform limit, not fixed: on Android 11 and later, the app only sees backup files that its current install created. After a reinstall, the older files stay in the folder but are not pruned. The owner can delete them in the Files app. Task 11 notes this in `HOW-TO-INSTALL.md`.

---

### Task 1: Quiet save and v1.2 settings

**Files:**
- Modify: `www/js/core.js`, `www/index.html` (persistence, `dismissUpdate`, `maybeCheckUpdate`, core import line)
- Test: `test/core.test.js`, create `test/housekeeping.test.js`

**Interfaces:**
- Produces: `TaalCore.LEAD_CHOICES = [30, 60, 120]`. `blank().settings` gains `reminders: {rehearsal:false, leadMins:60, digest:false, digestTime:'09:00'}` (a new object each call), `lastAutoBackupAt: 0`, `lastSharedBackupAt: 0` and `backupNudgeSnoozedUntil: 0`.
- Produces (in `index.html`): `quietSave(): void` writes `state` to `taal-v2` without touching `updatedAt`. `save(): void` is `state.updatedAt=Date.now();quietSave()`, and Task 10 appends to it.

- [ ] **Step 1: Create the branch and commit this plan**

Run: `git switch -c v1.2-backups-reminders && git add docs/superpowers/plans/2026-11-08-ark-studios-v1.2-backups-reminders.md && git commit -m "Add v1.2 (backups and reminders) implementation plan"`
Expected: `git branch --show-current` prints `v1.2-backups-reminders`.

- [ ] **Step 2: Write the failing tests**

In `test/core.test.js`:

```js
test('v1.2 settings defaults', () => {
  const s = C.blank().settings;
  assert.deepEqual(s.reminders, { rehearsal: false, leadMins: 60, digest: false, digestTime: '09:00' });
  assert.notEqual(s.reminders, C.blank().settings.reminders);
  assert.equal(s.lastAutoBackupAt, 0);
  assert.equal(s.lastSharedBackupAt, 0);
  assert.equal(s.backupNudgeSnoozedUntil, 0);
  assert.deepEqual(C.LEAD_CHOICES, [30, 60, 120]);
});

test('normalize repairs reminder settings', () => {
  const r = rem => C.normalize({ clients: [], settings: { reminders: rem } }).settings.reminders;
  const def = { rehearsal: false, leadMins: 60, digest: false, digestTime: '09:00' };
  assert.deepEqual(r(undefined), def);
  assert.deepEqual(r({ rehearsal: true, leadMins: 120 }), { ...def, rehearsal: true, leadMins: 120 });
  assert.deepEqual(r({ rehearsal: 'yes', leadMins: 45, digest: true, digestTime: '9am' }), { ...def, digest: true });
  assert.deepEqual(C.normalize(v2).settings.reminders, def);
});
```

Create `test/housekeeping.test.js`. It reads `www/index.html` and holds its own key list:

```js
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
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm test`
Expected: FAIL. The defaults are missing, `LEAD_CHOICES` is undefined, and `updateDismissedVersion must be stored with quietSave()`.

- [ ] **Step 4: Implement**

- In `core.js`, `normalize()` builds `reminders` from the defaults. `rehearsal` and `digest` are true only when `=== true`. `leadMins` must be in `LEAD_CHOICES`, and `digestTime` must match `/^\d{2}:\d{2}$/`. Otherwise each falls back to its default.
- Export `LEAD_CHOICES` and add it to the `window.TaalCore` destructuring in `index.html`. The existing test `index.html imports every core helper` requires this.
- In `index.html`, split `save()` into `save()` and `quietSave()`. `dismissUpdate` and `maybeCheckUpdate` use `quietSave()`.

- [ ] **Step 5: Run to verify they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 6: Commit**

`git commit -am "Quiet save for housekeeping settings, v1.2 reminder defaults"` (also `git add test/housekeeping.test.js`).

---

### Task 2: Swipe rows: tap elsewhere only closes, cancel restores

**Files:**
- Modify: `www/js/swipe.js`
- Test: `test/swipe.test.js`

**Interfaces:**
- Produces: `swipeDecision({..., cancel})`. When `cancel` is true it returns the starting position `{axis: null, offset: open ? -width : 0, state: open ? 'open' : 'closed'}`.
- Produces: `pressPlan({hasOpen, sameRow, onAction}) -> {closeNow, closeOnTap, swallowClick, drag}`.

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/swipe.test.js`
Expected: FAIL with `S.pressPlan is not a function`, and the cancel case returns the moved offset.

- [ ] **Step 3: Implement and wire into `attachSwipe`**

- `pointerdown`: first reset `swallowClick = false`. Then compute `pressPlan` with `hasOpen = openRow && openRow.isConnected`, `sameRow = row === openRow` and `onAction = !!e.target.closest('.swipe-act')`. If `closeNow`, close the row and set `swallowClick` from the plan. Start a drag only when `plan.drag && row`, and record `closeOnTap` on the drag.
- `finish`: on `pointercancel`, call `place(d.row, d.open ? -d.width : 0, true)`, leave `openRow` as it was, and return. When the gesture never locked to the x axis (a tap) and `d.closeOnTap` is set, call `close()` and set `swallowUntil = performance.now() + 350`.
- Click capture: swallow the click when `swallowClick` is set or `now < swallowUntil`, then clear both.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "Swipe rows: tapping elsewhere only closes the open row; cancel restores it"`

---

### Task 3: One buzz per tick, Undo after ✓, receipt for the right payment

**Files:**
- Modify: `www/js/native.js`, `www/js/core.js`, `www/index.html` (`stepNext`, `msgVars`, `payTab` Receipt swipe, `compose`, `savePay`, core import)
- Test: `test/native.test.js`, `test/core.test.js`

**Interfaces:**
- Produces: `ArkNative.tap(now = Date.now())`. It ignores a call that comes `0 ≤ now − lastBuzz < 150` ms after the previous buzz.
- Produces: `TaalCore.receiptPayment(client, paymentId) -> payment|null`. It returns the payment with that id, otherwise the latest by date (on a tie, the one later in the array), and `null` when there are no payments.

- [ ] **Step 1: Write the failing tests**

```js
// native.test.js
test('a second tap within 150 ms does not buzz again', () => {
  const calls = [], t = 3e13;
  global.window = { Capacitor: { isNativePlatform: () => true, Plugins: { Haptics: { impact: o => calls.push(o) } } } };
  N.tap(t); N.tap(t + 100); N.tap(t + 300);
  delete global.window;
  assert.equal(calls.length, 2);
});
// core.test.js
test('receipt uses the chosen payment, else the latest', () => {
  const c = { payments: [{ id: 'a', date: '2026-11-01' }, { id: 'b', date: '2026-11-05' }, { id: 'c', date: '2026-11-05' }] };
  assert.equal(C.receiptPayment(c, 'a').id, 'a');
  assert.equal(C.receiptPayment(c).id, 'c');
  assert.equal(C.receiptPayment(c, 'gone').id, 'c');
  assert.equal(C.receiptPayment({ payments: [] }), null);
});
```

The two existing tap tests run within 150 ms of each other, so the dedupe would swallow the second one. Give them explicit, far-apart times (`N.tap(1e13)` and `N.tap(2e13)`). Times later than the last buzz still count, and `Date.now()` calls after these tests fall below `lastBuzz`, so the `0 ≤` guard lets them through.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL. There are three buzzes instead of two, and `C.receiptPayment is not a function`.

- [ ] **Step 3: Implement**

- `tap` dedupe in `native.js`. A swipe ✓ calls `tap` from `attachSwipe`'s `onAction` and again from `stepNext`, which now buzzes once.
- `receiptPayment` in `core.js`, imported in `index.html`. `msgVars` takes `last` from `receiptPayment(c, ctx.xid)`.
- The Receipt swipe button gets `data-x="${x.id}"`. `case 'compose'` adds `xid: b.dataset.x||null` to `ui.compose`.
- `savePay` builds the new payment object first, so the "Send receipt" toast passes `xid` of the payment just recorded.
- `stepNext`: take `const sn=snap()` before ticking and pass `sn` to both of its toasts. That gives an Undo button through the existing `toast(text, snapshot)`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "One buzz per tick, Undo after ticking, receipts for the chosen payment"`

---

### Task 4: Layout and cleanup leftovers

**Files:**
- Modify: `www/css/app.css`, `www/index.html` (`composer`, `tplSheet`, input handler, `scheduleView` back button), `scripts/fetch-fonts.js` (line endings only)
- Test: `test/style.test.js`, `test/actions.test.js`

**Interfaces:**
- Produces: CSS token `--topbar-h: 60px`, used by `.topbar{min-height}` and `.segbar{top}`. Produces `fitText(el): void` in `index.html`, which sets a textarea's height to its `scrollHeight`.

- [ ] **Step 1: Write the failing tests**

```js
// style.test.js
test('segbar sits right under the 60 px top bar', () => {
  assert.match(css(), /--topbar-h:\s*60px/);
  assert.match(css(), /\.topbar\{[^}]*min-height:var\(--topbar-h\)/);
  assert.match(css(), /\.segbar\{[^}]*top:calc\(var\(--safe-top\) \+ var\(--topbar-h\)\)/);
});
test('no styles left for removed elements', () => {
  for (const re of [/\.b-due\b/, /\.eq i\.full/, /\.stage\b/, /\.hero \.btns/, /\.song(?![\w-])/, /\.x(?![\w-])/]) assert.doesNotMatch(css(), re);
});
// actions.test.js
test('a back button that shows a word is named by it', () => {
  assert.doesNotMatch(html, /aria-label="[^"]*">\$\{ic\('back'\)\}[A-Za-z]/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL on all three.

- [ ] **Step 3: Implement**

- CSS: add the token next to the other `:root` tokens, use it in `.topbar` and `.segbar`, and delete the dead rules. That also means removing `.x` from the shared 44 px tap-target selector lists.
- Schedule back button: drop `aria-label="Back"` and add class `back-btn`, as on the client page.
- `fitText`: call it on `#msg` right after `composer()` opens its sheet, and on the `[data-tpl]` textarea after `tplSheet()`. The `input` handler uses it for both.
- Line endings: rewrite `scripts/fetch-fonts.js` with LF only (`node -e "const f='scripts/fetch-fonts.js';require('fs').writeFileSync(f,require('fs').readFileSync(f,'utf8').replace(/\r\n?/g,'\n'))"`), then `git add --renormalize scripts/fetch-fonts.js`.

- [ ] **Step 4: Verify**

Run: `npm test` and `git ls-files --eol scripts/fetch-fonts.js`
Expected: PASS, and the index column reads `i/lf`.

Browser check (`npm run serve`, 360 × 780, sample data). On a client page, `document.querySelector('.topbar').getBoundingClientRect().height` is 60. After scrolling, the segbar's top edge equals the top bar's bottom edge. The update message for "Priya & Arjun" opens with no inner scroll in the card: `msg.scrollHeight <= msg.clientHeight + 1`.

- [ ] **Step 5: Commit**

`git commit -am "Segbar under the top bar, message card fits its text, drop dead styles, LF endings"`

---

### Task 5: `backup.js`: backup policy and writer

**Files:**
- Create: `www/js/backup.js` (exposed as `window.ArkBackup`, which requires `./core.js` under Node)
- Test: create `test/backup.test.js`

**Interfaces:**
- Consumes: `TaalCore.backupFileName(iso)`, `TaalCore.BACKUP_MARKER`.
- Produces:
  - `BACKUP_DIR = 'ARK Studios'`, `KEEP = 14`, `NUDGE_MS = 7 * 864e5`
  - `backupText(state) -> string`, equal to `JSON.stringify({app: BACKUP_MARKER, ...state}, null, 1)`
  - `needsAutoBackup(state) -> boolean`: there are clients and `updatedAt > settings.lastAutoBackupAt`
  - `isBackupName(name) -> boolean`, matching `/^ark-studios-backup-\d{4}-\d{2}-\d{2}(-\d+)?\.json$/`
  - `prunable(names, keep = KEEP) -> string[]`: backup names beyond the newest `keep`, ordered by date and then suffix; other names are ignored
  - `nudgeDue(state, now) -> boolean`
  - `writeBackup({state, today, fs}) -> Promise<string|null>`: writes `backupFileName(today)` and falls back to `ark-studios-backup-<today>-2.json`. Pruning runs only after a successful write and never fails the result. Returns the name written, or `null`.
  - `autoBackup({state, now, today, fs}) -> Promise<null | {ok, at, name}>`: returns `null` when `!needsAutoBackup(state)` (no file calls). Otherwise `{ok: !!name, at: now, name}`.
  - `fsFor(native) -> fs`. The `fs` adapter is `{write(name, text): Promise<boolean>, list(): Promise<string[]|null>, remove(name): Promise<boolean>}`, built on `native.writeDocument(BACKUP_DIR + '/' + name, text)`, `native.listDocuments(BACKUP_DIR)` and `native.deleteDocument(BACKUP_DIR + '/' + name)` (Task 6).

- [ ] **Step 1: Write the failing tests**

Fixtures: `NOW = Date.UTC(2026, 10, 8, 12)`, `DAY = 864e5`, `T = '2026-11-08'`. A `state(o)` helper builds `{clients: [{id: 'c1', name: 'Priya'}], updatedAt: NOW, settings: {lastAutoBackupAt: 0, lastSharedBackupAt: 0, backupNudgeSnoozedUntil: 0}, ...o}`. A fake fs `fakeFs(files = [], refuse = [])` keeps a `files` array, a `texts` map from name to written text, and a `log` of `['write'|'list'|'remove', name]`. Its `write` returns `false` for names in `refuse`. A `days(from, n)` helper builds daily backup names.

```js
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/backup.test.js`
Expected: FAIL with `Cannot find module '../www/js/backup.js'`.

- [ ] **Step 3: Implement `www/js/backup.js`**

Use the same module wrapper as `today.js`. `prunable` sorts newest first by date string, then by numeric suffix (`-2` before no suffix on the same day), and returns everything after the first `keep`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git add www/js/backup.js test/backup.test.js && git commit -m "Add backup policy: daily file, keep 14, weekly nudge"`

---

### Task 6: `native.js`: Documents files and app pause

**Files:**
- Modify: `www/js/native.js`, `android/app/src/main/AndroidManifest.xml`
- Test: `test/native.test.js`, create `test/android.test.js`

**Interfaces:**
- Produces: `ArkNative.onPause(fn)`. Produces `ArkNative.writeDocument(path, text) -> Promise<boolean>`, which calls `Filesystem.writeFile({path, data: text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true})`.
- Produces: `ArkNative.listDocuments(dir) -> Promise<string[]|null>` (file names from `readdir({path: dir, directory: 'DOCUMENTS'})`) and `ArkNative.deleteDocument(path) -> Promise<boolean>`.
- All of them resolve `false` or `null` on the web and on any error, and never throw.

- [ ] **Step 1: Write the failing tests**

Add a helper `withPlugins(plugins, fn)` to `native.test.js`. It sets `global.window = {Capacitor: {isNativePlatform: () => true, Plugins: plugins}}`, awaits `fn()`, and deletes `window` in a `finally`.

```js
test('writeDocument writes UTF-8 into Documents and creates the folder', async () => {
  const calls = [];
  const ok = await withPlugins({ Filesystem: { writeFile: async o => { calls.push(o); return { uri: 'file:///x' }; } } },
    () => N.writeDocument('ARK Studios/a.json', '{}'));
  assert.equal(ok, true);
  assert.deepEqual(calls, [{ path: 'ARK Studios/a.json', data: '{}', directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }]);
});
test('listDocuments returns file names', async () => {
  const names = await withPlugins({ Filesystem: { readdir: async () => ({ files: [{ name: 'a.json', type: 'file' }, { name: 'b.json' }] }) } },
    () => N.listDocuments('ARK Studios'));
  assert.deepEqual(names, ['a.json', 'b.json']);
});
test('document helpers fail soft', async () => {
  const boom = async () => { throw new Error('EACCES'); };
  assert.equal(await withPlugins({ Filesystem: { writeFile: boom } }, () => N.writeDocument('x', '')), false);
  assert.equal(await withPlugins({ Filesystem: { readdir: boom } }, () => N.listDocuments('x')), null);
  assert.equal(await withPlugins({ Filesystem: { deleteFile: boom } }, () => N.deleteDocument('x')), false);
  assert.equal(await N.writeDocument('x', ''), false);
  assert.equal(await N.listDocuments('x'), null);
});
test('onPause listens for the app going to the background', async () => {
  const events = [];
  await withPlugins({ App: { addListener: e => events.push(e) } }, async () => N.onPause(() => {}));
  assert.deepEqual(events, ['pause']);
});
```

Create `test/android.test.js`:

```js
test('Android 10 and older may write backups to Documents', () => {
  assert.match(manifest, /WRITE_EXTERNAL_STORAGE"\s+android:maxSdkVersion="29"/);
  assert.match(manifest, /READ_EXTERNAL_STORAGE"\s+android:maxSdkVersion="29"/);
  assert.match(manifest, /android:requestLegacyExternalStorage="true"/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL. `N.writeDocument` is not a function, and the manifest lacks the permissions.

- [ ] **Step 3: Implement the four functions and the manifest entries**

The Filesystem plugin asks for storage permission by itself on Android 10 and older. On Android 11 and later it needs none for files the app creates.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "Native: write, list and delete files in Documents; app pause event"` (also `git add test/android.test.js`).

---

### Task 7: Automatic backups and the weekly nudge in the app

**Files:**
- Modify: `www/index.html` (script tag, `homeView`, `moreView` backup group, handlers `exportFile` / `copyBackup`, new handlers, lifecycle), `www/sw.js` (`SHELL` + `'./js/backup.js'`, `CACHE = 'ark-studios-v5'`)
- Test: existing suites (`actions`, `housekeeping`, `offline-shell`)

**Interfaces:**
- Consumes: `ArkBackup.*` (Task 5), `ArkNative.writeDocument/listDocuments/deleteDocument/onPause/shareTextFile` (Task 6), `quietSave()` (Task 1).
- Produces (in `index.html`): `runAutoBackup(): Promise<void>` (Android app only, one at a time) and `shareBackup(): Promise<boolean>`. The new click actions are `nudgeShare` and `nudgeLater`.

- [ ] **Step 1: Load the module**

Add `<script src="js/backup.js"></script>` after `core.js`, and add the file to `SHELL`. Run `npm test`. Expected: PASS (the offline-shell test proves `SHELL` is complete).

- [ ] **Step 2: Automatic backup**

- `runAutoBackup()` runs only in the Android app, and a busy flag keeps two from overlapping. It calls `ArkBackup.autoBackup({state, now: Date.now(), today: todayISO(), fs: ArkBackup.fsFor(ArkNative)})`.
- On `{ok: true}` it sets `settings.lastAutoBackupAt = r.at` and calls `quietSave()`.
- On `{ok: false}`, when `settings.backupFailDay !== todayISO()`, it sets `backupFailDay`, calls `quietSave()` and toasts "Auto-backup failed. Save a backup from Settings.".
- Call it on start (after the first `render`), from `ArkNative.onPause`, and from the existing `onResume`. Calling it on start covers an app that Android killed in the background.

- [ ] **Step 3: Manual buttons**

- APK "Save backup file": `ArkBackup.writeBackup({state, today: todayISO(), fs})`. On success, set `lastAutoBackupAt = Date.now()`, call `quietSave()` and toast `Saved to Documents/ARK Studios` with action `{label: 'Share', fn: shareBackup}`. On failure, fall back to `shareBackup()`, which is the v1.1 behaviour.
- `shareBackup()`: `ArkNative.shareTextFile(backupFileName(todayISO()), ArkBackup.backupText(state), 'application/json')`. When it resolves true, set `lastSharedBackupAt = Date.now()`, call `quietSave()`, re-render if on Today and toast "Backup shared".
- Web: a successful "Save backup file" download and a successful clipboard "Copy as text" both set `lastSharedBackupAt` with `quietSave()`.

- [ ] **Step 4: Today banner**

After the empty-state return in `homeView` and below the update banner, show the nudge when `ArkBackup.nudgeDue(state, Date.now())`. Reuse the update banner's markup (`group update-banner`, `btns fill update-btns`).

- APK title: "Send this week’s backup to Google Drive or WhatsApp?". Sub: "Keeps a copy safe off this phone.". Buttons: **Share** (`nudgeShare`) and **Later** (`nudgeLater`).
- Web title: "Save this week’s backup file?". Sub: "Keep it somewhere safe, like Google Drive.". Buttons: **Save file** (`nudgeShare`) and **Later**.
- `nudgeShare`: APK → `shareBackup()`. Web → the `exportFile` path, then re-render.
- `nudgeLater`: `backupNudgeSnoozedUntil = Date.now() + ArkBackup.NUDGE_MS`, then `quietSave()` and re-render.
- The empty state already offers "Restore from a backup file" (added in v1.1), so spec 6.1's empty-state item needs no change.

- [ ] **Step 5: Settings → Backup and restore (APK)**

Add a first row "Automatic backups" whose end text is the last backup time. Format it as `dayLabel(isoOf(d)) + ', ' + fmtTime(HH:MM)`, for example "Today, 6:42 pm", or "Not yet" when it is 0. The APK footer reads "Every day you make changes, ARK Studios saves a backup to Documents/ARK Studios on this phone and keeps the last 14. They stay even if the app is uninstalled. Share one to Google Drive now and then." The web footer is unchanged.

- [ ] **Step 6: Verify**

Run: `npm test`. Expected: PASS. In particular, `every handler is reachable` covers `nudgeShare` and `nudgeLater`, and `housekeeping` covers the new fields.

Browser check (web, 360 px, sample data):
- Today shows "Save this week’s backup file?".
- **Later** hides it and it stays hidden after a reload (`JSON.parse(localStorage['taal-v2']).settings.backupNudgeSnoozedUntil > Date.now()`).
- `updatedAt` did not change.
- Settings → "Save backup file" downloads and sets `lastSharedBackupAt`.
- No console errors.

- [ ] **Step 7: Commit**

`git commit -am "Daily automatic backups to Documents/ARK Studios and a weekly share nudge"`

---

### Task 8: `reminders.js`: notification planner

**Files:**
- Create: `www/js/reminders.js` (exposed as `window.ArkReminders`, which requires `./core.js` under Node)
- Test: create `test/reminders.test.js`

**Interfaces:**
- Consumes: `TaalCore.{addDays, isoOf, fmtTime, fmtDate, money, songsOf, readyOf, totals}`.
- Produces:
  - `MAX_NOTIFICATIONS = 64`, `HORIZON_DAYS = 14`
  - `rehearsalNotifId(clientId, rehearsalId) -> integer` in `[100000000, 2000000000)`, from an FNV-1a 32-bit hash of `clientId + '/' + rehearsalId`
  - `summaryNotifId(iso) -> integer`, the date's digits (`'2026-11-08'` → `20261108`)
  - `summaryFor(state, day) -> string`, empty when there is nothing to report
  - `planNotifications(state, now) -> Array<{id, at, title, body, extra}>`: `at` is in epoch ms and uses local time. The array is sorted by `at` and capped at 64. Only items with `now < at < now + 14 days` are included.
- Rules:
  - **Rehearsal reminders** (when `reminders.rehearsal`). For each `planned` rehearsal with a time, of a client who is not cancelled, the reminder fires at start minus `leadMins`. The title is `${fmtTime(time)} rehearsal · ${client.name}`. The body is `[performance titles joined by ', ' or 'All performances', place]` joined by `' · '`, where the place is the client's venue when it is `'Venue'` and one is set. `extra = {kind: 'rehearsal', clientId, rehearsalId}`.
  - **Morning summary** (when `reminders.digest`). For days 0–13 from today, it fires at `digestTime` when `summaryFor` is not empty. The title is `'Today · ' + fmtDate(day, {weekday: 'short', day: 'numeric', month: 'short'})`. `extra = {kind: 'summary', date: day}`.
  - **`summaryFor` items, in this order.**
    - Planned rehearsals that day. One timed rehearsal reads "6:30 pm rehearsal with Priya & Arjun". One untimed rehearsal reads "Rehearsal with Priya & Arjun". Two or more read "N rehearsals today".
    - One item per booked or enquiry client whose event is 0–7 days after `day` and has songs not all ready, soonest first. It reads "`event or name` in N days, M songs not ready", with "today" and "tomorrow" for 0 and 1.
    - One combined item for booked or done clients with a balance due whose event date is no more than 3 days after `day`, including past events. It reads "₹30,000 due from Mehta family", or "₹40,000 due from 2 clients" when there are several.
    - Join the first three items with `' · '`. If there are more, add `' · +N more'`.

- [ ] **Step 1: Write the failing tests**

Use local-time fixtures so the tests pass in any time zone: `NOW = new Date(2026, 10, 8, 8, 0).getTime()` (Sunday 8 Nov 2026, 08:00) and `at = (d, h, m) => new Date(2026, 10, d, h, m).getTime()`. Reuse the `client`, `reh` and `songs` builders from `today.test.js`, plus `perf = (id, title) => ({id, title, performers: [], songs: []})`. Set `settings.reminders` per test.

```js
test('nothing when both reminders are off', ...)                       // → []
test('rehearsal reminder at start minus lead time', () => {
  // client 'Priya & Arjun', perf p1 'Cousins group', reh {date:'2026-11-08', time:'18:30', place:'Studio', perfIds:['p1']}, leadMins 60
  assert.deepEqual(plan, [{ id: R.rehearsalNotifId(c.id, r.id), at: at(8, 17, 30), title: '6:30 pm rehearsal · Priya & Arjun',
    body: 'Cousins group · Studio', extra: { kind: 'rehearsal', clientId: c.id, rehearsalId: r.id } }]);
});
test('skips past, untimed, done, cancelled and out-of-range rehearsals', ...)
  // today 08:30 (fires 07:30, past), untimed, status done, status cancelled, cancelled client,
  // 2026-11-22 18:00 (after the 14-day horizon) → only 2026-11-21 18:00 remains: at(21, 17, 0)
test('venue rehearsals show the venue', ...)                            // body 'All performances · The Grand'
test('summary: one rehearsal, many rehearsals, untimed', ...)           // '6:30 pm rehearsal with Priya & Arjun', '2 rehearsals today', 'Rehearsal with Priya & Arjun'
test('summary: events within 7 days with songs not ready', ...)         // 'Priya’s sangeet in 3 days, 2 songs not ready'; 'tomorrow'; 'today'; 8 days → ''
test('summary: balances due on events within 3 days or past', ...)      // done client, event 2026-10-20, ₹30,000 → '₹30,000 due from Mehta family';
  // booked event 2026-11-11 ₹10,000 added → '₹40,000 due from 2 clients'; event 2026-11-12, no date, enquiry → not included
test('summary joins three items and counts the rest', ...)              // '2 rehearsals today · A in 3 days, 2 songs not ready · B in 5 days, 1 song not ready · +1 more'
test('morning summary only on days with something to report', () => {
  // digest on at 09:00, one rehearsal on 2026-11-10 18:00 (rehearsal reminders off)
  assert.deepEqual(plan, [{ id: 20261110, at: at(10, 9, 0), title: 'Today · Tue, 10 Nov', body: '6 pm rehearsal with Priya & Arjun', extra: { kind: 'summary', date: '2026-11-10' } }]);
});
test('today’s summary is skipped once its time has passed', ...)       // digestTime '07:30' → no item for 2026-11-08
test('a balance due on a past event is in every morning’s summary', ...) // 14 items, ids 20261108…20261121
test('never more than 64, soonest first', ...)                           // 5 rehearsals a day × 14 days → length 64, ascending at
test('ids are stable and never collide across kinds', () => {
  const a = R.rehearsalNotifId('c1', 'r1');
  assert.equal(a, R.rehearsalNotifId('c1', 'r1'));
  assert.notEqual(a, R.rehearsalNotifId('c1', 'r2'));
  assert.ok(Number.isInteger(a) && a >= 1e8 && a < 2e9);
  assert.equal(R.summaryNotifId('2026-11-08'), 20261108);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/reminders.test.js`
Expected: FAIL with `Cannot find module '../www/js/reminders.js'`.

- [ ] **Step 3: Implement `www/js/reminders.js`**

Build local times with `new Date(day + 'T' + hhmm + ':00').getTime()`. Compute `today` from `isoOf(new Date(now))`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git add www/js/reminders.js test/reminders.test.js && git commit -m "Add reminder planner: rehearsal reminders and morning summary"`

---

### Task 9: Local notifications plugin and the native wrapper

**Files:**
- Modify: `package.json`, `package-lock.json`, `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle` (both regenerated by sync), `android/app/src/main/AndroidManifest.xml`, `capacitor.config.json`, `www/js/native.js`
- Create: `android/app/src/main/res/drawable/ic_stat_ark.xml`
- Test: `test/native.test.js`, `test/android.test.js`

**Interfaces:**
- Produces: `ArkNative.notifications`, where each method resolves on the web and never throws:
  - `permission() -> Promise<'granted'|'denied'|'prompt'|'unsupported'>`, from `checkPermissions().display`. The web returns `'unsupported'`.
  - `requestPermission() -> Promise<boolean>`, true when `requestPermissions().display === 'granted'`.
  - `replaceAll(items) -> Promise<boolean>`:
    - Always calls `cancelAll()` first; an empty `items` stops there and resolves true.
    - Otherwise calls `createChannel(REMINDER_CHANNEL)` and `checkExactNotificationSetting()` (`exact` = `exact_alarm === 'granted'`; an error counts as false), then `schedule({notifications})`.
    - Each notification is `{id, title, body, extra, channelId: 'reminders', schedule: {at: new Date(item.at), allowWhileIdle: true}, isExactNotification: exact}`.
    - Never asks for exact-alarm permission. When it isn't granted, the notifications are scheduled inexact instead.
  - `sendTest() -> Promise<boolean>`: creates the channel and schedules one immediate notification (no `schedule` field), `{id: TEST_ID, title: 'Reminders are on', body: 'Rehearsal reminders and the morning summary will look like this.', channelId: 'reminders', extra: {kind: 'test'}}`.
  - `onTap(fn)`: registers `localNotificationActionPerformed` and calls `fn(event.notification.extra || {})`.
  - `TEST_ID = 1` and `REMINDER_CHANNEL = {id: 'reminders', name: 'Reminders', description: 'Rehearsal reminders and the morning summary', importance: 4}`.

- [ ] **Step 1: Write the failing tests**

In `native.test.js`, add a `fakeLN(responses)` helper that records `[method, arg]` for `cancelAll`, `createChannel`, `checkExactNotificationSetting`, `schedule`, `checkPermissions`, `requestPermissions` and `addListener`.

```js
test('replaceAll cancels, then schedules exact allow-while-idle alarms on the reminders channel', async () => {
  const ln = fakeLN({ checkExactNotificationSetting: () => ({ exact_alarm: 'granted' }) });
  const item = { id: 5, at: Date.UTC(2026, 10, 8, 12), title: 't', body: 'b', extra: { kind: 'summary' } };
  assert.equal(await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.replaceAll([item])), true);
  assert.equal(ln.calls[0][0], 'cancelAll');
  assert.deepEqual(ln.calls.find(c => c[0] === 'createChannel')[1], N.notifications.REMINDER_CHANNEL);
  assert.deepEqual(ln.calls.at(-1), ['schedule', { notifications: [{ id: 5, title: 't', body: 'b', extra: { kind: 'summary' },
    channelId: 'reminders', schedule: { at: new Date(item.at), allowWhileIdle: true }, isExactNotification: true }] }]);
});
test('without exact-alarm permission the plan is scheduled inexact, never prompting', ...) // exact_alarm 'denied' → isExactNotification false; no other calls
test('an empty plan only cancels', ...)                                   // calls deepEqual [['cancelAll', undefined]], resolves true
test('a failing schedule resolves false', ...)
test('permission and request follow the display state', ...)              // 'granted'; requestPermissions {display:'denied'} → false
test('sendTest shows one notification now', ...)                          // schedule arg notifications[0] has id 1, no schedule key
test('onTap passes the notification’s extra', ...)                        // handler({notification:{extra:{kind:'rehearsal'}}}) → {kind:'rehearsal'}; no extra → {}
test('notifications are inert on the web', ...)                           // 'unsupported', false, false, false
```

In `android.test.js`:

```js
test('reminders: exact alarms, small icon, pinned plugin', () => {
  assert.match(manifest, /android\.permission\.SCHEDULE_EXACT_ALARM/);
  assert.match(manifest, /android\.permission\.USE_EXACT_ALARM/);
  const cfg = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8')).plugins.LocalNotifications;
  assert.equal(cfg.smallIcon, 'ic_stat_ark');
  assert.ok(fs.existsSync('android/app/src/main/res/drawable/ic_stat_ark.xml'));
  assert.equal(require('../package.json').dependencies['@capacitor/local-notifications'], '8.3.1');
  assert.match(fs.readFileSync('android/capacitor.settings.gradle', 'utf8'), /':capacitor-local-notifications'/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL. `N.notifications` is undefined and the manifest lacks the permissions.

- [ ] **Step 3: Install and sync**

Run: `npm install --save-exact @capacitor/local-notifications@8.3.1`, then `npx cap sync android`.
Expected: `package.json` pins `"8.3.1"`, and `git status` shows the regenerated `android/capacitor.settings.gradle` and `android/app/capacitor.build.gradle`.

- [ ] **Step 4: Implement**

- Add the `notifications` object to `native.js`.
- Manifest: add `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM`. The plugin's own manifest already brings `POST_NOTIFICATIONS` and the boot receiver that restores alarms after a restart.
- `capacitor.config.json`: `"LocalNotifications": {"smallIcon": "ic_stat_ark", "iconColor": "#B4236B"}`.
- `ic_stat_ark.xml`: a 24 dp white vector of the launcher's five equaliser bars (heights .3, .6, 1, .5, .75 of the box, rounded tops).

- [ ] **Step 5: Run to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

`git add -A package.json package-lock.json android capacitor.config.json www/js/native.js test && git commit -m "Add local notifications plugin and native reminder wrapper"`

---

### Task 10: Reminders in the app

**Files:**
- Modify: `www/js/reminders.js`, `www/index.html` (script tag, `save()`, lifecycle, `moreView`, handlers, `change` listener), `www/sw.js` (`SHELL` + `'./js/reminders.js'`)
- Test: `test/reminders.test.js`

**Interfaces:**
- Consumes: `planNotifications` (Task 8), `ArkNative.notifications` (Task 9), `LEAD_CHOICES` (Task 1).
- Produces (in `reminders.js`):
  - `syncAction(reminders, permission) -> 'cancel'|'switchOff'|'schedule'`: `'cancel'` when both switches are off; `'switchOff'` when one is on and the permission is not `'granted'`; otherwise `'schedule'`.
  - `tapTarget(state, extra) -> {view: 'home'} | {view: 'client', clientId, rehearsalId}`: `rehearsalId` is `null` when that rehearsal no longer exists, and the result is `home` when the client no longer exists or the kind is not `'rehearsal'`.
- Produces (in `index.html`):
  - `syncReminders(): Promise<void>`, queued so that runs never overlap.
  - `remindersSoon(): void`, a 2 s debounce that is a no-op on the web; `save()` calls it.
  - New click actions `remToggle`, `remLead` and `remTest`.

- [ ] **Step 1: Write the failing tests**

```js
test('sync: off, missing permission, or schedule', () => {
  const r = o => ({ rehearsal: false, leadMins: 60, digest: false, digestTime: '09:00', ...o });
  assert.equal(R.syncAction(r({}), 'granted'), 'cancel');
  assert.equal(R.syncAction(r({ digest: true }), 'prompt'), 'switchOff');
  assert.equal(R.syncAction(r({ rehearsal: true }), 'denied'), 'switchOff');
  assert.equal(R.syncAction(r({ rehearsal: true }), 'granted'), 'schedule');
});
test('tapping a notification opens what still exists', () => {
  // state with client c (rehearsal r)
  assert.deepEqual(R.tapTarget(s, { kind: 'rehearsal', clientId: c.id, rehearsalId: r.id }), { view: 'client', clientId: c.id, rehearsalId: r.id });
  assert.deepEqual(R.tapTarget(s, { kind: 'rehearsal', clientId: c.id, rehearsalId: 'gone' }), { view: 'client', clientId: c.id, rehearsalId: null });
  assert.deepEqual(R.tapTarget(s, { kind: 'rehearsal', clientId: 'gone', rehearsalId: r.id }), { view: 'home' });
  assert.deepEqual(R.tapTarget(s, { kind: 'summary', date: '2026-11-08' }), { view: 'home' });
  assert.deepEqual(R.tapTarget(s, {}), { view: 'home' });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/reminders.test.js`
Expected: FAIL with `R.syncAction is not a function`.

- [ ] **Step 3: Implement `syncAction` and `tapTarget`, then run**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Wire into `index.html`**

- **Script and cache:** add `<script src="js/reminders.js">` and the `SHELL` entry.
- **`syncReminders()`.** It does nothing on the web. Otherwise it gets `syncAction(settings.reminders, await notifications.permission())`:
  - `cancel` → `replaceAll([])`.
  - `switchOff` → both switches off, `save()`, `replaceAll([])`, toast "Reminders are off: notifications aren’t allowed for ARK Studios", and re-render if on Settings.
  - `schedule` → `replaceAll(ArkReminders.planNotifications(state, Date.now()))`.
- **When it runs:** on start, in `onResume`, through `remindersSoon()` from `save()`, and flushed immediately in `onPause` when a debounce is pending.
- **Notification taps:** `ArkNative.notifications.onTap` is registered at startup, before the first render. `tapTarget` decides what opens:
  - `client` → `closeSheet(); tab('home'); go('client', {c, tab: 'reh'})`, and when there is a rehearsal, `rehForm(c, r)`.
  - `home` → `closeSheet(); tab('home')`.
- **Settings → Reminders (APK)** goes between Messages and Appearance:
  - "Rehearsal reminders" switch row (`remToggle`, `data-k="rehearsal"`). When it is on, a seg "Remind me" built from `LEAD_CHOICES` (`remLead`), labelled "30 min / 1 hr / 2 hr".
  - "Morning summary" switch row (`data-k="digest"`). When it is on, a row "Time" with `<input type="time" data-rem="digestTime">`; the `change` listener stores it and calls `save()`.
  - "Send test notification" row (`remTest`).
  - Footer: "On Xiaomi, Oppo, Vivo and Realme phones, allow Autostart for ARK Studios and set its battery use to No restrictions, or reminders may arrive late or not at all."
  - When `ui.notifBlocked` is set, an extra footer: "Notifications are blocked for ARK Studios. Allow them in Android Settings → Apps → ARK Studios → Notifications, then turn the reminder on again."
  - Switches reuse the song sheet's `.switch` span with `aria-pressed`.
- **Web:** the same header with one footer, "Reminders work in the Android app."
- **`remToggle`:**
  - Turning a switch on first awaits `requestPermission()`. If denied, set `ui.notifBlocked = true`, re-render (the switch stays off) and stop. Otherwise clear `notifBlocked`, set the switch, `save()` and re-render.
  - Turning a switch off sets it, calls `save()` and re-renders.
- **`remLead`:** `reminders.leadMins = +v`, then `save()` and re-render.
- **`remTest`:** ensure the permission as in `remToggle`, then `sendTest()`, and toast "Test notification sent" or "Couldn’t send. Check that notifications are allowed.".

- [ ] **Step 5: Verify**

Run: `npm test`. Expected: PASS, including `every handler is reachable` for `remToggle`, `remLead` and `remTest`.

Browser check (web): Settings shows the Reminders header with "Reminders work in the Android app.", and there are no console errors.

- [ ] **Step 6: Commit**

`git commit -am "Rehearsal reminders and morning summary in the app, Settings → Reminders"`

---

### Task 11: Finish v1.2

**Files:**
- Modify: `www/js/version.js` (`APP_VERSION = '1.2.0'`), `HOW-TO-INSTALL.md`

- [ ] **Step 1: Version and docs**

- Set `APP_VERSION` to `'1.2.0'`.
- In `HOW-TO-INSTALL.md`, add a "Backups" section. It covers the daily files in `Documents/ARK Studios`, how to restore after a reinstall or on a new phone ("Restore from file" → Documents → ARK Studios), the weekly share, and the reinstall limit from the Review Focus.
- Add a "Reminders" section: how to turn them on, the test notification, and the Xiaomi/Oppo/Vivo/Realme tip.
- Run `npm test`. Expected: PASS (the branding test still finds no user-visible "Taal").

- [ ] **Step 2: Whole-app browser check**

Run `npm run serve` at 360 × 780 with sample data, then with the long-name fixture. Click through Today (nudge banner), a client (songs: tick ✓ → Undo restores; segbar placement), the Rehearsals and Money tabs (swipe Receipt on the older payment shows that payment's amount), Schedule (back reads "Today"), Money and Settings. For the swipe check, dispatch pointer events from the console:
- Open a row.
- `pointerdown`/`pointerup`/`click` on another row: the open row closes and the song sheet does **not** open.
- `pointercancel` mid-drag: the row returns to where it started.

Expected: no console errors and no sideways scroll.

- [ ] **Step 3: Commit, then check for the employer name and the identity**

Run `git commit -am "Version 1.2.0, install guide for backups and reminders"`.

Then run `git log main..HEAD --format='%an <%ae>' | sort -u`, which should print only the Romank Sadhwani noreply identity. Run `git grep -i -e "$WORK_ORG"` and `git log --format=%B | grep -i -e "$WORK_ORG"`; neither should print anything.

- [ ] **Step 4: Prove the Android build compiles (owner approved by approving this plan)**

Run: `git push -u origin v1.2-backups-reminders`, then `GH_TOKEN="$(gh auth token --user Romank12-vs)" gh workflow run ci.yml --ref v1.2-backups-reminders`, and watch the run.
Expected: the tests pass and the `assembleDebug` build succeeds with the new plugin.

- [ ] **Step 5: Whole-branch review**

A fresh reviewer checks `main..v1.2-backups-reminders` against spec 6.1/6.2 and this plan. Fix the findings, then run `npm test` again.

- [ ] **Step 6: Owner's go-ahead, then release**

Only after the owner says so:
1. `git switch main && git merge --ff-only v1.2-backups-reminders && git push`.
2. `git tag v1.2.0 && git push origin v1.2.0`.
3. Confirm the Release has `ARK-Studios.apk`.

- [ ] **Step 7: Owner's phone checklist**

Hand the owner this list:
1. Install over v1.1. All data is still there, and Today shows the backup banner.
2. Share it to Drive.
3. Change something and switch apps. `Documents/ARK Studios` holds today's file.
4. Turn on rehearsal reminders (allow notifications). "Send test notification" shows within a few seconds.
5. Use a 30 min lead time with a rehearsal 31 minutes ahead, then close the app. The notification arrives about a minute later, and tapping it opens that rehearsal.
6. Turn on the morning summary for a minute from now on a day with a rehearsal. It arrives.
7. Turn both off. Nothing else arrives.
8. Swipe a song's ✓: one buzz, then Undo.
9. Tapping outside an open swipe row only closes it.
10. Uninstall, reinstall, then Restore from file → Documents → ARK Studios. Everything comes back.
