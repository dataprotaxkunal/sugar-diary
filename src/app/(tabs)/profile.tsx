import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { HealthCard } from '../../components/HealthCard';
import { Card, Chip, Divider, Field, ListRow, Row, Screen, Txt } from '../../components/ui';
import { fmtDay, hm, ymd } from '../../lib/date';
import { activity, ctxLabel, DIABETES_TYPES } from '../../lib/health';
import { useStore } from '../../lib/store';
import { space, useColors } from '../../lib/theme';

export default function ProfileTab() {
  const c = useColors();
  const { data, updateProfile, loadDemo, clearDemo, resetAll } = useStore();
  const p = data.profile;
  const [name, setName] = useState(p.name);

  const exportData = async () => {
    const lines = ['Type,Date,Time,Value,Details,Note'];
    for (const r of data.readings) lines.push(['Blood sugar', ymd(r.ts), hm(r.ts), `${r.value} mg/dL`, ctxLabel(r.ctx), (r.note ?? '').replace(/,/g, ' ')].join(','));
    for (const w of data.workouts) lines.push(['Exercise', ymd(w.ts), hm(w.ts), `${w.minutes} min`, activity(w.type).label, (w.note ?? '').replace(/,/g, ' ')].join(','));
    for (const [k, v] of Object.entries(data.doses)) {
      const [d, medId, t] = k.split('|');
      const m = data.medicines.find((x) => x.id === medId);
      if (m) lines.push(['Medicine', d, t, v.status, `${m.name} ${m.dose}`.trim(), ''].join(','));
    }
    lines.sort((a, b) => (a.startsWith('Type') ? -1 : b.startsWith('Type') ? 1 : a.split(',').slice(1, 3).join() < b.split(',').slice(1, 3).join() ? -1 : 1));
    await Share.share({ title: 'Sugar Diary export', message: `Sugar Diary report for ${p.name || 'me'} (exported ${fmtDay(Date.now())})\n\n${lines.join('\n')}` });
  };

  const confirmReset = () =>
    Alert.alert('Delete all data?', 'This removes every reading, medicine and reminder from this phone. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: () => {
          resetAll();
          router.replace('/onboarding');
        },
      },
    ]);

  return (
    <Screen>
      <Txt v="h1">Profile</Txt>

      <Card>
        <Row gap={space.md}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Txt v="h1" color={c.onPrimary}>
              {(p.name || 'Y').charAt(0).toUpperCase()}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="h2">{p.name || 'Your name'}</Txt>
            <Txt v="sub">{DIABETES_TYPES.find((d) => d.key === p.diabetesType)?.label} diabetes</Txt>
          </View>
        </Row>
        <Field label="Name" value={name} onChangeText={setName} onEndEditing={() => updateProfile({ name: name.trim() })} placeholder="Your name" returnKeyType="done" />
        <Txt v="label">Diabetes type</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {DIABETES_TYPES.map((d) => (
            <Chip key={d.key} label={d.label} selected={p.diabetesType === d.key} onPress={() => updateProfile({ diabetesType: d.key })} />
          ))}
        </View>
      </Card>

      <HealthCard />

      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        <ListRow icon="speedometer-outline" iconColor={c.primary} iconBg={c.primarySoft} title="Targets & goals" subtitle={`${p.targetLow}–${p.targetHigh} mg/dL · ${p.exerciseGoal} min exercise`} onPress={() => router.push('/targets')} />
        <Divider />
        <ListRow icon="time-outline" iconColor={c.med} iconBg={c.medSoft} title="History" subtitle="All readings and workouts" onPress={() => router.push('/history')} />
        <Divider />
        <ListRow icon="share-outline" iconColor={c.ex} iconBg={c.exSoft} title="Share report with doctor" subtitle="Send your log via WhatsApp, email and more" onPress={exportData} />
        <Divider />
        {data.hasDemo ? (
          <ListRow icon="flask-outline" iconColor={c.warn} iconBg={c.warnSoft} title="Clear sample data" subtitle="Remove the example entries" onPress={clearDemo} />
        ) : (
          <ListRow icon="flask-outline" iconColor={c.warn} iconBg={c.warnSoft} title="Load sample data" subtitle="See how the charts look with a month of examples" onPress={loadDemo} />
        )}
      </Card>

      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        <ListRow icon="trash-outline" iconColor={c.bad} iconBg={c.badSoft} title="Delete all data" subtitle="Start again from scratch" onPress={confirmReset} />
      </Card>

      <Card style={{ backgroundColor: c.cardAlt, shadowOpacity: 0, elevation: 0, flexDirection: 'row', gap: space.md }}>
        <Ionicons name="lock-closed-outline" size={20} color={c.sub} />
        <Txt v="sub" style={{ flex: 1 }}>
          Your health data stays on this phone. Nothing is uploaded to the internet; if you connect Google Fit, data is shared only through Health Connect on this phone. Sugar Diary helps you keep a record. It is not medical advice, so talk to your doctor before changing medicines.
        </Txt>
      </Card>
      <Txt v="caption" center>
        Sugar Diary v{Constants.expoConfig?.version ?? '1.0.0'}
      </Txt>
    </Screen>
  );
}
