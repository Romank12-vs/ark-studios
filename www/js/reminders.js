/* ARK Studios reminder planner (pure, tested): works out which phone notifications should exist
   for the next two weeks, as plain data. Scheduling them is native.js's job. Never reads the clock. */
(function(){
"use strict";
const C = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : window.TaalCore;

const MAX_NOTIFICATIONS = 64;
const HORIZON_DAYS = 14;
const SONG_WINDOW_DAYS = 7;
const DUE_WINDOW_DAYS = 3;
const MAX_SUMMARY_ITEMS = 3;

const dateOf = iso => new Date(iso + 'T00:00:00');
const dayDiff = (fromISO, toISO) => Math.round((dateOf(toISO) - dateOf(fromISO)) / 864e5);
const localMs = (day, hhmm) => new Date(day + 'T' + hhmm + ':00').getTime();
const live = state => (state.clients || []).filter(c => c.status !== 'cancelled');
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

function rehearsalNotifId(clientId, rehearsalId){
  let h = 0x811c9dc5; // FNV-1a, 32-bit
  const s = clientId + '/' + rehearsalId;
  for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 100000000 + (h % 1900000000);
}
const summaryNotifId = iso => parseInt(iso.replace(/-/g, ''), 10);

function summaryFor(state, day){
  const clients = live(state), items = [];

  const todays = [];
  clients.forEach(c => (c.rehearsals || []).forEach(r => { if(r.date === day && r.status === 'planned') todays.push({c, r}); }));
  if(todays.length === 1){
    const {c, r} = todays[0];
    items.push(r.time ? `${C.fmtTime(r.time)} rehearsal with ${c.name}` : `Rehearsal with ${c.name}`);
  } else if(todays.length > 1) items.push(`${todays.length} rehearsals today`);

  const songs = [];
  clients.forEach(c => {
    if((c.status !== 'booked' && c.status !== 'enquiry') || !c.date) return;
    const d = dayDiff(day, c.date), total = C.songsOf(c).length, unready = total - C.readyOf(c);
    if(d >= 0 && d <= SONG_WINDOW_DAYS && total > 0 && unready > 0) songs.push({c, d, unready});
  });
  songs.sort((a, b) => a.d - b.d);
  songs.forEach(({c, d, unready}) => {
    const when = d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days';
    items.push(`${c.event || c.name} ${when}, ${plural(unready, 'song')} not ready`);
  });

  const dues = [];
  clients.forEach(c => {
    if((c.status !== 'booked' && c.status !== 'done') || !c.date) return;
    const bal = C.totals(c).bal;
    if(bal > 0 && dayDiff(day, c.date) <= DUE_WINDOW_DAYS) dues.push({c, bal});
  });
  if(dues.length){
    const sum = dues.reduce((a, x) => a + x.bal, 0);
    items.push(`${C.money(sum)} due from ${dues.length === 1 ? dues[0].c.name : dues.length + ' clients'}`);
  }

  if(!items.length) return '';
  const shown = items.slice(0, MAX_SUMMARY_ITEMS).join(' · ');
  return items.length > MAX_SUMMARY_ITEMS ? shown + ' · +' + (items.length - MAX_SUMMARY_ITEMS) + ' more' : shown;
}

function planNotifications(state, now){
  const rem = (state.settings && state.settings.reminders) || {};
  const horizon = now + HORIZON_DAYS * 864e5;
  const out = [];
  const keep = item => { if(Number.isFinite(item.at) && item.at > now && item.at < horizon) out.push(item); };

  if(rem.rehearsal){
    live(state).forEach(c => (c.rehearsals || []).forEach(r => {
      if(r.status !== 'planned' || !r.time) return;
      const parts = C.rehItems(c, r);
      const place = r.place === 'Venue' ? (c.venue || '') : (r.place || '');
      keep({
        id: rehearsalNotifId(c.id, r.id),
        at: localMs(r.date, r.time) - (Number(rem.leadMins) || 0) * 60000,
        title: `${C.fmtTime(r.time)} rehearsal · ${c.name}`,
        body: [parts.length ? parts.join(', ') : 'All performances', place].filter(Boolean).join(' · '),
        extra: {kind: 'rehearsal', clientId: c.id, rehearsalId: r.id},
      });
    }));
  }

  if(rem.digest){
    const today = C.isoOf(new Date(now));
    for(let i = 0; i < HORIZON_DAYS; i++){
      const day = C.addDays(today, i);
      const body = summaryFor(state, day);
      if(!body) continue;
      keep({
        id: summaryNotifId(day),
        at: localMs(day, rem.digestTime || '09:00'),
        title: 'Today · ' + C.fmtDate(day, {weekday: 'short', day: 'numeric', month: 'short'}),
        body,
        extra: {kind: 'summary', date: day},
      });
    }
  }

  return out.sort((a, b) => a.at - b.at).slice(0, MAX_NOTIFICATIONS);
}

function syncAction(rem, permission){
  const r = rem || {};
  if(!r.rehearsal && !r.digest) return 'cancel';
  return permission === 'granted' ? 'schedule' : 'switchOff';
}

function tapTarget(state, extra){
  const x = extra || {};
  if(x.kind !== 'rehearsal') return {view: 'home'};
  const c = (state.clients || []).find(k => k.id === x.clientId);
  if(!c) return {view: 'home'};
  const r = (c.rehearsals || []).find(k => k.id === x.rehearsalId);
  return {view: 'client', clientId: c.id, rehearsalId: r ? r.id : null};
}

const api = {MAX_NOTIFICATIONS, HORIZON_DAYS, rehearsalNotifId, summaryNotifId, summaryFor, planNotifications, syncAction, tapTarget};
if(typeof module !== 'undefined' && module.exports) module.exports = api; else window.ArkReminders = api;
})();
