import { hm, lastDays, parseHM, ymd } from './date';
import { doseKey } from './store';
import type { AppData, DoseStatus, Medicine } from './types';

export type PlanItem =
  | { kind: 'med'; key: string; time: string; med: Medicine; status: DoseStatus | null; state: TimeState }
  | { kind: 'sugar'; key: string; time: string; ctx: string; done: boolean; state: TimeState };

export type TimeState = 'upcoming' | 'due' | 'late';

export function timeState(time: string, now = new Date()): TimeState {
  const { h, m } = parseHM(time);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  const diff = (now.getTime() - t.getTime()) / 60000;
  if (diff < 0) return 'upcoming';
  if (diff <= 60) return 'due';
  return 'late';
}

export function todayPlan(data: AppData, now = new Date()): PlanItem[] {
  const today = ymd(now);
  const items: PlanItem[] = [];
  for (const med of data.medicines) {
    if (!med.active) continue;
    for (const time of med.times) {
      const k = doseKey(today, med.id, time);
      items.push({ kind: 'med', key: k, time, med, status: data.doses[k]?.status ?? null, state: timeState(time, now) });
    }
  }
  const todaysCtx = new Set(data.readings.filter((r) => ymd(r.ts) === today).map((r) => r.ctx));
  for (const c of data.profile.sugarChecks) {
    if (!c.enabled) continue;
    if (c.days && c.days.length && c.days.length < 7 && !c.days.includes(now.getDay())) continue;
    items.push({ kind: 'sugar', key: 'sugar-' + c.id, time: c.time, ctx: c.label, done: todaysCtx.has(c.label as never), state: timeState(c.time, now) });
  }
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

export function exerciseMinutes(data: AppData, day: string) {
  return data.workouts.filter((w) => ymd(w.ts) === day).reduce((s, w) => s + w.minutes, 0);
}

/** Per-day share of scheduled medicine doses marked taken (only doses whose time has passed count today). */
export function adherenceByDay(data: AppData, days: string[]) {
  const now = new Date();
  const today = ymd(now);
  const nowHM = hm(now);
  return days.map((d) => {
    let due = 0;
    let taken = 0;
    for (const m of data.medicines) {
      if (!m.active) continue;
      for (const t of m.times) {
        if (d === today && t > nowHM) continue;
        due++;
        if (data.doses[doseKey(d, m.id, t)]?.status === 'taken') taken++;
      }
    }
    return due ? (taken / due) * 100 : null;
  });
}

/** Consecutive days (ending today or yesterday) with at least one sugar reading. */
export function loggingStreak(data: AppData) {
  const have = new Set(data.readings.map((r) => ymd(r.ts)));
  const days = lastDays(400).reverse();
  let i = have.has(days[0]) ? 0 : 1;
  let n = 0;
  for (; i < days.length && have.has(days[i]); i++) n++;
  return n;
}
