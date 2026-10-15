import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Button, Card, Divider, EmptyState, IconBubble, Row, Screen, SectionHeader, TimeChip, Toggle, Txt } from '../../components/ui';
import { fmtTime, uid } from '../../lib/date';
import { CONTEXTS, ctxLabel, medForm, mealLabel } from '../../lib/health';
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
      <SectionHeader title="Sugar checks" action={p.sugarChecks.length < 5 ? '+ Add' : undefined} onAction={() => setChecks([...p.sugarChecks, { id: uid(), time: '20:00', label: nextCtx(), enabled: true }])} />
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
        Reminders repeat every day at the times above. Some phones (Xiaomi, Oppo, Vivo, Realme) stop reminders for apps in battery saver. If alerts don’t arrive, set Sugar Diary’s battery usage to “No restrictions”.
      </Txt>
    </Screen>
  );
}
