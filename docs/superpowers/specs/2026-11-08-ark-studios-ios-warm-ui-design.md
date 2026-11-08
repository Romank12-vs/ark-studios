# ARK Studios simpler "iOS warm" UI: design spec

Date: 2026-11-08
Status: Approved in conversation (layout "Today-first", style B "iOS warm"), awaiting written-spec review
Builds on: `docs/superpowers/specs/2026-11-08-ark-studios-android-app-design.md` (v1.0 shipped)

## 1. Why

The owner uses ARK Studios daily on their Android phone and finds it complicated:

- the home screen is too busy (many boxes and numbers at once),
- the client page is crowded (three hero buttons, four tabs, five step buttons under every song),
- everyday jobs take too many taps,
- text feels cramped (labels wrap, boxes are tight),
- the top of the home screen looks squeezed on the phone.

They want the app to feel modern, with an iOS touch, and very easy to use. Their four everyday jobs, in
no particular order: today's rehearsals (and WhatsApp reminders), updating song progress after a
session, money in and due, and sending client updates.

**Success:** counting the final Send or Save, each everyday job takes no more taps than today and at
most three from Today for the clients Today lists (four for any other client); no screen shows
more than three sections above the fold at 360 px width; no label wraps mid-word or truncates on a
360 px wide phone; the owner describes the app as easier.

## 2. Scope

In: layout, navigation, visual style, interaction (swipe actions, sheets, haptics, transitions), and the
squeezed-top-bar fix, across all screens. Data, storage keys, backups, WhatsApp templates and their
wording, and every existing capability stay as they are; nothing the app can do today is removed, only
moved.

Out: the new logo (the owner will supply their own file later), automatic backups and reminders, PDFs
and money features. Those keep their designs from the v1.0 spec and shift one release later (see 9).

## 3. Navigation

- Bottom tab bar with **four** tabs, each with an outline icon and label: **Today**, **Clients**,
  **Money**, **Settings**. The Schedule tab goes away.
- The full schedule (upcoming and past, all clients) stays available as a pushed screen from a
  "Full schedule" link on Today, with a back button.
- The "Songs in progress" screen (all unfinished songs by stage) stays available from Clients
  ("Songs in progress" row at the top of the list) instead of the home screen.
- Screens pushed on top (client, full schedule, songs in progress) slide in from the right and back out
  to the right; root tabs switch without animation.

## 4. Visual style: "iOS warm"

- **Colours:** keep the brand palette (cream `#FBF4F0` page, white cards, plum ink `#2A1730`, muted
  `#75617A`, magenta accent `#B4236B`, gold `#F2B940`, WhatsApp green `#1E8A4B`, warning `#C2410C`) and
  the existing dark-mode palette. Separators are 0.5 px hairlines.
- **Type:** body and UI text use the phone's own font (`-apple-system, "SF Pro Text", Roboto,
  "Segoe UI", sans-serif`). Large screen titles and client names use the existing serif **Rozha One**.
  Bricolage Grotesque is removed (its font files go, which also shrinks the app).
- **Sizes:** body 17 px, secondary 15 px, small 13 px minimum; large titles 30 px, client name 28 px.
  Every tap target is at least 44 × 44 px.
- **Shape:** inset grouped lists (white, 16 px corners, 16 px side margins) with 13 px muted section
  headers in sentence case; controls have 12–14 px corners; pills for chips.
- **Large titles:** every root screen starts with a large title; when it scrolls away, the title
  appears small and centred in a frosted top bar.
- **Frosted bars:** the top bar and tab bar are translucent with a blur, as today.

## 5. Screens

### 5.1 Today (home)

From top to bottom:

1. Date (small) and large title "Today". The greeting with the owner's name moves into the date line
   ("Sunday, 8 November · Good afternoon, Riya").
2. **Rehearsals:** today's rehearsals and event days, then a single line for the next upcoming one
   ("Tomorrow 3 pm · St. Mary's School"). Each of today's planned rehearsals has a visible green
   **Remind** button (opens the Message sheet on the rehearsal template, so a reminder is two taps as
   today); a done rehearsal shows its attendance instead. Tapping a row opens that rehearsal. With
   nothing today, the section shows the next rehearsal only. A "Full schedule" link sits in the section
   header.
3. **To collect:** one magenta card with the total due and the number of clients; tapping it opens
   Money.
4. **Needs attention:** at most five rows, most urgent first, each opening its client:
   - planned rehearsals in the past not marked done: "Mark Tuesday's rehearsal done?";
   - events in 21 days or fewer whose songs are not all ready (gold, then warning colour from 7 days): "Priya's sangeet · 16 days" /
     "5 songs not ready";
   - balance due where the event is 7 days away or less, or has passed: "St. Mary's School" /
     "₹20,000 due";
   - open enquiries: "Mehta family" / "Enquiry · follow up".
   When nothing needs attention, a single calm row says "All caught up".
5. Empty state (no clients) keeps "Add first client", "Explore with sample data" and "Restore from a
   backup file".

Removed from home: the three number tiles, the five song-stage boxes and the "Coming up" client cards.

### 5.2 Clients

- Large title, iOS search field, filter chips **Active / Enquiries / Done / All** with counts.
- A "Songs in progress" row (count of unfinished songs) above the list.
- Each client is one row in an inset grouped list: name (semibold), "Sangeet · 16 days" (warning colour
  when 7 days or fewer with songs not ready), right side "1/6 ready" and any amount due.
- Floating **+** adds a client.

### 5.3 Client page

- Top bar: "‹ Clients" back and **Edit** (opens the client form, whose header also shows "Added
  {date}" and the "found you through" source, which the Details tab showed before).
- Serif client name, one line "Event · date · N days left".
- Two buttons: **Message** (green, opens the Message sheet) and a **call** icon button (hidden without a
  phone number).
- Segmented control with three tabs: **Songs, Rehearsals, Money**. The Details tab goes: its fields
  live in the Edit sheet, and the booking status and the thank-you message move to the Edit sheet and
  the Message sheet respectively.
- **Songs tab:** one grouped list per performance, header "Couple dance · 1 of 2 ready" with the edit
  and reorder controls in a small "⋯" menu on the header. Each song is one row: title, five progress
  dots with the next step ("●●●○○ Teach next"), duration, and a round **✓** button at the end that
  ticks the next step (accessible name "Mark taught"; ready songs show no button). Swiping the row left
  reveals the same action as **✓ Taught** (the next step's past tense: Finalised, Edited,
  Choreographed, Taught, Practised), as a shortcut. Tapping the row opens the **song sheet** (all five steps as toggles, links, notes, edit, share
  practice video). "+ Add song" is the last row of each group; "Add performance" sits below.
- **Rehearsals tab:** package progress line, upcoming and past rehearsals as grouped lists, swipe left
  on an upcoming one for **Remind**; "Schedule rehearsal" button.
- **Money tab:** total / received / balance summary, charges and payments as grouped lists, "Record
  payment" button; swipe left on a payment for **Receipt**.

### 5.4 Message sheet

One sheet for every WhatsApp message to a client:

- header "Message {client}" with **Done**;
- template chips in one scrollable row (progress, finalise songs, practice, rehearsal, payment,
  receipt, run sheet, thank you, custom), defaulting to the template the caller asked for;
- the filled message in an editable card (same text and variables as today);
- "To: {client} ({phone})" with **Change** revealing the number field; the run sheet starts with no
  number so WhatsApp asks which chat or group;
- **Send on WhatsApp** (green, full width) and **Copy text**.

### 5.5 Money

- Large title, a magenta "To collect" card (total, number of clients) and a small "Received this month"
  line under it.
- Segmented **Due / Received**. Due rows (client, event timing, amount) swipe left for **Remind**
  (payment template); Received rows open the payment.
- Floating **+** records a payment.

### 5.6 Forms (sheets)

New / edit client, performance, song, rehearsal, payment and charge open as sheets:

- grabber and a header with **Cancel** and **Save** (Save is the accent action);
- only the essential fields visible: client name, phone, event, date (client); title, function, format
  (performance); song, duration (song); date, time, duration, place, what to rehearse (rehearsal);
  amount, date, mode (payment);
- everything else under a collapsed **More details** row;
- Delete as a red row at the bottom of edit sheets, with undo as today.
- Sheets close by dragging the grabber or header down more than 120 px, by tapping outside, or with
  the back button.

### 5.7 Settings

Inset grouped list: **Profile** (name, studio, UPI), **Messages** (language, templates: a list where
each template opens an editor sheet with reset), **Appearance** (Auto / Light / Dark), **Backup and
restore** (unchanged actions), **About** (version, install link on the web, delete all data in red).

## 6. Interaction

- **Swipe actions:** a row with an action follows the finger left up to the action width (76 px) and
  snaps open past half of it, or closed otherwise; a fast flick opens it too. Tapping the revealed
  action runs it; tapping elsewhere closes it; only one row is open at a time. Movement locks to the
  first axis past 8 px so vertical scrolling is never hijacked. Every swipe action is also reachable
  without swiping (in the row's sheet or page), so nothing depends on discovering the gesture.
- **Haptics:** a light tap when a step is ticked, a swipe action runs, a payment is recorded, or a
  toggle changes. Inside the app this uses `@capacitor/haptics`; on the web, `navigator.vibrate(10)`
  when available; otherwise nothing.
- **Transitions:** push/pop slide (see 3) using the View Transitions API where the WebView supports it
  (Android System WebView 111+), instant otherwise; sheets slide up (as today). All motion is skipped
  with "reduce motion".
- **Undo** toasts stay as they are.

## 7. Squeezed top bar

The top inset becomes `--safe-top: max(env(safe-area-inset-top, 0px), var(--safe-area-inset-top, 0px))`,
combining the CSS environment value with the variable Capacitor's SystemBars plugin injects, and every
screen's first element sits at `--safe-top + 12px`. The frosted status-bar strip, sticky top bar and
sheets use the same variable. The exact cause is confirmed against a screenshot from the owner's phone
when available; the acceptance check below applies either way.

## 8. Architecture

- `www/css/app.css` (new): all styles move out of `index.html`, rewritten around tokens for the new
  sizes, radii and spacing; light and dark palettes as today.
- `www/js/today.js` (new, pure, tested): `todayAgenda(state, todayISO)` (today's items and the next
  upcoming one) and `needsAttention(state, todayISO)` (the rules in 5.1, max five, urgency order).
- `www/js/swipe.js` (new): the swipe-action behaviour, with its pure decision function
  `swipeDecision({dx, dy, vx, width, open})` tested; the DOM part attaches to rows marked
  `data-swipe`.
- `www/js/core.js`: gains `nextStepLabel(song)` and `nextStepDoneLabel(song)` (tested).
- `www/js/native.js`: gains `tap()` for haptics (web fallback as in 6).
- `www/index.html`: views and sheets rewritten for the new screens; event handling keeps the existing
  `data-act` pattern and all existing actions.
- `@capacitor/haptics` added (exact 8.x version).
- Service worker pre-cache list, fonts and tests updated for the removed Bricolage files and new CSS
  and JS files (the existing offline-shell test enforces this).

## 9. Releases

This becomes **v1.1.0** ("simpler, iOS warm"). Automatic backups and reminders move to v1.2.0, and PDFs
and money to v1.3.0, with their designs unchanged; the v1.0 spec's release table is updated to say so.
The logo change ships in whichever release is next when the owner provides the file.

## 10. Acceptance criteria

- Today shows at most: date line, title, Rehearsals, To collect, Needs attention; at 360 × 780 px with
  the sample data, Rehearsals and To collect are fully visible without scrolling.
- Tap counts from Today, including the final Send or Save, with the sample data:
  - rehearsal reminder: Remind → Send on WhatsApp (2; today 2);
  - tick a song's next step for a client listed under Needs attention: row → ✓ (2), any client:
    Clients → client → ✓ (3; today 3);
  - record a payment: Money → + → Save (3, plus typing the amount);
  - client update for a listed client: row → Message → Send on WhatsApp (3), any client: 4.
- No text below 13 px; no label wraps mid-word or truncates on a 360 px screen in the main screens;
  every tap target is at least 44 px.
- Swiping a row never scrolls the page sideways, and scrolling a list never opens a row.
- Every existing action (all `data-act` handlers) is still reachable.
- Light and dark themes both look right; reduce motion turns off slides.
- On the phone: the home screen's first line has clear space below the status bar (at least 8 px),
  sheets drag down to close, haptics fire on ticks, and the back button still closes sheets first.
- All existing tests still pass, plus new tests for `today.js`, `swipe.js` decisions and the next-step
  labels.

## 11. Testing

Unit tests (Node built-in runner) for the pure functions above with the sample data and a fixed date;
the existing suite unchanged. Browser check at 360 × 780 and 412 × 915 in light and dark with sample
data, through every screen and sheet; screenshots compared against the approved mockups. On-phone
checklist from section 10 by the owner.
