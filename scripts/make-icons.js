// Renders the launcher-icon and splash inputs for `npx capacitor-assets generate --android`
// from assets/icon.svg and assets/icon-foreground.svg:  node scripts/make-icons.js
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const A = path.join(__dirname, '..', 'assets');
const BG = '#B4236B', SPLASH_LIGHT = '#FBF4F0', SPLASH_DARK = '#1B1120';
const svg = name => fs.readFileSync(path.join(A, name));

async function splash(file, background) {
  // The icon as a rounded square in the middle of a 2732 px canvas.
  const size = 640, r = Math.round(size * 0.22);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}"/></svg>`);
  const icon = await sharp(svg('icon.svg')).resize(size, size).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background } })
    .composite([{ input: icon, gravity: 'center' }]).png().toFile(path.join(A, file));
}

(async () => {
  await sharp(svg('icon.svg')).resize(1024, 1024).png().toFile(path.join(A, 'icon-only.png'));
  await sharp(svg('icon-foreground.svg')).resize(1024, 1024).png().toFile(path.join(A, 'icon-foreground.png'));
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } }).png().toFile(path.join(A, 'icon-background.png'));
  await splash('splash.png', SPLASH_LIGHT);
  await splash('splash-dark.png', SPLASH_DARK);
  console.log('wrote icon-only, icon-foreground, icon-background, splash, splash-dark');
})().catch(e => { console.error(e); process.exit(1); });
