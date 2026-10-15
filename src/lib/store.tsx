import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { uid } from './date';
import { makeDemo } from './demo';
import type { SyncResult } from './healthConnect';
import type { AppData, DoseStatus, HealthSettings, Medicine, Profile, Reading, Workout } from './types';

const KEY = 'sugar-diary:v1';

export const defaultProfile: Profile = {
  name: '',
  diabetesType: 'type2',
  targetLow: 70,
  targetHigh: 180,
  fastingHigh: 130,
  exerciseGoal: 30,
  exerciseReminder: { enabled: true, time: '18:30' },
  earlyReminderMin: 15,
  sugarChecks: [
    { id: 'fasting', time: '07:30', label: 'fasting', enabled: true },
    { id: 'after', time: '14:30', label: 'after', enabled: false },
  ],
  onboarded: false,
};

export const defaultHealth: HealthSettings = { connected: false, saveReadings: true, importReadings: true, ignored: [] };

const empty: AppData = { version: 1, profile: defaultProfile, readings: [], medicines: [], doses: {}, workouts: [], hasDemo: false, steps: {}, health: defaultHealth };

export const doseKey = (date: string, medId: string, time: string) => `${date}|${medId}|${time}`;

type Ctx = {
  ready: boolean;
  data: AppData;
  updateProfile: (p: Partial<Profile>) => void;
  addReading: (r: Omit<Reading, 'id'>) => void;
  deleteReading: (id: string) => void;
  saveMedicine: (m: Omit<Medicine, 'id'> & { id?: string }) => void;
  deleteMedicine: (id: string) => void;
  setDose: (date: string, medId: string, time: string, status: DoseStatus | null) => void;
  addWorkout: (w: Omit<Workout, 'id'>) => void;
  deleteWorkout: (id: string) => void;
  loadDemo: () => void;
  clearDemo: () => void;
  resetAll: () => void;
  setHealth: (h: Partial<HealthSettings>) => void;
  applySync: (r: SyncResult) => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(empty);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AppData;
          setData({ ...empty, ...parsed, profile: { ...defaultProfile, ...parsed.profile }, health: { ...defaultHealth, ...parsed.health }, steps: parsed.steps ?? {} });
        }
      } catch (e) {
        console.warn('Could not load saved data', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(data)).catch((e) => console.warn('Save failed', e));
    }, 250);
  }, [data, ready]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const api = useMemo<Ctx>(
    () => ({
      ready,
      data,
      updateProfile: (p) => update((d) => ({ ...d, profile: { ...d.profile, ...p } })),
      addReading: (r) => update((d) => ({ ...d, readings: [...d.readings, { ...r, id: uid() }].sort((a, b) => a.ts - b.ts) })),
      deleteReading: (id) =>
        update((d) => {
          const r = d.readings.find((x) => x.id === id);
          const ignored = r?.source && r.hcId ? [...d.health.ignored, r.hcId] : d.health.ignored;
          return { ...d, readings: d.readings.filter((x) => x.id !== id), health: { ...d.health, ignored } };
        }),
      saveMedicine: (m) =>
        update((d) => {
          if (m.id && d.medicines.some((x) => x.id === m.id)) {
            return { ...d, medicines: d.medicines.map((x) => (x.id === m.id ? ({ ...x, ...m, id: x.id, demo: false } as Medicine) : x)) };
          }
          return { ...d, medicines: [...d.medicines, { ...m, id: uid() } as Medicine] };
        }),
      deleteMedicine: (id) =>
        update((d) => ({
          ...d,
          medicines: d.medicines.filter((m) => m.id !== id),
          doses: Object.fromEntries(Object.entries(d.doses).filter(([k]) => k.split('|')[1] !== id)),
        })),
      setDose: (date, medId, time, status) =>
        update((d) => {
          const doses = { ...d.doses };
          const k = doseKey(date, medId, time);
          if (status) doses[k] = { status, at: Date.now() };
          else delete doses[k];
          return { ...d, doses };
        }),
      addWorkout: (w) => update((d) => ({ ...d, workouts: [...d.workouts, { ...w, id: uid() }].sort((a, b) => a.ts - b.ts) })),
      deleteWorkout: (id) =>
        update((d) => {
          const w = d.workouts.find((x) => x.id === id);
          const ignored = w?.hcId ? [...d.health.ignored, w.hcId] : d.health.ignored;
          return { ...d, workouts: d.workouts.filter((x) => x.id !== id), health: { ...d.health, ignored } };
        }),
      loadDemo: () =>
        update((d) => {
          const demo = makeDemo();
          return {
            ...d,
            hasDemo: true,
            readings: [...d.readings, ...demo.readings].sort((a, b) => a.ts - b.ts),
            workouts: [...d.workouts, ...demo.workouts].sort((a, b) => a.ts - b.ts),
            medicines: [...d.medicines, ...demo.medicines],
            doses: { ...demo.doses, ...d.doses },
          };
        }),
      clearDemo: () =>
        update((d) => {
          const demoMeds = new Set(d.medicines.filter((m) => m.demo).map((m) => m.id));
          return {
            ...d,
            hasDemo: false,
            readings: d.readings.filter((r) => !r.demo),
            workouts: d.workouts.filter((w) => !w.demo),
            medicines: d.medicines.filter((m) => !m.demo),
            doses: Object.fromEntries(Object.entries(d.doses).filter(([k]) => !demoMeds.has(k.split('|')[1]))),
          };
        }),
      resetAll: () => update(() => ({ ...empty })),
      setHealth: (h) => update((d) => ({ ...d, health: { ...d.health, ...h } })),
      applySync: (res) =>
        update((d) => {
          const ignored = new Set(d.health.ignored);
          // Workouts: replace any earlier import of the same Health Connect record (it may have been edited).
          const incomingW = res.workouts.filter((w) => !ignored.has(w.hcId!));
          const wIds = new Set(incomingW.map((w) => w.hcId));
          const workouts = [...d.workouts.filter((w) => !w.hcId || !wIds.has(w.hcId)), ...incomingW].sort((a, b) => a.ts - b.ts);
          // Readings: mark ones we saved, and add imports from other apps.
          const incomingR = res.readings.filter((r) => !ignored.has(r.hcId!));
          const rIds = new Set(incomingR.map((r) => r.hcId));
          const readings = [
            ...d.readings.filter((r) => !r.hcId || !rIds.has(r.hcId)).map((r) => (res.written[r.id] ? { ...r, hcId: res.written[r.id] } : r)),
            ...incomingR,
          ].sort((a, b) => a.ts - b.ts);
          return { ...d, workouts, readings, steps: { ...d.steps, ...res.steps }, health: { ...d.health, connected: true, lastSync: Date.now() } };
        }),
    }),
    [data, ready, update],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}
