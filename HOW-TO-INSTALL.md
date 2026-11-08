# Installing ARK Studios

ARK Studios is free. There are two ways to get it: the Android app, or the web version, which also works on iPhone.

## Install on Android

1. On your phone, open this link in Chrome:
   **https://github.com/Romank12-vs/ark-studios/releases/latest/download/ARK-Studios.apk**
2. When Chrome says the file is downloaded, tap **Open**.
3. The first time only, Android asks whether Chrome may install unknown apps. Tap **Settings**, turn on **Allow from this source**, then go back.
4. Tap **Install**. ARK Studios appears on your home screen.

## Update

When a new version is out, ARK Studios shows a banner: *"ARK Studios X.Y is available · Download"*. Tap **Download** and install it over the old app (or open the same link as above). Your data stays.

## iPhone or any browser

Open **https://romank12-vs.github.io/ark-studios/**

- iPhone (Safari): tap **Share**, then **Add to Home Screen**.
- Android (Chrome): tap the three-dot menu, then **Install app**.

The web version works offline once opened, but has no reminders or automatic backups.

## Move data from the old web version

If you already used the earlier web version of this app:

1. Open the old version, go to **Settings** and tap **Save backup file**.
2. In the ARK Studios app, go to **Settings**, tap **Restore from file** and choose that backup.

## Backups

In the Android app, backups happen by themselves.

1. Every day you change something, ARK Studios saves a backup file called `ark-studios-backup-YYYY-MM-DD.json` in **Documents → ARK Studios** on your phone. Today's file is replaced with the latest data, and the newest 14 files are kept.
2. To see when the last one was saved, go to **Settings → Backup and restore**, under **Automatic backups**.
3. These files stay on the phone even if you uninstall the app.
4. To save one yourself, tap **Save backup file**. It goes into the same folder, and you can then share it.

**Weekly reminder to share a copy.** Once a week, the Today screen asks *"Send this week’s backup to Google Drive or WhatsApp?"* Tap **Share** and pick Google Drive or WhatsApp "Message yourself". Tap **Later** to hide it for 7 days. It comes back 7 days after you last shared. On the web version it offers **Save file** instead.

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
