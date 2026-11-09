# Installing ARK Studios

ARK Studios is free. There are two ways to get it: the Android app, or the web version for iPhone and any browser. An iPhone can't install the Android app (the `.apk` file), so on iPhone always use the web version.

## Install on Android

1. On your phone, open this link in Chrome:
   **https://github.com/Romank12-vs/ark-studios/releases/latest/download/ARK-Studios.apk**
2. When Chrome says the file is downloaded, tap **Open**.
3. The first time only, Android asks whether Chrome may install unknown apps. Tap **Settings**, turn on **Allow from this source**, then go back.
4. Tap **Install**. ARK Studios appears on your home screen.

If the link shows an error, GitHub is busy: try again a little later.

## Update on Android

About once a day, when the app is opened with internet, ARK Studios checks for a new version. When one is out, Today shows *"ARK Studios X.Y.Z is available"*. Tap **Download**, open the downloaded file and tap **Update**. Android always asks for that last tap; the app can't install updates by itself. Your data stays.

### Optional: update checks with Obtainium

[Obtainium](https://github.com/ImranR98/Obtainium) is a free, open-source app that watches ARK Studios' releases, tells you when there is a new one and installs it in one tap.

1. Download Obtainium from its [releases page](https://github.com/ImranR98/Obtainium/releases) (the latest release; if there are several `.apk` files, the one with `arm64-v8a` in its name suits almost every recent phone) and install it the same way as above.
2. On the phone, open this link: **https://apps.obtainium.imranr.dev/redirect.html?r=obtainium://add/https://github.com/Romank12-vs/ark-studios**
   Obtainium opens with ARK Studios filled in. (Or open Obtainium, tap **Add App**, paste `https://github.com/Romank12-vs/ark-studios` and tap **Add**.)
3. Tap **Add**. If ARK Studios is already installed, Obtainium shows its version; if not, tap **Install**.
4. The first time Obtainium installs something, Android asks whether Obtainium may install unknown apps. Allow it.

From then on Obtainium checks in the background and sends a notification when a new version is out. Tap **Update**, then **Update** again on Android's screen. Your data stays.

## Install on iPhone

1. Open **Safari** (use Safari, not Chrome) and go to **https://romank12-vs.github.io/ark-studios/**
2. Tap the **Share** button (the square with an arrow) at the bottom of the screen.
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. From now on, always open ARK Studios from its **home screen icon**. The icon version keeps its own data, separate from Safari: anything entered in a Safari tab won't appear in the icon version.

The web version works offline once opened. It has no reminders and no automatic backup files (those are Android only), so use the weekly backup below.

## Update on iPhone

Updates come by themselves. Each time ARK Studios is opened with internet it loads the newest version. If a new version comes out while it's open, Today shows *"ARK Studios X.Y.Z is ready"*: tap **Update**. To check which version is running, go to **Settings → About**. If an update doesn't show up, close the app fully (swipe up from the bottom, then swipe ARK Studios away) and open it again.

## Move data to another phone or from the web version

1. On the phone that has the data, go to **Settings** and tap **Save backup file**, then send the file to the new phone (for example on WhatsApp).
2. On the new phone, save the file (on iPhone: open it in WhatsApp, tap Share, **Save to Files**).
3. In ARK Studios on the new phone, go to **Settings**, tap **Restore from file** and choose that file.

## Backups

In the Android app, backups happen by themselves.

1. Every day you change something, ARK Studios saves a backup file called `ark-studios-backup-YYYY-MM-DD.json` in **Documents → ARK Studios** on your phone. Today's file is replaced with the latest data, and the newest 14 files are kept.
2. To see when the last one was saved, go to **Settings → Backup and restore**, under **Automatic backups**.
3. These files stay on the phone even if you uninstall the app.
4. To save one yourself, tap **Save backup file**. It goes into the same folder, and you can then share it.

**Weekly reminder to share a copy.** Once a week, the Today screen asks *"Send this week’s backup to Google Drive or WhatsApp?"* Tap **Share** and pick Google Drive or WhatsApp "Message yourself". Tap **Later** to hide it for 7 days. It comes back 7 days after you last shared.

**On iPhone** the weekly banner asks *"Save this week’s backup file?"* Tap **Save file**, then save it to Files or share it to WhatsApp "Message yourself" or Google Drive. If nothing happens, go to **Settings → Copy as text** and paste it into WhatsApp "Message yourself". This weekly copy is the iPhone's only backup, and an iPhone may clear a web app's data if it isn't opened for a long time, so don't skip it.

**After a reinstall, or on a new phone**

1. Install ARK Studios.
2. Go to **Settings** and tap **Restore from file**.
3. Pick the backup file from **Documents → ARK Studios**. On a new phone, first copy the file there, or pick the one you shared to Google Drive or WhatsApp.

On Android 11 and later, after a reinstall the app only sees backup files its new install created. Older files stay in the folder but are not tidied up automatically, so the folder can hold more than 14 files. Delete the old ones in the Files app if you like.

## Reminders

Reminders work in the Android app only.

1. Go to **Settings → Reminders**.
2. Turn on **Rehearsal reminders** and choose 30 min, 1 hr or 2 hr before. Tapping a reminder opens that rehearsal.
3. Turn on **Morning summary** and choose a time. It only comes on days with something to report: rehearsals that day, an event within a week with songs not ready, or money due for an event in the next 3 days or already past. Tapping it opens Today.
4. The first time you turn one on, Android asks to allow notifications. Tap **Allow**.
5. Tap **Send test notification** to see one straight away.

If notifications are blocked, go to Android **Settings → Apps → ARK Studios → Notifications**, allow them, then turn the reminder on again.

On Xiaomi, Oppo, Vivo and Realme phones, also allow **Autostart** for ARK Studios and set its battery use to **No restrictions**. Otherwise reminders may arrive late or not at all.

## Keep your data safe

Your data is stored on the phone, and the app backs it up daily (see **Backups**). A backup on the same phone can't help if the phone is lost or broken, so keep a copy elsewhere: share the weekly backup to Google Drive or WhatsApp "Message yourself", or go to **Settings → Save backup file** and share it. To move to a new phone, install ARK Studios there and use **Restore from file**.

## Keep the signing key safe (owner only)

The folder `ark-studios-signing` on the computer that publishes the app holds the key that signs every version. Keep a copy in Google Drive. If it is lost, a new version can't install over the old app: you would have to uninstall (after saving a backup) and install again.
