import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { fmtClock, fmtDay, startOfDay } from '../lib/date';
import { classify, ctxLabel, levelColors, levelLabel } from '../lib/health';
import { useColors } from '../lib/theme';
import type { Profile, Reading } from '../lib/types';
import { tap, Txt } from './ui';

const DAY = 864e5;
const HOUR = 36e5;
const MIN_SPAN = 12 * HOUR;
/** Above this visible span the chart shows one high–low bar per day instead of every reading. */
const DENSE_SPAN = 21 * DAY + HOUR;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type View_ = { start: number; end: number };
type DayAgg = { t: number; avg: number; min: number; max: number; n: number };
type Cursor = { kind: 'reading'; r: Reading } | { kind: 'day'; d: DayAgg };

function aggregateDays(rs: Reading[]): DayAgg[] {
  const m = new Map<number, number[]>();
  for (const r of rs) {
    const k = startOfDay(r.ts).getTime();
    const a = m.get(k);
    if (a) a.push(r.value);
    else m.set(k, [r.value]);
  }
  return [...m.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => ({ t: k + DAY / 2, avg: v.reduce((s, x) => s + x, 0) / v.length, min: Math.min(...v), max: Math.max(...v), n: v.length }));
}

/** Ticks aligned to calendar boundaries, spaced for the visible span. */
function timeTicks(start: number, end: number): { t: number; label: string }[] {
  const span = end - start;
  const out: { t: number; label: string }[] = [];
  if (span <= 2.5 * DAY) {
    const step = span <= DAY ? 4 * HOUR : 6 * HOUR;
    let t = startOfDay(start).getTime();
    while (t < start) t += step;
    for (; t <= end; t += step) {
      const d = new Date(t);
      const h = d.getHours();
      out.push({ t, label: h === 0 ? fmtDay(d) : `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` });
    }
    return out;
  }
  const stepDays = span <= 8 * DAY ? 1 : span <= 21 * DAY ? 3 : span <= 60 * DAY ? 7 : span <= 200 * DAY ? 30 : 60;
  if (stepDays >= 30) {
    const d = new Date(start);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() < start) d.setMonth(d.getMonth() + 1);
    for (; d.getTime() <= end; d.setMonth(d.getMonth() + stepDays / 30)) out.push({ t: d.getTime(), label: `${MONTHS[d.getMonth()]}` });
    return out;
  }
  let t = startOfDay(start).getTime() + DAY;
  // anchor weekly ticks on Mondays for a steady rhythm
  if (stepDays === 7) while (new Date(t).getDay() !== 1) t += DAY;
  for (; t <= end; t += stepDays * DAY) out.push({ t, label: fmtDay(new Date(t)) });
  return out;
}

export function ZoomGlucoseChart({
  readings,
  profile,
  windowDays,
  onActiveChange,
  height = 230,
}: {
  readings: Reading[];
  profile: Profile;
  windowDays: number;
  onActiveChange?: (active: boolean) => void;
  height?: number;
}) {
  const c = useColors();
  const [w, setW] = useState(340);
  const L = 34, R = 10, T = 12, B = 24;
  const plotW = Math.max(10, w - L - R);

  const now = Date.now();
  const domainEnd = startOfDay(now).getTime() + DAY;
  const firstTs = readings.length ? readings[0].ts : now;
  const domainStart = Math.min(startOfDay(firstTs).getTime(), domainEnd - windowDays * DAY);
  const defaultView = (): View_ => ({ start: domainEnd - windowDays * DAY, end: domainEnd });
  const [view, setView] = useState<View_>(defaultView);
  const [cursor, setCursor] = useState<Cursor | null>(null);

  useEffect(() => {
    setView(defaultView());
    setCursor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays]);

  const clamp = (v: View_): View_ => {
    let span = Math.min(Math.max(v.end - v.start, MIN_SPAN), domainEnd - domainStart);
    let start = Math.max(domainStart, Math.min(v.start, domainEnd - span));
    return { start, end: start + span };
  };

  const visible = useMemo(() => readings.filter((r) => r.ts >= view.start - DAY && r.ts <= view.end + DAY), [readings, view]);
  const inWin = visible.filter((r) => r.ts >= view.start && r.ts <= view.end);
  const lo = Math.min(60, ...inWin.map((r) => r.value - 15));
  const hi = Math.max(220, ...inWin.map((r) => r.value + 20));
  const x = (t: number) => L + ((t - view.start) / (view.end - view.start)) * plotW;
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (height - T - B);

  /* ---------- gestures ---------- */
  const g = useRef({
    pageX0: 0,
    view0: view,
    pinch: null as null | { dist: number; centerT: number; view: View_ },
    moved: false,
    t0: 0,
    hold: null as null | ReturnType<typeof setTimeout>,
    scrub: false,
  }).current;
  const containerRef = useRef<View>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const visRef = useRef(visible);
  visRef.current = visible;
  const daysAll = useMemo(() => aggregateDays(readings), [readings]);
  const daysRef = useRef(daysAll);
  daysRef.current = daysAll;
  const dims = useRef({ L, plotW });
  dims.current = { L, plotW };

  const nearest = (pageX: number): Cursor | null => {
    const v = viewRef.current;
    const t = v.start + ((pageX - g.pageX0 - dims.current.L) / dims.current.plotW) * (v.end - v.start);
    if (v.end - v.start > DENSE_SPAN) {
      let bd: DayAgg | null = null;
      for (const d of daysRef.current) if (d.t >= v.start && d.t <= v.end && (!bd || Math.abs(d.t - t) < Math.abs(bd.t - t))) bd = d;
      return bd ? { kind: 'day', d: bd } : null;
    }
    let best: Reading | null = null;
    for (const r of visRef.current) if (r.ts >= v.start && r.ts <= v.end && (!best || Math.abs(r.ts - t) < Math.abs(best.ts - t))) best = r;
    return best ? { kind: 'reading', r: best } : null;
  };
  const sameCursor = (a: Cursor | null, b: Cursor | null) =>
    !!a && !!b && a.kind === b.kind && (a.kind === 'reading' ? a.r.id === (b as { r: Reading }).r.id : a.d.t === (b as { d: DayAgg }).d.t);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          onActiveChange?.(true);
          g.view0 = viewRef.current;
          g.pinch = null;
          g.moved = false;
          g.scrub = false;
          g.t0 = Date.now();
          const pageX = e.nativeEvent.pageX;
          containerRef.current?.measureInWindow((px) => {
            g.pageX0 = px;
          });
          if (g.hold) clearTimeout(g.hold);
          // Press and hold = scrub through readings, like a stock chart crosshair.
          g.hold = setTimeout(() => {
            if (!g.moved && !g.pinch) {
              g.scrub = true;
              tap();
              setCursor(nearest(pageX));
            }
          }, 280);
        },
        onPanResponderMove: (e, gs) => {
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2) {
            const [a, b] = touches;
            const dist = Math.max(20, Math.abs(a.pageX - b.pageX));
            const cx = (a.pageX + b.pageX) / 2 - g.pageX0;
            if (!g.pinch) {
              const v = viewRef.current;
              g.pinch = { dist, view: v, centerT: v.start + ((cx - dims.current.L) / dims.current.plotW) * (v.end - v.start) };
              g.moved = true;
              setCursor(null);
            }
            const p = g.pinch;
            const span = ((p.view.end - p.view.start) * p.dist) / dist;
            const frac = (cx - dims.current.L) / dims.current.plotW;
            setView(clamp({ start: p.centerT - frac * span, end: p.centerT - frac * span + span }));
            return;
          }
          if (g.pinch) return; // one finger lifted during a pinch: wait for release
          if (g.scrub) {
            setCursor(nearest(e.nativeEvent.pageX));
            return;
          }
          if (Math.abs(gs.dx) > 6) {
            g.moved = true;
            setCursor(null);
            const span = g.view0.end - g.view0.start;
            const dt = (-gs.dx / dims.current.plotW) * span;
            setView(clamp({ start: g.view0.start + dt, end: g.view0.end + dt }));
          }
        },
        onPanResponderRelease: (e) => {
          if (g.hold) clearTimeout(g.hold);
          if (!g.moved && !g.scrub && Date.now() - g.t0 < 280) {
            // Tap: show the nearest reading (tap again on empty space to hide).
            const r = nearest(e.nativeEvent.pageX);
            setCursor((cur) => (sameCursor(cur, r) ? null : r));
          }
          g.pinch = null;
          onActiveChange?.(false);
        },
        onPanResponderTerminate: () => {
          if (g.hold) clearTimeout(g.hold);
          g.pinch = null;
          onActiveChange?.(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [domainStart, domainEnd],
  );

  /* ---------- drawing ---------- */
  const span = view.end - view.start;
  const dense = span > DENSE_SPAN;
  const visDays = daysAll.filter((d) => d.t >= view.start - DAY && d.t <= view.end + DAY);
  const pts = visible.map((r) => ({ X: x(r.ts), Y: y(r.value), r }));
  const line = (dense ? visDays.map((d) => [x(d.t), y(d.avg)]) : pts.map((p) => [p.X, p.Y]))
    .map(([X, Y], i) => `${i ? 'L' : 'M'}${X.toFixed(1)},${Y.toFixed(1)}`)
    .join(' ');
  const nLine = dense ? visDays.length : pts.length;
  const ticks = timeTicks(view.start, view.end);
  const yTicks = [profile.targetLow, profile.targetHigh, ...(hi > 270 ? [250] : [])].filter((v) => v > lo && v < hi);
  const zoomed = Math.abs(view.end - view.start - windowDays * DAY) > HOUR || Math.abs(view.end - domainEnd) > HOUR;
  const avg = inWin.length ? Math.round(inWin.reduce((s, r) => s + r.value, 0) / inWin.length) : null;
  const barW = Math.max(2, Math.min(10, (plotW / (span / DAY)) * 0.55));
  const levelOf = (v: number) => (v < profile.targetLow ? c.bad : v > 250 ? c.bad : v > profile.targetHigh ? c.warn : c.good);

  const cur = cursor && (cursor.kind === 'reading' ? cursor.r.ts >= view.start && cursor.r.ts <= view.end : cursor.d.t >= view.start && cursor.d.t <= view.end) ? cursor : null;
  const curT = cur ? (cur.kind === 'reading' ? cur.r.ts : cur.d.t) : 0;
  const curV = cur ? (cur.kind === 'reading' ? cur.r.value : cur.d.avg) : 0;
  const curLvl = cur?.kind === 'reading' ? classify(cur.r.value, cur.r.ctx, profile) : null;
  const curColor = cur ? (cur.kind === 'reading' ? levelColors(curLvl!, c).fg : levelOf(cur.d.avg)) : c.text;

  return (
    <View style={{ gap: 8 }}>
      {/* header: window and average, like a ticker */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          {cur?.kind === 'reading' && curLvl ? (
            <>
              <Txt v="h1" color={curColor} style={{ fontVariant: ['tabular-nums'] }}>
                {cur.r.value} <Txt v="sub">mg/dL</Txt>
              </Txt>
              <Txt v="caption">
                {ctxLabel(cur.r.ctx)} · {fmtDay(cur.r.ts)}, {fmtClock(cur.r.ts)} · {levelLabel[curLvl]}
              </Txt>
            </>
          ) : cur?.kind === 'day' ? (
            <>
              <Txt v="h1" color={curColor} style={{ fontVariant: ['tabular-nums'] }}>
                {Math.round(cur.d.avg)} <Txt v="sub">day avg</Txt>
              </Txt>
              <Txt v="caption">
                {fmtDay(cur.d.t)} · low {cur.d.min} · high {cur.d.max} · {cur.d.n} {cur.d.n === 1 ? 'reading' : 'readings'}
              </Txt>
            </>
          ) : (
            <>
              <Txt v="h1" style={{ fontVariant: ['tabular-nums'] }}>
                {avg ?? '—'} <Txt v="sub">avg</Txt>
              </Txt>
              <Txt v="caption">
                {fmtDay(view.start)} – {fmtDay(view.end - 1)} · {inWin.length} readings
              </Txt>
            </>
          )}
        </View>
        {zoomed ? (
          <Pressable
            onPress={() => {
              tap();
              setView(defaultView());
              setCursor(null);
            }}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: c.primarySoft }}
          >
            <Ionicons name="scan-outline" size={14} color={c.primary} />
            <Txt v="caption" color={c.primary} style={{ fontWeight: '700' }}>
              Reset
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <View
        ref={containerRef}
        collapsable={false}
        onLayout={(e: LayoutChangeEvent) => {
          const nw = Math.round(e.nativeEvent.layout.width);
          if (nw > 0 && Math.abs(nw - w) > 1) setW(nw);
        }}
        {...responder.panHandlers}
      >
        <Svg width={w} height={height}>
          <Rect x={L} y={y(profile.targetHigh)} width={plotW} height={Math.max(0, y(profile.targetLow) - y(profile.targetHigh))} fill={c.band} />
          {yTicks.map((v) => (
            <G key={v}>
              <Line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={c.line} strokeDasharray={v === 250 ? '3 5' : undefined} />
            </G>
          ))}
          {ticks.map((tk) => (
            <G key={tk.t}>
              <Line x1={x(tk.t)} x2={x(tk.t)} y1={T} y2={height - B} stroke={c.line} strokeOpacity={0.6} />
              <SvgText x={x(tk.t)} y={height - 7} fontSize={10} fill={c.sub} textAnchor="middle">
                {tk.label}
              </SvgText>
            </G>
          ))}
          {dense
            ? visDays.map((d) => (
                <Rect key={d.t} x={x(d.t) - barW / 2} y={y(d.max)} width={barW} height={Math.max(2, y(d.min) - y(d.max))} rx={barW / 2} fill={levelOf(d.avg)} fillOpacity={0.35} />
              ))
            : null}
          {nLine > 1 ? <Path d={line} stroke={c.primary} strokeWidth={dense ? 2 : 2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
          {dense
            ? visDays.filter((d) => d.min < profile.targetLow || d.max > 250).map((d) => <Circle key={'o' + d.t} cx={x(d.t)} cy={y(d.min < profile.targetLow ? d.min : d.max)} r={3} fill={c.bad} />)
            : pts.map((p) => <Circle key={p.r.id} cx={p.X} cy={p.Y} r={3.6} fill={levelColors(classify(p.r.value, p.r.ctx, profile), c).fg} stroke={c.card} strokeWidth={1} />)}
          {/* edge masks keep panned-out lines from drawing over the axis labels */}
          <Rect x={0} y={0} width={L} height={height - B + 1} fill={c.card} />
          <Rect x={w - R} y={0} width={R} height={height} fill={c.card} />
          {yTicks.map((v) => (
            <SvgText key={'l' + v} x={L - 6} y={y(v) + 4} fontSize={10} fill={c.sub} textAnchor="end">
              {v}
            </SvgText>
          ))}
          {cur ? (
            <G>
              <Line x1={x(curT)} x2={x(curT)} y1={T} y2={height - B} stroke={c.text} strokeWidth={1} strokeDasharray="4 3" />
              <Line x1={L} x2={w - R} y1={y(curV)} y2={y(curV)} stroke={c.text} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="4 3" />
              <Circle cx={x(curT)} cy={y(curV)} r={7} fill={c.card} stroke={curColor} strokeWidth={3} />
            </G>
          ) : inWin.length ? null : (
            <SvgText x={L + plotW / 2} y={height / 2} fontSize={13} fill={c.sub} textAnchor="middle">
              No readings here, drag or pinch out
            </SvgText>
          )}
        </Svg>
      </View>

      <Navigator readings={readings} start={domainStart} end={domainEnd} view={view} width={w} onJump={(t) => setView(clamp({ start: t - span / 2, end: t + span / 2 }))} />
      <Txt v="caption" center>
        Pinch to zoom · drag to move · tap or hold to see values
      </Txt>
    </View>
  );
}

/** Thin overview of all readings with the visible window highlighted; tap to jump. */
function Navigator({ readings, start, end, view, width, onJump }: { readings: Reading[]; start: number; end: number; view: View_; width: number; onJump: (t: number) => void }) {
  const c = useColors();
  const H = 34, L = 34, R = 10;
  const pw = Math.max(10, width - L - R);
  const x = (t: number) => L + ((t - start) / (end - start)) * pw;
  // daily averages keep the overview light even with many readings
  const days = new Map<number, { s: number; n: number }>();
  for (const r of readings) {
    const k = startOfDay(r.ts).getTime();
    const d = days.get(k) ?? { s: 0, n: 0 };
    d.s += r.value;
    d.n++;
    days.set(k, d);
  }
  const pts = [...days.entries()].sort((a, b) => a[0] - b[0]).map(([k, d]) => ({ t: k + DAY / 2, v: d.s / d.n }));
  const lo = Math.min(...pts.map((p) => p.v), 80) - 10;
  const hi = Math.max(...pts.map((p) => p.v), 200) + 10;
  const y = (v: number) => 3 + (1 - (v - lo) / (hi - lo)) * (H - 6);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return (
    <Pressable onPress={(e) => onJump(start + ((e.nativeEvent.locationX - L) / pw) * (end - start))}>
      <Svg width={width} height={H}>
        <Rect x={L} y={0} width={pw} height={H} rx={8} fill={c.cardAlt} />
        {pts.length > 1 ? <Path d={d} stroke={c.sub} strokeWidth={1.2} fill="none" /> : null}
        <Rect x={x(view.start)} y={0} width={Math.max(4, x(view.end) - x(view.start))} height={H} rx={8} fill={c.primary} fillOpacity={0.18} stroke={c.primary} strokeWidth={1.5} />
      </Svg>
    </Pressable>
  );
}
