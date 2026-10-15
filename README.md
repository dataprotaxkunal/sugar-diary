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

## Option A — Try it on your phone in 5 minutes (Expo Go)

1. On your computer install [Node.js 22 LTS](https://nodejs.org).
2. Unzip this project, open a terminal in the folder and run:
   ```
   npm install
   npx expo start
   ```
3. On your Android phone install **Expo Go** from the Play Store and scan the QR code shown in the terminal (phone and computer on the same Wi-Fi).

Expo Go is for trying the app. Reminders work, but the app icon and name are Expo Go's.

## Option B — Install it as a real app (APK)

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

## Option C — Publish on the Google Play Store

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
src/lib/            data store (AsyncStorage), notifications, health rules, demo data
```

Built with Expo SDK 57, React Native 0.86, Expo Router, expo-notifications and react-native-svg.

## Medical note

Sugar Diary keeps a record and shows standard target ranges (fasting 80–130, after meals under 180 mg/dL). The HbA1c figure is an estimate (GMI), not a lab result. Always follow your doctor's advice.
