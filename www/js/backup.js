/* ARK Studios automatic backup policy and writer. The policy functions are pure; the writer takes an
   injected file adapter `fs` so it is testable without a device. Never reads the clock. */
(function(){
"use strict";
const C = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : window.TaalCore;

const BACKUP_DIR = 'ARK Studios';
const KEEP = 14;
const NUDGE_MS = 7 * 864e5;
const NAME_RE = /^ark-studios-backup-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.json$/;

const backupText = state => JSON.stringify({app: C.BACKUP_MARKER, ...state}, null, 1);
const hasClients = state => !!(state.clients && state.clients.length);
const setting = (state, key) => (state.settings && state.settings[key]) || 0;

function needsAutoBackup(state){
  return hasClients(state) && (state.updatedAt || 0) > setting(state, 'lastAutoBackupAt');
}

const isBackupName = name => NAME_RE.test(name);

function prunable(names, keep = KEEP){
  const key = name => { const m = NAME_RE.exec(name); return {date: m[1], n: m[2] ? +m[2] : 1}; };
  return names.filter(isBackupName)
    .sort((a, b) => {
      const x = key(a), y = key(b);
      return x.date < y.date ? 1 : x.date > y.date ? -1 : y.n - x.n; // newest first
    })
    .slice(keep);
}

function nudgeDue(state, now){
  return hasClients(state) && now >= setting(state, 'backupNudgeSnoozedUntil') && now - setting(state, 'lastSharedBackupAt') > NUDGE_MS;
}

async function tryWrite(fs, name, text){
  try { return !!(await fs.write(name, text)); } catch(e){ return false; }
}

async function prune(fs, keepName){
  try {
    const names = await fs.list();
    if(!names) return;
    for(const name of prunable(names).filter(n => n !== keepName)){
      try { await fs.remove(name); } catch(e){ /* a stuck old file is not worth failing over */ }
    }
  } catch(e){ /* listing failed: skip pruning */ }
}

async function writeBackup({state, today, fs}){
  if(!hasClients(state)) return null; // a backup never overwrites a file with an empty state
  const text = backupText(state);
  const first = C.backupFileName(today);
  const second = 'ark-studios-backup-' + today + '-2.json';
  const name = (await tryWrite(fs, first, text)) ? first : (await tryWrite(fs, second, text)) ? second : null;
  if(name) await prune(fs, name);
  return name;
}

async function autoBackup({state, now, today, fs}){
  if(!needsAutoBackup(state)) return null;
  const name = await writeBackup({state, today, fs});
  return {ok: !!name, at: now, name};
}

function fsFor(native){
  const path = name => BACKUP_DIR + '/' + name;
  return {
    write: (name, text) => native.writeDocument(path(name), text),
    list: () => native.listDocuments(BACKUP_DIR),
    remove: name => native.deleteDocument(path(name))
  };
}

const api = {BACKUP_DIR, KEEP, NUDGE_MS, backupText, needsAutoBackup, isBackupName, prunable, nudgeDue, writeBackup, autoBackup, fsFor};
if(typeof module !== 'undefined' && module.exports) module.exports = api; else window.ArkBackup = api;
})();
