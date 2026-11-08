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

const api = {backAction, barStyleFor, isNative, onBackButton, onResume, exitApp, setBarStyle, shareTextFile};
if(typeof module !== 'undefined' && module.exports) module.exports = api; else window.ArkNative = api;
})();
