import type { Colors } from './theme';
import type { ActivityType, MealTiming, MedForm, Profile, Reading, ReadingContext } from './types';

export const DIABETES_TYPES: { key: Profile['diabetesType']; label: string }[] = [
  { key: 'type2', label: 'Type 2' },
  { key: 'type1', label: 'Type 1' },
  { key: 'prediabetes', label: 'Prediabetes' },
  { key: 'gestational', label: 'Gestational' },
  { key: 'other', label: 'Other' },
];

export const CONTEXTS: { key: ReadingContext; label: string; icon: string }[] = [
  { key: 'fasting', label: 'Fasting', icon: 'sunny-outline' },
  { key: 'before', label: 'Before meal', icon: 'restaurant-outline' },
  { key: 'after', label: 'After meal', icon: 'fast-food-outline' },
  { key: 'bedtime', label: 'Bedtime', icon: 'moon-outline' },
  { key: 'random', label: 'Random', icon: 'shuffle-outline' },
];
export const ctxLabel = (c: ReadingContext) => CONTEXTS.find((x) => x.key === c)?.label ?? c;

export const ACTIVITIES: { key: ActivityType; label: string; icon: string }[] = [
  { key: 'walk', label: 'Walking', icon: 'walk-outline' },
  { key: 'yoga', label: 'Yoga', icon: 'body-outline' },
  { key: 'cycling', label: 'Cycling', icon: 'bicycle-outline' },
  { key: 'gym', label: 'Gym', icon: 'barbell-outline' },
  { key: 'run', label: 'Running', icon: 'footsteps-outline' },
  { key: 'other', label: 'Other', icon: 'fitness-outline' },
];
export const activity = (k: ActivityType) => ACTIVITIES.find((a) => a.key === k) ?? ACTIVITIES[5];

export const MED_FORMS: { key: MedForm; label: string; icon: string }[] = [
  { key: 'tablet', label: 'Tablet', icon: 'medical-outline' },
  { key: 'capsule', label: 'Capsule', icon: 'ellipse-outline' },
  { key: 'insulin', label: 'Insulin', icon: 'eyedrop-outline' },
  { key: 'syrup', label: 'Syrup', icon: 'flask-outline' },
];
export const medForm = (k: MedForm) => MED_FORMS.find((m) => m.key === k) ?? MED_FORMS[0];

export const MEALS: { key: MealTiming; label: string }[] = [
  { key: 'before', label: 'Before food' },
  { key: 'after', label: 'After food' },
  { key: 'with', label: 'With food' },
  { key: 'any', label: 'Any time' },
];
export const mealLabel = (k: MealTiming) => MEALS.find((m) => m.key === k)?.label ?? '';

export type Level = 'low' | 'good' | 'high' | 'veryHigh' | 'slightlyLow';

export function classify(value: number, ctx: ReadingContext, p: Pick<Profile, 'targetLow' | 'targetHigh' | 'fastingHigh'>): Level {
  if (value < p.targetLow) return 'low';
  if (value > 250) return 'veryHigh';
  if (ctx === 'fasting' || ctx === 'before') {
    if (value < 80 && p.targetLow < 80) return 'slightlyLow';
    return value <= p.fastingHigh ? 'good' : 'high';
  }
  return value <= p.targetHigh ? 'good' : 'high';
}

export const levelLabel: Record<Level, string> = {
  low: 'Low',
  slightlyLow: 'Slightly low',
  good: 'In range',
  high: 'High',
  veryHigh: 'Very high',
};

export function levelColors(l: Level, c: Colors) {
  switch (l) {
    case 'good':
      return { fg: c.good, bg: c.goodSoft };
    case 'high':
    case 'slightlyLow':
      return { fg: c.warn, bg: c.warnSoft };
    default:
      return { fg: c.bad, bg: c.badSoft };
  }
}

export function stats(readings: Reading[], p: Profile) {
  const vals = readings.map((r) => r.value);
  const n = vals.length;
  if (!n) return { n: 0, avg: null, tir: null, lows: 0, highs: 0, min: null, max: null, gmi: null };
  const avg = vals.reduce((a, b) => a + b, 0) / n;
  const inRange = vals.filter((v) => v >= p.targetLow && v <= p.targetHigh).length;
  return {
    n,
    avg,
    tir: (inRange / n) * 100,
    lows: vals.filter((v) => v < p.targetLow).length,
    highs: vals.filter((v) => v > p.targetHigh).length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    // Glucose Management Indicator (Bergenstal 2018) — an estimate, not a lab HbA1c.
    gmi: n >= 10 ? 3.31 + 0.02392 * avg : null,
  };
}

export const TIPS = [
  'A 10–15 minute walk after meals can noticeably lower post-meal sugar.',
  'Check fasting sugar before tea or breakfast for a true reading.',
  'Feeling shaky or sweaty? Check your sugar. Below 70 mg/dL, take 15 g of fast sugar and recheck in 15 minutes.',
  'Keep a small pack of glucose tablets or sweets with you when you go out.',
  'Swap white rice for millets or brown rice a few times a week to smooth sugar spikes.',
  'Drink water through the day. Dehydration can push sugar readings up.',
  'Take your tablets at the same time each day so they work evenly.',
  'Sleep matters: poor sleep can raise next-morning fasting sugar.',
];

/* ---------- Sugar test frequency ---------- */

export type CheckPlan = { label: ReadingContext; time: string; days?: number[]; everyDays?: number };

export const TEST_FREQUENCIES: { key: string; label: string; hint: string; checks: CheckPlan[] }[] = [
  { key: '30n', label: 'Every 30 days', hint: 'One fasting test a month', checks: [{ label: 'fasting', time: '07:30', everyDays: 30 }] },
  { key: '15n', label: 'Every 15 days', hint: 'One fasting test every 15 days', checks: [{ label: 'fasting', time: '07:30', everyDays: 15 }] },
  { key: '7n', label: 'Every 7 days', hint: 'One fasting test a week', checks: [{ label: 'fasting', time: '07:30', everyDays: 7 }] },
  { key: '3w', label: '3 days a week', hint: 'Fasting on Mon, Wed, Fri', checks: [{ label: 'fasting', time: '07:30', days: [1, 3, 5] }] },
  { key: '1d', label: 'Once a day', hint: 'Fasting every morning', checks: [{ label: 'fasting', time: '07:30' }] },
  {
    key: '2d',
    label: 'Twice a day',
    hint: 'Fasting + 2 hrs after lunch',
    checks: [
      { label: 'fasting', time: '07:30' },
      { label: 'after', time: '14:30' },
    ],
  },
  {
    key: '4d',
    label: '4 times a day',
    hint: 'Fasting, after breakfast, after lunch, bedtime',
    checks: [
      { label: 'fasting', time: '07:30' },
      { label: 'after', time: '10:30' },
      { label: 'after', time: '14:30' },
      { label: 'bedtime', time: '22:00' },
    ],
  },
];

const everyDay = (d?: number[]) => !d || d.length === 0 || d.length === 7;
const sig = (cs: { label: string; time: string; days?: number[]; everyDays?: number }[]) =>
  cs
    .map((c) => `${c.label}@${c.time}@${c.everyDays ? 'n' + c.everyDays : everyDay(c.days) ? '*' : [...c.days!].sort().join('')}`)
    .sort()
    .join('|');

/** Which preset (if any) the current enabled checks match. */
export function matchFrequency(checks: { label: string; time: string; days?: number[]; everyDays?: number; enabled: boolean }[]) {
  const s = sig(checks.filter((c) => c.enabled));
  return TEST_FREQUENCIES.find((f) => sig(f.checks) === s)?.key ?? null;
}

/** Planned sugar tests per week from the reminder schedule. */
export function plannedTestsPerWeek(checks: { enabled: boolean; days?: number[]; everyDays?: number }[]) {
  return checks.filter((c) => c.enabled).reduce((n, c) => n + (c.everyDays ? 7 / c.everyDays : everyDay(c.days) ? 7 : c.days!.length), 0);
}

/** Short human description of how often a check repeats. */
export function checkRepeatLabel(c: { days?: number[]; everyDays?: number }) {
  if (c.everyDays) return `Every ${c.everyDays} days`;
  if (everyDay(c.days)) return 'Every day';
  return c.days!.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
}

export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
