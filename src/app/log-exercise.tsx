import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, IconBubble, Stepper, success, Txt, WhenButton } from '../components/ui';
import { ACTIVITIES } from '../lib/health';
import { useStore } from '../lib/store';
import { radius, space, useColors } from '../lib/theme';
import type { ActivityType } from '../lib/types';

const PRESETS = [10, 15, 20, 30, 45, 60];

export default function LogExercise() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { addWorkout } = useStore();
  const [type, setType] = useState<ActivityType>('walk');
  const [minutes, setMinutes] = useState(30);
  const [ts, setTs] = useState(Date.now());
  const [note, setNote] = useState('');

  const save = () => {
    addWorkout({ type, minutes, ts, note: note.trim() || undefined });
    success();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 }}>
        <View style={{ gap: space.sm }}>
          <Txt v="label">Activity</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {ACTIVITIES.map((a) => {
              const on = a.key === type;
              return (
                <Pressable
                  key={a.key}
                  onPress={() => setType(a.key)}
                  style={{ width: '31.5%', alignItems: 'center', gap: 6, paddingVertical: space.md, borderRadius: radius.md, backgroundColor: on ? c.exSoft : c.card, borderWidth: 2, borderColor: on ? c.ex : c.line }}
                >
                  <IconBubble name={a.icon as never} color={on ? c.ex : c.sub} bg={on ? c.card : c.cardAlt} size={40} />
                  <Txt v="sub" color={on ? c.text : c.sub} style={{ fontWeight: '700' }}>
                    {a.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card style={{ alignItems: 'center' }}>
          <Txt v="label">Duration</Txt>
          <Stepper value={minutes} onChange={setMinutes} step={5} min={5} max={300} suffix="min" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' }}>
            {PRESETS.map((m) => (
              <Chip key={m} label={`${m}`} selected={minutes === m} onPress={() => setMinutes(m)} color={c.ex} />
            ))}
          </View>
        </Card>

        <View style={{ gap: space.sm }}>
          <Txt v="label">When</Txt>
          <WhenButton ts={ts} onChange={setTs} />
        </View>
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Evening walk in the park" maxLength={140} />
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button title={`Save ${minutes} min`} icon="checkmark-circle" onPress={save} style={{ borderRadius: radius.lg }} />
      </View>
    </View>
  );
}
