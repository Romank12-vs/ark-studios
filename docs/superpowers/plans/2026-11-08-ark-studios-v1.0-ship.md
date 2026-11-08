# ARK Studios v1.0 (Ship) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing single-file choreography app into a free, signed Android APK and a web app named ARK Studios, built and published by GitHub Actions from the owner's personal GitHub account.

**Architecture:** The app stays plain HTML/JS with no bundler. It moves into `www/`, pure helpers move into small classic-script modules (`www/js/*.js`) that also export via `module.exports` so Node can test them, and Capacitor 8 wraps `www/` into an Android shell. GitHub Actions deploys `www/` to Pages on every push and builds and signs the APK on every `v*` tag.

**Tech Stack:** Vanilla JS, Capacitor 8.6.0 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, `@capacitor/app`, `@capacitor/filesystem`, `@capacitor/share`), `@capacitor/assets` 4.0.0 for icons, Node 22+ built-in test runner, JDK 21, Gradle via the Capacitor template, GitHub Actions + Pages + Releases.

**Spec:** `docs/superpowers/specs/2026-11-08-ark-studios-android-app-design.md` (section 5 is this milestone; sections 3, 4 and 8 apply throughout).

## Global Constraints

- App name shown to users: **ARK Studios**. App ID: `com.arkstudios.app` (permanent).
- No user-visible "Taal". Internal identifiers stay: localStorage keys `taal-v2` and `taal-choreo-v1`, global `window.TaalCore`.
- Nothing may reference the owner's employer in code, config, docs, commits or remotes. The name is deliberately not written in any repo file, this plan included. The executor gets it outside the repo (session memory) as the shell variable `WORK_ORG` and checks with it before pushing (Task 9 Step 3).
- Repo `Romank12-vs/ark-studios`, public. Web link `https://romank12-vs.github.io/ark-studios/`. Stable APK link `https://github.com/Romank12-vs/ark-studios/releases/latest/download/ARK-Studios.apk`.
- Commit identity (repo-local, already set): `Romank Sadhwani <117653360+Romank12-vs@users.noreply.github.com>`. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- The owner's work GitHub account stays the default `gh` account. Never run `gh auth switch`. Every `gh` command for this project runs with `GH_TOKEN="$(gh auth token --user Romank12-vs)"`.
- Capacitor packages pinned exactly (no `^`/`~`). Capacitor 8 needs Node ≥ 22 and JDK 21. Android: minSdk 24, compileSdk/targetSdk 36 (Capacitor template defaults; don't change them).
- `versionName` = tag without `v`; `versionCode` = `major*10000 + minor*100 + patch`. `APP_VERSION` in `www/js/version.js` is the single source of the version.
- No bundler and no new runtime dependencies in `www/` for v1.0. Every `www/js/*.js` file is a classic script that sets one `window.*` global and, when `module` exists, assigns `module.exports`.
- Client data never goes into the repo. Signing keys never go into the repo.

## Review Focus

1. **Existing web data after the move and rename**: someone who already uses the web app has data under `localStorage['taal-v2']`. It must load unchanged → Task 2 tests `normalize` on a v2 fixture; Task 3's browser check seeds `taal-v2` before loading.
2. **Backups made before the rename** (`"app":"taal"`) must still restore, and junk must be rejected with the existing message → Task 2 tests `parseBackup`.
3. **Back with a sheet open on a root tab**: there's no history entry, so Android's default back would *exit the app* instead of closing the sheet → Task 5 tests `backAction`.
4. **"Save backup file" inside the APK**: blob downloads silently do nothing in the Android WebView, but the toast would still say "Backup saved". That's a data-safety trap, so v1.0 already routes it through the share sheet → Task 5 (moved forward from spec 6.1 for this reason); verified on the phone in Task 10.
5. **Bad tags and bad update responses**: `v1.0`, `v1.0.0-beta`, a rate-limit JSON or no network must not crash, publish a wrong `versionCode`, or show a bogus banner → Tasks 6 and 8 test these.

---

### Task 1: Tooling and project layout

**Files:**
- Move: `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` → `www/`
- Create: `package.json`, `.gitattributes`, `.claude/launch.json`

**Interfaces:**
- Produces: `npm test` (runs `node --test "test/*.test.js"`), `npm run serve` (serves `www/` on port 5173 with caching off).

- [ ] **Step 1: Install Node LTS and JDK 21**

Run: `winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements` and `winget install --id EclipseAdoptium.Temurin.21.JDK -e --accept-source-agreements --accept-package-agreements`
Then, in the same shell, prepend `/c/Program Files/nodejs` and the Temurin `bin` folder (under `/c/Program Files/Eclipse Adoptium/`) to `PATH` if `node`/`keytool` aren't found yet. Windows only refreshes PATH for new processes.
Expected: `node -v` prints v22 or later; `keytool -help` prints usage.

- [ ] **Step 2: Move the app into `www/` with `git mv`**

Run: `git mv index.html manifest.webmanifest sw.js icons www/`
Expected: `git status` shows four renames and nothing else.

- [ ] **Step 3: Create `package.json`**

`"name": "ark-studios"`, `"private": true`, no `"version"` field (`APP_VERSION` is the only version), no `"type"` field (CommonJS), `"engines": {"node": ">=22"}`, scripts `test` and `serve` as above. Add `http-server` as an exact-pinned devDependency (current version from `npm view http-server version`). Run `npm install`.

- [ ] **Step 4: Create `.gitattributes`**

```
* text=auto
*.sh text eol=lf
gradlew text eol=lf
*.png binary
*.jks binary
*.woff2 binary
```

- [ ] **Step 5: Create `.claude/launch.json`**

One configuration named `ark-studios-web`: `runtimeExecutable` `npm`, `runtimeArgs` `["run","serve"]`, `port` 5173.

- [ ] **Step 6: Verify the app still works from `www/`**

Start the preview (`ark-studios-web`), set the viewport to mobile, tap "Explore with sample data", open a client, and switch through the Songs, Rehearsals, Payments and Details tabs.
Expected: identical to before the move, with no console errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Move the app into www/ and add Node tooling"
```

---

### Task 2: Extract `core.js` with characterization tests

**Files:**
- Create: `www/js/core.js`, `test/core.test.js`, `test/fixtures/v1-state.json`, `test/fixtures/v2-state.json`
- Modify: `www/index.html` (remove the moved definitions from the IIFE and load `js/core.js` before the inline script)

**Interfaces:**
- Produces, on `window.TaalCore` and `module.exports`: `STEPS`, `V1_TPL`, `uid()`, `pad(n)`, `isoOf(date)`, `todayISO()`, `addDays(iso, n)`, `daysLeft(iso) → number|null`, `fmtDate(iso, opt?)`, `dayLabel(iso)`, `fmtTime(hhmm)`, `parseDur(text) → seconds`, `fmtDur(seconds) → 'm:ss'|''`, `money(n) → '₹1,50,000'`, `num(v) → number`, `waNumber(phone) → digits`, `waHref(phone, text)`, `nextIdx(song) → 0..5`, `doneN(song)`, `songsOf(client)`, `readyOf(client)`, `totals(client) → {total, paid, bal}`, `isActive(client)`, `upcomingReh(client)`, `blank()`, `normalize(raw) → State`, plus new `BACKUP_MARKER = 'ark-studios'`, `backupFileName(iso) → 'ark-studios-backup-<iso>.json'`, `parseBackup(text) → object` (throws `Error('not-a-backup')`).
- `index.html` gets them with one destructuring line at the top of its IIFE: `const {STEPS, uid, …} = window.TaalCore;`

- [ ] **Step 1: Write fixtures**

`v2-state.json`: `{"v":2, "updatedAt":1762560000000, "settings":{"name":"Riya","studio":"Steps Studio","lang":"english","theme":"dark","templates":{"update":"Custom {client}"}}, "clients":[one booked client "Priya & Arjun" with one performance "Couple dance" (performer "Priya"), one song "Tum Se Hi" with steps {final:true, edit:true}, dur 190, one charge {label:"Package", amount:"45000"} (amount as a string), one payment {amount:15000, mode:"UPI", date:"2026-10-01"}]}`.
`v1-state.json`: no `v` field, `templates.full` set to a custom string and `templates.finalize` set to the exact `V1_TPL.finalize` text.

- [ ] **Step 2: Write the failing tests in `test/core.test.js`**

```js
const test = require('node:test'); const assert = require('node:assert/strict');
const C = require('../www/js/core.js');
const v1 = require('./fixtures/v1-state.json'), v2 = require('./fixtures/v2-state.json');

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
  assert.equal(C.nextIdx({steps:{}}), 0);
  assert.equal(C.nextIdx({steps:{final:true, edit:true}}), 2);
  assert.equal(C.nextIdx({steps:{final:true, edit:true, choreo:true, teach:true, practice:true}}), 5);
  assert.deepEqual(C.totals({charges:[{amount:45000},{amount:3500}], payments:[{amount:15000}]}), {total:48500, paid:15000, bal:33500});
});
test('normalize: empty, v1 migration, v2 kept', () => {
  const e = C.normalize(null);
  assert.equal(e.v, 2); assert.deepEqual(e.clients, []); assert.equal(e.settings.lang, 'hinglish');
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../www/js/core.js'`.

- [ ] **Step 4: Create `www/js/core.js`**

Move the listed functions and constants out of `index.html` verbatim, so behaviour doesn't change. Wrap them in an IIFE that ends with `if (typeof module !== 'undefined') module.exports = api; else window.TaalCore = api;`. Add `BACKUP_MARKER`, `backupFileName` and `parseBackup`: trim, `JSON.parse`, require `Array.isArray(d.clients)`, otherwise throw `new Error('not-a-backup')`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 6 tests.

- [ ] **Step 6: Wire `index.html` to `core.js`**

Add `<script src="js/core.js"></script>` before the inline script, add the destructuring line, and delete the moved definitions. Make `restoreFrom` use `parseBackup` (on error, show the same toast as today). Make `exportFile`/`copyBackup` write `{app: BACKUP_MARKER, ...state}` and name the file with `backupFileName(todayISO())`.

- [ ] **Step 7: Browser check**

Reload the preview, load sample data, and visit every tab. Save a backup file (the file name should be `ark-studios-backup-<today>.json`), then restore it.
Expected: no console errors, and the restore sheet shows the right client count.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Extract pure helpers into core.js with characterization tests"
```

---

### Task 3: ARK Studios branding, version, cleanup, install guide

**Files:**
- Create: `www/js/version.js`, `test/branding.test.js`
- Modify: `www/index.html`, `www/manifest.webmanifest`, `HOW-TO-INSTALL.md`

**Interfaces:**
- Produces: global `APP_VERSION = '1.0.0'` (also `module.exports = {APP_VERSION}`), loaded before `core.js`.

- [ ] **Step 1: Write the failing test `test/branding.test.js`**

```js
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs');
const INTERNAL = /taal-v2|taal-choreo-v1|TaalCore/g;
for (const f of ['www/index.html', 'www/manifest.webmanifest', 'HOW-TO-INSTALL.md']) {
  test(`no user-visible Taal in ${f}`, () => {
    assert.doesNotMatch(fs.readFileSync(f, 'utf8').replace(INTERNAL, ''), /taal/i);
  });
}
test('manifest names', () => {
  const m = JSON.parse(fs.readFileSync('www/manifest.webmanifest', 'utf8'));
  assert.equal(m.name, 'ARK Studios: choreography studio');
  assert.equal(m.short_name, 'ARK Studios');
});
test('version', () => assert.equal(require('../www/js/version.js').APP_VERSION, '1.0.0'));
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL on the Taal checks, the manifest names and the missing `version.js`.

- [ ] **Step 3: Rebrand**

- `<title>ARK Studios: choreography studio</title>`, `apple-mobile-web-app-title` set to `ARK Studios`.
- Manifest `name` and `short_name` as tested; description `Clients, songs, rehearsals and payments for choreographers, with WhatsApp updates.`
- Settings footer: `ARK Studios ${APP_VERSION} · N clients, M songs`.
- Restore error toast: `That doesn’t look like an ARK Studios backup`.
- Remove the `window.claude` code: the `connect()` IIFE, `pushDb`, `dbRef`/`dbBusy`/`dbAgain`/`dbTimer`/`dlCap`, the `dlCap` branch in `downloadFile`, and `${dbRef?…}` in Settings. `syncLabel` becomes the constant `'Saved on this device'`, and `save()` keeps only the localStorage write.

- [ ] **Step 4: Rewrite `HOW-TO-INSTALL.md`**

Sections:
1. **Install on Android**: open the stable APK link, allow "Install unknown apps" for the browser once, open the file.
2. **Update**: the in-app banner, or the same link; installs over the old app and keeps data.
3. **iPhone or any browser**: the web link, then Share → Add to Home Screen.
4. **Move data from the old web version**: Settings → Save backup file there, then Restore from file in the app.
5. **Keep data safe**: backups.
6. **Keep the signing key safe**: the `ark-studios-signing` folder and its copy in Google Drive.

Use the exact URLs from Global Constraints.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Browser check with existing data**

In the preview console, set `localStorage['taal-v2']` to the contents of `test/fixtures/v2-state.json`, then reload.
Expected: "Priya & Arjun" appears, Settings footer reads `ARK Studios 1.0.0 · 1 clients, 1 songs`, and there are no console errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Rename the app to ARK Studios, add APP_VERSION, drop Claude-only sync"
```

---

### Task 4: Self-hosted fonts and a web cache that never serves stale code

**Files:**
- Create: `scripts/fetch-fonts.js`, `www/fonts/fonts.css`, `www/fonts/*.woff2`, `www/fonts/OFL-BricolageGrotesque.txt`, `www/fonts/OFL-RozhaOne.txt`
- Modify: `www/index.html` (head), `www/sw.js`

- [ ] **Step 1: Write `scripts/fetch-fonts.js`**

This is a one-off script, kept so the fonts can be fetched again later.
1. Fetch the CSS for the current Google Fonts URL (`family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Rozha+One&display=swap`), sending a desktop Chrome `User-Agent` so the response uses woff2.
2. Keep only the `/* latin */` and `/* latin-ext */` blocks. latin-ext carries ₹ (U+20B9).
3. Download each `url(...)` into `www/fonts/` with names like `bricolage-latin.woff2`, and rewrite the URLs to be relative.
4. Write `www/fonts/fonts.css`, keeping the original `unicode-range` and `font-display`.
5. Download the two OFL texts from `https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/OFL.txt` and `.../ofl/rozhaone/OFL.txt`.

- [ ] **Step 2: Run it**

Run: `node scripts/fetch-fonts.js`
Expected: four or more `.woff2` files, `fonts.css`, and two OFL files in `www/fonts/`.

- [ ] **Step 3: Swap the font links**

Replace the three Google Fonts `<link>` tags in `index.html` with `<link rel="stylesheet" href="fonts/fonts.css">`.

- [ ] **Step 4: Rewrite `sw.js`**

- Cache name `ark-studios-v1`. The activate step deletes every other cache, which also removes the old `taal-v2` cache.
- Pre-cache only `./`, `index.html`, `manifest.webmanifest` and `fonts/fonts.css`. Everything else (scripts, font files, icons) is cached the first time the network-first handler fetches it, so later tasks never have to update a list.
- Fetch handler: same-origin GET only, **network-first for everything** (put the response in the cache, fall back to the cache when offline; navigations fall back to `index.html`). Cache-first JS would serve old `core.js` next to a new `index.html` after a deploy.
- Remove the Google Fonts special case.

- [ ] **Step 5: Browser check, offline**

Reload twice so the SW installs, then switch DevTools/network to offline (or stop the server) and reload.
Expected: the app loads with Rozha One headings and Bricolage body text, and ₹ renders in the dashboard. Bring the server back, edit a visible string in `core.js` temporarily, and reload: the change shows on the first reload. Revert the edit.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Self-host fonts and make the web cache network-first"
```

---

### Task 5: Native bridge: back button, system bars, backup sharing, web-only service worker

**Files:**
- Create: `www/js/native.js`, `test/native.test.js`
- Modify: `www/index.html`

**Interfaces:**
- Consumes: `window.Capacitor` (present only in the APK; plugins via `window.Capacitor.Plugins.App | Filesystem | Share | SystemBars`).
- Produces, on `window.ArkNative` and `module.exports`:
  - pure: `backAction({sheetOpen: boolean, stackLen: number}) → 'closeSheet'|'back'|'exit'`, `barStyleFor(theme: 'auto'|'light'|'dark') → 'DEFAULT'|'LIGHT'|'DARK'`
  - effects: `isNative() → boolean`, `onBackButton(fn)`, `onResume(fn)`, `exitApp()`, `setBarStyle(theme)`, `shareTextFile(name, text, mime) → Promise<boolean>`. All of them are no-ops or return `false` on the web.

- [ ] **Step 1: Write the failing test `test/native.test.js`**

```js
const test = require('node:test'); const assert = require('node:assert/strict');
const N = require('../www/js/native.js');
test('back: sheet first, then history, then exit', () => {
  assert.equal(N.backAction({sheetOpen:true, stackLen:1}), 'closeSheet');
  assert.equal(N.backAction({sheetOpen:true, stackLen:3}), 'closeSheet');
  assert.equal(N.backAction({sheetOpen:false, stackLen:3}), 'back');
  assert.equal(N.backAction({sheetOpen:false, stackLen:1}), 'exit');
});
test('bar style follows theme', () => {
  assert.equal(N.barStyleFor('light'), 'LIGHT');   // dark icons on a light bar
  assert.equal(N.barStyleFor('dark'), 'DARK');     // light icons on a dark bar
  assert.equal(N.barStyleFor('auto'), 'DEFAULT');
});
test('not native under Node', () => assert.equal(N.isNative(), false));
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '../www/js/native.js'`.

- [ ] **Step 3: Implement `www/js/native.js`**

- `isNative()`: `!!(typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())`.
- `onBackButton(fn)`: `App.addListener('backButton', fn)`. Registering a listener disables Capacitor's default, which would exit the app with a sheet open.
- `onResume(fn)`: `App.addListener('resume', fn)`.
- `exitApp()`: `App.exitApp()`.
- `setBarStyle(t)`: `SystemBars.setStyle({style: barStyleFor(t)})`, wrapped in try/catch.
- `shareTextFile`: `Filesystem.writeFile({path: name, data: text, directory: 'CACHE', encoding: 'utf8'})`, then `Share.share({title: name, files: [uri]})`. Resolve `true` on success and `false` if the user cancels or anything throws.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Wire it into `index.html`**

1. Load `js/native.js` after `core.js`.
2. Call `ArkNative.onBackButton(() => { const a = ArkNative.backAction({sheetOpen: sheet.open, stackLen: ui.stack.length}); a === 'closeSheet' ? closeSheet() : a === 'back' ? back() : ArkNative.exitApp(); })`.
3. `applyTheme()` also calls `ArkNative.setBarStyle(state.settings.theme)`.
4. In `exportFile`, when `ArkNative.isNative()`, call `shareTextFile(backupFileName(todayISO()), json, 'application/json')` instead of `downloadFile`. Toast `Backup ready to save` on success and `Backup not saved` on cancel.
5. Register the service worker only when `!ArkNative.isNative()`.
6. Settings "Install on your phone": hide it in the APK. On the web, show `Android: <a href="…">download the ARK Studios app</a>. iPhone: tap Share in Safari, then “Add to Home Screen”.`, with the stable APK link from Global Constraints written out literally.

- [ ] **Step 6: Browser check (web path unchanged)**

Expected: back navigation in the preview still works through browser back, the service worker registers (DevTools → Application), and Save backup file still downloads.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Add native bridge for back button, system bars and backup sharing"
```

---

### Task 6: Update check and banner

**Files:**
- Create: `www/js/update.js`, `test/update.test.js`
- Modify: `www/index.html`

**Interfaces:**
- Consumes: `APP_VERSION`, `ArkNative.isNative()`, `ArkNative.onResume(fn)`.
- Produces, on `window.ArkUpdate` and `module.exports`: `APK_URL`, `RELEASES_API = 'https://api.github.com/repos/Romank12-vs/ark-studios/releases/latest'`, `parseVersion(tag) → [maj, min, patch]|null`, `isNewer(remoteTag, current) → boolean`, `shouldCheck(lastCheckAt, now) → boolean`, `bannerFor(release, current, dismissed) → {version, url}|null`, `checkForUpdate({now, lastCheckAt, current, dismissed, fetchFn}) → Promise<null | {checkedAt, banner}>`.
- New settings fields (spec 4.3): `settings.lastUpdateCheckAt`, `settings.updateDismissedVersion`.

- [ ] **Step 1: Write the failing test `test/update.test.js`**

```js
const test = require('node:test'); const assert = require('node:assert/strict');
const U = require('../www/js/update.js');
const DAY = 86400000, now = 1762600000000;
test('constants', () => assert.equal(U.APK_URL, 'https://github.com/Romank12-vs/ark-studios/releases/latest/download/ARK-Studios.apk'));
test('parseVersion', () => {
  assert.deepEqual(U.parseVersion('v1.2.3'), [1,2,3]);
  assert.deepEqual(U.parseVersion('1.2.3'), [1,2,3]);
  for (const bad of ['1.2', 'v1.0.0-beta', 'garbage', undefined, null]) assert.equal(U.parseVersion(bad), null);
});
test('isNewer', () => {
  assert.equal(U.isNewer('v1.0.1', '1.0.0'), true);
  assert.equal(U.isNewer('v1.10.0', '1.9.0'), true);
  assert.equal(U.isNewer('v1.0.0', '1.0.0'), false);
  assert.equal(U.isNewer('v0.9.9', '1.0.0'), false);
  assert.equal(U.isNewer('garbage', '1.0.0'), false);
});
test('shouldCheck: at most once a day', () => {
  assert.equal(U.shouldCheck(undefined, now), true);
  assert.equal(U.shouldCheck(now - DAY + 1, now), false);
  assert.equal(U.shouldCheck(now - DAY, now), true);
});
test('bannerFor', () => {
  assert.deepEqual(U.bannerFor({tag_name:'v1.1.0'}, '1.0.0'), {version:'1.1.0', url:U.APK_URL});
  assert.equal(U.bannerFor({tag_name:'v1.1.0'}, '1.0.0', '1.1.0'), null);
  assert.equal(U.bannerFor({message:'API rate limit exceeded'}, '1.0.0'), null);
  assert.equal(U.bannerFor(null, '1.0.0'), null);
});
test('checkForUpdate is silent on failure and skips when checked today', async () => {
  const base = {now, current:'1.0.0', lastCheckAt:undefined};
  assert.deepEqual(await U.checkForUpdate({...base, fetchFn: () => Promise.reject(new Error('offline'))}), {checkedAt:now, banner:null});
  assert.deepEqual(await U.checkForUpdate({...base, fetchFn: async () => ({ok:false, json: async () => ({})})}), {checkedAt:now, banner:null});
  assert.deepEqual(await U.checkForUpdate({...base, fetchFn: async () => ({ok:true, json: async () => ({tag_name:'v1.1.0'})})}), {checkedAt:now, banner:{version:'1.1.0', url:U.APK_URL}});
  let called = false;
  assert.equal(await U.checkForUpdate({...base, lastCheckAt: now - 1000, fetchFn: async () => { called = true; }}), null);
  assert.equal(called, false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '../www/js/update.js'`.

- [ ] **Step 3: Implement `www/js/update.js`**

`parseVersion` accepts only `/^v?(\d+)\.(\d+)\.(\d+)$/`. `checkForUpdate` returns `null` when `!shouldCheck`. Otherwise it calls `fetchFn(RELEASES_API, {headers: {Accept: 'application/vnd.github+json'}})` and returns `{checkedAt: now, banner}`, where `banner` is `null` on any error or non-ok response.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Wire the banner (APK only)**

On startup and on `ArkNative.onResume`, when `ArkNative.isNative()`, run `checkForUpdate({now: Date.now(), lastCheckAt: settings.lastUpdateCheckAt, current: APP_VERSION, dismissed: settings.updateDismissedVersion, fetchFn: fetch})`. On a non-null result, save `lastUpdateCheckAt`, keep `ui.update = banner`, and re-render.
Home shows the banner at the top: `ARK Studios {version} is available` with a `Download` link (`href=url`, so Capacitor opens it in the browser) and a `Not now` button that saves `updateDismissedVersion = version` and hides it. Use existing `.list`/`.btn` styles.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Add once-a-day update check with an in-app banner"
```

- [ ] **Step 7: Browser check with a temporary edit**

In the update wiring, temporarily replace `ArkNative.isNative()` with `true` and `fetch` with `async () => ({ok: true, json: async () => ({tag_name: 'v9.9.9'})})`. Clear `lastUpdateCheckAt` in localStorage, then reload.
Expected: the banner reads "ARK Studios 9.9.9 is available", "Not now" hides it, and it stays hidden after reload. Then run `git restore www/index.html` and confirm `git status` is clean. If the check found a bug, fix it and commit again.

---

### Task 7: Capacitor Android project and launcher icons

**Files:**
- Create: `capacitor.config.json`, `android/` (generated), `assets/icon.svg`, `assets/icon-foreground.svg`, `scripts/make-icons.js`, `assets/icon-only.png`, `assets/icon-foreground.png`, `assets/icon-background.png`
- Modify: `package.json`, `android/app/build.gradle`, `test/branding.test.js`

**Interfaces:**
- Produces: an `android/` project that `./gradlew assembleRelease -PversionName=X.Y.Z -PversionCode=N` builds, signed when env vars `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_ALIAS` are set (PKCS12, key password = store password). Without them it builds unsigned, so local builds still work.

- [ ] **Step 1: Install Capacitor**

Run: `npm install --save-exact @capacitor/core@8.6.0 @capacitor/android@8.6.0 @capacitor/app@8.1.2 @capacitor/filesystem@<latest 8.x> @capacitor/share@<latest 8.x>` and `npm install --save-dev --save-exact @capacitor/cli@8.6.0 @capacitor/assets@4.0.0`. Get the two `<latest 8.x>` versions from `npm view @capacitor/filesystem version` and `npm view @capacitor/share version`. If either's major isn't 8, use `npm view <pkg>@8 version` and take the highest.
Expected: `package.json` has exact versions only.

- [ ] **Step 2: Create `capacitor.config.json`**

```json
{ "appId": "com.arkstudios.app", "appName": "ARK Studios", "webDir": "www",
  "backgroundColor": "#FBF4F0",
  "plugins": { "SystemBars": { "insetsHandling": "css" } } }
```

With `insetsHandling: "css"` and the page's existing `viewport-fit=cover` + `env(safe-area-inset-*)` CSS, WebView ≥ 140 renders edge-to-edge with real insets, and older WebViews get padded natively, so nothing sits under the bars.

- [ ] **Step 3: Generate the Android project**

Run: `npx cap add android`
Expected: `android/` exists; `android/variables.gradle` shows `minSdkVersion = 24` and `targetSdkVersion = 36`; `android/app/src/main/res/values/strings.xml` has `app_name` `ARK Studios`.

- [ ] **Step 4: Recreate the icon as SVG and render the inputs**

- `assets/icon.svg`: 1024×1024. Square background in the colour sampled from `www/icons/icon-512.png` (expect ≈ `#B4236B`). Five rounded bars, coordinates doubled from the 512 px original: bar width ≈ 92, radius ≈ 24, left edges ≈ 180/324/466/610/752, common bottom ≈ 800, tops ≈ 600/460/320/518/404. Bars 1, 2, 4 and 5 use the cream colour and bar 3 the gold, both sampled from the PNG.
- `assets/icon-foreground.svg`: the bars only, on transparent, scaled to 66% around the centre (the adaptive-icon safe zone).
- `scripts/make-icons.js`: uses `sharp` (add it as an exact-pinned devDependency) to render `icon-only.png` and `icon-foreground.png` at 1024 px, and `icon-background.png` as a solid 1024 px square in the background colour.

Run: `node scripts/make-icons.js`
Then compare `assets/icon-only.png` side by side with `www/icons/icon-512.png`.
Expected: same artwork.

- [ ] **Step 5: Generate Android icons**

Run: `npx capacitor-assets generate --android`
Expected: `android/app/src/main/res/mipmap-*` updated, including `ic_launcher_foreground` and `ic_launcher_background`. If the tool insists on splash inputs, render `assets/splash.png` / `splash-dark.png` at 2732 px (icon centred on `#FBF4F0` / `#1B1120`) with the same script and run it again.

- [ ] **Step 6: Version and signing in `android/app/build.gradle`**

- `defaultConfig`: `versionCode (project.findProperty('versionCode') ?: '1') as Integer` and `versionName (project.findProperty('versionName') ?: '0.0.0')`.
- `signingConfigs.release`: reads the three env vars above. In `buildTypes.release`, apply `signingConfig signingConfigs.release` only when `System.getenv('ANDROID_KEYSTORE_PATH')` is set. `minifyEnabled false`.

- [ ] **Step 7: Extend the branding test**

Add to `test/branding.test.js`:

```js
test('android app name and id', () => {
  assert.match(fs.readFileSync('android/app/src/main/res/values/strings.xml', 'utf8'), /<string name="app_name">ARK Studios<\/string>/);
  assert.match(fs.readFileSync('android/app/build.gradle', 'utf8'), /applicationId "com\.arkstudios\.app"/);
});
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Sync and commit**

Run: `npx cap sync android` (expected: copies `www/` and registers App, Filesystem and Share). Confirm `android/.gitignore` (from the template) excludes `app/src/main/assets/public`. Then:

```bash
git add -A && git commit -m "Add Capacitor Android shell with ARK Studios icons and signing hooks"
```

---

### Task 8: Version script and CI workflows

**Files:**
- Create: `scripts/version.js`, `test/version.test.js`, `.github/workflows/pages.yml`, `.github/workflows/release.yml`

**Interfaces:**
- Produces: `versionCode(tag) → number` (throws `Error('bad-tag')`), `versionName(tag) → 'X.Y.Z'`, `tagMatches(tag, appVersion) → boolean`, exported via `module.exports`. CLI: `node scripts/version.js check <tag>` (exit 1 with the message `Tag <tag> does not match APP_VERSION <v>` on mismatch), `node scripts/version.js code <tag>`, `node scripts/version.js name <tag>`.

- [ ] **Step 1: Write the failing test `test/version.test.js`**

```js
const test = require('node:test'); const assert = require('node:assert/strict');
const V = require('../scripts/version.js');
test('versionCode', () => {
  assert.equal(V.versionCode('v1.0.0'), 10000);
  assert.equal(V.versionCode('v1.2.3'), 10203);
  assert.ok(V.versionCode('v1.10.0') > V.versionCode('v1.9.9'));
  for (const bad of ['v1.0', '1.0.0-beta', 'v1.100.0', 'v1.0.100', 'main']) assert.throws(() => V.versionCode(bad), /bad-tag/);
});
test('versionName and tagMatches', () => {
  assert.equal(V.versionName('v1.2.3'), '1.2.3');
  assert.equal(V.tagMatches('v1.0.0', '1.0.0'), true);
  assert.equal(V.tagMatches('v1.0.1', '1.0.0'), false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '../scripts/version.js'`.

- [ ] **Step 3: Implement `scripts/version.js`**

Accept only `/^v(\d+)\.(\d+)\.(\d+)$/` with minor ≤ 99 and patch ≤ 99. `check` reads `APP_VERSION` via `require('../www/js/version.js')`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write `.github/workflows/pages.yml`**

- Triggers: push to `main`, plus `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`. Concurrency group `pages`.
- Steps: checkout, `configure-pages`, `upload-pages-artifact` with `path: www`, then `deploy-pages` in a job with `environment: github-pages`.
- Use each action's current major tag, looked up with `gh api repos/actions/<name>/releases/latest --jq .tag_name`.

- [ ] **Step 6: Write `.github/workflows/release.yml`**

- Trigger: push of tags `v*`. Runs on `ubuntu-latest` (Android SDK preinstalled). Permissions: `contents: write`.
- Steps, in order:
  1. checkout
  2. setup-node 22 with npm cache
  3. setup-java 21 temurin with gradle cache
  4. `npm ci`
  5. `npm test`
  6. `node scripts/version.js check "$GITHUB_REF_NAME"`
  7. `npx cap sync android`
  8. Decode `secrets.ANDROID_KEYSTORE_BASE64` to `$RUNNER_TEMP/release.jks` and export `ANDROID_KEYSTORE_PATH`, plus `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_ALIAS` from secrets.
  9. `chmod +x android/gradlew`
  10. `cd android && ./gradlew assembleRelease -PversionName=$(node ../scripts/version.js name $GITHUB_REF_NAME) -PversionCode=$(node ../scripts/version.js code $GITHUB_REF_NAME)`
  11. Copy `android/app/build/outputs/apk/release/app-release.apk` to `ARK-Studios.apk`
  12. `gh release create "$GITHUB_REF_NAME" ARK-Studios.apk --title "ARK Studios ${GITHUB_REF_NAME#v}" --notes "Install or update: download ARK-Studios.apk below and open it."` with `GH_TOKEN: ${{ github.token }}`
- Fail the job if the APK isn't signed: before step 12, run `"$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)/apksigner" verify ARK-Studios.apk`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Add version script, Pages deploy and signed APK release workflows"
```

---

### Task 9: Publish: repo, signing secrets, Pages, first release

**Files:**
- Outside the repo: `C:\Users\DELL\ark-studios-signing\ark-studios-release.jks`, `C:\Users\DELL\ark-studios-signing\signing-info.txt`
- Repo-local git config only.

- [ ] **Step 1: Create the public repo with the personal account**

Run: `GH_TOKEN="$(gh auth token --user Romank12-vs)" gh repo create Romank12-vs/ark-studios --public --description "ARK Studios: choreography studio app (Android + web)" --source . --remote origin`
Expected: `git remote get-url origin` prints `https://github.com/Romank12-vs/ark-studios.git`.

- [ ] **Step 2: Make this repo always push as the personal account**

```bash
git config --local credential.helper ""
git config --local --add credential.helper '!f() { test "$1" = get && echo username=Romank12-vs && echo "password=$(gh auth token --user Romank12-vs)"; }; f'
```

Expected: `git config --local --get-all credential.helper` shows the empty reset line and then the function; the global config is untouched.

- [ ] **Step 3: Pre-push checks, then push**

Run: `git log --format='%an <%ae>' | sort -u` (expect only the Romank Sadhwani noreply identity), `git grep -i -e "$WORK_ORG"` and `git log --format=%B | grep -i -e "$WORK_ORG"` (expect no output from either; `WORK_ORG` comes from session memory, see Global Constraints). Then `git push -u origin main`.
Expected: push succeeds; `pages.yml` starts. It will fail until Step 4. Rerun it after.

- [ ] **Step 4: Enable Pages from Actions**

Run: `GH_TOKEN="$(gh auth token --user Romank12-vs)" gh api -X POST repos/Romank12-vs/ark-studios/pages -f build_type=workflow`, then rerun the Pages workflow (`gh workflow run pages.yml --repo Romank12-vs/ark-studios` with the same `GH_TOKEN`).
Expected: `curl -s -o /dev/null -w '%{http_code}' https://romank12-vs.github.io/ark-studios/` prints `200` within a few minutes.

- [ ] **Step 5: Generate the signing key (once, ever)**

Create `C:\Users\DELL\ark-studios-signing\`. Generate a password with `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`, keeping it in a shell variable and never printing it to the chat. Then run `keytool -genkeypair -keystore ark-studios-release.jks -storetype PKCS12 -alias arkstudios -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=ARK Studios, C=IN" -storepass "$PW" -keypass "$PW"`. Write `signing-info.txt` with the alias, the password, the app ID, and a one-line warning that losing this file means future updates can't install over the app.
Expected: `keytool -list -keystore … -storepass "$PW"` shows one `arkstudios` entry.

- [ ] **Step 6: Store the secrets**

With the personal `GH_TOKEN`, run:
- `base64 -w0 ark-studios-release.jks | gh secret set ANDROID_KEYSTORE_BASE64 --repo Romank12-vs/ark-studios`
- `printf %s "$PW" | gh secret set ANDROID_KEYSTORE_PASSWORD --repo Romank12-vs/ark-studios`
- `gh secret set ANDROID_KEY_ALIAS --repo Romank12-vs/ark-studios --body arkstudios`

Expected: `gh secret list --repo Romank12-vs/ark-studios` shows all three.

- [ ] **Step 7: Tag and release v1.0.0**

Run: `git tag v1.0.0 && git push origin v1.0.0`, then watch with `GH_TOKEN=… gh run watch --repo Romank12-vs/ark-studios`.
Expected: the release workflow passes, and `curl -sIL https://github.com/Romank12-vs/ark-studios/releases/latest/download/ARK-Studios.apk` ends in `HTTP/2 200` with a `content-length` of several MB.

- [ ] **Step 8: Tell the owner to back up the signing folder**

Ask them to copy `C:\Users\DELL\ark-studios-signing\` (both files) into their Google Drive now.

---

### Task 10: On-phone acceptance (owner)

- [ ] **Step 1: Install**

On the phone, open the stable APK link in Chrome, allow installs from Chrome when asked, and install.
Expected: the launcher shows the bars icon labelled "ARK Studios".

- [ ] **Step 2: Run the spec 5 checklist and report each result**

1. Airplane mode on: first launch shows proper fonts.
2. Nothing hidden under the status bar or navigation bar, in light and dark themes.
3. Back closes an open sheet on Home, goes back from a client screen, and exits from a root tab.
4. Send update opens WhatsApp with the text; Call opens the dialer; Reference video and Add to calendar open the right apps.
5. Settings → Save backup file opens the share sheet, and saving to Drive works.
6. Restore from file restores a backup made in the old web version.
7. No "Taal" anywhere; Settings footer shows `ARK Studios 1.0.0`.
8. The web link `https://romank12-vs.github.io/ark-studios/` opens in Chrome on Android (and in Safari on an iPhone if one is handy) and offers to install.

- [ ] **Step 3: Check updates keep data**

Bump `APP_VERSION` in `www/js/version.js` to `1.0.1`, commit, tag `v1.0.1` and push. Then on the phone:
Expected: the banner appears, and installing over the old app keeps all data.
