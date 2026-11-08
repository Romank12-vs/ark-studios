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
