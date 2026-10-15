import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { DayBars, GlucoseChart, HBars } from '../../components/charts';
import { Button, Card, EmptyState, IconBubble, Row, Screen, Txt } from '../../components/ui';
import { lastDays, ymd } from '../../lib/date';
import { classify, CONTEXTS, levelColors, stats } from '../../lib/health';
import { useStore } from '../../lib/store';
import { radius, space, useColors } from '../../lib/theme';
import { adherenceByDay } from '../../lib/today';

const RANGES = [
  { n: 7, label: '7D' },
  { n: 30, label: '30D' },
  { n: 90, label: '90D' },
];

export default function Insights() {
  const c = useColors();
  const { data, loadDemo } = useStore();
  const p = data.profile;
  const [range, setRange] = useState(7);

  const days = useMemo(() => lastDays(range), [range]);
  const daySet = useMemo(() => new Set(days), [days]);
  const readings = useMemo(() => data.readings.filter((r) => daySet.has(ymd(r.ts))), [data.readings, daySet]);
  const s = useMemo(() => stats(readings, p), [readings, p]);
  const adherence = useMemo(() => adherenceByDay(data, days), [data, days]);
  const adhVals = adherence.filter((v): v is number => v != null);
  const adhAvg = adhVals.length ? adhVals.reduce((a, b) => a + b, 0) / adhVals.length : null;
  const exercise = useMemo(() => days.map((d) => data.workouts.filter((w) => ymd(w.ts) === d).reduce((a, w) => a + w.minutes, 0)), [data.workouts, days]);
  const exTotal = exercise.reduce((a, b) => a + b, 0);
  const goalDays = exercise.filter((m) => m >= p.exerciseGoal).length;
  const steps = useMemo(() => days.map((d) => data.steps[d] ?? null), [data.steps, days]);
  const stepVals = steps.filter((v): v is number => v != null);
  const stepAvg = stepVals.length ? stepVals.reduce((a, b) => a + b, 0) / stepVals.length : null;

  const ctxRows = CONTEXTS.map((k) => {
    const vals = readings.filter((r) => r.ctx === k.key).map((r) => r.value);
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { label: k.label, value: avg, limit: k.key === 'fasting' || k.key === 'before' ? p.fastingHigh : p.targetHigh, color: levelColors(classify(Math.round(avg), k.key, p), c).fg };
  }).filter(Boolean) as { label: string; value: number; limit: number; color: string }[];

  const empty = data.readings.length === 0 && data.workouts.length === 0;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="h1">Insights</Txt>
        <View style={{ flexDirection: 'row', backgroundColor: c.cardAlt, borderRadius: radius.md, padding: 4 }}>
          {RANGES.map((r) => (
            <Pressable key={r.n} onPress={() => setRange(r.n)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: range === r.n ? c.card : 'transparent' }}>
              <Txt v="sub" color={range === r.n ? c.text : c.sub} style={{ fontWeight: '700' }}>
                {r.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Row>

      {empty ? (
        <Card>
          <EmptyState icon="stats-chart" title="Your charts will appear here" text="Log blood sugar, medicines and exercise for a few days to see trends, averages and your estimated HbA1c." />
          <Button title="Log first reading" icon="water-outline" onPress={() => router.push('/log-sugar')} />
          <Button title="Explore with sample data" kind="ghost" onPress={loadDemo} />
        </Card>
      ) : (
        <>
          {/* Summary tiles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Tile label="Average" value={s.avg ? String(Math.round(s.avg)) : '—'} unit="mg/dL" />
            <Tile label="Time in range" value={s.tir != null ? `${Math.round(s.tir)}%` : '—'} unit={`${p.targetLow}–${p.targetHigh} mg/dL`} accent={s.tir != null ? (s.tir >= 70 ? c.good : s.tir >= 50 ? c.warn : c.bad) : undefined} />
            <Tile label="Est. HbA1c" value={s.gmi ? `${s.gmi.toFixed(1)}%` : '—'} unit={s.gmi ? 'estimate, not a lab test' : 'needs 10+ readings'} />
            <Tile label="Lows / Highs" value={s.n ? `${s.lows} / ${s.highs}` : '—'} unit={`of ${s.n} readings`} accent={s.lows ? c.bad : undefined} />
          </View>

          {/* Glucose trend */}
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="h3">Blood sugar trend</Txt>
              {s.n ? (
                <Txt v="caption">
                  Min {s.min} · Max {s.max}
                </Txt>
              ) : null}
            </Row>
            <GlucoseChart readings={readings} days={days} profile={p} />
            <Row gap={space.md} style={{ flexWrap: 'wrap' }}>
              <Legend color={c.good} text="In range" />
              <Legend color={c.warn} text="High" />
              <Legend color={c.bad} text="Low / very high" />
              <Legend color={c.band} text="Target band" square />
            </Row>
          </Card>

          {/* Time-in-range bar */}
          {s.n ? (
            <Card>
              <Txt v="h3">Range breakdown</Txt>
              <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: c.cardAlt }}>
                <View style={{ flex: s.lows, backgroundColor: c.bad }} />
                <View style={{ flex: s.n - s.lows - s.highs, backgroundColor: c.good }} />
                <View style={{ flex: s.highs, backgroundColor: c.warn }} />
              </View>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="caption">Low {Math.round((s.lows / s.n) * 100)}%</Txt>
                <Txt v="caption">In range {Math.round(((s.n - s.lows - s.highs) / s.n) * 100)}%</Txt>
                <Txt v="caption">High {Math.round((s.highs / s.n) * 100)}%</Txt>
              </Row>
            </Card>
          ) : null}

          {/* By context */}
          {ctxRows.length ? (
            <Card>
              <Txt v="h3">Average by time of day</Txt>
              <HBars rows={ctxRows} />
              <Txt v="caption">Dashed line marks your upper target for that time.</Txt>
            </Card>
          ) : null}

          {/* Medicine adherence */}
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <IconBubble name="medkit" color={c.med} bg={c.medSoft} size={32} />
                <Txt v="h3">Medicines taken</Txt>
              </View>
              <Txt v="h3" color={c.med}>
                {adhAvg != null ? `${Math.round(adhAvg)}%` : '—'}
              </Txt>
            </Row>
            {data.medicines.length ? (
              <DayBars days={days} values={adherence} max={100} format={(v) => `${Math.round(v)}%`} colorFor={(v) => (v >= 80 ? c.med : v >= 50 ? c.warn : c.bad)} />
            ) : (
              <Txt v="sub">Add medicines under Reminders to track how regularly you take them.</Txt>
            )}
          </Card>

          {/* Exercise */}
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <IconBubble name="walk" color={c.ex} bg={c.exSoft} size={32} />
                <Txt v="h3">Exercise</Txt>
              </View>
              <Txt v="sub">
                {exTotal} min · goal met {goalDays}/{range} days
              </Txt>
            </Row>
            <DayBars days={days} values={exercise} max={Math.max(p.exerciseGoal * 1.4, ...exercise, 10)} goal={p.exerciseGoal} format={(v) => String(Math.round(v))} colorFor={(v) => (v >= p.exerciseGoal ? c.ex : c.warnSoft)} />
            <Txt v="caption">Dashed line marks your daily goal of {p.exerciseGoal} minutes.</Txt>
          </Card>

          {stepAvg != null ? (
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <IconBubble name="footsteps" color={c.primary} bg={c.primarySoft} size={32} />
                  <Txt v="h3">Steps</Txt>
                </View>
                <Txt v="sub">avg {Math.round(stepAvg).toLocaleString('en-IN')} / day</Txt>
              </Row>
              <DayBars days={days} values={steps} max={Math.max(10000, ...stepVals) * 1.1} goal={7000} format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)))} colorFor={(v) => (v >= 7000 ? c.primary : c.primarySoft)} />
              <Txt v="caption">From Google Fit via Health Connect. Dashed line marks 7,000 steps.</Txt>
            </Card>
          ) : null}

          <Button title="See all readings" kind="secondary" icon="list-outline" onPress={() => router.push('/history')} />
          <Txt v="caption" center>
            Estimated HbA1c uses the Glucose Management Indicator formula. Always confirm with a lab test and your doctor.
          </Txt>
        </>
      )}
    </Screen>
  );

  function Tile({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: string }) {
    return (
      <Card style={{ width: '48.5%', flexGrow: 1, padding: space.md, gap: 2 }}>
        <Txt v="label">{label}</Txt>
        <Txt v="h1" color={accent} style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
        <Txt v="caption" numberOfLines={1}>
          {unit}
        </Txt>
      </Card>
    );
  }
}

function Legend({ color, text, square }: { color: string; text: string; square?: boolean }) {
  return (
    <Row gap={6}>
      <View style={{ width: 10, height: 10, borderRadius: square ? 3 : 5, backgroundColor: color }} />
      <Txt v="caption">{text}</Txt>
    </Row>
  );
}
