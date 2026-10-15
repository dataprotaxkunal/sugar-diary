export type ReadingContext = 'fasting' | 'before' | 'after' | 'bedtime' | 'random';

export type Reading = {
  id: string;
  value: number; // mg/dL
  ctx: ReadingContext;
  ts: number;
  note?: string;
  demo?: boolean;
  /** Health Connect record id: set when imported from, or saved to, Health Connect. */
  hcId?: string;
  /** Where the reading came from when not entered in this app (e.g. a glucometer app). */
  source?: string;
};

export type MedForm = 'tablet' | 'insulin' | 'capsule' | 'syrup';
export type MealTiming = 'before' | 'after' | 'with' | 'any';

export type Medicine = {
  id: string;
  name: string;
  dose: string;
  form: MedForm;
  meal: MealTiming;
  times: string[]; // "HH:MM"
  active: boolean;
  demo?: boolean;
};

export type DoseStatus = 'taken' | 'skipped';
export type DoseLog = { status: DoseStatus; at: number };

export type ActivityType = 'walk' | 'yoga' | 'cycling' | 'gym' | 'run' | 'other';

export type Workout = {
  id: string;
  type: ActivityType;
  minutes: number;
  ts: number;
  note?: string;
  demo?: boolean;
  hcId?: string;
  /** App that recorded it, e.g. "Google Fit", when imported from Health Connect. */
  source?: string;
};

export type SugarCheck = {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  /** Days of the week this check repeats on (0 = Sunday … 6 = Saturday). Missing or all seven = every day. */
  days?: number[];
};

export type Profile = {
  name: string;
  diabetesType: 'type1' | 'type2' | 'prediabetes' | 'gestational' | 'other';
  targetLow: number;
  targetHigh: number; // after meal / overall upper
  fastingHigh: number;
  exerciseGoal: number; // minutes per day
  exerciseReminder: { enabled: boolean; time: string };
  /** Extra alert this many minutes before each medicine and sugar check (0 = off). */
  earlyReminderMin: number;
  sugarChecks: SugarCheck[];
  onboarded: boolean;
};

export type AppData = {
  version: 1;
  profile: Profile;
  readings: Reading[];
  medicines: Medicine[];
  doses: Record<string, DoseLog>; // key: YYYY-MM-DD|medId|HH:MM
  workouts: Workout[];
  hasDemo: boolean;
  /** Daily step totals from Health Connect, keyed YYYY-MM-DD. */
  steps: Record<string, number>;
  health: HealthSettings;
};

export type HealthSettings = {
  connected: boolean;
  lastSync?: number;
  saveReadings: boolean;
  importReadings: boolean;
  /** Health Connect ids the user deleted here, so they are not imported again. */
  ignored: string[];
};
