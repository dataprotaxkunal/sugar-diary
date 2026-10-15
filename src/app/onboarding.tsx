import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, IconBubble, Row, TimeChip, Toggle, Txt } from '../components/ui';
import { DIABETES_TYPES } from '../lib/health';
import { requestPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { radius, space, useColors } from '../lib/theme';

const FEATURES = [
  { icon: 'water' as const, title: 'Track blood sugar', text: 'Log readings in seconds and see if you’re in range.' },
  { icon: 'alarm' as const, title: 'Never miss a dose', text: 'Daily medicine reminders with a one-tap “Taken” button.' },
  { icon: 'walk' as const, title: 'Stay active', text: 'Exercise reminders and a daily movement goal.' },
  { icon: 'stats-chart' as const, title: 'See your progress', text: 'Clear charts, averages and an estimated HbA1c.' },
];

export default function Onboarding() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateProfile } = useStore();
  const [step, setStep] = useState(0);
  const p = data.profile;
  const [name, setName] = useState(p.name);
  const [type, setType] = useState(p.diabetesType);
  const [checks, setChecks] = useState(p.sugarChecks);
  const [exercise, setExercise] = useState(p.exerciseReminder);
  const [notifOk, setNotifOk] = useState<boolean | null>(null);

  const finish = () => {
    updateProfile({ name: name.trim(), diabetesType: type, sugarChecks: checks, exerciseReminder: exercise, onboarded: true });
    setTimeout(() => router.replace('/'), 50);
  };

  if (step === 0) {
    return (
      <LinearGradient colors={[c.heroFrom, c.heroTo]} style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.xl, justifyContent: 'space-between' }}>
        <View style={{ gap: space.lg }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="water" size={38} color="#FFFFFF" />
          </View>
          <Txt v="display" color="#FFFFFF" style={{ fontSize: 40, lineHeight: 46 }}>
            Sugar Diary
          </Txt>
          <Txt v="h3" color="rgba(255,255,255,0.9)" style={{ fontWeight: '500', lineHeight: 23 }}>
            Your daily companion for managing diabetes, for you and your family.
          </Txt>
          <View style={{ gap: space.lg, marginTop: space.lg }}>
            {FEATURES.map((f) => (
              <Row key={f.title} gap={space.md} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={f.icon} size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="h3" color="#FFFFFF">
                    {f.title}
                  </Txt>
                  <Txt v="sub" color="rgba(255,255,255,0.8)">
                    {f.text}
                  </Txt>
                </View>
              </Row>
            ))}
          </View>
        </View>
        <Pressable onPress={() => setStep(1)} style={({ pressed }) => ({ backgroundColor: '#FFFFFF', borderRadius: radius.lg, paddingVertical: 17, alignItems: 'center', opacity: pressed ? 0.9 : 1 })}>
          <Txt v="h3" color={c.heroFrom}>
            Get started
          </Txt>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior="height">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: 40, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => setStep(step - 1)} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </Pressable>
          <Row gap={6}>
            {[1, 2].map((i) => (
              <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? c.primary : c.line }} />
            ))}
          </Row>
          <View style={{ width: 24 }} />
        </Row>

        {step === 1 ? (
          <>
            <View style={{ gap: 6 }}>
              <Txt v="h1">About you</Txt>
              <Txt v="sub">This personalises your dashboard. Everything stays on this phone.</Txt>
            </View>
            <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Kunal" autoFocus maxLength={40} />
            <View style={{ gap: space.sm }}>
              <Txt v="label">Diabetes type</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {DIABETES_TYPES.map((d) => (
                  <Chip key={d.key} label={d.label} selected={type === d.key} onPress={() => setType(d.key)} />
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Txt v="h1">Daily reminders</Txt>
              <Txt v="sub">Pick when you’d like a nudge. You can add medicines and change times any time.</Txt>
            </View>

            {checks.map((s) => (
              <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconBubble name="water" color={c.bad} bg={c.badSoft} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Txt v="h3">{s.label === 'fasting' ? 'Fasting sugar check' : 'After-lunch sugar check'}</Txt>
                  <View style={{ flexDirection: 'row' }}>
                    <TimeChip time={s.time} onChange={(t) => setChecks(checks.map((x) => (x.id === s.id ? { ...x, time: t } : x)))} />
                  </View>
                </View>
                <Toggle value={s.enabled} onChange={(v) => setChecks(checks.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)))} />
              </Card>
            ))}
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconBubble name="walk" color={c.ex} bg={c.exSoft} />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt v="h3">Exercise reminder</Txt>
                <View style={{ flexDirection: 'row' }}>
                  <TimeChip time={exercise.time} onChange={(t) => setExercise({ ...exercise, time: t })} />
                </View>
              </View>
              <Toggle value={exercise.enabled} onChange={(v) => setExercise({ ...exercise, enabled: v })} />
            </Card>

            <Card style={{ backgroundColor: notifOk ? c.goodSoft : c.primarySoft, shadowOpacity: 0, elevation: 0 }}>
              <Row>
                <Ionicons name={notifOk ? 'checkmark-circle' : 'notifications'} size={22} color={notifOk ? c.good : c.primary} />
                <Txt v="h3" style={{ flex: 1 }}>
                  {notifOk ? 'Notifications are on' : notifOk === false ? 'Notifications are blocked' : 'Allow notifications'}
                </Txt>
              </Row>
              <Txt v="sub">{notifOk === false ? 'You can turn them on later from the Reminders tab.' : 'Needed so reminders reach you even when the app is closed.'}</Txt>
              {!notifOk ? <Button title="Allow notifications" small onPress={async () => setNotifOk(await requestPermission())} /> : null}
            </Card>
          </>
        )}
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md }}>
        {step === 1 ? <Button title="Continue" onPress={() => setStep(2)} disabled={!name.trim()} /> : <Button title="Start using Sugar Diary" icon="checkmark-circle" onPress={finish} />}
      </View>
    </KeyboardAvoidingView>
  );
}
