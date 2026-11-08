# ARK Studios v1.1 (simpler "iOS warm" UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every screen of ARK Studios around a Today-first layout in the approved "iOS warm" style, with fewer taps, roomier text, swipe shortcuts, haptics and a fixed top inset, without losing any existing capability.

**Architecture:** The app stays vanilla HTML/JS without a bundler. Styles move to `www/css/app.css`. New pure logic goes in small tested classic-script modules (`www/js/today.js`, `www/js/swipe.js`, additions to `core.js` and `native.js`). The views and sheets in `www/index.html` are rewritten one screen per task, keeping the existing `data-act` click-delegation pattern so every action survives.

**Tech Stack:** Vanilla JS, CSS custom properties, Node 22+ built-in test runner, Capacitor 8.6.0 plus `@capacitor/haptics` 8.0.2, the View Transitions API where available.

**Spec:** `docs/superpowers/specs/2026-11-08-ark-studios-ios-warm-ui-design.md` (and the v1.0 spec for everything this one leaves unchanged).

## Global Constraints

- Nothing the app can do today is removed, only moved. Data, storage keys (`taal-v2`), backups, WhatsApp template text and variables are unchanged.
- Four tabs: **Today, Clients, Money, Settings**. Internal route keys stay `home`, `clients`, `money`, `more`.
- Colours: page `#FBF4F0`, cards `#FFFFFF`, ink `#2A1730`, muted `#75617A`, accent `#B4236B`, gold `#F2B940`, WhatsApp `#1E8A4B`, warning `#C2410C`, plus the existing dark palette. Separators 0.5 px.
- Body/UI font `-apple-system, "SF Pro Text", Roboto, "Segoe UI", sans-serif`. Large titles and client names use Rozha One. Bricolage Grotesque is removed.
- Sizes: body 17 px, secondary 15 px, nothing below 13 px; large title 30 px, client name 28 px; every tap target at least 44 × 44 px.
- Inset grouped lists: white, 16 px corners, 16 px side margins, 13 px muted sentence-case section headers.
- Top inset: `--safe-top: max(env(safe-area-inset-top, 0px), var(--safe-area-inset-top, 0px))`; the first element of every screen sits at `--safe-top + 12px`. The same pattern applies at the bottom for `--safe-bottom`.
- Swipe action width 76 px; axis lock at 8 px; a sheet closes when dragged down more than 120 px.
- All motion is skipped under `prefers-reduced-motion: reduce`.
- Exact pinned versions only; `@capacitor/haptics` at `8.0.2`.
- Commits use the repo-local identity and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `v1.1-ui`. Nothing is pushed or tagged until the owner says so.
- Never write the owner's employer name into any repo file (see the v1.0 plan's `WORK_ORG` check).

## Review Focus

1. **Diagonal drags on a real touch screen**: a mostly vertical drag must scroll and never half-open a row, and a sideways swipe must never scroll the page sideways → Task 4 tests `swipeDecision` on diagonal and short moves; Task 14 phone check.
2. **Nothing to show**: no clients, no rehearsals today or later, nothing due. Today must show calm empty states ("All caught up", no next rehearsal line) and never a blank or broken section → Task 3 tests empty inputs; Task 7 browser check runs with an empty state.
3. **Long names at 360 px** (client "St. Mary's Convent High School, Bandra West", long song titles): one line with an ellipsis, buttons stay on screen, no sideways page scroll → `uiAudit()` (Task 5) runs with the long-name fixture in Tasks 7–11.
4. **Incomplete client records** (no event date, no phone, no songs, cancelled status): no wrong Needs-attention rows, no crash, no Call button without a phone → Task 3 tests; Task 9 browser check on a phoneless client.
5. **A capability silently dropped in the rewrite** (status change, performance reorder, practice-video share, thank-you message, restore from text): the frozen action list in `test/actions.test.js` (Task 1) runs on every task.

---

### Task 1: Branch, action guard, haptics

**Files:**
- Create: `test/actions.test.js`
- Modify: `www/js/native.js`, `test/native.test.js`, `package.json`, `package-lock.json`

**Interfaces:**
- Produces: `ArkNative.tap(): void` (light haptic in the app, `navigator.vibrate(10)` on the web when present, otherwise nothing; never throws).

- [ ] **Step 1: Create the branch**

Run: `git switch -c v1.1-ui`
Expected: `git branch --show-current` prints `v1.1-ui`.

- [ ] **Step 2: Write `test/actions.test.js`**

Two tests:
1. `every v1.0 action still has a handler` asserts that each name in this frozen list appears as `case '<name>'` in `www/index.html`: `back clientsFilter close compose copyBackup copyMsg ctab delCharge delClient delPay delPerf delReh delSong dismissUpdate doRestore editCharge editClient editPay editPerf editReh editSong exportFile importPick movePerf nav newCharge newClient newPay newPerf newReh newSong open resetTpl restorePaste sample saveCharge saveClient savePay savePerf saveReh saveSong schedSeg setPref setStatus shareTut toastAct todo todoStage toggle tpl wipe`.
2. `every handler is reachable` asserts that every `case '<name>'` in the click `switch` also appears in markup as `data-act="<name>"` or as the first element of an entry in the FAB map (`['newClient', …]`).

- [ ] **Step 3: Run it**

Run: `npm test`
Expected: PASS. This is a characterization guard. Prove it can fail: temporarily rename one `data-act="shareTut"` in `index.html`, watch test 2 fail, then revert.

- [ ] **Step 4: Write the failing haptics tests in `test/native.test.js`**

```js
test('tap uses Capacitor Haptics in the app', () => {
  const calls = [];
  global.window = { Capacitor: { isNativePlatform: () => true, Plugins: { Haptics: { impact: o => calls.push(o) } } } };
  N.tap();
  delete global.window;
  assert.deepEqual(calls, [{ style: 'LIGHT' }]);
});
test('tap falls back to vibrate on the web and never throws', () => {
  const calls = [];
  global.window = {}; global.navigator = { vibrate: ms => calls.push(ms) };
  N.tap();
  delete global.window; delete global.navigator;
  assert.deepEqual(calls, [10]);
  assert.doesNotThrow(() => N.tap());
});
```

`global.navigator` may be read-only in Node 22+. If so, set it with `Object.defineProperty(globalThis, 'navigator', {value: …, configurable: true})` and restore it afterwards.

- [ ] **Step 5: Run to verify they fail**

Run: `node --test test/native.test.js`
Expected: FAIL with `N.tap is not a function`.

- [ ] **Step 6: Implement `tap()` in `www/js/native.js` and add the plugin**

Wrap both paths in try/catch. Run `npm install --save-exact @capacitor/haptics@8.0.2`, then `npx cap sync android`.
Expected: the sync output lists 4 plugins, including `@capacitor/haptics@8.0.2`.

- [ ] **Step 7: Run tests and commit**

Run: `npm test`
Expected: all pass.

```bash
git add -A && git commit -m "Add action guard test and haptic tap"
```

---

### Task 2: Next-step labels in `core.js`

**Files:**
- Modify: `www/js/core.js`, `test/core.test.js`

**Interfaces:**
- Produces, exported: `nextStepKey(song) → 'final'|'edit'|'choreo'|'teach'|'practice'|null`, `nextStepLabel(song) → 'Finalise next'|'Edit next'|'Choreograph next'|'Teach next'|'Practise next'|'Ready'`, `nextStepDoneLabel(song) → 'Finalised'|'Edited'|'Choreographed'|'Taught'|'Practised'|null`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/core.test.js`
Expected: FAIL with `C.nextStepKey is not a function`.

- [ ] **Step 3: Implement the three functions**

Build them on the existing `nextIdx` and `STEPS`, and add them to the exported `api`.

- [ ] **Step 4: Run tests and commit**

Run: `npm test`
Expected: all pass.

```bash
git add -A && git commit -m "Add next-step labels to core"
```

---

### Task 3: `today.js`: agenda and needs attention

**Files:**
- Create: `www/js/today.js`, `test/today.test.js`
- Modify: `www/index.html` (load `js/today.js` after `core.js`), `www/sw.js` (add `./js/today.js` to `SHELL`)

**Interfaces:**
- Consumes: `TaalCore` (`songsOf`, `readyOf`, `totals`, `money`, `fmtDate`). Under Node, use `require('./core.js')`; in the browser, `window.TaalCore`.
- Produces, on `window.ArkToday` and `module.exports`:
  - `todayAgenda(state, today) → {items: Array<{kind:'event', client} | {kind:'rehearsal', client, rehearsal}>, next: {client, rehearsal} | null}`
  - `needsAttention(state, today) → Array<{kind:'rehearsal'|'songs'|'due'|'enquiry', clientId, rehearsalId?, title, detail, tone:'warn'|'gold'|'muted'}>`
  - `today` is an ISO date string. Neither function reads the clock.

Rules, which the tests pin:
- **Cancelled clients never appear.**
- **`todayAgenda.items`**: events whose date is `today`, then rehearsals dated `today` whose status isn't `cancelled`, sorted by time with empty times last.
- **`todayAgenda.next`**: the earliest `planned` rehearsal dated after `today`, or `null`.
- **`needsAttention`**: groups in this order, at most 5 rows in total:
  1. `rehearsal`: `planned` rehearsals dated from `today − 14` to `today − 1`, oldest first. Title `Mark <Weekday>'s rehearsal done?` (long weekday, `en-IN`), detail = client name, tone `muted`.
  2. `songs`: clients that are `booked` or `enquiry`, with an event from `today` to `today + 14` and at least one unready song (and at least one song), soonest first. Title `<event or name> · <today|tomorrow|N days>`, detail `<n> song(s) not ready`. Tone `warn` if 7 days or fewer, otherwise `gold`.
  3. `due`: clients that are `booked` or `done`, with balance > 0, and either status `done` or an event set ≤ 7 days ahead (past included); most overdue first. Title = client name, detail `₹X due` (via `money`), tone `warn`.
  4. `enquiry`: status `enquiry` with no date or a date ≥ `today`; dated soonest first, undated last. Title = client name, detail `Enquiry · follow up`, tone `gold`.

- [ ] **Step 1: Write the failing tests in `test/today.test.js`**

Use a helper `client(o)` that fills defaults (`status:'booked'`, empty arrays, `createdAt:0`) and `T = '2026-11-08'` (a Sunday). Tests:
- `empty state`:
  - `todayAgenda({clients:[]}, T)` deep-equals `{items:[], next:null}`
  - `needsAttention({clients:[]}, T)` deep-equals `[]`
- `agenda`: one event today plus rehearsals today at `18:30`, `''` and `09:00` (one cancelled) gives items in order event, 09:00, 18:30, `''` with the cancelled one absent. `next` is the earliest planned rehearsal after T, ignoring one dated T and one cancelled.
- `stale rehearsal`: a planned rehearsal on `2026-11-03` gives `{kind:'rehearsal', title:"Mark Tuesday's rehearsal done?", tone:'muted'}`. One on `2026-10-20` (19 days ago) and one with status `done` give nothing.
- `songs`:
  - an event on `2026-11-24` with 6 songs, 1 ready, gives `title:'<event> · 16 days'`, `detail:'5 songs not ready'`, `tone:'gold'`
  - the same client on `2026-11-12` gives `4 days` and `tone:'warn'`
  - a client with no songs, or with no date, gives nothing
- `due`:
  - status `done` with balance 25000 gives `detail:'₹25,000 due'`
  - booked with balance and event in 30 days gives nothing
  - booked with balance and event 2 days ago gives the row
  - balance 0 gives nothing
- `enquiry`: a dated future enquiry comes before an undated one; an enquiry whose date is in the past gives nothing.
- `order and cap`: a state producing 2 rehearsal, 2 songs, 2 due and 2 enquiry rows returns exactly 5, with kinds `['rehearsal','rehearsal','songs','songs','due']`.
- `cancelled clients ignored`: a cancelled client meeting every rule produces nothing in either function.

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/today.test.js`
Expected: FAIL with `Cannot find module '../www/js/today.js'`.

- [ ] **Step 3: Implement `www/js/today.js`**

Same classic-script shape as `update.js`. Use a local `dayDiff(fromISO, toISO)` that computes whole days from `T00:00:00` dates rather than `daysLeft`, which reads the clock.

- [ ] **Step 4: Run tests and commit**

Run: `npm test`
Expected: all pass, including the offline-shell test, which requires `./js/today.js` in `SHELL` once the script tag exists.

```bash
git add -A && git commit -m "Add Today agenda and needs-attention rules"
```

---

### Task 4: `swipe.js`: swipe decisions and row behaviour

**Files:**
- Create: `www/js/swipe.js`, `test/swipe.test.js`
- Modify: `www/index.html` (load it), `www/sw.js` (`SHELL`)

**Interfaces:**
- Produces, on `window.ArkSwipe` and `module.exports`:
  - `swipeDecision({dx, dy, vx, width, open, end}) → {axis:'x'|'y'|null, offset:number, state:'open'|'closed'|'moving'}`
  - `attachSwipe(root, onAction?)` (DOM): rows are `<div class="swipe" data-swipe>` containing `.swipe-act` (one `<button data-act=…>`, 76 px) and `.swipe-front` (the row content). It translates `.swipe-front` by `offset`, keeps one row open at a time, and closes the open row on any tap outside it. It calls `onAction()` when a revealed action button is clicked (the click itself still reaches the normal `data-act` handler); the caller passes `ArkNative.tap`, so a swipe action that runs gives a haptic.

`swipeDecision` rules:
- `base = open ? -width : 0`
- While `max(|dx|,|dy|) < 8`: `{axis:null, offset:base, state: open?'open':'closed'}`.
- Then `axis = |dx| > |dy| ? 'x' : 'y'`. For `'y'`, offset stays `base` and state stays as before.
- For `'x'`: `offset = clamp(base + dx, -width, 0)`, and `state:'moving'` until `end`.
- At `end`: `open` if `vx < -0.5` (px/ms) or (`-offset > width/2` and `vx <= 0.5`), otherwise `closed`. The offset snaps to `-width` or `0`.

- [ ] **Step 1: Write the failing tests**

```js
const W = 76;
test('small moves do nothing', () => assert.deepEqual(S.swipeDecision({dx:-5, dy:3, vx:0, width:W, open:false, end:false}), {axis:null, offset:0, state:'closed'}));
test('vertical drags scroll', () => assert.deepEqual(S.swipeDecision({dx:-30, dy:40, vx:0, width:W, open:false, end:true}), {axis:'y', offset:0, state:'closed'}));
test('follows the finger and clamps', () => {
  assert.equal(S.swipeDecision({dx:-30, dy:5, vx:0, width:W, open:false, end:false}).offset, -30);
  assert.equal(S.swipeDecision({dx:-200, dy:5, vx:0, width:W, open:false, end:false}).offset, -W);
  assert.equal(S.swipeDecision({dx:40, dy:0, vx:0, width:W, open:false, end:false}).offset, 0);
});
test('settles open past half or on a flick', () => {
  assert.deepEqual(S.swipeDecision({dx:-50, dy:5, vx:-0.1, width:W, open:false, end:true}), {axis:'x', offset:-W, state:'open'});
  assert.deepEqual(S.swipeDecision({dx:-20, dy:2, vx:-0.8, width:W, open:false, end:true}), {axis:'x', offset:-W, state:'open'});
  assert.deepEqual(S.swipeDecision({dx:-20, dy:2, vx:-0.1, width:W, open:false, end:true}), {axis:'x', offset:0, state:'closed'});
});
test('an open row closes when swiped right', () => assert.deepEqual(S.swipeDecision({dx:50, dy:4, vx:0.6, width:W, open:true, end:true}), {axis:'x', offset:0, state:'closed'}));
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/swipe.test.js`
Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `swipeDecision` and `attachSwipe`**

`attachSwipe` uses pointer events on `root` (delegated to `[data-swipe]`) and calls `setPointerCapture` once the axis is `'x'`. Add CSS `touch-action: pan-y` on `.swipe-front`. Offsets transition at 0.2 s except while dragging (none under reduced motion). Velocity is measured over the last 80 ms of moves.

- [ ] **Step 4: Run tests and commit**

Run: `npm test`
Expected: all pass.

```bash
git add -A && git commit -m "Add swipe decisions and swipe rows"
```

---

### Task 5: Style foundation

**Files:**
- Create: `www/css/app.css`, `test/style.test.js`, `scripts/ui-audit.browser.js`, `test/fixtures/long-names-state.json`
- Modify: `www/index.html` (replace the `<style>` block with `<link rel="stylesheet" href="css/app.css">`), `www/fonts/fonts.css`, `scripts/fetch-fonts.js`, `www/sw.js`
- Delete: `www/fonts/bricolage-grotesque-latin.woff2`, `www/fonts/bricolage-grotesque-latin-ext.woff2`, `www/fonts/OFL-BricolageGrotesque.txt`

**Interfaces:**
- Produces:
  - CSS tokens `--safe-top`, `--safe-bottom`, `--font-ui`, `--font-title`, `--radius-card` (16px), `--radius-ctl` (12px), `--hair` (0.5px)
  - Component classes for later tasks: `.large-title`, `.group` (inset grouped list), `.group-head` (section header), `.row` (≥ 44 px list row with `.row-main`, `.row-sub`, `.row-end`), `.seg` (segmented control), `.btn` / `.btn.primary` / `.btn.wa` (≥ 44 px), `.chip`, `.card-accent` (magenta card), `.fab` (56 px round), plus `.swipe`, `.swipe-act` and `.swipe-front`
  - `window.uiAudit() → {smallText: string[], smallTargets: string[], overflowX: boolean}`, defined by `scripts/ui-audit.browser.js` for browser checks (it isn't loaded by the app)

- [ ] **Step 1: Write the failing test `test/style.test.js`**

- `safe-top combines env and Capacitor's variable`: `app.css` matches `/--safe-top:\s*max\(env\(safe-area-inset-top,\s*0px\),\s*var\(--safe-area-inset-top,\s*0px\)\)/`.
- `no Bricolage anywhere`: no file under `www/` (html, css, js, json, webmanifest) contains `Bricolage`, and no `bricolage*` file exists in `www/fonts`.
- `no text below 13px`: every `font-size` in `app.css` is ≥ 13 px (px values) or ≥ 0.8125 rem (rem values). Ignore `%` and `em`.
- `system font for UI`: `app.css` defines `--font-ui` starting with `-apple-system`, and `body` uses `var(--font-ui)` at 17px.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/style.test.js`
Expected: FAIL (no `www/css/app.css`).

- [ ] **Step 3: Build `app.css`**

1. Move the current `<style>` contents across verbatim.
2. Add the tokens and component classes listed above, using the Global Constraints values.
3. Switch `body` to `var(--font-ui)` at 17px.
4. Replace every `env(safe-area-inset-*)` use with `var(--safe-top)` / `var(--safe-bottom)`: root padding, the frosted status strip, the sticky top bar's `top`, sheets, tab bar, FAB, toast.
5. Make the first element of every screen start 12 px below `--safe-top`: `.pagehead`, `.large-title` and the top bar get `margin-top: 12px`.
6. Raise any size below 13 px to `0.8125rem`.

Then:
- Remove the Bricolage blocks from `fonts.css` and the Bricolage family from `CSS_URL` in `fetch-fonts.js`.
- Delete the three Bricolage files.
- Update `SHELL`: add `./css/app.css`, remove the Bricolage files, and bump `CACHE` to `ark-studios-v3`.

- [ ] **Step 4: Write `scripts/ui-audit.browser.js` and the long-names fixture**

`uiAudit()`:
- **smallText:** visible elements with their own text node and a computed `font-size` < 13 px.
- **smallTargets:** visible `button`, `a[href]`, `[data-act]`, `input`, `select` and `summary` whose box is under 44 px tall or wide, excluding links inside running text (`p a`).
- **overflowX:** `document.documentElement.scrollWidth > innerWidth`.

Each entry names the element (tag, class, first 20 characters of text).

`long-names-state.json`: the v2 fixture plus a client named `St. Mary's Convent High School, Bandra West` with event `Annual day celebration and prize distribution`, a song titled `Chaiyya Chaiyya (extended edit with dhol outro)`, and no phone.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all pass, including offline-shell with the new `SHELL`.

- [ ] **Step 6: Browser check**

Run `npm run serve`, open the preview at 360 × 780, load sample data and visit every screen. Paste and run `scripts/ui-audit.browser.js`, then `uiAudit()`.
Expected: no console errors; the old layout still works with the system font; `smallText` is `[]`. `smallTargets` may still list old controls, which later tasks fix; record them in the ledger.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Move styles to app.css, add iOS-warm tokens and safe-area insets, drop Bricolage"
```

---

### Task 6: Navigation shell

**Files:**
- Modify: `www/index.html` (`TABS`, `ICON`, `render`, `go`, `back`, popstate, FAB, new helper), `www/css/app.css`

**Interfaces:**
- Consumes: `.large-title` and `.fab` (Task 5).
- Produces:
  - `TABS = [['home','Today','sun'], ['clients','Clients','users'], ['money','Money','wallet'], ['more','Settings','gear']]`, with new outline icons `sun` and `gear` added to `ICON`
  - action `push` (`data-act="push" data-v="schedule|todo"`) calling `go(v)`
  - helper `pageHead(title, {sub, action})`, which returns the frosted top bar (`#topbar` with the compact title and an optional right action) followed by `<h1 class="large-title">`
  - `withTransition(dir, fn)`, where `dir` is `'push'|'pop'|'none'`

- [ ] **Step 1: Tabs, push and FAB**

- Swap `TABS`.
- Make `scheduleView` and `todoView` pushed screens with a back button (`todo` already is; `schedule` gets the same top bar with `‹ Today` and a right action `+` → `newReh`).
- Add the `push` case.
- FAB map: `clients → newClient`, `money → newPay`; render the FAB as a 56 px round `+` with `aria-label` set to the action name ("New client", "Record payment").
- Root screens use `pageHead`.

- [ ] **Step 2: Transitions**

`go()` uses `withTransition('push', …)`; `back()` and popstate pops use `'pop'`; tab switches use `'none'`.

`withTransition` calls `document.startViewTransition(fn)` when it exists and reduced motion is off, setting `documentElement.dataset.vt = dir` for the CSS; otherwise it calls `fn()`.

CSS: `::view-transition-old(root)` / `::view-transition-new(root)` slide 30% / 100% horizontally over 0.28 s in the direction set by `[data-vt="push"]` / `[data-vt="pop"]`.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all pass. The action guard now also sees `push`.

- [ ] **Step 4: Browser check at 360 × 780 with sample data**

Expected:
- four tabs labelled Today, Clients, Money, Settings with icons
- the old home's "Schedule" header link now uses `push` → `schedule` (Task 7 replaces it with "Full schedule"), opens the schedule, and its back button returns to Today
- the large title collapses into the top bar when scrolled
- no console errors
- `uiAudit().overflowX === false`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Four-tab navigation with large titles and slide transitions"
```

---

### Task 7: Today screen

**Files:**
- Modify: `www/index.html` (`homeView`), `www/css/app.css`

**Interfaces:**
- Consumes: `ArkToday.todayAgenda`, `ArkToday.needsAttention` (Task 3); `pageHead`, `push` (Task 6).

- [ ] **Step 1: Rewrite `homeView`**

Order, per spec 5.1:

1. Date line `Sunday, 8 November · Good afternoon, Riya` (name part only when set) and the large title `Today`.
2. Group **Rehearsals**, with header action `Full schedule` (`push` → `schedule`):
   - Rows from `items`. Events show 🎉 and open the client.
   - Rehearsals show the time and `client`, `performances · place`, and open `editReh`.
   - Planned rehearsals end in a green 44 px `Remind` button (`compose`, `t=rehearsal`, `r`); done ones show attendance `n/of`.
   - Then one muted row `Tomorrow 3 pm · St. Mary's School` from `next`, using `dayLabel` and `fmtTime`.
   - With no items and no `next`, a single muted row `No rehearsals planned`.
3. `.card-accent` **To collect** (`nav` → `money`): total due and the client count, computed as today.
4. Group **Needs attention**: rows from `needsAttention`, each with a dot coloured by tone, title and detail.
   - `rehearsal` rows open `editReh`; all others open the client (`open`, with `data-t="pay"` for `due`).
   - When there are none, one row `All caught up`.
5. Empty state as today, plus a third button `Restore from a backup file` (`importPick`).

Remove the number tiles, stage boxes and "Coming up" cards.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 3: Browser check**

At 360 × 780:
- **Sample data:** Rehearsals and To collect are fully visible without scrolling. Today's 6:30 pm rehearsal has a `Remind` button, and tapping it opens the Message sheet on the rehearsal template (2 taps to WhatsApp). Needs attention lists the sample's rows.
- **Long-names fixture:** names end in an ellipsis on one line, and `uiAudit()` returns `smallText: []`, `smallTargets: []` and `overflowX: false`.
- **Empty state** (Settings → Delete all data, then undo afterwards): shows the three buttons.

Repeat once at 412 × 915 and in dark theme.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Today screen: rehearsals, to collect, needs attention"
```

---

### Task 8: Clients list

**Files:**
- Modify: `www/index.html` (`clientsView`, `clientListHTML`, input handler for `#q`), `www/css/app.css`

- [ ] **Step 1: Rewrite the list**

- Large title `Clients`.
- iOS-style search field (`#q`, placeholder `Search clients, events or songs`; same matching as today).
- Chips `Active / Enquiries / Done / All` with counts (`clientsFilter`; same keys as today).
- A grouped row `Songs in progress`, showing the count of unfinished songs for active clients, which opens `todo`.
- One inset grouped list of client rows, sorted as today:
  - name (semibold, ellipsis)
  - sub line `event · N days` (`today` / `tomorrow` / `event passed` / no date → the event only), in warning colour when ≤ 7 days with unready songs
  - right side `r/n ready` (when there are songs) and `₹X due` in warning colour (when booked or done with balance)
  - a status badge only for enquiry and cancelled
  - rows open `open`
- Keep the empty and no-match messages.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 3: Browser check**

With sample data and then the long-names fixture:
- the chips filter
- search for `Kala` finds Priya & Arjun
- the Songs in progress row opens the todo screen and back works
- `uiAudit()` is clean

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Clients list as an inset grouped list with search and chips"
```

---

### Task 9: Client page and song sheet

**Files:**
- Modify: `www/index.html` (`clientView`, `songsTab`, `songRow`, `rehTab`, `payTab`, remove `infoTab`, new `songSheet`, new `perfMenu`, click cases), `www/css/app.css`

**Interfaces:**
- Consumes: `nextStepKey`, `nextStepLabel`, `nextStepDoneLabel` (Task 2); `attachSwipe` (Task 4); `ArkNative.tap` (Task 1).
- Produces three new actions:
  - `stepNext` (`data-c`, `data-p`, `data-s`): sets `s.steps[nextStepKey(s)] = true`, saves, calls `tap()`, re-renders, and toasts the same way `toggle` does. From this task on, the existing `toggle` handler also calls `ArkNative.tap()`
  - `songSheet` (`data-c`, `data-p`, `data-s`): opens the song sheet
  - `perfMenu` (`data-c`, `data-p`): opens a small sheet with Edit performance (`editPerf`), Move up and Move down (`movePerf`, shown when possible)

- [ ] **Step 1: Header and tabs**

- Top bar `‹ Clients` (`back`) and `Edit` (`editClient`).
- Serif name (28 px, up to 2 lines) and one line `event · date · N days left`.
- Buttons `Message` (green, `compose`, `t=update`) and a 44 px call icon (`tel:`), only when a phone is set.
- Segmented control Songs / Rehearsals / Money (`ctab` with `songs|reh|pay`). An old `tab:'info'` in the stack falls back to `songs`.

- [ ] **Step 2: Songs tab**

For each performance:
- Group header `<title> · r of n ready`, with a `⋯` button (`perfMenu`).
- Rows wrapped as swipe rows (Task 4 markup):
  - front: title (ellipsis), sub line of five dots plus `nextStepLabel` (green `Ready` when done), duration, and a 44 px round `✓` button (`stepNext`, `aria-label="Mark <done label lowercased>"`) when not ready; tapping the front opens `songSheet`
  - action: `✓ <nextStepDoneLabel>` (`stepNext`) when not ready; no swipe action when ready
- Last row `+ Add song` (`newSong`).

Below the groups:
- Stats line `r of n ready · total m:ss`.
- `Ask to finalise N songs` row (`compose`, `t=finalize`) when any song isn't final.
- `Add performance` (`newPerf`).

Call `attachSwipe(document.getElementById('app'), ArkNative.tap)` once at startup (swipe actions then buzz when they run).

- [ ] **Step 3: Song sheet**

Header: song title and artist. Then:
- the five steps as toggle rows (`toggle`, the same keys)
- duration and editing notes
- `Reference video` link (when set)
- `Share practice video` (`shareTut`, when set)
- notes
- `Edit song` (`editSong`)

- [ ] **Step 4: Rehearsals and Money tabs**

Same content as today in grouped lists:
- **Rehearsals:** upcoming rehearsal rows become swipe rows with action `Remind` (`compose`, `t=rehearsal`); `Schedule rehearsal` button.
- **Money:** the summary (total / received / balance, meter), Charges and Payments groups. Payment rows become swipe rows with action `Receipt` (`compose`, `t=receipt`). `Record payment` and `Ask for payment` stay as in `payTab`.

Remove `infoTab`. Its contents move to the client form (Task 12) and the Message sheet (Task 10).

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all pass. `setStatus`, `delClient` and `compose t=thanks` must still be referenced. If the guard fails here, keep the old Details controls until Tasks 10 and 12 land, and remove them there.

- [ ] **Step 6: Browser check with sample data**

Expected:
- Clients → Priya & Arjun → `✓` on `Tum Se Hi` ticks Teach (3 taps)
- the sheet toggles still work
- `⋯` → Move down reorders performances
- swiping left on a song in the preview at mobile size (mouse drag works with pointer events) reveals `✓ Taught`, while a vertical drag scrolls
- the phoneless long-names client shows no call button
- `uiAudit()` is clean on all three tabs
- no console errors

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Client page with one-row songs, next-step button, swipe shortcuts and song sheet"
```

---

### Task 10: Message sheet

**Files:**
- Modify: `www/index.html` (`composer`, `updateWaLink`, click cases), `www/css/app.css`

**Interfaces:**
- Consumes: existing `ui.compose = {c, t, rid, pid, sid}`, `TPL_ORDER`, `TPL_NAMES`, `fill`, `msgVars`, `waHref`.
- Produces: new action `msgTo`, which reveals the `#toPhone` field.

- [ ] **Step 1: Rewrite `composer()`**

- Header `Message <name>` with `Done` (`close`); grabber.
- One horizontally scrolling row of chips for every template in `TPL_ORDER` (`tpl`, active one dark). Hidden for `t=tutorial`, whose header stays `Share practice video`.
- The filled text in an editable card (`<textarea id="msg">` styled as a white 16 px-radius card that grows to its content, 15 px text).
- `To: <name> (<phone>)` with `Change` (`msgTo`), which reveals `#toPhone`. With no phone (or for the run sheet and tutorial), show `#toPhone` empty with the existing placeholder.
- Full-width green `Send on WhatsApp` (`a#waLink`, same `href` logic) and a `Copy text` text button (`copyMsg`).

The chip labels are the short forms `Progress, Finalise, Practice, Rehearsal, Payment, Receipt, Run sheet, Thank you, Custom` (add `TPL_CHIP` alongside `TPL_NAMES`). Settings keeps the full names.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 3: Browser check**

Expected:
- each chip changes the text to that template, with the same wording as before (compare `#msg` for `update` with a capture from the v1.0 composer for the sample client)
- the `waLink` href starts with `https://wa.me/91` for a phone and contains the encoded text
- the run sheet has no number
- Change reveals the field, and typing updates the href
- the tutorial share opens without chips
- `uiAudit()` is clean

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Single Message sheet with template chips"
```

---

### Task 11: Money screen

**Files:**
- Modify: `www/index.html` (`moneyView`, `ui.moneySeg`, new `moneySeg` action), `www/css/app.css`

- [ ] **Step 1: Rewrite `moneyView`**

- Large title `Money`.
- `.card-accent` `To collect · N clients / ₹X`, with a muted line `Received this month ₹Y` below it.
- Segmented Due / Received (`moneySeg`, default `due`).
  - **Due:** rows for clients that are booked or done with balance, sorted as today: client, timing line as today, amount in warning colour. Each is a swipe row with action `Remind` (`compose`, `t=payment`); tapping opens the client on the Money tab (`open`, `data-t="pay"`). With none, `Everyone is paid up`.
  - **Received:** the 25 most recent payments (client, date · mode, amount), opening `editPay`.
- FAB `+` → `newPay`. The `savePay` handler calls `ArkNative.tap()` when a new payment is recorded.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 3: Browser check**

Expected:
- Money → `+` → amount → Save records a payment (3 taps plus typing)
- the post-payment toast still offers Send receipt
- swiping a due row reveals Remind
- `uiAudit()` is clean

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Money screen with due and received lists"
```

---

### Task 12: Forms as sheets

**Files:**
- Modify: `www/index.html` (`openSheet`, `clientForm`, `perfForm`, `songForm`, `rehForm`, `payForm`, `chargeForm`, sheet drag), `www/css/app.css`

**Interfaces:**
- Produces: `openSheet(title, body, opts?)`, where `opts = {save: {act, data: {c?, p?, s?, r?, x?}, label}}`. It renders the header `Cancel` (`close`) · title · `Save` (accent button carrying the save action and data attributes). Without `opts`, the header shows `Done`, as today.

- [ ] **Step 1: Header and drag-to-dismiss**

- Update `openSheet`.
- Move each form's primary save button into the header. Keep `data-more` ("Save and add another") as a secondary button at the bottom of the new-song form.
- Drag: a pointer down on `.grab` or `.sheet-head` and moving down translates the sheet. Release past 120 px closes it; otherwise it springs back (0.2 s, none under reduced motion).

- [ ] **Step 2: Essential fields plus More details**

Per spec 5.6. Everything else goes inside `<details class="more"><summary>More details</summary>…</details>`, open when editing a record whose hidden fields have values.

- **Client:** name, phone, event, date. More details: status, venue, songs and rehearsals in the package, package price and advance (new client only), source, notes.
  - On edit, the header sub line reads `Added <date>` plus `· via <source>` when set.
  - A status segmented control (`setStatus`, applies immediately).
  - When status is `done`: a row `Send thank-you and ask for a review` (`compose`, `t=thanks`).
  - A red `Delete client` row (`delClient`).
- **Performance:** title, function, format. More details: performers, props.
- **Song:** song, duration. More details: artist, editing notes, reference link, practice link, move to performance, notes.
- **Rehearsal:** date, time, duration, place, what to rehearse (plus the client picker when not on a client). More details: status, attendance, notes.
- **Payment:** amount, date, mode. More details: note.
- **Charge:** what for, amount.

Delete stays a red row at the bottom of edit sheets, with the same actions and undo.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all pass. Remove any temporary Details controls kept in Task 9.

- [ ] **Step 4: Browser check**

Expected:
- each form saves and edits as before (add a client, a performance, a song with "Save and add another", a rehearsal from Today's full schedule, a payment and a charge; edit and delete one of each with undo)
- dragging a sheet down by 150 px closes it, and by 60 px springs back
- `uiAudit()` is clean in every sheet

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Forms as sheets with Save in the header, More details and drag to close"
```

---

### Task 13: Settings

**Files:**
- Modify: `www/index.html` (`moreView`, new `tplSheet` action, input handler), `www/css/app.css`

**Interfaces:**
- Produces: action `tplSheet` (`data-k`), which opens a sheet titled with the template name, containing a `<textarea data-tpl="k">`, the variable list, and `Reset to default` (`resetTpl`) when edited.

- [ ] **Step 1: Rewrite `moreView` as grouped lists**

- **Profile:** name, studio, UPI as inline inputs in rows. Same `data-set` keys; same helper texts as row sub lines.
- **Messages:** language segmented control (`setPref` `lang`), plus `Templates` rows, one per template (`tplSheet`), showing `Edited` when customised.
- **Appearance:** `setPref` `theme` segmented control.
- **Backup and restore:** `Save backup file` (`exportFile`), `Restore from file` (`importPick`), `Copy as text` (`copyBackup`), and `Restore from pasted text` as a `<details>` row with `#backupBox` and `restorePaste`.
- **About:**
  - version row `ARK Studios <APP_VERSION>`
  - the install row (web only, as today)
  - client and song counts
  - red `Delete all data` (`wipe`)

The update banner stays on Today.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 3: Browser check**

Expected:
- editing a template in its sheet persists across reload, and Reset restores it
- language and theme switch
- backup save, copy, paste-restore and file-restore work as before (intercept the download as in v1.0 Task 2)
- `uiAudit()` is clean

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Settings as grouped lists with template editor sheets"
```

---

### Task 14: Finish v1.1

**Files:**
- Modify: `www/css/app.css` (remove dead rules), `www/js/version.js` (`1.1.0`), `www/sw.js` (`CACHE` → `ark-studios-v4`)

- [ ] **Step 1: Remove dead CSS**

List every class selector in `app.css`, `grep` each in `www/index.html` and `www/js/*.js`, and delete rules for classes used nowhere.

Run: `npm test`
Expected: all pass.

- [ ] **Step 2: Full browser audit**

At 360 × 780 and 412 × 915, in light and dark, with sample data and with the long-names fixture, visit every screen and sheet and run `uiAudit()`.
Expected: `smallText: []`, `smallTargets: []`, `overflowX: false` everywhere; no console errors.

With reduced motion emulated, push and pop don't animate.

Count the taps in spec section 10 and confirm each one.

- [ ] **Step 3: Bump the version and commit**

Set `APP_VERSION = '1.1.0'` and `CACHE = 'ark-studios-v4'`.

Run: `npm test`
Expected: all pass.

```bash
git add -A && git commit -m "Finish v1.1: remove dead styles, version 1.1.0"
```

- [ ] **Step 4: Owner's phone check (after the final review, merge and the owner's go-ahead to release)**

Release: push `main`, tag `v1.1.0`, and push the tag. The CI and release workflows build the APK. Then the owner installs it over v1.0 from the update banner or the stable link, confirms their data is intact, and runs spec section 10 on the phone:
- clear space below the status bar on Today
- swipe versus scroll behaves
- sheets drag down to close
- haptics fire on ticks
- back closes sheets first
