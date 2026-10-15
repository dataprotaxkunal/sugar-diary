import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ymd } from '../lib/date';
import { ACTION_LOG, ACTION_SNOOZE, ACTION_TAKEN, configureNotifications, NotifData, snooze, syncSchedules } from '../lib/notifications';
import { StoreProvider, useStore } from '../lib/store';
import { useColors, useIsDark } from '../lib/theme';
import { useAutoHealthSync } from '../lib/useHealthSync';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

function NotificationBridge() {
  const { ready, data } = useStore();

  // Keep scheduled reminders in sync with medicines and reminder settings.
  const scheduleKey = useMemo(
    () => JSON.stringify([data.medicines.map((m) => [m.id, m.name, m.dose, m.meal, m.times, m.active, m.demo]), data.profile.sugarChecks, data.profile.exerciseReminder, data.profile.exerciseGoal]),
    [data.medicines, data.profile.sugarChecks, data.profile.exerciseReminder, data.profile.exerciseGoal],
  );
  const dataRef = useRef(data);
  dataRef.current = data;
  useEffect(() => {
    if (ready && data.profile.onboarded) syncSchedules(dataRef.current);
  }, [scheduleKey, ready, data.profile.onboarded]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return Platform.OS === 'web' ? null : <NotificationResponses />;
}

/** Handles taps and action buttons on notifications (also when the app was closed). Phone only. */
function NotificationResponses() {
  const { ready, setDose } = useStore();
  const handled = useRef(new Set<string>());
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!ready || !last) return;
    const id = `${last.notification.request.identifier}|${last.notification.date}|${last.actionIdentifier}`;
    if (handled.current.has(id)) return;
    handled.current.add(id);
    const d = last.notification.request.content.data as NotifData | undefined;
    if (d?.kind === 'med') {
      if (last.actionIdentifier === ACTION_TAKEN) setDose(ymd(new Date()), d.medId, d.time, 'taken');
      else if (last.actionIdentifier === ACTION_SNOOZE) snooze(last.notification.request.content);
      Notifications.dismissNotificationAsync(last.notification.request.identifier).catch(() => {});
      setTimeout(() => router.navigate('/'), 400);
    } else if (d?.kind === 'sugar') {
      setTimeout(() => router.navigate({ pathname: '/log-sugar', params: { ctx: d.ctx } }), 400);
    } else if (d?.kind === 'exercise') {
      setTimeout(() => router.navigate('/log-exercise'), 400);
    }
    if (last.actionIdentifier === ACTION_LOG) Notifications.dismissNotificationAsync(last.notification.request.identifier).catch(() => {});
    Notifications.clearLastNotificationResponse();
  }, [last, ready, setDose]);

  return null;
}

function HealthAutoSync() {
  useAutoHealthSync();
  return null;
}

function Navigator() {
  const c = useColors();
  const dark = useIsDark();
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.bg, card: c.card, text: c.text, border: c.line, primary: c.primary } };
  const { ready } = useStore();
  if (!ready) return null;
  return (
    <ThemeProvider value={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="log-sugar" options={{ title: 'Log blood sugar', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="log-exercise" options={{ title: 'Log exercise', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="medicine" options={{ title: 'Medicine', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="history" options={{ title: 'History' }} />
        <Stack.Screen name="targets" options={{ title: 'Targets & goals' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <NotificationBridge />
        <HealthAutoSync />
        <Navigator />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
