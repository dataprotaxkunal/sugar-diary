export type ReadingContext = 'fasting' | 'before' | 'after' | 'bedtime' | 'random';

export type Reading = {
  id: string;
  value: number; // mg/dL
  ctx: ReadingContext;
  ts: number;
  note?: string;
  demo?: boolean;
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
};

export type SugarCheck = { id: string; time: string; label: string; enabled: boolean };

export type Profile = {
  name: string;
  diabetesType: 'type1' | 'type2' | 'prediabetes' | 'gestational' | 'other';
  targetLow: number;
  targetHigh: number; // after meal / overall upper
  fastingHigh: number;
  exerciseGoal: number; // minutes per day
  exerciseReminder: { enabled: boolean; time: string };
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
};
