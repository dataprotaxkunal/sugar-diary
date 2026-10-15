export const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date | number) => {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const hm = (d: Date | number) => {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

export const parseHM = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
};

export const fmtTime = (t: string) => {
  const { h, m } = parseHM(t);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

export const fmtClock = (ts: number) => fmtTime(hm(ts));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const fmtDay = (d: Date | number) => {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getDate()} ${MONTHS[x.getMonth()]}`;
};

export const fmtLongDate = (d: Date) => `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const weekdayShort = (d: Date) => DAYS[d.getDay()];

export const relDay = (ts: number) => {
  const today = ymd(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const k = ymd(ts);
  if (k === today) return 'Today';
  if (k === ymd(y)) return 'Yesterday';
  return fmtDay(ts);
};

export const startOfDay = (d: Date | number) => {
  const x = new Date(typeof d === 'number' ? d : d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Last n calendar days, oldest first, as YYYY-MM-DD. */
export const lastDays = (n: number) => {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(ymd(d));
  }
  return out;
};

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Whole calendar days from a (YYYY-MM-DD) to b (YYYY-MM-DD); negative if b is earlier. */
export const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 864e5);

export const addDays = (key: string, n: number) => {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
};

/** For an every-N-days plan: is `day` a test day? */
export const isIntervalDay = (start: string, every: number, day: string) => {
  const diff = daysBetween(start, day);
  return diff >= 0 && diff % every === 0;
};

/** Next test day on or after `from` for an every-N-days plan. */
export const nextIntervalDay = (start: string, every: number, from: string) => {
  const diff = daysBetween(start, from);
  if (diff <= 0) return start;
  return addDays(start, Math.ceil(diff / every) * every);
};
