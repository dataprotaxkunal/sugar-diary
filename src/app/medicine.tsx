import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, pickTime, Row, success, TimeChip, Toggle, Txt } from '../components/ui';
import { MEALS, MED_FORMS } from '../lib/health';
import { useStore } from '../lib/store';
import { radius, space, useColors } from '../lib/theme';
import type { MealTiming, MedForm } from '../lib/types';

const SCHEDULES: { label: string; times: string[] }[] = [
  { label: 'Once a day', times: ['08:30'] },
  { label: 'Twice a day', times: ['08:30', '20:30'] },
  { label: '3 times a day', times: ['08:30', '13:30', '20:30'] },
];

export default function MedicineScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveMedicine, deleteMedicine } = useStore();
  const existing = data.medicines.find((m) => m.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [dose, setDose] = useState(existing?.dose ?? '');
  const [form, setForm] = useState<MedForm>(existing?.form ?? 'tablet');
  const [meal, setMeal] = useState<MealTiming>(existing?.meal ?? 'after');
  const [times, setTimes] = useState<string[]>(existing?.times ?? ['08:30']);
  const [active, setActive] = useState(existing?.active ?? true);

  const sorted = [...new Set(times)].sort();
  const canSave = name.trim().length > 0 && sorted.length > 0;

  const save = () => {
    saveMedicine({ id: existing?.id, name: name.trim(), dose: dose.trim(), form, meal, times: sorted, active });
    success();
    router.back();
  };

  const remove = () =>
    Alert.alert(`Delete ${existing?.name}?`, 'Its reminders and history will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (existing) deleteMedicine(existing.id);
          router.back();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: existing ? 'Edit medicine' : 'Add medicine' }} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Field label="Medicine name" value={name} onChangeText={setName} placeholder="e.g. Metformin" autoFocus={!existing} maxLength={50} />
        <Field label="Dose" value={dose} onChangeText={setDose} placeholder={form === 'insulin' ? 'e.g. 10 units' : 'e.g. 500 mg or 1 tablet'} maxLength={40} />

        <View style={{ gap: space.sm }}>
          <Txt v="label">Type</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {MED_FORMS.map((f) => (
              <Chip key={f.key} label={f.label} icon={f.icon as never} selected={form === f.key} onPress={() => setForm(f.key)} color={c.med} />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Txt v="label">Take it</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {MEALS.map((m) => (
              <Chip key={m.key} label={m.label} selected={meal === m.key} onPress={() => setMeal(m.key)} />
            ))}
          </View>
        </View>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3">Reminder times</Txt>
            <Txt v="caption">Tap a time to change it</Txt>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {SCHEDULES.map((s) => (
              <Chip key={s.label} label={s.label} selected={JSON.stringify(sorted) === JSON.stringify(s.times)} onPress={() => setTimes(s.times)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {sorted.map((t) => (
              <TimeChip key={t} time={t} onChange={(nt) => setTimes(sorted.map((x) => (x === t ? nt : x)))} onRemove={sorted.length > 1 ? () => setTimes(sorted.filter((x) => x !== t)) : undefined} />
            ))}
            {sorted.length < 6 ? (
              <Pressable onPress={() => pickTime('12:00', (t) => setTimes([...sorted, t]))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.line, borderStyle: 'dashed' }}>
                <Ionicons name="add" size={18} color={c.primary} />
                <Txt v="sub" color={c.primary} style={{ fontWeight: '700' }}>
                  Add time
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">Reminders on</Txt>
            <Txt v="caption">Turn off for a course you've paused</Txt>
          </View>
          <Toggle value={active} onChange={setActive} />
        </Card>

        {existing ? <Button title="Delete medicine" kind="danger" icon="trash-outline" onPress={remove} /> : null}
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button title={existing ? 'Save changes' : 'Add medicine'} icon="checkmark-circle" disabled={!canSave} onPress={save} style={{ borderRadius: radius.lg }} />
      </View>
    </View>
  );
}
