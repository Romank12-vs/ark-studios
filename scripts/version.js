// Release version helpers for CI. A release tag must look like vX.Y.Z (minor and patch at most 99)
// and match APP_VERSION in www/js/version.js.
//   node scripts/version.js check v1.0.0   exits 1 unless the tag matches APP_VERSION
//   node scripts/version.js code  v1.2.3   prints the Android versionCode (10203)
//   node scripts/version.js name  v1.2.3   prints the Android versionName (1.2.3)

function parseTag(tag) {
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(String(tag));
  if (!m) throw new Error('bad-tag: ' + tag);
  const [maj, min, patch] = m.slice(1).map(Number);
  if (min > 99 || patch > 99) throw new Error('bad-tag: ' + tag + ' (minor and patch must be 0-99)');
  return [maj, min, patch];
}
const versionCode = tag => { const [a, b, c] = parseTag(tag); return a * 10000 + b * 100 + c; };
const versionName = tag => parseTag(tag).join('.');
const tagMatches = (tag, appVersion) => tag === 'v' + appVersion;

module.exports = { versionCode, versionName, tagMatches };

if (require.main === module) {
  const [cmd, tag] = process.argv.slice(2);
  try {
    if (cmd === 'code') console.log(versionCode(tag));
    else if (cmd === 'name') console.log(versionName(tag));
    else if (cmd === 'check') {
      const { APP_VERSION } = require('../www/js/version.js');
      versionCode(tag); // validates the tag shape
      if (!tagMatches(tag, APP_VERSION)) {
        console.error(`Tag ${tag} does not match APP_VERSION ${APP_VERSION}`);
        process.exit(1);
      }
      console.log(`Tag ${tag} matches APP_VERSION`);
    } else {
      console.error('usage: node scripts/version.js check|code|name <tag>');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
