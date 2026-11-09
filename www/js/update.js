/* ARK Studios update checks. Android app: at most once a day, ask GitHub for the latest release and
   offer the APK. Web version (iPhone, browsers): when the app comes back to the screen, at most every
   10 minutes, read the deployed version.js and offer a reload. Any failure is silent. */
(function(){
"use strict";

const APK_URL = 'https://github.com/Romank12-vs/ark-studios/releases/latest/download/ARK-Studios.apk';
const RELEASES_API = 'https://api.github.com/repos/Romank12-vs/ark-studios/releases/latest';
const DAY = 86400000;

function parseVersion(tag){
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(tag == null ? '' : tag));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function isNewer(remoteTag, current){
  const a = parseVersion(remoteTag), b = parseVersion(current);
  if(!a || !b) return false;
  for(let i = 0; i < 3; i++) if(a[i] !== b[i]) return a[i] > b[i];
  return false;
}
function shouldCheck(lastCheckAt, now){
  return !lastCheckAt || now - lastCheckAt >= DAY;
}
function bannerFor(release, current, dismissed){
  if(!release || typeof release.tag_name !== 'string' || !isNewer(release.tag_name, current)) return null;
  const version = parseVersion(release.tag_name).join('.');
  return version === dismissed ? null : {version, url: APK_URL};
}
async function checkForUpdate({now, lastCheckAt, current, dismissed, fetchFn}){
  if(!shouldCheck(lastCheckAt, now)) return null;
  let banner = null;
  try{
    const res = await fetchFn(RELEASES_API, {headers: {Accept: 'application/vnd.github+json'}});
    if(res && res.ok) banner = bannerFor(await res.json(), current, dismissed);
  }catch(e){ banner = null; }
  return {checkedAt: now, banner};
}

/* ---------- web version ---------- */
const WEB_VERSION_URL = 'js/version.js';
const WEB_CHECK_EVERY = 10 * 60000;

function versionFromScript(text){
  const m = /APP_VERSION\s*=\s*'(\d+\.\d+\.\d+)'/.exec(String(text == null ? '' : text));
  return m ? m[1] : null;
}
// Resolves null when checked less than 10 minutes ago, else {checkedAt, version}: version is the newer
// deployed version, or null when there is none (or the check failed).
async function checkWebUpdate({now, lastCheckAt, current, fetchFn}){
  if(lastCheckAt && now - lastCheckAt < WEB_CHECK_EVERY) return null;
  let version = null;
  try{
    const res = await fetchFn(WEB_VERSION_URL, {cache: 'no-store'});
    const deployed = res && res.ok ? versionFromScript(await res.text()) : null;
    if(deployed && isNewer(deployed, current)) version = deployed;
  }catch(e){ version = null; }
  return {checkedAt: now, version};
}

const api = {APK_URL, RELEASES_API, parseVersion, isNewer, shouldCheck, bannerFor, checkForUpdate, WEB_VERSION_URL, versionFromScript, checkWebUpdate};
if(typeof module !== 'undefined' && module.exports) module.exports = api; else window.ArkUpdate = api;
})();
