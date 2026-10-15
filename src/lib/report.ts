/**
 * Builds the doctor's report as a self-contained HTML page (A4), which expo-print turns into a PDF.
 * Pure function: no React Native imports, so it can also be rendered and checked outside the app.
 */
import { fmtTime, hm, lastDays, pad, ymd } from './date';
import { classify, CONTEXTS, ctxLabel, DIABETES_TYPES, levelLabel, mealLabel, medForm, stats, activity } from './health';
import type { AppData, Reading } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const dLong = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const dShort = (k: string) => {
  const d = new Date(k + 'T12:00:00');
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
};
const pct = (n: number) => `${Math.round(n)}%`;

const COLORS = { ink: '#10231F', sub: '#5C6F69', line: '#DCE5E2', brand: '#0F7A63', soft: '#E7F3EF', good: '#18874A', warn: '#B45F06', bad: '#C62D37', band: '#E3F3E8' };

function levelColor(l: string) {
  return l === 'good' ? COLORS.good : l === 'high' || l === 'slightlyLow' ? COLORS.warn : COLORS.bad;
}

/** Daily average line with each day's low–high bar and the target band. */
function chartSvg(readings: Reading[], days: string[], low: number, high: number) {
  const W = 690, H = 230, L = 34, R = 8, T = 10, B = 22;
  const pw = W - L - R, ph = H - T - B;
  const byDay = new Map<string, number[]>();
  for (const r of readings) {
    const k = ymd(r.ts);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(r.value);
  }
  const vals = readings.map((r) => r.value);
  const lo = Math.min(60, ...vals.map((v) => v - 10));
  const hi = Math.max(220, ...vals.map((v) => v + 15));
  const x = (i: number) => L + ((i + 0.5) / days.length) * pw;
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * ph;
  const bw = Math.max(2, Math.min(12, (pw / days.length) * 0.5));
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${W} ${H}" style="display:block" font-family="Helvetica, Arial, sans-serif">`;
  svg += `<rect x="${L}" y="${y(high)}" width="${pw}" height="${y(low) - y(high)}" fill="${COLORS.band}"/>`;
  for (const v of [low, high, ...(hi > 260 ? [250] : [])]) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${COLORS.line}" ${v === 250 ? 'stroke-dasharray="3 4"' : ''}/>`;
    svg += `<text x="${L - 5}" y="${y(v) + 3.5}" font-size="9" fill="${COLORS.sub}" text-anchor="end">${v}</text>`;
  }
  const step = days.length <= 8 ? 1 : days.length <= 16 ? 2 : days.length <= 31 ? 5 : 15;
  days.forEach((k, i) => {
    if ((days.length - 1 - i) % step === 0) svg += `<text x="${x(i)}" y="${H - 6}" font-size="9" fill="${COLORS.sub}" text-anchor="middle">${dShort(k)}</text>`;
  });
  const linePts: string[] = [];
  days.forEach((k, i) => {
    const v = byDay.get(k);
    if (!v) return;
    const mn = Math.min(...v), mx = Math.max(...v), av = v.reduce((a, b) => a + b, 0) / v.length;
    const col = mn < low || mx > 250 ? COLORS.bad : av > high ? COLORS.warn : COLORS.good;
    svg += `<rect x="${x(i) - bw / 2}" y="${y(mx)}" width="${bw}" height="${Math.max(2, y(mn) - y(mx))}" rx="${bw / 2}" fill="${col}" fill-opacity="0.35"/>`;
    linePts.push(`${x(i).toFixed(1)},${y(av).toFixed(1)}`);
  });
  if (linePts.length > 1) svg += `<polyline points="${linePts.join(' ')}" fill="none" stroke="${COLORS.brand}" stroke-width="1.8" stroke-linejoin="round"/>`;
  linePts.forEach((p) => {
    const [px, py] = p.split(',');
    svg += `<circle cx="${px}" cy="${py}" r="${days.length > 31 ? 1.4 : 2.4}" fill="${COLORS.brand}"/>`;
  });
  if (!readings.length) svg += `<text x="${W / 2}" y="${H / 2}" font-size="11" fill="${COLORS.sub}" text-anchor="middle">No readings in this period</text>`;
  return svg + '</svg>';
}

export function buildReportHtml(data: AppData, periodDays: number, now = new Date()) {
  const p = data.profile;
  const days = lastDays(periodDays);
  const daySet = new Set(days);
  const readings = data.readings.filter((r) => daySet.has(ymd(r.ts)) && !r.demo).sort((a, b) => a.ts - b.ts);
  const s = stats(readings, p);
  const from = new Date(days[0] + 'T12:00:00');
  const testDays = new Set(readings.map((r) => ymd(r.ts))).size;
  const veryHigh = readings.filter((r) => r.value > 250).length;
  const typeLabel = DIABETES_TYPES.find((d) => d.key === p.diabetesType)?.label ?? '';

  // By time of day
  const ctxRows = CONTEXTS.map((k) => {
    const v = readings.filter((r) => r.ctx === k.key).map((r) => r.value);
    if (!v.length) return '';
    const upper = k.key === 'fasting' || k.key === 'before' ? p.fastingHigh : p.targetHigh;
    const inT = v.filter((x) => x >= p.targetLow && x <= upper).length;
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    return `<tr><td>${k.label}</td><td class="n">${v.length}</td><td class="n b" style="color:${avg > upper ? COLORS.warn : avg < p.targetLow ? COLORS.bad : COLORS.good}">${Math.round(avg)}</td><td class="n">${Math.min(...v)}</td><td class="n">${Math.max(...v)}</td><td class="n">${p.targetLow}–${upper}</td><td class="n">${pct((inT / v.length) * 100)}</td></tr>`;
  }).join('');

  // Medicines with adherence over the period
  const nowHM = hm(now);
  const today = ymd(now);
  const medRows = data.medicines
    .filter((m) => !m.demo)
    .map((m) => {
      let due = 0, taken = 0, skipped = 0;
      if (m.active)
        for (const d of days)
          for (const t of m.times) {
            if (d === today && t > nowHM) continue;
            due++;
            const st = data.doses[`${d}|${m.id}|${t}`]?.status;
            if (st === 'taken') taken++;
            else if (st === 'skipped') skipped++;
          }
      const adh = due ? (taken / due) * 100 : null;
      return `<tr><td><b>${esc(m.name)}</b>${m.active ? '' : ' <span class="muted">(paused)</span>'}</td><td>${esc(m.dose)}</td><td>${esc(medForm(m.form).label)}</td><td>${esc(m.times.map(fmtTime).join(', '))}<br><span class="muted">${esc(mealLabel(m.meal))}</span></td><td class="n b" style="color:${adh == null ? COLORS.sub : adh >= 80 ? COLORS.good : adh >= 50 ? COLORS.warn : COLORS.bad}">${adh == null ? '—' : pct(adh)}</td><td class="n">${taken}/${due}${skipped ? `<br><span class="muted">${skipped} skipped</span>` : ''}</td></tr>`;
    })
    .join('');

  // Activity
  const workouts = data.workouts.filter((w) => daySet.has(ymd(w.ts)) && !w.demo);
  const exTotal = workouts.reduce((a, w) => a + w.minutes, 0);
  const exByDay = days.map((d) => workouts.filter((w) => ymd(w.ts) === d).reduce((a, w) => a + w.minutes, 0));
  const goalDays = exByDay.filter((m) => m >= p.exerciseGoal).length;
  const stepVals = days.map((d) => data.steps?.[d]).filter((v): v is number => typeof v === 'number');
  const stepAvg = stepVals.length ? Math.round(stepVals.reduce((a, b) => a + b, 0) / stepVals.length) : null;
  const kinds = new Map<string, number>();
  for (const w of workouts) kinds.set(activity(w.type).label, (kinds.get(activity(w.type).label) ?? 0) + w.minutes);
  const kindText = [...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, m]) => `${k} ${m} min`).join(' · ');

  // Notable events
  const events = readings.filter((r) => r.value < p.targetLow || r.value > 250);
  const eventRows = events
    .map((r) => {
      const d = new Date(r.ts);
      return `<tr><td>${dShort(ymd(d))}</td><td>${fmtTime(hm(d))}</td><td>${ctxLabel(r.ctx)}</td><td class="n b" style="color:${COLORS.bad}">${r.value}</td><td>${r.value < p.targetLow ? 'Low' : 'Very high'}</td><td>${esc(r.note)}</td></tr>`;
    })
    .join('');

  // Full log, newest first
  const logRows = [...readings]
    .reverse()
    .map((r) => {
      const d = new Date(r.ts);
      const l = classify(r.value, r.ctx, p);
      return `<tr><td>${dShort(ymd(d))}</td><td>${fmtTime(hm(d))}</td><td>${ctxLabel(r.ctx)}</td><td class="n b" style="color:${levelColor(l)}">${r.value}</td><td>${levelLabel[l]}</td><td>${esc([r.note, r.source ? `via ${r.source}` : ''].filter(Boolean).join(' · '))}</td></tr>`;
    })
    .join('');

  const tile = (label: string, value: string, sub: string, color?: string) =>
    `<div class="tile"><div class="tl">${label}</div><div class="tv" ${color ? `style="color:${color}"` : ''}>${value}</div><div class="ts">${sub}</div></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Sugar Diary report</title>
<style>
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: Helvetica, Arial, sans-serif; color: ${COLORS.ink}; font-size: 10.5px; line-height: 1.4; margin: 0; }
.head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${COLORS.brand}; padding-bottom: 8px; margin-bottom: 12px; }
.brand { color: ${COLORS.brand}; font-weight: 800; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
h1 { font-size: 20px; margin: 2px 0 0; }
h2 { font-size: 12.5px; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1px solid ${COLORS.line}; }
.meta { text-align: right; color: ${COLORS.sub}; font-size: 10px; }
.meta b { color: ${COLORS.ink}; }
.patient { display: flex; gap: 22px; background: ${COLORS.soft}; border-radius: 8px; padding: 9px 12px; margin-bottom: 4px; }
.patient div span { display: block; color: ${COLORS.sub}; font-size: 9px; text-transform: uppercase; letter-spacing: .6px; }
.patient div b { font-size: 11.5px; }
.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.tile { border: 1px solid ${COLORS.line}; border-radius: 8px; padding: 7px 9px; }
.tl { color: ${COLORS.sub}; font-size: 8.5px; text-transform: uppercase; letter-spacing: .6px; font-weight: 700; }
.tv { font-size: 17px; font-weight: 800; margin-top: 1px; }
.ts { color: ${COLORS.sub}; font-size: 8.5px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; color: ${COLORS.sub}; border-bottom: 1px solid ${COLORS.line}; padding: 4px 5px; }
td { border-bottom: 1px solid ${COLORS.line}; padding: 4px 5px; vertical-align: top; }
tr { page-break-inside: avoid; }
.n { text-align: right; font-variant-numeric: tabular-nums; }
th.n { text-align: right; }
.b { font-weight: 700; }
.muted { color: ${COLORS.sub}; font-size: 9px; }
.legend { color: ${COLORS.sub}; font-size: 9px; margin-top: 3px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.facts div { display: flex; justify-content: space-between; border-bottom: 1px solid ${COLORS.line}; padding: 4px 0; }
.foot { margin-top: 16px; padding-top: 8px; border-top: 1px solid ${COLORS.line}; color: ${COLORS.sub}; font-size: 8.5px; }
.log td, .log th { padding: 3px 5px; }
.avoid { page-break-inside: avoid; }
</style></head><body>
<div class="head">
  <div><div class="brand">Sugar Diary</div><h1>Blood sugar report</h1></div>
  <div class="meta"><b>${dLong(from)} – ${dLong(now)}</b><br>${periodDays} days · created ${dLong(now)}, ${fmtTime(hm(now))}</div>
</div>
<div class="patient">
  <div><span>Patient</span><b>${esc(p.name || '—')}</b></div>
  <div><span>Diabetes</span><b>${esc(typeLabel)}</b></div>
  <div><span>Targets (mg/dL)</span><b>Fasting ${p.targetLow}–${p.fastingHigh} · After meal &lt;${p.targetHigh}</b></div>
</div>

<h2>Summary</h2>
<div class="tiles">
  ${tile('Average', s.avg ? `${Math.round(s.avg)}` : '—', 'mg/dL')}
  ${tile('Time in range', s.tir != null ? pct(s.tir) : '—', `${p.targetLow}–${p.targetHigh} mg/dL`, s.tir == null ? undefined : s.tir >= 70 ? COLORS.good : s.tir >= 50 ? COLORS.warn : COLORS.bad)}
  ${tile('Est. HbA1c (GMI)', s.gmi ? `${s.gmi.toFixed(1)}%` : '—', s.gmi ? 'estimate, not a lab test' : 'needs 10+ readings')}
  ${tile('Readings', String(s.n), `${testDays} of ${periodDays} days tested`)}
  ${tile('Lowest', s.min != null ? String(s.min) : '—', 'mg/dL', s.min != null && s.min < p.targetLow ? COLORS.bad : undefined)}
  ${tile('Highest', s.max != null ? String(s.max) : '—', 'mg/dL', s.max != null && s.max > 250 ? COLORS.bad : undefined)}
  ${tile('Lows', String(s.lows), `below ${p.targetLow} mg/dL`, s.lows ? COLORS.bad : undefined)}
  ${tile('Highs', String(s.highs), `above ${p.targetHigh}${veryHigh ? ` · ${veryHigh} over 250` : ''}`, s.highs ? COLORS.warn : undefined)}
</div>

<div class="avoid">
<h2>Daily trend</h2>
${chartSvg(readings, days, p.targetLow, p.targetHigh)}
<div class="legend">Line: daily average · Bars: lowest to highest reading of the day · Green band: ${p.targetLow}–${p.targetHigh} mg/dL</div>
</div>

${ctxRows ? `<div class="avoid"><h2>By time of day</h2><table><tr><th>When</th><th class="n">Readings</th><th class="n">Average</th><th class="n">Lowest</th><th class="n">Highest</th><th class="n">Target</th><th class="n">In target</th></tr>${ctxRows}</table></div>` : ''}

${medRows ? `<div class="avoid"><h2>Medicines</h2><table><tr><th>Medicine</th><th>Dose</th><th>Type</th><th>Schedule</th><th class="n">Taken</th><th class="n">Doses</th></tr>${medRows}</table><div class="legend">Taken = doses marked “Taken” in the app out of doses scheduled in this period.</div></div>` : ''}

<div class="two avoid">
  <div><h2>Activity</h2><div class="facts">
    <div><span>Exercise total</span><b>${exTotal} min</b></div>
    <div><span>Average per day</span><b>${Math.round(exTotal / periodDays)} min</b></div>
    <div><span>Days goal met (${p.exerciseGoal} min)</span><b>${goalDays} / ${periodDays}</b></div>
    ${stepAvg != null ? `<div><span>Average steps</span><b>${stepAvg.toLocaleString('en-IN')}</b></div>` : ''}
  </div>${kindText ? `<div class="legend">${esc(kindText)}</div>` : ''}</div>
  <div><h2>Testing</h2><div class="facts">
    <div><span>Readings per day</span><b>${(s.n / periodDays).toFixed(1)}</b></div>
    <div><span>Days with a reading</span><b>${testDays} / ${periodDays}</b></div>
    <div><span>Lows (&lt;${p.targetLow})</span><b style="color:${s.lows ? COLORS.bad : COLORS.ink}">${s.lows}</b></div>
    <div><span>Very high (&gt;250)</span><b style="color:${veryHigh ? COLORS.bad : COLORS.ink}">${veryHigh}</b></div>
  </div></div>
</div>

${eventRows ? `<h2>Lows and very high readings</h2><table><tr><th>Date</th><th>Time</th><th>When</th><th class="n">mg/dL</th><th>Type</th><th>Note</th></tr>${eventRows}</table>` : ''}

<h2>All readings (${readings.length})</h2>
${readings.length ? `<table class="log"><tr><th>Date</th><th>Time</th><th>When</th><th class="n">mg/dL</th><th>Status</th><th>Note</th></tr>${logRows}</table>` : '<p class="muted">No readings were logged in this period.</p>'}

<div class="foot">Created with Sugar Diary from readings entered by the patient${readings.some((r) => r.source) ? ' or imported from Health Connect' : ''}. Est. HbA1c is the Glucose Management Indicator (GMI = 3.31 + 0.02392 × average mg/dL), an estimate that is not a substitute for a laboratory HbA1c. Targets shown are those set in the app.</div>
</body></html>`;
}
