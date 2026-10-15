# Sugar Diary — Android app

A personal diabetes companion: blood sugar log, medicine reminders with a "Taken" button, exercise tracking, daily notifications and charts. All data stays on the phone.

## What's inside

| Screen | What it does |
|---|---|
| Onboarding | Name, diabetes type, sugar-check and exercise reminder times, notification permission |
| Home | Latest reading with status and trend, 7-day average, time in range, logging streak, today's plan (take/skip medicines, sugar checks), activity ring, daily tip |
| + button | Log blood sugar, log exercise, add a medicine |
| Insights | 7/30/90-day sugar trend with target band, range breakdown, average by time of day, medicine adherence, exercise minutes, estimated HbA1c |
| Reminders | Medicines (on/off), sugar-check times, exercise reminder, test notification |
| Profile | Name and type, targets and goals, history, share report with doctor (WhatsApp/email), sample data, delete all |

Notifications repeat daily. Medicine alerts have **✓ Taken** and **Snooze 10 min** buttons.

## Google Fit (via Health Connect)

Google is shutting down the Google Fit APIs in 2026, so Sugar Diary connects through **Health Connect**, Android's shared health store. Google Fit, Samsung Health, Fitbit and many glucometer apps write into it.

What Sugar Diary does once connected:
- Imports walks and workouts recorded by Google Fit into your Activity ring and exercise chart.
- Shows daily steps on Home and a steps chart in Insights.
- Saves your sugar readings to Health Connect (can be turned off).
- Imports sugar readings from other apps, such as a Bluetooth glucometer app (can be turned off).
- Syncs automatically when you open the app; you can also tap **Sync now**.

To set it up:
1. Install the real APK (Option B or C). Health Connect does not work inside Expo Go.
2. On Android 13 or older, install **Health Connect** from the Play Store (it's built into Android 14+).
3. In Google Fit: **Profile → ⚙ Settings → Sync with Health Connect** → turn on.
4. In Sugar Diary: **Profile → Google Fit & Health Connect → Connect Google Fit**, then allow the items you want.

Requires Android 8.0 or newer. Publishing on the Play Store with Health Connect needs a Health Connect declaration in the Play Console (approval can take about a week).

## Option A — Try it on your phone in 5 minutes (Expo Go)

1. On your computer install [Node.js 22 LTS](https://nodejs.org).
2. Unzip this project, open a terminal in the folder and run:
   ```
   npm install
   npx expo start
   ```
3. On your Android phone install **Expo Go** from the Play Store and scan the QR code shown in the terminal (phone and computer on the same Wi-Fi).

Expo Go is for trying the app. Reminders work, but the app icon and name are Expo Go's, and Google Fit / Health Connect needs the real install (Option B or C).

## Option B (free, no computer setup) — Build the APK on GitHub

GitHub builds the APK for you every time you upload changes. It takes about 15–20 minutes and costs nothing for a personal account.

1. Sign in at [github.com](https://github.com) and create a **New repository** (for example `sugar-diary`). Private is fine.
2. Click **uploading an existing file**, then drag in **everything inside** the unzipped `sugar-diary` folder (including the `.github` folder). Click **Commit changes**.
   - On a Mac, press **Cmd + Shift + .** in Finder to show the hidden `.github` folder before dragging.
   - If the `.github` folder didn't upload: in the repository click **Add file → Create new file**, name it `.github/workflows/build-apk.yml`, paste the contents of that file, and commit.
3. Open the **Actions** tab. You'll see **Build Android APK** running. If GitHub asks, click **I understand my workflows, go ahead and enable them**, then **Run workflow**.
4. When it shows a green tick, open the repository's **Releases** (right side of the main page). Tap the latest **Sugar Diary … (build N)** and download the `.apk` on your phone.
5. Open the file to install. Allow **Install unknown apps** if Android asks.

Each new build installs over the previous one and keeps your data. Send the Release link to family members so they can install it too (for a private repository they need access, or you can forward the .apk file on WhatsApp).

**For the Play Store later:** add your own signing key as repository secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (Settings → Secrets and variables → Actions). The workflow uses it automatically. Note: switching keys means uninstalling the old app once.

## Option C — Build with Expo's cloud (EAS)

This builds the app in Expo's cloud (free account), so you don't need Android Studio.

1. Create a free account at [expo.dev](https://expo.dev/signup).
2. In the project folder run:
   ```
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest build -p android --profile preview
   ```
   Answer **Yes** when it asks to create a project and to generate a keystore.
3. After 10–20 minutes you get a link. Open it on your phone, download the `.apk` and install it (allow "Install unknown apps" for your browser when asked).
4. Send the same link to family members to install it on their phones.

## Option D — Publish on the Google Play Store

1. Pay the one-time Google Play developer fee and create an app in the Play Console.
2. Run `npx eas-cli@latest build -p android --profile production` to get an `.aab` file.
3. Upload it in the Play Console. Health apps must fill in the Health apps declaration and a privacy policy.
4. Remove `SCHEDULE_EXACT_ALARM` from `app.json` → `android.permissions` before submitting unless you can justify it to Google; reminders still work, just a few minutes less precisely.

## Reminders not arriving?

Some phones (Xiaomi, Redmi, Oppo, Vivo, Realme, OnePlus) stop background apps to save battery. Open **Settings → Apps → Sugar Diary → Battery** and choose **No restrictions**, and allow **Autostart** if your phone has it.

## Project structure

```
src/app/            screens (Expo Router)
  (tabs)/           Home, Insights, Reminders, Profile + centre add button
  log-sugar.tsx     log a reading
  log-exercise.tsx  log a workout
  medicine.tsx      add / edit a medicine and its times
  history.tsx       all entries, long-press or tap the bin to delete
  targets.tsx       target ranges and exercise goal
  onboarding.tsx    first-run setup
src/components/     UI kit and SVG charts
src/lib/            data store (AsyncStorage), notifications, Health Connect sync, health rules, demo data
```

Built with Expo SDK 57, React Native 0.86, Expo Router, expo-notifications, react-native-health-connect and react-native-svg.

## Medical note

Sugar Diary keeps a record and shows standard target ranges (fasting 80–130, after meals under 180 mg/dL). The HbA1c figure is an estimate (GMI), not a lab result. Always follow your doctor's advice.
