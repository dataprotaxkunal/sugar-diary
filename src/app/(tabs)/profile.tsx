import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { HealthCard } from '../../components/HealthCard';
import { Card, Chip, Divider, Field, ListRow, Row, Screen, Txt } from '../../components/ui';
import { DIABETES_TYPES } from '../../lib/health';
import { useStore } from '../../lib/store';
import { space, useColors } from '../../lib/theme';

export default function ProfileTab() {
  const c = useColors();
  const { data, updateProfile, loadDemo, clearDemo, resetAll } = useStore();
  const p = data.profile;
  const [name, setName] = useState(p.name);

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
        <ListRow icon="document-text-outline" iconColor={c.ex} iconBg={c.exSoft} title="PDF report for doctor" subtitle="Last 7, 15, 30 or 90 days · share on WhatsApp or email" onPress={() => router.push('/report')} />
        <Divider />
        {data.hasDemo ? (
          <ListRow icon="flask-outline" iconColor={c.warn} iconBg={c.warnSoft} title="Clear sample data" subtitle="Remove the example entries" onPress={clearDemo} />
        ) : (
          <ListRow icon="flask-outline" iconColor={c.warn} iconBg={c.warnSoft} title="Load sample data" subtitle="See how the charts look with 3 months of examples" onPress={loadDemo} />
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
