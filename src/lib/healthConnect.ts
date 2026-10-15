/**
 * Health Connect bridge. Google Fit, Samsung Health, Fitbit and many glucometer apps write into
 * Health Connect on the phone; Sugar Diary reads workouts, steps and glucose from it and can save
 * its own sugar readings back.
 *
 * The native module only exists in the installed Android app (not Expo Go or the web preview),
 * so it is loaded lazily and every call fails soft.
 */
import { Platform } from 'react-native';
import { lastDays, ymd } from './date';
import type { ActivityType, Reading, ReadingContext, Workout } from './types';

type HC = typeof import('react-native-health-connect');

const OWN_PACKAGE = 'com.sugardiary.app';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
export { PLAY_STORE_URL };

let mod: HC | null | undefined;
function hc(): HC | null {
  if (mod !== undefined) return mod;
  if (Platform.OS !== 'android') return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-health-connect') as HC;
  } catch {
    mod = null;
  }
  return mod;
}

export type Availability = 'available' | 'needs-update' | 'not-installed' | 'unsupported';

let status: number | null = null;
/** The raw status code from Health Connect's last availability check (1 unavailable, 2 update needed, 3 ready). */
export const lastStatus = () => status;

export async function availability(): Promise<Availability> {
  const m = hc();
  if (!m) return 'unsupported';
  try {
    const s = await m.getSdkStatus();
    status = s;
    if (s === m.SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (s === m.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-update';
    return 'not-installed';
  } catch {
    // Native module missing (e.g. running inside Expo Go).
    return 'unsupported';
  }
}

const PERMISSIONS = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'BloodGlucose' },
  { accessType: 'write', recordType: 'BloodGlucose' },
] as const;

export type Granted = { exercise: boolean; steps: boolean; readGlucose: boolean; writeGlucose: boolean };

function toGranted(list: { accessType: string; recordType: string }[]): Granted {
  const has = (a: string, r: string) => list.some((p) => p.accessType === a && p.recordType === r);
  return {
    exercise: has('read', 'ExerciseSession'),
    steps: has('read', 'Steps'),
    readGlucose: has('read', 'BloodGlucose'),
    writeGlucose: has('write', 'BloodGlucose'),
  };
}

/** Shows the Health Connect permission screen. Returns what the user allowed. */
export async function connect(): Promise<Granted | null> {
  const m = hc();
  if (!m) return null;
  try {
    if (!(await m.initialize())) return null;
    const granted = await m.requestPermission(PERMISSIONS.map((p) => ({ ...p })));
    return toGranted(granted as { accessType: string; recordType: string }[]);
  } catch (e) {
    console.warn('Health Connect permission request failed', e);
    return null;
  }
}

export async function granted(): Promise<Granted | null> {
  const m = hc();
  if (!m) return null;
  try {
    if (!(await m.initialize())) return null;
    return toGranted((await m.getGrantedPermissions()) as { accessType: string; recordType: string }[]);
  } catch {
    return null;
  }
}

export function openSettings() {
  try {
    hc()?.openHealthConnectSettings();
  } catch {}
}

/* ---------- Mapping ---------- */

function activityFor(m: HC, type: number): ActivityType {
  const E = m.ExerciseType;
  if (type === E.WALKING || type === E.HIKING) return 'walk';
  if (type === E.RUNNING || type === E.RUNNING_TREADMILL) return 'run';
  if (type === E.BIKING || type === E.BIKING_STATIONARY) return 'cycling';
  if (type === E.YOGA) return 'yoga';
  if (type === E.STRENGTH_TRAINING || type === E.WEIGHTLIFTING || type === E.CALISTHENICS || type === E.ELLIPTICAL) return 'gym';
  return 'other';
}

function ctxFor(m: HC, relation: number): ReadingContext {
  const R = m.RelationToMeal;
  if (relation === R.FASTING) return 'fasting';
  if (relation === R.BEFORE_MEAL) return 'before';
  if (relation === R.AFTER_MEAL) return 'after';
  return 'random';
}

function relationFor(m: HC, ctx: ReadingContext): number {
  const R = m.RelationToMeal;
  return ctx === 'fasting' ? R.FASTING : ctx === 'before' ? R.BEFORE_MEAL : ctx === 'after' ? R.AFTER_MEAL : R.GENERAL;
}

const APP_NAMES: Record<string, string> = {
  'com.google.android.apps.fitness': 'Google Fit',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.google.android.apps.healthdata': 'Health Connect',
  'com.mi.health': 'Mi Fitness',
  'com.xiaomi.wearable': 'Mi Fitness',
  'com.huawei.health': 'Huawei Health',
  'com.heytap.health': 'HeyTap Health',
  'com.oneplus.health': 'OHealth',
  'com.noisefit': 'NoiseFit',
  'com.boat.crest': 'boAt Crest',
};
export const appName = (pkg?: string) => (pkg ? APP_NAMES[pkg] ?? 'Health Connect' : 'Health Connect');

async function readAll<T extends 'ExerciseSession' | 'BloodGlucose'>(m: HC, type: T, startTime: string) {
  const out: Awaited<ReturnType<HC['readRecords']>>['records'] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 20; i++) {
    const res = await m.readRecords(type, { timeRangeFilter: { operator: 'after', startTime }, pageSize: 500, pageToken });
    out.push(...res.records);
    pageToken = res.pageToken;
    if (!pageToken) break;
  }
  return out;
}

/* ---------- Sync ---------- */

export type SyncResult = {
  workouts: Workout[];
  readings: Reading[];
  steps: Record<string, number>;
  /** App reading id → Health Connect id, for readings saved this round. */
  written: Record<string, string>;
  granted: Granted;
};

export async function sync(opts: { since: number; unsaved: Reading[]; saveReadings: boolean; importReadings: boolean }): Promise<SyncResult | null> {
  const m = hc();
  if (!m) return null;
  if (!(await m.initialize())) return null;
  const g = toGranted((await m.getGrantedPermissions()) as { accessType: string; recordType: string }[]);
  const startTime = new Date(opts.since).toISOString();
  const result: SyncResult = { workouts: [], readings: [], steps: {}, written: {}, granted: g };

  if (g.exercise) {
    try {
      const sessions = await readAll(m, 'ExerciseSession', startTime);
      for (const r of sessions as Array<{ startTime: string; endTime: string; exerciseType: number; title?: string; metadata?: { id?: string; dataOrigin?: string } }>) {
        if (r.metadata?.dataOrigin === OWN_PACKAGE || !r.metadata?.id) continue;
        const start = new Date(r.startTime).getTime();
        const minutes = Math.round((new Date(r.endTime).getTime() - start) / 60000);
        if (minutes < 1) continue;
        result.workouts.push({ id: 'hc-' + r.metadata.id, hcId: r.metadata.id, type: activityFor(m, r.exerciseType), minutes, ts: start, note: r.title || undefined, source: appName(r.metadata.dataOrigin) });
      }
    } catch (e) {
      console.warn('Reading workouts failed', e);
    }
  }

  if (g.steps) {
    try {
      const days = lastDays(Math.min(31, Math.max(2, Math.ceil((Date.now() - opts.since) / 864e5) + 1)));
      await Promise.all(
        days.map(async (d) => {
          const start = new Date(d + 'T00:00:00');
          const end = new Date(start.getTime() + 864e5);
          const agg = await m.aggregateRecord({ recordType: 'Steps', timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() } });
          const n = (agg as { COUNT_TOTAL?: number }).COUNT_TOTAL ?? 0;
          if (n > 0) result.steps[d] = n;
        }),
      );
    } catch (e) {
      console.warn('Reading steps failed', e);
    }
  }

  if (g.readGlucose && opts.importReadings) {
    try {
      const recs = await readAll(m, 'BloodGlucose', startTime);
      for (const r of recs as Array<{ time: string; level: { inMilligramsPerDeciliter: number }; relationToMeal: number; metadata?: { id?: string; dataOrigin?: string } }>) {
        if (r.metadata?.dataOrigin === OWN_PACKAGE || !r.metadata?.id) continue;
        result.readings.push({ id: 'hc-' + r.metadata.id, hcId: r.metadata.id, value: Math.round(r.level.inMilligramsPerDeciliter), ctx: ctxFor(m, r.relationToMeal), ts: new Date(r.time).getTime(), source: appName(r.metadata.dataOrigin) });
      }
    } catch (e) {
      console.warn('Reading glucose failed', e);
    }
  }

  if (g.writeGlucose && opts.saveReadings && opts.unsaved.length) {
    try {
      const batch = opts.unsaved.slice(0, 200);
      const ids = await m.insertRecords(
        batch.map((r) => ({
          recordType: 'BloodGlucose' as const,
          time: new Date(r.ts).toISOString(),
          level: { value: r.value, unit: 'milligramsPerDeciliter' as const },
          specimenSource: m.SpecimenSource.CAPILLARY_BLOOD,
          mealType: m.MealType.UNKNOWN,
          relationToMeal: relationFor(m, r.ctx),
          metadata: { clientRecordId: r.id, clientRecordVersion: 1 },
        })),
      );
      batch.forEach((r, i) => {
        if (ids[i]) result.written[r.id] = ids[i];
      });
    } catch (e) {
      console.warn('Saving glucose failed', e);
    }
  }
  return result;
}

/** Remove a reading this app saved to Health Connect. */
export async function deleteSavedReading(appId: string) {
  const m = hc();
  if (!m) return;
  try {
    await m.initialize();
    await m.deleteRecordsByUuids('BloodGlucose', [], [appId]);
  } catch {}
}

export const todayKey = () => ymd(new Date());
