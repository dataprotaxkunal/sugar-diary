import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Button, Card, Chip, Divider, EmptyState, IconBubble, Pill, Row, Screen, SectionHeader, TimeChip, Toggle, Txt } from '../../components/ui';
import { fmtTime, uid } from '../../lib/date';
import { CONTEXTS, ctxLabel, matchFrequency, medForm, mealLabel, plannedTestsPerWeek, TEST_FREQUENCIES, WEEKDAY_LETTERS } from '../../lib/health';
import { getPermission, requestPermission, sendTest, syncSchedules } from '../../lib/notifications';
import { useStore } from '../../lib/store';
import { space, useColors } from '../../lib/theme';
import type { ReadingContext, SugarCheck } from '../../lib/types';

export default function Reminders() {
  const c = useColors();
  const { data, updateProfile, saveMedicine } = useStore();
  const p = data.profile;
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined'>('granted');
  const [tested, setTested] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getPermission().then(setPerm);
    }, []),
  );

  const setChecks = (checks: SugarCheck[]) => updateProfile({ sugarChecks: checks });
  const freq = matchFrequency(p.sugarChecks);
  const nextCtx = (): ReadingContext => {
    const used = new Set(p.sugarChecks.map((s) => s.label));
    return (CONTEXTS.find((k) => !used.has(k.key))?.key ?? 'random') as ReadingContext;
  };

  return (
    <Screen>
      <Txt v="h1">Reminders</Txt>

      {perm !== 'granted' ? (
        <Card style={{ backgroundColor: c.warnSoft, gap: space.sm }}>
          <Row>
            <Ionicons name="notifications-off" size={22} color={c.warn} />
            <Txt v="h3" color={c.warn} style={{ flex: 1 }}>
              Notifications are off
            </Txt>
          </Row>
          <Txt v="sub">Turn them on so Sugar Diary can remind you about medicines and sugar checks, even when the app is closed.</Txt>
          <Button
            title={perm === 'denied' ? 'Open phone settings' : 'Turn on notifications'}
            small
            onPress={async () => {
              if (perm === 'denied') return Linking.openSettings();
              const ok = await requestPermission();
              setPerm(ok ? 'granted' : 'denied');
              if (ok) syncSchedules(data);
            }}
          />
        </Card>
      ) : null}

      {/* Medicines */}
      <SectionHeader title="Medicines" action="+ Add" onAction={() => router.push('/medicine')} />
      <Card style={{ paddingVertical: space.sm }}>
        {data.medicines.length === 0 ? (
          <EmptyState icon="medkit-outline" title="No medicines yet" text="Add tablets or insulin with their times. You'll get a reminder every day with a quick “Taken” button." action="Add medicine" onAction={() => router.push('/medicine')} />
        ) : (
          data.medicines.map((m, i) => (
            <View key={m.id}>
              {i ? <Divider /> : null}
              <Pressable onPress={() => router.push({ pathname: '/medicine', params: { id: m.id } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: pressed ? 0.7 : 1 })}>
                <IconBubble name={medForm(m.form).icon as never} color={m.active ? c.med : c.faint} bg={m.active ? c.medSoft : c.cardAlt} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="h3" numberOfLines={1} color={m.active ? undefined : c.sub}>
                    {m.name} {m.dose ? <Txt v="sub">· {m.dose}</Txt> : null}
                  </Txt>
                  <Txt v="sub" numberOfLines={1}>
                    {m.times.map(fmtTime).join(', ')} · {mealLabel(m.meal)}
                  </Txt>
                </View>
                <Toggle value={m.active} onChange={(v) => saveMedicine({ ...m, active: v })} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      {/* Sugar checks */}
      <SectionHeader title="Sugar checks" action={p.sugarChecks.length < 6 ? '+ Add' : undefined} onAction={() => setChecks([...p.sugarChecks, { id: uid(), time: '20:00', label: nextCtx(), enabled: true }])} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="h3">How often do you test?</Txt>
          <Pill text={`${plannedTestsPerWeek(p.sugarChecks)} tests / week`} fg={c.bad} bg={c.badSoft} />
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {TEST_FREQUENCIES.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={freq === f.key}
              color={c.bad}
              onPress={() => setChecks(f.checks.map((x, i) => ({ id: uid() + i, label: x.label, time: x.time, days: x.days, enabled: true })))}
            />
          ))}
        </View>
        <Txt v="caption">
          {freq ? TEST_FREQUENCIES.find((f) => f.key === freq)!.hint + '. ' : 'Custom schedule. '}Ask your doctor how often you should test. You can change times and days below.
        </Txt>
      </Card>
      <Card style={{ paddingVertical: space.sm }}>
        {p.sugarChecks.length === 0 ? (
          <Txt v="sub" style={{ paddingVertical: space.md }}>
            No sugar-check reminders. Tap “+ Add” to create one.
          </Txt>
        ) : (
          p.sugarChecks.map((s, i) => (
            <View key={s.id}>
              {i ? <Divider /> : null}
              <View style={{ paddingVertical: space.md, gap: space.sm }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={space.md} style={{ flex: 1 }}>
                    <IconBubble name="water" color={s.enabled ? c.bad : c.faint} bg={s.enabled ? c.badSoft : c.cardAlt} />
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => {
                        const idx = CONTEXTS.findIndex((k) => k.key === s.label);
                        const next = CONTEXTS[(idx + 1) % CONTEXTS.length].key;
                        setChecks(p.sugarChecks.map((x) => (x.id === s.id ? { ...x, label: next } : x)));
                      }}
                    >
                      <Txt v="h3">{ctxLabel(s.label as ReadingContext)} check</Txt>
                      <Txt v="caption">Tap to change type</Txt>
                    </Pressable>
                  </Row>
                  <Toggle value={s.enabled} onChange={(v) => setChecks(p.sugarChecks.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)))} />
                </Row>
                <Row style={{ paddingLeft: 52 }} gap={5}>
                  {WEEKDAY_LETTERS.map((L, d) => {
                    const all = !s.days || s.days.length === 0 || s.days.length === 7;
                    const on = all || s.days!.includes(d);
                    return (
                      <Pressable
                        key={d}
                        accessibilityLabel={`Toggle day ${d}`}
                        onPress={() => {
                          const cur = all ? [0, 1, 2, 3, 4, 5, 6] : [...s.days!];
                          const next = on ? cur.filter((x) => x !== d) : [...cur, d].sort();
                          if (!next.length) return;
                          setChecks(p.sugarChecks.map((x) => (x.id === s.id ? { ...x, days: next.length === 7 ? undefined : next } : x)));
                        }}
                        style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.bad : c.cardAlt }}
                      >
                        <Txt v="caption" color={on ? '#FFFFFF' : c.sub} style={{ fontWeight: '700' }}>
                          {L}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </Row>
                <Row style={{ paddingLeft: 52 }}>
                  <TimeChip time={s.time} onChange={(t) => setChecks(p.sugarChecks.map((x) => (x.id === s.id ? { ...x, time: t } : x)))} />
                  <Pressable onPress={() => setChecks(p.sugarChecks.filter((x) => x.id !== s.id))} hitSlop={8} style={{ marginLeft: 'auto', padding: 6 }}>
                    <Ionicons name="trash-outline" size={20} color={c.faint} />
                  </Pressable>
                </Row>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Early alarm */}
      <SectionHeader title="Early alarm" />
      <Card>
        <Row gap={space.md}>
          <IconBubble name="timer-outline" color={c.primary} bg={c.primarySoft} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">Alert me before medicines and tests</Txt>
            <Txt v="caption">{p.earlyReminderMin ? `An extra alarm ${p.earlyReminderMin} min before each one, plus the on-time alarm` : 'Only the on-time alarm'}</Txt>
          </View>
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {[0, 5, 10, 15, 30].map((m) => (
            <Chip key={m} label={m ? `${m} min` : 'Off'} selected={p.earlyReminderMin === m} onPress={() => updateProfile({ earlyReminderMin: m })} />
          ))}
        </View>
      </Card>

      {/* Exercise */}
      <SectionHeader title="Exercise" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={space.md} style={{ flex: 1 }}>
            <IconBubble name="walk" color={p.exerciseReminder.enabled ? c.ex : c.faint} bg={p.exerciseReminder.enabled ? c.exSoft : c.cardAlt} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">Daily exercise reminder</Txt>
              <Txt v="caption">Goal: {p.exerciseGoal} minutes a day</Txt>
            </View>
          </Row>
          <Toggle value={p.exerciseReminder.enabled} onChange={(v) => updateProfile({ exerciseReminder: { ...p.exerciseReminder, enabled: v } })} />
        </Row>
        <Row style={{ paddingLeft: 52 }}>
          <TimeChip time={p.exerciseReminder.time} onChange={(t) => updateProfile({ exerciseReminder: { ...p.exerciseReminder, time: t } })} />
          <Pressable onPress={() => router.push('/targets')} style={{ marginLeft: 'auto' }}>
            <Txt v="sub" color={c.primary} style={{ fontWeight: '700' }}>
              Change goal
            </Txt>
          </Pressable>
        </Row>
      </Card>

      {perm === 'granted' ? (
        <Button
          title={tested ? 'Test sent: check in 5 seconds' : 'Send a test notification'}
          kind="secondary"
          icon="notifications-outline"
          onPress={async () => {
            await sendTest();
            setTested(true);
            setTimeout(() => setTested(false), 8000);
          }}
        />
      ) : null}
      <Txt v="caption" center>
        Reminders repeat at the times and days above. Some phones (Xiaomi, Oppo, Vivo, Realme) stop reminders for apps in battery saver. If alerts don’t arrive, set Sugar Diary’s battery usage to “No restrictions”.
      </Txt>
    </Screen>
  );
}
