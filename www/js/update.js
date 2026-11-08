/* ARK Studios update check (Android app only): at most once a day, ask GitHub for the latest
   release and offer a banner when it is newer than this build. Any failure is silent. */
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

const api = {APK_URL, RELEASES_API, parseVersion, isNewer, shouldCheck, bannerFor, checkForUpdate};
if(typeof module !== 'undefined' && module.exports) module.exports = api; else window.ArkUpdate = api;
})();
