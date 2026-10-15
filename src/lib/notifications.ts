import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fmtTime, parseHM } from './date';
import { mealLabel } from './health';
import type { AppData } from './types';

export const ACTION_TAKEN = 'DOSE_TAKEN';
export const ACTION_SNOOZE = 'DOSE_SNOOZE';
export const ACTION_LOG = 'LOG_SUGAR';
const CAT_DOSE = 'med-dose';
const CAT_SUGAR = 'sugar-check';

export type NotifData =
  | { kind: 'med'; medId: string; time: string }
  | { kind: 'sugar'; ctx: string }
  | { kind: 'exercise' };

let configured = false;

export async function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medicine', {
        name: 'Medicine reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#0F7A63',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('health', {
        name: 'Sugar checks and exercise',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
    await Notifications.setNotificationCategoryAsync(CAT_DOSE, [
      { identifier: ACTION_TAKEN, buttonTitle: '✓ Taken', options: { opensAppToForeground: true } },
      { identifier: ACTION_SNOOZE, buttonTitle: 'Snooze 10 min', options: { opensAppToForeground: true } },
    ]);
    await Notifications.setNotificationCategoryAsync(CAT_SUGAR, [
      { identifier: ACTION_LOG, buttonTitle: 'Log reading', options: { opensAppToForeground: true } },
    ]);
  } catch {
    // Categories/channels are best-effort; reminders still fire without them.
  }
}

export async function getPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

export async function requestPermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

/** Rebuild every repeating reminder from the current data. Cheap and keeps schedules exactly in sync. */
export async function syncSchedules(data: AppData) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!(await Notifications.getPermissionsAsync()).granted) return;

    const jobs: Promise<string>[] = [];
    for (const med of data.medicines) {
      if (!med.active || med.demo) continue;
      for (const time of med.times) {
        const { h, m } = parseHM(time);
        const d: NotifData = { kind: 'med', medId: med.id, time };
        jobs.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: `💊 Time for ${med.name}`,
              body: [med.dose, mealLabel(med.meal), fmtTime(time)].filter(Boolean).join(' · '),
              data: d,
              categoryIdentifier: CAT_DOSE,
              sound: 'default',
              color: '#0F7A63',
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: 'medicine' },
          }),
        );
      }
    }
    for (const c of data.profile.sugarChecks) {
      if (!c.enabled) continue;
      const { h, m } = parseHM(c.time);
      const d: NotifData = { kind: 'sugar', ctx: c.label };
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: '🩸 Time to check your sugar',
            body: `${labelFor(c.label)} reading. Tap to log it.`,
            data: d,
            categoryIdentifier: CAT_SUGAR,
            sound: 'default',
            color: '#0F7A63',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: 'health' },
        }),
      );
    }
    const ex = data.profile.exerciseReminder;
    if (ex.enabled) {
      const { h, m } = parseHM(ex.time);
      const d: NotifData = { kind: 'exercise' };
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: '🚶 Time to move',
            body: `Your goal today is ${data.profile.exerciseGoal} minutes. A brisk walk counts!`,
            data: d,
            sound: 'default',
            color: '#0F7A63',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: 'health' },
        }),
      );
    }
    await Promise.all(jobs);
  } catch (e) {
    console.warn('Could not schedule reminders', e);
  }
}

export async function snooze(content: Notifications.NotificationContent, minutes = 10) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title ?? 'Reminder',
        body: content.body ?? undefined,
        data: (content.data ?? {}) as Record<string, unknown>,
        categoryIdentifier: CAT_DOSE,
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60, channelId: 'medicine' },
    });
  } catch {}
}

function labelFor(ctx: string) {
  return ({ fasting: 'Fasting', before: 'Before-meal', after: 'After-meal', bedtime: 'Bedtime', random: 'Sugar' } as Record<string, string>)[ctx] ?? 'Sugar';
}

/** Fires a sample reminder a few seconds from now so the user can confirm alerts work on their phone. */
export async function sendTest() {
  await Notifications.scheduleNotificationAsync({
    content: { title: '✅ Reminders are working', body: 'This is how your medicine and sugar-check alerts will look.', sound: 'default', color: '#0F7A63' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: 'medicine' },
  });
}

export async function scheduledCount() {
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}
