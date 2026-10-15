import { Card, Button, Screen, Stepper, Txt, Row } from '../components/ui';
import { defaultProfile, useStore } from '../lib/store';
import { space } from '../lib/theme';
import { View } from 'react-native';

export default function Targets() {
  const { data, updateProfile } = useStore();
  const p = data.profile;

  const Item = ({ title, sub, value, onChange, step, min, max, suffix }: { title: string; sub: string; value: number; onChange: (n: number) => void; step: number; min: number; max: number; suffix: string }) => (
    <Card>
      <View>
        <Txt v="h3">{title}</Txt>
        <Txt v="caption">{sub}</Txt>
      </View>
      <Row style={{ justifyContent: 'center' }}>
        <Stepper value={value} onChange={onChange} step={step} min={min} max={max} suffix={suffix} />
      </Row>
    </Card>
  );

  return (
    <Screen padTop={false}>
      <Txt v="sub">Your doctor may give you personal targets. Set them here and the app’s colours and charts will follow them.</Txt>
      <Item title="Low limit" sub="Below this is a low (hypo). Usually 70." value={p.targetLow} onChange={(v) => updateProfile({ targetLow: v })} step={5} min={50} max={100} suffix="mg/dL" />
      <Item title="Fasting / before-meal upper target" sub="Usually 130 for most adults." value={p.fastingHigh} onChange={(v) => updateProfile({ fastingHigh: v })} step={5} min={90} max={200} suffix="mg/dL" />
      <Item title="After-meal & overall upper target" sub="Usually 180, two hours after eating." value={p.targetHigh} onChange={(v) => updateProfile({ targetHigh: v })} step={5} min={120} max={300} suffix="mg/dL" />
      <Item title="Daily exercise goal" sub="150 minutes a week (about 30 a day) is commonly advised." value={p.exerciseGoal} onChange={(v) => updateProfile({ exerciseGoal: v })} step={5} min={5} max={180} suffix="min" />
      <Button
        title="Reset to standard targets"
        kind="ghost"
        onPress={() => updateProfile({ targetLow: defaultProfile.targetLow, fastingHigh: defaultProfile.fastingHigh, targetHigh: defaultProfile.targetHigh, exerciseGoal: defaultProfile.exerciseGoal })}
        style={{ marginTop: space.sm }}
      />
    </Screen>
  );
}
