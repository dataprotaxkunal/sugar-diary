import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ring, Sparkline } from '../../components/charts';
import { Button, Card, IconBubble, Pill, Row, Screen, SectionHeader, success, tap, Txt } from '../../components/ui';
import { fmtClock, fmtLongDate, fmtTime, greeting, lastDays, relDay, ymd } from '../../lib/date';
import { activity, classify, ctxLabel, levelLabel, medForm, mealLabel, stats, TIPS } from '../../lib/health';
import { useStore } from '../../lib/store';
import { radius, space, useColors } from '../../lib/theme';
import { exerciseMinutes, loggingStreak, PlanItem, todayPlan } from '../../lib/today';

function useNow(ms = 30000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function Home() {
  const c = useColors();
  const { data, setDose, clearDemo } = useStore();
  const now = useNow();
  const p = data.profile;
  const today = ymd(now);

  const latest = data.readings[data.readings.length - 1];
  const prev = data.readings[data.readings.length - 2];
  const level = latest ? classify(latest.value, latest.ctx, p) : null;
  const spark = data.readings.slice(-12).map((r) => r.value);

  const week = useMemo(() => {
    const days = new Set(lastDays(7));
    return stats(data.readings.filter((r) => days.has(ymd(r.ts))), p);
  }, [data.readings, p]);
  const streak = useMemo(() => loggingStreak(data), [data]);
  const plan = todayPlan(data, now);
  const done = plan.filter((i) => (i.kind === 'med' ? i.status != null : i.done)).length;
  const exMin = exerciseMinutes(data, today);
  const lastWorkout = data.workouts[data.workouts.length - 1];
  const stepsToday = data.steps[today] as number | undefined;
  const tip = TIPS[now.getDate() % TIPS.length];
  const initial = (p.name || 'You').trim().charAt(0).toUpperCase();

  return (
    <Screen>
      {/* Header */}
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt v="sub">{fmtLongDate(now)}</Txt>
          <Txt v="h1" numberOfLines={1}>
            {greeting(now)}
            {p.name ? `, ${p.name.split(' ')[0]}` : ''}
          </Txt>
        </View>
        <Pressable onPress={() => router.navigate('/profile')} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Txt v="h2" color={c.primary}>
            {initial}
          </Txt>
        </Pressable>
      </Row>

      {data.hasDemo ? (
        <Card style={{ backgroundColor: c.warnSoft, flexDirection: 'row', alignItems: 'center', padding: space.md, gap: space.sm }}>
          <Ionicons name="flask-outline" size={20} color={c.warn} />
          <Txt v="sub" color={c.warn} style={{ flex: 1, fontWeight: '600' }}>
            You're viewing sample data.
          </Txt>
          <Button title="Clear it" kind="ghost" small onPress={clearDemo} />
        </Card>
      ) : null}

      {/* Hero */}
      <Pressable onPress={() => router.push('/log-sugar')}>
        <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 26, padding: space.xl, gap: space.md, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ position: 'absolute', right: 40, bottom: -70, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="label" color="rgba(255,255,255,0.8)">
              Latest blood sugar
            </Txt>
            {level ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: level === 'good' ? '#7CF0A6' : level === 'high' || level === 'slightlyLow' ? '#FFC879' : '#FF9AA0' }} />
                <Txt v="caption" color="#FFFFFF" style={{ fontWeight: '700' }}>
                  {levelLabel[level]}
                </Txt>
              </View>
            ) : null}
          </Row>
          {latest ? (
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Row gap={6} style={{ alignItems: 'flex-end' }}>
                  <Txt v="display" color="#FFFFFF" style={{ fontSize: 56, lineHeight: 60 }}>
                    {latest.value}
                  </Txt>
                  <Txt v="sub" color="rgba(255,255,255,0.8)" style={{ marginBottom: 10 }}>
                    mg/dL
                  </Txt>
                </Row>
                <Txt v="sub" color="rgba(255,255,255,0.85)">
                  {ctxLabel(latest.ctx)} · {relDay(latest.ts)}, {fmtClock(latest.ts)}
                </Txt>
                {prev ? (
                  <Row gap={4} style={{ marginTop: 4 }}>
                    <Ionicons name={latest.value >= prev.value ? 'arrow-up' : 'arrow-down'} size={14} color="#FFFFFF" />
                    <Txt v="caption" color="rgba(255,255,255,0.9)">
                      {Math.abs(latest.value - prev.value)} from previous
                    </Txt>
                  </Row>
                ) : null}
              </View>
              <Sparkline values={spark} width={110} height={52} />
            </Row>
          ) : (
            <View style={{ gap: 6 }}>
              <Txt v="h1" color="#FFFFFF">
                No readings yet
              </Txt>
              <Txt v="sub" color="rgba(255,255,255,0.85)">
                Tap here to log your first blood sugar reading.
              </Txt>
            </View>
          )}
          <Row style={{ backgroundColor: 'rgba(255,255,255,0.16)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99 }} gap={6}>
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Txt v="sub" color="#FFFFFF" style={{ fontWeight: '700' }}>
              Log reading
            </Txt>
          </Row>
        </LinearGradient>
      </Pressable>

      {/* Quick stats */}
      <Row gap={space.sm}>
        <MiniStat icon="analytics" color={c.primary} bg={c.primarySoft} value={week.avg ? String(Math.round(week.avg)) : '—'} label="7-day avg" />
        <MiniStat icon="checkmark-circle" color={c.good} bg={c.goodSoft} value={week.tir != null ? `${Math.round(week.tir)}%` : '—'} label="In range" />
        <MiniStat icon="flame" color={c.ex} bg={c.exSoft} value={String(streak)} label={streak === 1 ? 'Day streak' : 'Days streak'} />
      </Row>

      {/* Today's plan */}
      <SectionHeader title="Today's plan" action={plan.length ? `${done}/${plan.length} done` : 'Add'} onAction={() => router.navigate('/reminders')} />
      <Card style={{ paddingVertical: space.sm }}>
        {plan.length ? (
          <>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.cardAlt, marginTop: space.sm, overflow: 'hidden' }}>
              <View style={{ width: `${(done / plan.length) * 100}%`, height: 6, backgroundColor: c.primary, borderRadius: 3 }} />
            </View>
            {plan.map((item, i) => (
              <PlanRow key={item.key} item={item} first={i === 0} onDose={(s) => {
                if (item.kind !== 'med') return;
                s ? success() : tap();
                setDose(today, item.med.id, item.time, s);
              }} />
            ))}
          </>
        ) : (
          <View style={{ paddingVertical: space.md, gap: space.md, alignItems: 'flex-start' }}>
            <Txt v="sub">Add your medicines and sugar-check times to get daily reminders and a checklist here.</Txt>
            <Button title="Add a medicine" icon="medkit-outline" small kind="secondary" onPress={() => router.push('/medicine')} />
          </View>
        )}
      </Card>

      {/* Exercise */}
      <SectionHeader title="Activity" action="Log" onAction={() => router.push('/log-exercise')} />
      <Card onPress={() => router.push('/log-exercise')}>
        <Row gap={space.lg}>
          <Ring progress={exMin / p.exerciseGoal} size={84} stroke={9} color={c.ex} track={c.exSoft}>
            <Txt v="h2" style={{ fontVariant: ['tabular-nums'] }}>
              {exMin}
            </Txt>
            <Txt v="caption" style={{ marginTop: -2 }}>
              min
            </Txt>
          </Ring>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="h3">{exMin >= p.exerciseGoal ? 'Goal reached! 🎉' : `${p.exerciseGoal - exMin} min to your goal`}</Txt>
            <Txt v="sub">Daily goal: {p.exerciseGoal} minutes</Txt>
            {lastWorkout ? (
              <Txt v="caption">
                Last: {activity(lastWorkout.type).label}, {lastWorkout.minutes} min · {relDay(lastWorkout.ts)}
                {lastWorkout.source ? ` · ${lastWorkout.source}` : ''}
              </Txt>
            ) : null}
          </View>
          <Ionicons name="add-circle" size={30} color={c.ex} />
        </Row>
        {stepsToday != null ? (
          <Row style={{ backgroundColor: c.cardAlt, borderRadius: 14, padding: space.md }} gap={space.md}>
            <Ionicons name="footsteps" size={20} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Txt v="h3" style={{ fontVariant: ['tabular-nums'] }}>
                {stepsToday.toLocaleString('en-IN')} steps
              </Txt>
              <Txt v="caption">Today · from Google Fit via Health Connect</Txt>
            </View>
          </Row>
        ) : null}
        {!data.health.connected && Platform.OS === 'android' ? (
          <Pressable onPress={() => router.navigate('/profile')} hitSlop={6}>
            <Row gap={6}>
              <Ionicons name="link-outline" size={16} color={c.primary} />
              <Txt v="sub" color={c.primary} style={{ fontWeight: '700', flex: 1 }}>
                Connect Google Fit to import walks and steps automatically
              </Txt>
              <Ionicons name="chevron-forward" size={16} color={c.primary} />
            </Row>
          </Pressable>
        ) : null}
      </Card>

      {/* Tip */}
      <Card style={{ flexDirection: 'row', gap: space.md, backgroundColor: c.primarySoft, shadowOpacity: 0, elevation: 0 }}>
        <IconBubble name="bulb" color={c.primary} bg={c.card} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="label" color={c.primary}>
            Tip of the day
          </Txt>
          <Txt v="body">{tip}</Txt>
        </View>
      </Card>
    </Screen>
  );

  function MiniStat({ icon, color, bg, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string; value: string; label: string }) {
    return (
      <Card style={{ flex: 1, padding: space.md, gap: 6 }} onPress={() => router.navigate('/insights')}>
        <IconBubble name={icon} color={color} bg={bg} size={32} />
        <Txt v="h2" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
        <Txt v="caption" numberOfLines={1}>
          {label}
        </Txt>
      </Card>
    );
  }
}

function PlanRow({ item, first, onDose }: { item: PlanItem; first: boolean; onDose: (s: 'taken' | 'skipped' | null) => void }) {
  const c = useColors();
  const border = first ? null : { borderTopWidth: 1, borderTopColor: c.line };
  const timeColor = item.state === 'due' ? c.warn : item.state === 'late' ? c.bad : c.sub;

  if (item.kind === 'sugar') {
    return (
      <Row style={[{ paddingVertical: space.md, gap: space.md }, border]}>
        <IconBubble name="water" color={c.bad} bg={c.badSoft} />
        <View style={{ flex: 1 }}>
          <Txt v="caption" color={item.done ? c.sub : timeColor} style={{ fontWeight: '700' }}>
            {fmtTime(item.time)} · Sugar check
          </Txt>
          <Txt v="h3">{ctxLabel(item.ctx as never)} reading</Txt>
        </View>
        {item.done ? (
          <Pill text="Logged" icon="checkmark" fg={c.good} bg={c.goodSoft} />
        ) : (
          <Button title="Log" small kind="secondary" onPress={() => router.push({ pathname: '/log-sugar', params: { ctx: item.ctx } })} />
        )}
      </Row>
    );
  }

  const f = medForm(item.med.form);
  return (
    <Row style={[{ paddingVertical: space.md, gap: space.md }, border]}>
      <IconBubble name={f.icon as never} color={c.med} bg={c.medSoft} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="caption" color={item.status ? c.sub : timeColor} style={{ fontWeight: '700' }}>
          {fmtTime(item.time)}
          {!item.status && item.state === 'due' ? ' · Due now' : !item.status && item.state === 'late' ? ' · Missed?' : ''}
        </Txt>
        <Txt v="h3" numberOfLines={1}>
          {item.med.name} {item.med.dose ? <Txt v="sub">{item.med.dose}</Txt> : null}
        </Txt>
        <Txt v="caption">{mealLabel(item.med.meal)}</Txt>
      </View>
      {item.status ? (
        <Pressable onPress={() => onDose(null)} hitSlop={8}>
          <Pill text={item.status === 'taken' ? 'Taken' : 'Skipped'} icon={item.status === 'taken' ? 'checkmark' : 'close'} fg={item.status === 'taken' ? c.good : c.sub} bg={item.status === 'taken' ? c.goodSoft : c.cardAlt} />
        </Pressable>
      ) : (
        <Row gap={6}>
          <Pressable onPress={() => onDose('skipped')} hitSlop={6} style={{ width: 38, height: 38, borderRadius: radius.sm, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={20} color={c.sub} />
          </Pressable>
          <Pressable onPress={() => onDose('taken')} hitSlop={6} style={{ height: 38, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}>
            <Ionicons name="checkmark" size={18} color={c.onPrimary} />
            <Txt v="sub" color={c.onPrimary} style={{ fontWeight: '700' }}>
              Take
            </Txt>
          </Pressable>
        </Row>
      )}
    </Row>
  );
}

