import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, fmtTime, nextIntervalDay, parseHM, ymd } from './date';
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
  | { kind: 'exercise' }
  | { kind: 'early' };

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
    const early = data.profile.earlyReminderMin ?? 0;
    const T = Notifications.SchedulableTriggerInputTypes;

    /** Schedules a repeating alert at `time` on the given weekdays (0–6, Sunday = 0), or every day. */
    const at = (time: string, days: number[] | undefined, minutesBefore: number, channelId: string, content: Notifications.NotificationContentInput) => {
      let { h, m } = parseHM(time);
      let total = h * 60 + m - minutesBefore;
      let dayShift = 0;
      if (total < 0) {
        total += 1440;
        dayShift = -1;
      }
      h = Math.floor(total / 60);
      m = total % 60;
      const everyDay = !days || days.length === 0 || days.length === 7;
      if (everyDay) {
        jobs.push(Notifications.scheduleNotificationAsync({ content, trigger: { type: T.DAILY, hour: h, minute: m, channelId } }));
      } else {
        for (const d of days!) {
          const wd = ((d + dayShift + 7) % 7) + 1; // expo: 1 = Sunday
          jobs.push(Notifications.scheduleNotificationAsync({ content, trigger: { type: T.WEEKLY, weekday: wd, hour: h, minute: m, channelId } }));
        }
      }
    };

    for (const med of data.medicines) {
      if (!med.active || med.demo) continue;
      for (const time of med.times) {
        const d: NotifData = { kind: 'med', medId: med.id, time };
        const detail = [med.dose, mealLabel(med.meal)].filter(Boolean).join(' · ');
        at(time, undefined, 0, 'medicine', {
          title: `💊 Time for ${med.name}`,
          body: [detail, fmtTime(time)].filter(Boolean).join(' · '),
          data: d,
          categoryIdentifier: CAT_DOSE,
          sound: 'default',
          color: '#0F7A63',
        });
        if (early > 0)
          at(time, undefined, early, 'medicine', {
            title: `⏰ In ${early} min: ${med.name}`,
            body: `${detail ? detail + ' · ' : ''}due at ${fmtTime(time)}. Keep it ready.`,
            data: { kind: 'early' },
            sound: 'default',
            color: '#0F7A63',
          });
      }
    }
    /** One-off alarm on a specific date and time (used for every-N-days plans). */
    const onDate = (day: string, time: string, minutesBefore: number, channelId: string, content: Notifications.NotificationContentInput) => {
      const { h, m } = parseHM(time);
      const when = new Date(day + 'T00:00:00');
      when.setHours(h, m, 0, 0);
      const ts = when.getTime() - minutesBefore * 60000;
      if (ts > Date.now() + 5000) jobs.push(Notifications.scheduleNotificationAsync({ content, trigger: { type: T.DATE, date: ts, channelId } }));
    };

    for (const c of data.profile.sugarChecks) {
      if (!c.enabled) continue;
      const d: NotifData = { kind: 'sugar', ctx: c.label };
      if (c.everyDays) {
        // Repeating "every N days" isn't a native trigger, so book the next 10 test days.
        // The schedule is rebuilt every time the app opens, so it keeps rolling forward.
        const today = ymd(new Date());
        let day = nextIntervalDay(c.startDate ?? today, c.everyDays, today);
        for (let i = 0; i < 10; i++, day = addDays(day, c.everyDays)) {
          onDate(day, c.time, 0, 'health', {
            title: '🩸 Sugar test day',
            body: `${labelFor(c.label)} reading (every ${c.everyDays} days). Tap to log it.`,
            data: d,
            categoryIdentifier: CAT_SUGAR,
            sound: 'default',
            color: '#0F7A63',
          });
          if (early > 0)
            onDate(day, c.time, early, 'health', {
              title: `⏰ Sugar test in ${early} min`,
              body: `${labelFor(c.label)} reading at ${fmtTime(c.time)}.${c.label === 'fasting' ? ' Don’t eat or drink tea before it.' : ''}`,
              data: { kind: 'early' },
              sound: 'default',
              color: '#0F7A63',
            });
        }
        // Evening-before heads-up for fasting tests, so nobody eats late by mistake.
        if (c.label === 'fasting')
          for (let i = 0, dd = nextIntervalDay(c.startDate ?? today, c.everyDays, addDays(today, 1)); i < 10; i++, dd = addDays(dd, c.everyDays))
            onDate(addDays(dd, -1), '21:00', 0, 'health', {
              title: '🩸 Fasting sugar test tomorrow',
              body: `Test at ${fmtTime(c.time)} before eating. Avoid late-night snacks.`,
              data: { kind: 'early' },
              sound: 'default',
              color: '#0F7A63',
            });
        continue;
      }
      at(c.time, c.days, 0, 'health', {
        title: '🩸 Time to check your sugar',
        body: `${labelFor(c.label)} reading. Tap to log it.`,
        data: d,
        categoryIdentifier: CAT_SUGAR,
        sound: 'default',
        color: '#0F7A63',
      });
      if (early > 0)
        at(c.time, c.days, early, 'health', {
          title: `⏰ Sugar test in ${early} min`,
          body: `${labelFor(c.label)} reading at ${fmtTime(c.time)}.${c.label === 'fasting' ? ' Don’t eat or drink tea before it.' : ''}`,
          data: { kind: 'early' },
          sound: 'default',
          color: '#0F7A63',
        });
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
