/* ARK Studios native bridge: the only file that talks to Capacitor. Every effect is a no-op (or
   resolves false) in a normal browser, so index.html never has to branch on the platform. */
(function(){
"use strict";

/* ---------- pure decisions (unit-tested) ---------- */
// Android back: close an open sheet first, then go back a screen, then leave the app.
function backAction({sheetOpen, stackLen}){
  if(sheetOpen) return 'closeSheet';
  return stackLen > 1 ? 'back' : 'exit';
}
// SystemBars names describe the bar background: LIGHT = dark icons on a light bar.
function barStyleFor(theme){
  return theme === 'light' ? 'LIGHT' : theme === 'dark' ? 'DARK' : 'DEFAULT';
}

/* ---------- effects ---------- */
const cap = () => (typeof window !== 'undefined' && window.Capacitor) || null;
function isNative(){
  const c = cap();
  return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform());
}
const plugin = name => (isNative() && cap().Plugins && cap().Plugins[name]) || null;

function onBackButton(fn){
  // Registering a listener replaces Capacitor's default, which would exit with a sheet open.
  const app = plugin('App'); if(app) app.addListener('backButton', () => fn());
}
function onResume(fn){
  const app = plugin('App'); if(app) app.addListener('resume', () => fn());
}
function onPause(fn){
  const app = plugin('App'); if(app) app.addListener('pause', () => fn());
}
function exitApp(){
  const app = plugin('App'); if(app) app.exitApp();
}
function setBarStyle(theme){
  const bars = plugin('SystemBars');
  if(!bars) return;
  try{ Promise.resolve(bars.setStyle({style: barStyleFor(theme)})).catch(() => {}); }catch(e){}
}
// Writes a text file to the app cache and opens the Android share sheet (Drive, WhatsApp, Files…).
// Resolves true once shared, false if the user cancels or anything fails.
async function shareTextFile(name, text, mime){
  const fsys = plugin('Filesystem'), share = plugin('Share');
  if(!fsys || !share) return false;
  try{
    const {uri} = await fsys.writeFile({path: name, data: text, directory: 'CACHE', encoding: 'utf8'});
    await share.share({title: name, files: [uri], dialogTitle: name});
    return true;
  }catch(e){
    return false;
  }
}
// Files in the public Documents folder (auto-backups). Web or any error: false / null, never a throw.
async function writeDocument(path, text){
  const fsys = plugin('Filesystem');
  if(!fsys) return false;
  try{
    await fsys.writeFile({path, data: text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true});
    return true;
  }catch(e){
    return false;
  }
}
async function listDocuments(dir){
  const fsys = plugin('Filesystem');
  if(!fsys) return null;
  try{
    const res = await fsys.readdir({path: dir, directory: 'DOCUMENTS'});
    return ((res && res.files) || []).map(f => typeof f === 'string' ? f : f && f.name).filter(n => typeof n === 'string');
  }catch(e){
    return null;
  }
}
async function deleteDocument(path){
  const fsys = plugin('Filesystem');
  if(!fsys) return false;
  try{
    await fsys.deleteFile({path, directory: 'DOCUMENTS'});
    return true;
  }catch(e){
    return false;
  }
}
// Whether a Documents write can go ahead without a system storage prompt. On Android 7–10 each Filesystem call
// prompts when storage isn't granted, so background backups check first. A plugin hiccup resolves true; web: false.
async function documentsAllowed(){
  const fsys = plugin('Filesystem');
  if(!fsys) return false;
  try{
    return (await fsys.checkPermissions()).publicStorage === 'granted';
  }catch(e){
    return true;
  }
}
// A light haptic tick (step ticked, swipe action, payment recorded). Web: a 10 ms vibration where supported.
// A swipe action and its handler can both call tap(); calls within 150 ms of the last buzz are ignored.
let lastBuzz = -Infinity;
function tap(now = Date.now()){
  const gap = now - lastBuzz;
  if(gap >= 0 && gap < 150) return;
  lastBuzz = now;
  try{
    const haptics = plugin('Haptics');
    if(haptics){ Promise.resolve(haptics.impact({style: 'LIGHT'})).catch(() => {}); return; }
    if(typeof navigator !== 'undefined' && navigator && typeof navigator.vibrate === 'function') navigator.vibrate(10);
  }catch(e){}
}

/* ---------- local notifications (reminders) ---------- */
const TEST_ID = 1;
const REMINDER_CHANNEL = {id: 'reminders', name: 'Reminders', description: 'Rehearsal reminders and the morning summary', importance: 4};
const notifications = {
  TEST_ID, REMINDER_CHANNEL,
  async permission(){
    const ln = plugin('LocalNotifications');
    if(!ln) return 'unsupported';
    try{ return (await ln.checkPermissions()).display; }catch(e){ return 'unsupported'; }
  },
  async requestPermission(){
    const ln = plugin('LocalNotifications');
    if(!ln) return false;
    try{ return (await ln.requestPermissions()).display === 'granted'; }catch(e){ return false; }
  },
  // Replaces every pending reminder with `items` ({id, at, title, body, extra}). Never asks for a permission:
  // without exact-alarm access the alarms are scheduled inexact, so a background re-plan can't open a settings screen.
  async replaceAll(items){
    const ln = plugin('LocalNotifications');
    if(!ln) return false;
    try{
      await ln.cancelAll();
      if(!items || !items.length) return true;
      try{ await ln.createChannel(REMINDER_CHANNEL); }catch(e){} // Android < 8 has no channels and rejects this
      let exact = false;
      try{ exact = (await ln.checkExactNotificationSetting()).exact_alarm === 'granted'; }catch(e){}
      await ln.schedule({notifications: items.map(i => ({
        id: i.id, title: i.title, body: i.body, extra: i.extra,
        channelId: REMINDER_CHANNEL.id,
        schedule: {at: new Date(i.at), allowWhileIdle: true},
        isExactNotification: exact
      }))});
      return true;
    }catch(e){
      return false;
    }
  },
  async sendTest(){
    const ln = plugin('LocalNotifications');
    if(!ln) return false;
    try{
      try{ await ln.createChannel(REMINDER_CHANNEL); }catch(e){} // Android < 8 has no channels and rejects this
      await ln.schedule({notifications: [{
        id: TEST_ID, title: 'Test notification',
        body: 'Rehearsal reminders and the morning summary will look like this.',
        channelId: REMINDER_CHANNEL.id, isExactNotification: false, extra: {kind: 'test'}
      }]});
      return true;
    }catch(e){
      return false;
    }
  },
  onTap(fn){
    const ln = plugin('LocalNotifications');
    if(!ln) return;
    try{
      Promise.resolve(ln.addListener('localNotificationActionPerformed', e => fn((e && e.notification && e.notification.extra) || {}))).catch(() => {});
    }catch(e){}
  }
};

const api = {backAction, barStyleFor, isNative, onBackButton, onResume, onPause, exitApp, setBarStyle, shareTextFile, writeDocument, listDocuments, deleteDocument, documentsAllowed, tap, notifications};
if(typeof module !== 'undefined' && module.exports) module.exports = api; else window.ArkNative = api;
})();
