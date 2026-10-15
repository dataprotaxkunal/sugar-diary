import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, Pill, Row, success, Txt, WhenButton } from '../components/ui';
import { classify, CONTEXTS, levelColors, levelLabel } from '../lib/health';
import { useStore } from '../lib/store';
import { radius, space, useColors } from '../lib/theme';
import type { ReadingContext } from '../lib/types';

function defaultCtx(): ReadingContext {
  const h = new Date().getHours();
  if (h < 10) return 'fasting';
  if (h >= 21) return 'bedtime';
  return 'after';
}

export default function LogSugar() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data, addReading } = useStore();
  const params = useLocalSearchParams<{ ctx?: string }>();
  const initialCtx = (CONTEXTS.some((k) => k.key === params.ctx) ? params.ctx : defaultCtx()) as ReadingContext;
  const [text, setText] = useState('');
  const [ctx, setCtx] = useState<ReadingContext>(initialCtx);
  const [ts, setTs] = useState(Date.now());
  const [note, setNote] = useState('');
  const input = useRef<TextInput>(null);

  const value = parseInt(text, 10);
  const valid = Number.isFinite(value) && value >= 20 && value <= 600;
  const level = valid ? classify(value, ctx, data.profile) : null;
  const lc = level ? levelColors(level, c) : null;

  const guidance = useMemo(() => {
    if (!valid) return null;
    if (value < 70) return { icon: 'warning' as const, text: 'Low sugar. Take 15 g of fast-acting sugar (3 glucose tablets, ½ glass juice or 1 tbsp sugar in water), then recheck in 15 minutes.' };
    if (value > 300) return { icon: 'alert-circle' as const, text: 'Very high reading. Drink water, recheck soon, and contact your doctor if it stays above 300 mg/dL or you feel unwell.' };
    return null;
  }, [valid, value]);

  const save = () => {
    if (!valid) return;
    addReading({ value, ctx, ts, note: note.trim() || undefined });
    success();
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior="height">
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => input.current?.focus()}>
          <Card style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.sm, borderWidth: 2, borderColor: lc ? lc.fg : 'transparent' }}>
            <Txt v="label">Blood sugar</Txt>
            <Row gap={6} style={{ alignItems: 'flex-end' }}>
              <TextInput
                ref={input}
                value={text}
                onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 3))}
                keyboardType="number-pad"
                autoFocus
                placeholder="000"
                placeholderTextColor={c.line}
                style={{ fontSize: 68, fontWeight: '800', color: lc ? lc.fg : c.text, minWidth: 140, textAlign: 'center', padding: 0, fontVariant: ['tabular-nums'] }}
                accessibilityLabel="Blood sugar in milligrams per decilitre"
              />
              <Txt v="h3" color={c.sub} style={{ marginBottom: 14 }}>
                mg/dL
              </Txt>
            </Row>
            {level && lc ? (
              <View style={{ flexDirection: 'row' }}>
                <Pill text={levelLabel[level]} fg={lc.fg} bg={lc.bg} />
              </View>
            ) : <Txt v="caption">Enter the number from your glucometer</Txt>}
          </Card>
        </Pressable>

        {guidance ? (
          <Card style={{ flexDirection: 'row', gap: space.md, backgroundColor: c.badSoft, shadowOpacity: 0, elevation: 0 }}>
            <Ionicons name={guidance.icon} size={22} color={c.bad} />
            <Txt v="sub" color={c.text} style={{ flex: 1 }}>
              {guidance.text}
            </Txt>
          </Card>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Txt v="label">When was this taken?</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {CONTEXTS.map((k) => (
              <Chip key={k.key} label={k.label} icon={k.icon as never} selected={ctx === k.key} onPress={() => setCtx(k.key)} />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Txt v="label">Date & time</Txt>
          <WhenButton ts={ts} onChange={setTs} />
        </View>

        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Had sweets at a function" maxLength={140} />
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button title={valid ? `Save ${value} mg/dL` : 'Save reading'} icon="checkmark-circle" disabled={!valid} onPress={save} style={{ borderRadius: radius.lg }} />
      </View>
    </KeyboardAvoidingView>
  );
}
