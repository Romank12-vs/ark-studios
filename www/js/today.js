/* ARK Studios Today screen logic (pure, tested): today's agenda and the "Needs attention" list.
   Both take today's ISO date as a parameter and never read the clock. */
(function(){
"use strict";
const C = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : window.TaalCore;

const MAX_ATTENTION = 5;
const SONG_WINDOW_DAYS = 21; // warn about unready songs up to three weeks before an event
const dateOf = iso => new Date(iso + 'T00:00:00');
const dayDiff = (fromISO, toISO) => Math.round((dateOf(toISO) - dateOf(fromISO)) / 864e5);
const live = state => (state.clients || []).filter(c => c.status !== 'cancelled');
const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99');

function todayAgenda(state, today){
  const clients = live(state), items = [];
  clients.filter(c => c.date === today).forEach(client => items.push({kind: 'event', client}));
  const todays = [];
  clients.forEach(client => client.rehearsals.forEach(rehearsal => {
    if(rehearsal.date === today && rehearsal.status !== 'cancelled') todays.push({kind: 'rehearsal', client, rehearsal});
  }));
  todays.sort((a, b) => byTime(a.rehearsal, b.rehearsal));
  let next = null;
  clients.forEach(client => client.rehearsals.forEach(rehearsal => {
    if(rehearsal.status !== 'planned' || rehearsal.date <= today) return;
    if(!next || (rehearsal.date + (rehearsal.time || '99:99')) < (next.rehearsal.date + (next.rehearsal.time || '99:99'))) next = {client, rehearsal};
  }));
  return {items: items.concat(todays), next};
}

function needsAttention(state, today){
  const clients = live(state);
  const rehearsals = [], songs = [], dues = [], enquiries = [];

  clients.forEach(c => c.rehearsals.forEach(r => {
    const d = dayDiff(today, r.date);
    if(r.status === 'planned' && d >= -14 && d <= -1) rehearsals.push({r, c});
  }));
  rehearsals.sort((a, b) => a.r.date.localeCompare(b.r.date));

  clients.forEach(c => {
    const d = c.date ? dayDiff(today, c.date) : null;
    const total = C.songsOf(c).length, unready = total - C.readyOf(c);
    if((c.status === 'booked' || c.status === 'enquiry') && d !== null && d >= 0 && d <= SONG_WINDOW_DAYS && total > 0 && unready > 0) songs.push({c, d, unready});
    const bal = C.totals(c).bal;
    if((c.status === 'booked' || c.status === 'done') && bal > 0 && (c.status === 'done' || (d !== null && d <= 7))) dues.push({c, bal});
    if(c.status === 'enquiry' && (!c.date || c.date >= today)) enquiries.push({c});
  });
  songs.sort((a, b) => a.d - b.d);
  dues.sort((a, b) => (a.c.date || '0000').localeCompare(b.c.date || '0000'));
  enquiries.sort((a, b) => (a.c.date || '9999').localeCompare(b.c.date || '9999'));

  const when = d => d === 0 ? 'today' : d === 1 ? 'tomorrow' : d + ' days';
  const rows = [
    ...rehearsals.map(({r, c}) => ({kind: 'rehearsal', clientId: c.id, rehearsalId: r.id,
      title: `Mark ${dateOf(r.date).toLocaleDateString('en-IN', {weekday: 'long'})}'s rehearsal done?`, detail: c.name, tone: 'muted'})),
    ...songs.map(({c, d, unready}) => ({kind: 'songs', clientId: c.id,
      title: `${c.event || c.name} · ${when(d)}`, detail: `${unready} song${unready > 1 ? 's' : ''} not ready`, tone: d <= 7 ? 'warn' : 'gold'})),
    ...dues.map(({c, bal}) => ({kind: 'due', clientId: c.id, title: c.name, detail: `${C.money(bal)} due`, tone: 'warn'})),
    ...enquiries.map(({c}) => ({kind: 'enquiry', clientId: c.id, title: c.name, detail: 'Enquiry · follow up', tone: 'gold'})),
  ];
  return rows.slice(0, MAX_ATTENTION);
}

const api = {todayAgenda, needsAttention};
if(typeof module !== 'undefined' && module.exports) module.exports = api; else window.ArkToday = api;
})();
