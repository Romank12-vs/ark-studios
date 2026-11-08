const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifest = fs.readFileSync(path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');

test('Android 10 and older may write backups to Documents', () => {
  assert.match(manifest, /WRITE_EXTERNAL_STORAGE"\s+android:maxSdkVersion="29"/);
  assert.match(manifest, /READ_EXTERNAL_STORAGE"\s+android:maxSdkVersion="29"/);
  assert.match(manifest, /android:requestLegacyExternalStorage="true"/);
});

test('reminders: exact alarms, small icon, pinned plugin', () => {
  const root = path.join(__dirname, '..');
  assert.match(manifest, /android\.permission\.SCHEDULE_EXACT_ALARM/);
  assert.match(manifest, /android\.permission\.USE_EXACT_ALARM/);
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8')).plugins.LocalNotifications;
  assert.equal(cfg.smallIcon, 'ic_stat_ark');
  assert.ok(fs.existsSync(path.join(root, 'android/app/src/main/res/drawable/ic_stat_ark.xml')));
  assert.equal(require('../package.json').dependencies['@capacitor/local-notifications'], '8.3.1');
  assert.match(fs.readFileSync(path.join(root, 'android/capacitor.settings.gradle'), 'utf8'), /':capacitor-local-notifications'/);
});
