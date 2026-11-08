const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Guard for the UI rewrite: nothing the app could do in v1.0 may silently disappear.
const html = fs.readFileSync('www/index.html', 'utf8');
const V1_ACTIONS = `back clientsFilter close compose copyBackup copyMsg ctab delCharge delClient delPay delPerf
  delReh delSong dismissUpdate doRestore editCharge editClient editPay editPerf editReh editSong exportFile
  importPick movePerf nav newCharge newClient newPay newPerf newReh newSong open resetTpl restorePaste sample
  saveCharge saveClient savePay savePerf saveReh saveSong schedSeg setPref setStatus shareTut toastAct todo
  todoStage toggle tpl wipe`.split(/\s+/);

const handlers = new Set([...html.matchAll(/case '(\w+)':/g)].map(m => m[1]));
const referenced = new Set([
  ...[...html.matchAll(/data-act="(\w+)"/g)].map(m => m[1]),
  ...[...html.matchAll(/\['(\w+)',\s*'[^']*'\]/g)].map(m => m[1]), // FAB map entries like ['newClient','New client']
  ...[...html.matchAll(/save:\{act:'(\w+)'/g)].map(m => m[1]), // sheet header Save: openSheet(..., {save:{act:'saveClient', ...}})
  ...[...html.matchAll(/deleteRow\('[^']*','(\w+)'/g)].map(m => m[1]), // red delete rows: deleteRow('Delete client','delClient', ...)
]);

test('every v1.0 action still has a handler', () => {
  for (const a of V1_ACTIONS) assert.ok(handlers.has(a), `handler for "${a}" is missing`);
});

test('every handler is reachable', () => {
  for (const a of handlers) assert.ok(referenced.has(a), `nothing on screen triggers "${a}"`);
});
