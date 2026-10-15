import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { fmtDay } from '../lib/date';
import { classify, levelColors } from '../lib/health';
import { useColors } from '../lib/theme';
import type { Profile, Reading } from '../lib/types';

function useWidth(initial = 320) {
  const [w, setW] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => {
    const nw = Math.round(e.nativeEvent.layout.width);
    if (nw > 0 && Math.abs(nw - w) > 1) setW(nw);
  };
  return { w, onLayout };
}

function dayTicks(days: string[]) {
  const step = days.length <= 7 ? 1 : days.length <= 14 ? 2 : days.length <= 31 ? 6 : 15;
  return days.map((d, i) => ((days.length - 1 - i) % step === 0 ? d : null));
}

/* ---------- Glucose line with target band ---------- */
export function GlucoseChart({ readings, days, profile, height = 220 }: { readings: Reading[]; days: string[]; profile: Profile; height?: number }) {
  const c = useColors();
  const { w, onLayout } = useWidth();
  const L = 34, R = 12, T = 14, B = 26;
  const t0 = new Date(days[0] + 'T00:00').getTime();
  const t1 = new Date(days[days.length - 1] + 'T00:00').getTime() + 864e5;
  const max = Math.max(260, ...readings.map((r) => r.value + 20));
  const min = 40;
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (w - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (height - T - B);
  const pts = readings.map((r) => ({ X: x(r.ts), Y: y(r.value), r }));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.X.toFixed(1)},${p.Y.toFixed(1)}`).join(' ');
  const area = pts.length > 1 ? `${path} L${pts[pts.length - 1].X},${height - B} L${pts[0].X},${height - B} Z` : '';
  const ticks = dayTicks(days);
  const yTicks = [profile.targetLow, profile.targetHigh, 250].filter((v, i, a) => a.indexOf(v) === i && v < max);
  const last = pts[pts.length - 1];
  const dotR = readings.length > 60 ? 2.4 : readings.length > 25 ? 3.2 : 4;

  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.primary} stopOpacity={0.22} />
            <Stop offset="1" stopColor={c.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={L} y={y(profile.targetHigh)} width={w - L - R} height={y(profile.targetLow) - y(profile.targetHigh)} fill={c.band} rx={6} />
        {yTicks.map((v) => (
          <G key={v}>
            <Line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={c.line} strokeDasharray={v === 250 ? '3 5' : undefined} />
            <SvgText x={L - 6} y={y(v) + 4} fontSize={10} fill={c.sub} textAnchor="end">
              {v}
            </SvgText>
          </G>
        ))}
        {area ? <Path d={area} fill="url(#gArea)" /> : null}
        {pts.length > 1 ? <Path d={path} stroke={c.primary} strokeWidth={2} fill="none" strokeLinejoin="round" strokeOpacity={0.75} /> : null}
        {pts.map((p) => (
          <Circle key={p.r.id} cx={p.X} cy={p.Y} r={dotR} fill={levelColors(classify(p.r.value, p.r.ctx, profile), c).fg} stroke={c.card} strokeWidth={1} />
        ))}
        {last ? (
          <G>
            <Circle cx={last.X} cy={last.Y} r={7} fill={c.card} stroke={levelColors(classify(last.r.value, last.r.ctx, profile), c).fg} strokeWidth={3} />
            <SvgText x={Math.min(last.X, w - R - 2)} y={last.Y - 12} fontSize={12} fontWeight="bold" fill={c.text} textAnchor="end">
              {last.r.value}
            </SvgText>
          </G>
        ) : (
          <SvgText x={w / 2} y={height / 2} fontSize={13} fill={c.sub} textAnchor="middle">
            No readings in this period
          </SvgText>
        )}
        {ticks.map((d, i) =>
          d ? (
            <SvgText key={d} x={L + ((i + 0.5) / days.length) * (w - L - R)} y={height - 6} fontSize={10} fill={c.sub} textAnchor="middle">
              {fmtDay(new Date(d + 'T00:00'))}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

/* ---------- Vertical bars per day ---------- */
export function DayBars({
  days,
  values,
  max,
  colorFor,
  format,
  goal,
  height = 160,
}: {
  days: string[];
  values: (number | null)[];
  max: number;
  colorFor: (v: number) => string;
  format: (v: number) => string;
  goal?: number;
  height?: number;
}) {
  const c = useColors();
  const { w, onLayout } = useWidth();
  const L = 30, R = 6, T = 16, B = 24;
  const n = days.length;
  const bw = (w - L - R) / n;
  const y = (v: number) => T + (1 - v / max) * (height - T - B);
  const ticks = dayTicks(days);
  const lastIdx = values.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={height}>
        {[0, max / 2, max].map((v) => (
          <G key={v}>
            <Line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={c.line} strokeDasharray={v ? '3 5' : undefined} />
            <SvgText x={L - 6} y={y(v) + 4} fontSize={10} fill={c.sub} textAnchor="end">
              {format(v)}
            </SvgText>
          </G>
        ))}
        {goal ? <Line x1={L} x2={w - R} y1={y(goal)} y2={y(goal)} stroke={c.primary} strokeWidth={1.5} strokeDasharray="5 4" /> : null}
        {values.map((v, i) => {
          if (v == null) return null;
          const bx = L + i * bw + bw * 0.18;
          const h = Math.max(v > 0 ? 3 : 0, height - B - y(Math.min(v, max)));
          return (
            <G key={days[i]}>
              <Rect x={bx} y={height - B - h} width={bw * 0.64} height={h} rx={Math.min(5, bw * 0.3)} fill={colorFor(v)} />
              {i === lastIdx && v > 0 ? (
                <SvgText x={bx + bw * 0.32} y={height - B - h - 5} fontSize={11} fontWeight="bold" fill={c.text} textAnchor="middle">
                  {format(v)}
                </SvgText>
              ) : null}
            </G>
          );
        })}
        {ticks.map((d, i) =>
          d ? (
            <SvgText key={d} x={L + (i + 0.5) * bw} y={height - 6} fontSize={10} fill={c.sub} textAnchor="middle">
              {n <= 7 ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d + 'T00:00').getDay()] : fmtDay(new Date(d + 'T00:00'))}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

/* ---------- Horizontal bars (average by time of day) ---------- */
export function HBars({ rows }: { rows: { label: string; value: number; limit: number; color: string }[] }) {
  const c = useColors();
  const { w, onLayout } = useWidth();
  const L = 96, R = 42, rowH = 36;
  const max = Math.max(200, ...rows.map((r) => r.value), ...rows.map((r) => r.limit)) * 1.05;
  const x = (v: number) => L + (v / max) * (w - L - R);
  const h = rows.length * rowH;
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={h}>
        {rows.map((r, i) => {
          const yy = i * rowH + 6;
          return (
            <G key={r.label}>
              <SvgText x={0} y={yy + 15} fontSize={13} fill={c.text}>
                {r.label}
              </SvgText>
              <Rect x={L} y={yy} width={w - L - R} height={22} rx={8} fill={c.cardAlt} />
              <Rect x={L} y={yy} width={Math.max(4, x(r.value) - L)} height={22} rx={8} fill={r.color} />
              <Line x1={x(r.limit)} x2={x(r.limit)} y1={yy - 3} y2={yy + 25} stroke={c.text} strokeWidth={1.5} strokeDasharray="3 2" />
              <SvgText x={w - R + 6} y={yy + 16} fontSize={13} fontWeight="bold" fill={c.text}>
                {Math.round(r.value)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/* ---------- Progress ring ---------- */
export function Ring({ progress, size = 72, stroke = 8, color, track, children }: { progress: number; size?: number; stroke?: number; color: string; track: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ---------- Sparkline for the hero card ---------- */
export function Sparkline({ values, width = 120, height = 44, color = '#FFFFFF' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...values) - 10;
  const max = Math.max(...values) + 10;
  const x = (i: number) => 3 + (i / (values.length - 1)) * (width - 6);
  const y = (v: number) => 3 + (1 - (v - min) / (max - min)) * (height - 6);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeOpacity={0.9} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={4} fill={color} />
    </Svg>
  );
}
