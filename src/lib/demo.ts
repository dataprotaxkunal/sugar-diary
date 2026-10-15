import { uid, ymd } from './date';
import type { ActivityType, AppData, DoseLog, Medicine, Reading, Workout } from './types';

/** `days` of realistic example data (default 90) so a new user can see what the app looks like. Every item is flagged `demo`. */
export function makeDemo(days = 90): Pick<AppData, 'readings' | 'medicines' | 'doses' | 'workouts'> {
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const meds: Medicine[] = [
    { id: 'demo-met', name: 'Metformin', dose: '500 mg', form: 'tablet', meal: 'after', times: ['08:30', '20:30'], active: true, demo: true },
    { id: 'demo-glim', name: 'Glimepiride', dose: '1 mg', form: 'tablet', meal: 'before', times: ['08:00'], active: true, demo: true },
  ];
  const readings: Reading[] = [];
  const workouts: Workout[] = [];
  const doses: Record<string, DoseLog> = {};
  const now = new Date();
  const kinds: ActivityType[] = ['walk', 'walk', 'yoga', 'walk', 'cycling'];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const improve = (i / days) * 30; // sugar trending better over time
    const at = (h: number, m: number) => {
      const x = new Date(d);
      x.setHours(h, m, 0, 0);
      return x.getTime();
    };
    const push = (h: number, m: number, ctx: Reading['ctx'], base: number, spread: number) => {
      const ts = at(h, m);
      if (ts > now.getTime()) return;
      readings.push({ id: uid(), value: Math.round(base + improve + rnd() * spread), ctx, ts, demo: true });
    };
    push(7, 15, 'fasting', 98, 34);
    if (rnd() > 0.3) push(14, 10, 'after', 138, 70);
    if (rnd() > 0.55) push(22, 5, 'bedtime', 118, 40);

    for (const m of meds)
      for (const t of m.times) {
        const [h, mm] = t.split(':').map(Number);
        if (at(h, mm) > now.getTime()) continue;
        if (rnd() > 0.12) doses[`${ymd(d)}|${m.id}|${t}`] = { status: 'taken', at: at(h, mm + Math.round(rnd() * 20)) };
      }
    if (rnd() > 0.25 && at(18, 30) < now.getTime()) {
      workouts.push({ id: uid(), type: kinds[Math.floor(rnd() * kinds.length)], minutes: Math.round(15 + rnd() * 30), ts: at(18, 30), demo: true });
    }
  }
  return { readings, medicines: meds, doses, workouts };
}
