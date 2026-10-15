import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { connect, sync } from './healthConnect';
import { useStore } from './store';

let running = false;
const listeners = new Set<(b: boolean) => void>();
const setRunning = (b: boolean) => {
  running = b;
  listeners.forEach((l) => l(b));
};

const DAY = 864e5;

/** Pull workouts, steps and glucose from Health Connect and push unsaved sugar readings to it. */
export function useHealthSync() {
  const { data, applySync, setHealth } = useStore();
  const [syncing, setSyncing] = useState(running);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    listeners.add(setSyncing);
    return () => {
      listeners.delete(setSyncing);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (running) return 'busy' as const;
    setRunning(true);
    try {
      const d = dataRef.current;
      const since = d.health.lastSync ? d.health.lastSync - 2 * DAY : Date.now() - 30 * DAY;
      const unsaved = d.readings.filter((r) => !r.hcId && !r.source && !r.demo && r.ts > Date.now() - 30 * DAY);
      const res = await sync({ since, unsaved, saveReadings: d.health.saveReadings, importReadings: d.health.importReadings });
      if (!res) return 'unavailable' as const;
      applySync(res);
      return 'ok' as const;
    } catch (e) {
      console.warn('Health sync failed', e);
      return 'error' as const;
    } finally {
      setRunning(false);
    }
  }, [applySync]);

  const connectNow = useCallback(async () => {
    const g = await connect();
    if (!g) return null;
    const any = g.exercise || g.steps || g.readGlucose || g.writeGlucose;
    setHealth({ connected: any });
    if (any) await syncNow();
    return g;
  }, [setHealth, syncNow]);

  return { syncing, syncNow, connectNow };
}

/** Mounted once at the root: syncs when the app opens or comes back to the foreground. */
export function useAutoHealthSync() {
  const { data, ready } = useStore();
  const { syncNow } = useHealthSync();
  const connected = ready && data.health.connected;
  const lastRef = useRef(data.health.lastSync ?? 0);
  lastRef.current = data.health.lastSync ?? 0;

  useEffect(() => {
    if (!connected) return;
    const maybe = () => {
      if (Date.now() - lastRef.current > 5 * 60 * 1000) syncNow();
    };
    maybe();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') maybe();
    });
    return () => sub.remove();
  }, [connected, syncNow]);
}
