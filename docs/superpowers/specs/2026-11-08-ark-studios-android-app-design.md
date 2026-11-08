# ARK Studios Android app: design spec

Date: 2026-11-08
Status: Approved (renamed from "Taal" to "ARK Studios" the same day, at the owner's request)

## 1. Context

The app (until now called "Taal") is a choreography studio manager for Indian wedding and event
choreographers. Today it is a single-file, offline-first web app (`index.html`, ~1,050 lines of vanilla
JS, no build step, no backend) with a web manifest and service worker so it can be installed from a
browser.

It already covers: clients (enquiry → booked → completed / cancelled), performances with performers,
songs with a 5-step pipeline (Final → Edit → Choreo → Teach → Practice), rehearsals with attendance
and package tracking, charges and payments with UPI, ten auto-filled WhatsApp templates in Hinglish
or English, a dashboard, a cross-client schedule, light/dark theme, undo, and JSON backup/restore.

All data lives in the browser's `localStorage`. A sync path via `window.claude` exists from the app's
origins as a Claude artifact and is inert everywhere else.

## 2. Goal, user, constraints

- **User:** one choreographer (the owner), using the app on their own Android phone. No other users.
  This is a personal project of the owner, unrelated to their employer.
- **Goal:** install the app on the phone as a downloadable Android app named **ARK Studios** for free,
  then add four enhancements: automatic backups, phone reminders, PDF invoices/receipts, earnings and
  expenses.
- **Constraints:**
  - Zero cost. No Play Store ($25) or App Store ($99/yr). Free GitHub services only.
  - Client data never leaves the phone except through backup files the user chooses to share.
  - Keep the existing app and its look; enhance, don't rewrite.
  - The code repository is public (required for free GitHub Pages and a no-login APK download).
    It contains no client data and no secrets.
  - Nothing in the app, its ID, the repository or commit metadata refers to the owner's employer.

## 3. Decisions

| Topic | Decision |
|---|---|
| App name | **ARK Studios** everywhere the user sees a name (launcher label, title, install guide, backup file names, invoice numbers, update banner). Internal storage keys stay as they are (see 4.3) |
| App ID | `com.arkstudios.app` (permanent) |
| Native shell | Capacitor 8 (8.6.0 at time of writing) wrapping the existing web app, versions pinned exactly in `package.json` |
| GitHub account | The owner's personal account **Romank12-vs**. The work account stays the default `gh` account on the PC; this project's `gh` and `git push` calls use the personal account's token explicitly |
| Repo | Public repo `Romank12-vs/ark-studios` |
| Commit identity | `Romank Sadhwani <117653360+Romank12-vs@users.noreply.github.com>` (GitHub private email), set in the repo's local git config |
| Web link | GitHub Pages at `https://romank12-vs.github.io/ark-studios/`, deployed on every push to `main` |
| APK builds | GitHub Actions, signed release APK attached to a GitHub Release on each version tag |
| Stable APK link | `https://github.com/Romank12-vs/ark-studios/releases/latest/download/ARK-Studios.apk` |
| Local tooling | Node 22+ (LTS) and JDK 21 installed on the Windows PC via `winget`, used to generate the Android project and the signing keystore; APKs are built in CI, not locally |
| Signing key | Generated once; stored as encrypted GitHub Actions secrets; the owner keeps a copy in Google Drive |
| Releases | v1.0 Ship (shipped) → v1.1 Simpler "iOS warm" UI (see `2026-11-08-ark-studios-ios-warm-ui-design.md`) → v1.2 Backups & reminders → v1.3 PDFs & money; each is an installable APK and gets its own implementation plan, written and approved before that milestone starts. Sections 6 and 7 below keep their original "v1.1" / "v1.2" labels but now ship as v1.2 and v1.3 |

Rejected: a TWA/PWABuilder wrapper (no offline reminders, no file backups, data tied to Chrome
storage) and a rewrite in Flutter/React Native (discards a working, polished app).

## 4. Architecture

### 4.1 Repository layout

```
ark-studios/
  www/                          the app, served by Capacitor and by GitHub Pages
    index.html                  views, sheets, event handling (existing code)
    js/version.js               APP_VERSION constant, the single source of the app version
    js/core.js                  pure domain helpers extracted from index.html
    js/native.js                thin wrapper over Capacitor plugins, with web fallbacks
    js/update.js                v1.0: update check (pure version logic + fetch)
    js/reminders.js             v1.1: notification planning (pure) + scheduling
    js/backup.js                v1.1: auto-backup policy (pure) + file writing
    js/pdf.js                   v1.2: invoice/receipt PDF building
    js/money.js                 v1.2: earnings, expenses, insights aggregation (pure)
    vendor/                     v1.2: jsPDF, QR code generator, PDF font (all offline)
    fonts/                      Bricolage Grotesque + Rozha One woff2 (OFL), self-hosted
    icons/, manifest.webmanifest, sw.js
  android/                      Capacitor Android project, generated once, committed
  test/                         Node built-in test runner tests for the pure modules
  capacitor.config.json
  package.json                  Capacitor CLI/core/plugins + test script
  .github/workflows/pages.yml   deploy www/ to GitHub Pages on push to main
  .github/workflows/release.yml run tests, build + sign APK, publish Release on tag v*
  HOW-TO-INSTALL.md             rewritten for the APK and the web link
  docs/superpowers/specs/       this spec
```

The existing launcher icon (coloured equaliser bars, no lettering) stays.

### 4.2 Module boundaries

- **`core.js`**: pure functions with no DOM access, shared by the UI and the new modules: date helpers
  (`todayISO`, `addDays`, `daysLeft`, `fmtDate`, `fmtTime`), money formatting, song progress
  (`nextIdx`, `doneN`, `songsOf`, `readyOf`), `totals(client)`, `upcomingReh(client)`, `normalize(state)`.
  Exposed as `window.TaalCore` in the browser and via `module.exports` under Node for tests.
- **`native.js`**: the only place that touches Capacitor. Exposes `isNative()`, `saveFile(name, data)`,
  `shareFile(path, title)`, `notifications.{requestPermission, schedule, cancelAll}`, `onResume(fn)`,
  `onPause(fn)`. Every function has a web fallback (download link, no-op, Web Share API) so `index.html`
  never branches on platform except to hide native-only settings.
- **Feature modules** (`update`, `reminders`, `backup`, `money`, `pdf`) each split into a pure
  *planning* part (input: state + "now", output: plain data) and a thin *effect* part that calls
  `native.js` or `fetch`. Only the pure parts are unit-tested.
- **`index.html`** keeps rendering and events. It loads the scripts above with plain `<script>` tags
  (no bundler).

### 4.3 State and data model

- **Unchanged internal identifiers:** the `localStorage` key `taal-v2` (and the legacy
  `taal-choreo-v1` read on first load) stay, so data saved by the existing web version is still found
  after the rename. The global `window.TaalCore` name is internal too. Restore keeps accepting any
  backup with a `clients` array, so backups made before the rename (`"app":"taal"`) still restore; new
  backups are marked `"app":"ark-studios"`.
- `state.v` goes from 2 to 3 in v1.2. `normalize()` accepts v1, v2 and v3 data, so older backups
  restore cleanly.
- New fields:
  - v1.0: `settings.lastUpdateCheckAt`, `settings.updateDismissedVersion`.
  - v1.1: `settings.reminders = {rehearsal: false, leadMins: 60, digest: false, digestTime: '09:00'}`
    (off until the user turns them on, which is when permission is requested),
    `settings.lastAutoBackupAt`, `settings.lastSharedBackupAt` (last time a backup left the app),
    `settings.backupNudgeSnoozedUntil`.
  - v1.2: `state.expenses = [{id, date, amount, category, note, clientId|null}]`,
    `settings.logo` (data URL, resized to max 256 px), `settings.terms`, `settings.invoiceSeq`,
    `client.invoiceNo` (assigned on first invoice and reused).
- Storage stays `localStorage` inside the app's WebView. It persists across APK updates signed with the
  same key and is lost on uninstall or "Clear storage", which the v1.1 file backups cover.

## 5. Milestone v1.0: Ship

**Scope**
1. Move app files into `www/`, add `.gitattributes` (LF for `gradlew` and shell scripts), create the
   public repo `Romank12-vs/ark-studios` and push.
2. Rename every user-visible "Taal" to "ARK Studios": page title, `apple-mobile-web-app-title`,
   manifest `name` ("ARK Studios: choreography studio"), `short_name` ("ARK Studios") and description,
   the Settings footer, the "doesn't look like a backup" message, and backup file names
   (`ark-studios-backup-YYYY-MM-DD.json`). Internal identifiers stay as described in 4.3.
3. Self-host the two fonts (remove the Google Fonts link) so the first launch needs no internet.
4. Remove the inert `window.claude` sync and download-capability code. `syncLabel` becomes the static
   "Saved on this device".
5. Extract `core.js` from `index.html` with no behaviour change.
6. Add Capacitor with `@capacitor/app`; generate `android/`; set app ID `com.arkstudios.app`, app name
   "ARK Studios", launcher icons (including the adaptive icon) from the existing icon artwork, and
   system bar styling that follows the app's light/dark theme.
7. Register the service worker **only on the web**, never inside the APK, so an updated APK can never
   be served stale cached files.
8. Show the app version (`APP_VERSION`) at the bottom of Settings.
9. Update check (APK only): when online, at most once a day, fetch
   `https://api.github.com/repos/Romank12-vs/ark-studios/releases/latest`. If its tag is newer than
   `APP_VERSION` and not the version the user dismissed, show a banner "ARK Studios X.Y is available ·
   Download" linking to the stable APK URL, with a dismiss button. Failures are silent.
10. CI: `pages.yml` deploys `www/`. `release.yml` triggers on `v*` tags: runs `npm test`, checks that
    the tag matches `APP_VERSION`, runs `npx cap sync android`, builds a signed release APK with
    `versionName` = tag and `versionCode` = `major*10000 + minor*100 + patch`, and uploads it as
    `ARK-Studios.apk` to a GitHub Release.
11. Rewrite `HOW-TO-INSTALL.md`: download link, allowing "install unknown apps" once, updating,
    moving data from the existing web version (Save backup → Restore from file), keeping the keystore
    safe.

**Acceptance criteria**
- The APK installs (minSdk 24, Android 7.0+) and opens offline on first launch with the correct fonts;
  the launcher label reads "ARK Studios".
- No content is hidden under the status bar or navigation bar, in light or dark mode.
- Hardware/gesture back closes an open sheet first, then goes back a screen, then leaves the app from
  a root tab.
- WhatsApp buttons open WhatsApp with the message pre-filled; Call opens the dialer; Reference video
  and Add to calendar open the right apps or the browser.
- "Restore from file" opens the system file picker and restores a backup made in the existing web
  version.
- Installing a newer APK over an older one keeps all data.
- The web link works in Chrome on Android and Safari on iPhone and is installable as before.
- No user-visible "Taal" remains.
- Existing behaviour is otherwise unchanged (verified by clicking through the main flows with sample
  data).

## 6. Milestone v1.1: Never lose data and reminders

### 6.1 Automatic backups (APK)

- **When:** on app pause/background and on resume, if `state.updatedAt > settings.lastAutoBackupAt`,
  write the full state to `Documents/ARK Studios/ark-studios-backup-YYYY-MM-DD.json` (today's file is
  overwritten with the latest state). Then delete files in that folder matching the pattern older than
  the newest 14.
- **Why that folder:** it is public storage that survives uninstall and is visible in the Files app;
  "Restore from file" can pick from it after a reinstall or on a new phone.
- **Off-phone copy:** if data exists and `lastSharedBackupAt` is more than 7 days ago (and not
  snoozed), Home shows a banner "Send this week's backup to Google Drive or WhatsApp?" with **Share**
  (opens the Android share sheet with today's file and sets `lastSharedBackupAt`) and **Later**
  (snoozes 7 days).
- **Empty state:** when there are no clients, Home shows "Restore from a backup file" next to the
  existing "Add first client" and "Explore with sample data".
- **Manual buttons:** in the APK, "Save backup file" writes to `Documents/ARK Studios` and offers
  Share, because blob downloads do not work inside the Android WebView.
- **Web version:** manual backups as today. "Save backup file" and "Copy as text" set
  `lastSharedBackupAt`, and the same weekly Home banner appears when it is more than 7 days old (its
  button saves a backup file instead of sharing).
- **Failure handling:** if a write fails (e.g. storage full), show a toast "Auto-backup failed. Save
  a backup from Settings." once per day; never block the UI.

### 6.2 Reminders (APK)

- **Planner** (`planNotifications(state, now)`, pure): returns at most 64 items
  `{id, at, title, body, extra}` for the next 14 days.
  - *Rehearsal reminder:* for each planned rehearsal with a date and time, at `start − leadMins`
    (skipped if already past). Title "6:30 pm rehearsal · Priya & Arjun", body "Cousins group ·
    Studio". `extra` carries client and rehearsal IDs.
  - *Morning summary:* for each of the next 14 days, at `digestTime`, only if that day has at least one
    of: rehearsals that day; an event within 7 days whose songs are not all ready; an event within
    3 days or already passed with a balance due. Body joins up to three items, e.g. "2 rehearsals today
    · Priya's event in 3 days, 2 songs not ready · ₹30,000 due from Mehta".
  - IDs are deterministic integers so re-planning replaces rather than duplicates.
- **Scheduling:** on app start, on resume, and after every `save()` (debounced 2 s): cancel all pending
  ARK Studios notifications and schedule the new plan with `@capacitor/local-notifications`, using
  exact, allow-while-idle alarms. Declare `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM`; Play Store
  policy does not apply to a sideloaded app.
- **Tapping a notification:** a rehearsal reminder opens that client's rehearsal sheet; the summary
  opens Home.
- **Permissions:** notification permission is requested only when the user turns a reminder on in
  Settings. If denied, the toggle flips back and Settings explains how to allow it in Android settings.
- **Settings → Reminders** (shown in the APK only): rehearsal reminders on/off with lead time
  (30 min / 1 hr / 2 hr), morning summary on/off with time, "Send test notification", and a short tip
  for Xiaomi/Oppo/Vivo/Realme phones about allowing autostart and disabling battery restrictions.
- **Web version:** Settings shows "Reminders work in the Android app".

**Acceptance criteria (v1.1)**
- After any data change and backgrounding the app, today's backup file exists in
  `Documents/ARK Studios`; more than 14 files never accumulate.
- Uninstall, reinstall, and "Restore from file" from `Documents/ARK Studios` brings all data back.
- With a 30-minute lead time, a rehearsal scheduled 31 minutes ahead triggers a notification about a
  minute later with the app closed; tapping it opens that rehearsal.
- "Send test notification" shows a notification within a few seconds.
- The morning summary fires at the configured time only on days with something to report.
- Turning reminders off cancels all pending notifications.

## 7. Milestone v1.2: PDFs and money

### 7.1 PDF invoices and receipts

- **Library:** jsPDF and a QR code generator, vendored into `www/vendor/`, with an embedded TTF font
  (Latin plus the ₹ glyph, OFL licensed) so PDFs are text-based, small, and work offline.
- **Invoice** (button on a client's Payments tab): studio name, optional logo, owner name and phone,
  invoice number `ARK-YYYY-NNN` (assigned once per client from `settings.invoiceSeq`, reused on
  re-share), invoice date, client name, event, event date, venue, itemised charges (discounts shown as
  negative), payments received with dates and modes, **balance due**, UPI ID, and a UPI QR code
  encoding `upi://pay?pa=<upi>&pn=<studio>&am=<balance>&cu=INR&tn=<event>` when a UPI ID is set and the
  balance is positive. Optional payment terms at the bottom.
- **Receipt** (from a payment's edit sheet and from the post-payment toast): amount, date, mode, note,
  then total, received to date, and balance.
- **Sharing:** the APK writes the PDF to the app cache and opens the Android share sheet (WhatsApp →
  choose chat). The web version uses the Web Share API with files when available, otherwise downloads.
- **Settings:** logo upload (resized to max 256 px), payment terms text.
- No GST in this version.

### 7.2 Earnings and expenses

- **Expenses:** date, amount, category (Travel, Props, Costume, Assistants/dancers, Studio rent,
  Music/editing, Other), note, optional client. Add, edit, and delete with undo, matching the existing
  sheet patterns.
- **Navigation:** the "Payments" tab is renamed **Money**, with three segments:
  - *Overview:* Month / Year toggle; received, spent, and profit; a 12-month bar chart of income vs
    expenses (inline SVG, no chart library, readable in light and dark); lead sources table (clients,
    bookings, booked value, and conversion per `source`); average booking value.
  - *Due:* the existing payments-due list and recent payments.
  - *Expenses:* list grouped by month, with "Add expense" as the floating button.
- **Client view:** the Payments tab gains an Expenses section and a "Profit on this booking" figure
  (received − client expenses).
- **CSV export:** choose a year; one file `ark-studios-YYYY.csv` with columns
  `date,type,client,category_or_mode,amount,note` covering payments and expenses; shared or downloaded
  like backups.

**Acceptance criteria (v1.2)**
- Invoice and receipt PDFs open in a PDF viewer, show ₹ correctly, and share to WhatsApp.
- Scanning the invoice QR in a UPI app pre-fills the payee and exact balance.
- Overview figures match hand-calculated totals for the sample data.
- A v1.1 backup restores into v1.2 with an empty expense list; a v1.2 backup round-trips with no loss.
- CSV opens correctly in Google Sheets.

## 8. Testing

- **Unit tests** with Node's built-in runner (`node --test`, no extra dependencies) for every pure
  module: `core.js`, version comparison and update-check timing, the reminder planner, the backup
  retention policy, money aggregation, invoice numbering, CSV building. Fixtures reuse the app's sample
  data with a fixed "now".
- **CI gate:** `release.yml` runs the tests before building; a failing test means no APK.
- **Browser check:** each milestone's web build is clicked through in a browser at phone size with
  sample data (home, client, songs, rehearsal, payments, settings, messages).
- **On-phone checklist:** each milestone's acceptance criteria, run by the owner on their phone.
  Native behaviour (notifications, files, share sheet, back button) can only be confirmed there.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Signing key lost: updates can't install over the old app | Key in GitHub secrets plus a copy in the owner's Google Drive; daily backup files make a reinstall recoverable anyway |
| Phone makers' battery savers kill reminders | Exact allow-while-idle alarms; in-app tip for Xiaomi/Oppo/Vivo/Realme; test notification button |
| WebView storage cleared | Daily backup files in `Documents/ARK Studios` plus a weekly off-phone share nudge |
| Android blocks a scoped-storage write on some versions | Write failures surface as a toast; manual Share backup always works |
| Unauthenticated GitHub API rate limit | At most one update check per day; failures are silent |
| A push or `gh` call accidentally uses the work account | Repo-local git identity; remote URL and `gh` calls for this project use the personal account's token explicitly; a check before the first push confirms the remote owner is `Romank12-vs` |

## 10. Out of scope

Play Store and App Store listings, a native iOS app, cloud sync or accounts, multiple users, GST,
automatic Google Drive upload, a Hindi interface, and renaming the local working folder `taal-app`.
