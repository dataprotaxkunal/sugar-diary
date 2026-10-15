import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Card, Chip, IconBubble, Row, Screen, success, Txt } from '../components/ui';
import { fmtDay, lastDays, ymd } from '../lib/date';
import { stats } from '../lib/health';
import { buildReportHtml } from '../lib/report';
import { useStore } from '../lib/store';
import { space, useColors } from '../lib/theme';

const PERIODS = [7, 15, 30, 90];

export default function ReportScreen() {
  const c = useColors();
  const { data } = useStore();
  const p = data.profile;
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState<'share' | 'print' | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const period = useMemo(() => lastDays(days), [days]);
  const readings = useMemo(() => {
    const set = new Set(period);
    return data.readings.filter((r) => set.has(ymd(r.ts)) && !r.demo);
  }, [data.readings, period]);
  const s = stats(readings, p);
  const demoOnly = !readings.length && data.readings.some((r) => r.demo);

  const fileName = () => {
    const who = (p.name || 'patient').trim().replace(/[^A-Za-z0-9]+/g, '-');
    const d = new Date();
    return `Sugar-Diary-report-${who}-${d.getDate()}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}-${days}d.pdf`;
  };

  const makePdf = async () => {
    const html = buildReportHtml(data, days);
    const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
    // Give the file a readable name so it arrives tidy on WhatsApp or email.
    try {
      const named = new File(Paths.cache, fileName());
      if (named.exists) named.delete();
      new File(uri).copySync(named);
      return named.uri;
    } catch {
      return uri;
    }
  };

  const share = async () => {
    setMsg(null);
    setBusy('share');
    try {
      const uri = await makePdf();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Send report to your doctor', UTI: 'com.adobe.pdf' });
        success();
      } else {
        setMsg({ text: 'Sharing isn’t available on this device.', ok: false });
      }
    } catch (e) {
      setMsg({ text: 'Couldn’t create the PDF. Please try again.', ok: false });
      console.warn(e);
    } finally {
      setBusy(null);
    }
  };

  const print = async () => {
    setMsg(null);
    setBusy('print');
    try {
      await Print.printAsync({ html: buildReportHtml(data, days) });
    } catch {
      setMsg({ text: 'Printing was cancelled or isn’t available.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const includes: [React.ComponentProps<typeof Ionicons>['name'], string][] = [
    ['speedometer-outline', 'Average, time in range, estimated HbA1c, lows and highs'],
    ['analytics-outline', 'Daily trend chart with your target band'],
    ['time-outline', 'Averages for fasting, after meals and bedtime'],
    ['medkit-outline', 'Medicines and how regularly you took them'],
    ['walk-outline', 'Exercise, steps and testing frequency'],
    ['list-outline', 'Every reading with date, time and notes'],
  ];

  return (
    <Screen padTop={false}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconBubble name="document-text" color={c.primary} bg={c.primarySoft} size={48} />
        <View style={{ flex: 1 }}>
          <Txt v="h3">Blood sugar report (PDF)</Txt>
          <Txt v="sub">A clear A4 summary your doctor can read in a minute.</Txt>
        </View>
      </Card>

      <View style={{ gap: space.sm }}>
        <Txt v="label">Period</Txt>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {PERIODS.map((d) => (
            <Chip key={d} label={`Last ${d} days`} selected={days === d} onPress={() => setDays(d)} />
          ))}
        </Row>
        <Txt v="caption">
          {fmtDay(new Date(period[0] + 'T12:00:00'))} – {fmtDay(new Date())}
        </Txt>
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Fact label="Readings" value={String(s.n)} />
          <Fact label="Average" value={s.avg ? `${Math.round(s.avg)}` : '—'} />
          <Fact label="In range" value={s.tir != null ? `${Math.round(s.tir)}%` : '—'} />
          <Fact label="Est. HbA1c" value={s.gmi ? `${s.gmi.toFixed(1)}%` : '—'} />
        </Row>
        {demoOnly ? (
          <Txt v="caption" color={c.warn}>
            Sample data is left out of reports. Log your own readings to fill it.
          </Txt>
        ) : !s.n ? (
          <Txt v="caption" color={c.warn}>
            No readings in this period yet. The report will still list your medicines and activity.
          </Txt>
        ) : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt v="h3">What’s inside</Txt>
        {includes.map(([icon, text]) => (
          <Row key={text} gap={10}>
            <Ionicons name={icon} size={18} color={c.primary} />
            <Txt v="sub" style={{ flex: 1 }}>
              {text}
            </Txt>
          </Row>
        ))}
      </Card>

      <Button title="Create PDF & share" icon="share-social-outline" loading={busy === 'share'} disabled={!!busy} onPress={share} />
      <Button title="Print" icon="print-outline" kind="secondary" loading={busy === 'print'} disabled={!!busy || Platform.OS === 'web'} onPress={print} />
      {msg ? (
        <Txt v="caption" color={msg.ok ? c.good : c.bad} center>
          {msg.text}
        </Txt>
      ) : null}
      <Txt v="caption" center>
        Share it on WhatsApp or email, or save it to Files. The PDF is made on your phone; nothing is uploaded.
      </Txt>
    </Screen>
  );

  function Fact({ label, value }: { label: string; value: string }) {
    return (
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Txt v="h2" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
        <Txt v="caption">{label}</Txt>
      </View>
    );
  }
}
