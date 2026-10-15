import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmtDay, fmtTime, hm } from '../lib/date';
import { radius, space, useColors } from '../lib/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const tap = () => {
  Haptics.selectionAsync().catch(() => {});
};
export const success = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/* ---------- Text ---------- */
type TxtVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'sub' | 'caption' | 'label';
export function Txt({
  v = 'body',
  color,
  style,
  children,
  numberOfLines,
  center,
}: {
  v?: TxtVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  center?: boolean;
}) {
  const c = useColors();
  const base: Record<TxtVariant, TextStyle> = {
    display: { fontSize: 44, fontWeight: '800', letterSpacing: -1.2, color: c.text, fontVariant: ['tabular-nums'] },
    h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: c.text },
    h2: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2, color: c.text },
    h3: { fontSize: 16, fontWeight: '700', color: c.text },
    body: { fontSize: 15, color: c.text, lineHeight: 21 },
    sub: { fontSize: 14, color: c.sub, lineHeight: 19 },
    caption: { fontSize: 12, color: c.sub },
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: c.sub },
  };
  return (
    <Text numberOfLines={numberOfLines} style={[base[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}>
      {children}
    </Text>
  );
}

/* ---------- Layout ---------- */
export function Screen({
  children,
  scroll = true,
  padTop = true,
  contentStyle,
  scrollEnabled = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  scrollEnabled?: boolean;
  padTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = { paddingTop: padTop ? insets.top + space.md : space.md, paddingHorizontal: space.lg, paddingBottom: 120, gap: space.lg };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.bg }, pad, contentStyle]}>{children}</View>;
  return (
    <ScrollView scrollEnabled={scrollEnabled} style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[pad, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Row({ children, style, gap = space.sm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const s: ViewStyle = {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    shadowColor: c.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[s, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.xs }}>
      <Txt v="h2">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Txt v="sub" color={c.primary} style={{ fontWeight: '700' }}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function IconBubble({ name, color, bg, size = 40 }: { name: IconName; color: string; bg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function Pill({ text, fg, bg, icon }: { text: string; fg: string; bg: string; icon?: IconName }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: bg, alignSelf: 'flex-start' }}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

/* ---------- Controls ---------- */
export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const c = useColors();
  const map = {
    primary: { bg: c.primary, fg: c.onPrimary },
    secondary: { bg: c.primarySoft, fg: c.primary },
    ghost: { bg: 'transparent', fg: c.primary },
    danger: { bg: c.badSoft, fg: c.bad },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: map.bg,
          borderRadius: radius.md,
          paddingVertical: small ? 9 : 15,
          paddingHorizontal: small ? 14 : 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={map.fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 19} color={map.fg} /> : null}
      <Text style={{ color: map.fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, color }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName; color?: string }) {
  const c = useColors();
  const accent = color ?? c.primary;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: selected ? accent : c.card,
        borderWidth: 1.5,
        borderColor: selected ? accent : c.line,
      }}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? c.onPrimary : c.sub} /> : null}
      <Text style={{ fontWeight: '600', fontSize: 14, color: selected ? c.onPrimary : c.text }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <TextInput
        placeholderTextColor={c.faint}
        {...props}
        style={[
          { backgroundColor: c.card, borderWidth: 1.5, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: c.text },
          props.style,
        ]}
      />
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        tap();
        onChange(v);
      }}
      trackColor={{ true: c.primary, false: c.line }}
      thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
    />
  );
}

export function Stepper({ value, onChange, step = 5, min = 0, max = 600, suffix }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  const c = useColors();
  const Btn = ({ icon, d }: { icon: IconName; d: number }) => (
    <Pressable
      onPress={() => {
        tap();
        onChange(Math.min(max, Math.max(min, value + d)));
      }}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      <Ionicons name={icon} size={22} color={c.primary} />
    </Pressable>
  );
  return (
    <Row gap={space.md}>
      <Btn icon="remove" d={-step} />
      <Txt v="h2" style={{ minWidth: 80, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value}
        {suffix ? <Txt v="sub"> {suffix}</Txt> : null}
      </Txt>
      <Btn icon="add" d={step} />
    </Row>
  );
}

/* ---------- Date & time pickers (Android native dialogs) ---------- */
export function pickTime(current: string, onPick: (t: string) => void) {
  const [h, m] = current.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 8, m || 0, 0, 0);
  DateTimePickerAndroid.open({
    value: d,
    mode: 'time',
    is24Hour: false,
    onChange: (e, date) => {
      if (e.type === 'set' && date) onPick(hm(date));
    },
  });
}

export function pickDateTime(current: number, onPick: (ts: number) => void) {
  const base = new Date(current);
  DateTimePickerAndroid.open({
    value: base,
    mode: 'date',
    maximumDate: new Date(),
    onChange: (e, date) => {
      if (e.type !== 'set' || !date) return;
      const withDate = new Date(base);
      withDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      DateTimePickerAndroid.open({
        value: withDate,
        mode: 'time',
        is24Hour: false,
        onChange: (e2, t) => {
          if (e2.type !== 'set' || !t) return onPick(withDate.getTime());
          const out = new Date(withDate);
          out.setHours(t.getHours(), t.getMinutes(), 0, 0);
          onPick(Math.min(out.getTime(), Date.now()));
        },
      });
    },
  });
}

export function WhenButton({ ts, onChange }: { ts: number; onChange: (ts: number) => void }) {
  const c = useColors();
  const isToday = fmtDay(ts) === fmtDay(Date.now());
  return (
    <Pressable
      onPress={() => pickDateTime(ts, onChange)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, padding: 14, opacity: pressed ? 0.8 : 1 })}
    >
      <Ionicons name="calendar-outline" size={20} color={c.primary} />
      <Txt v="body" style={{ flex: 1, fontWeight: '600' }}>
        {isToday ? 'Today' : fmtDay(ts)}, {fmtTime(hm(ts))}
      </Txt>
      <Txt v="sub" color={c.primary} style={{ fontWeight: '700' }}>
        Change
      </Txt>
    </Pressable>
  );
}

export function TimeChip({ time, onChange, onRemove }: { time: string; onChange: (t: string) => void; onRemove?: () => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.primarySoft, borderRadius: radius.pill, paddingLeft: 14, paddingRight: onRemove ? 4 : 14, paddingVertical: 4 }}>
      <Pressable onPress={() => pickTime(time, onChange)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
        <Ionicons name="alarm-outline" size={16} color={c.primary} />
        <Text style={{ color: c.primary, fontWeight: '700', fontSize: 15 }}>{fmtTime(time)}</Text>
      </Pressable>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} style={{ padding: 6, marginLeft: 2 }}>
          <Ionicons name="close-circle" size={20} color={c.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, text, action, onAction }: { icon: IconName; title: string; text: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: space.xl, paddingHorizontal: space.md }}>
      <IconBubble name={icon} color={c.primary} bg={c.primarySoft} size={60} />
      <Txt v="h3" center>
        {title}
      </Txt>
      <Txt v="sub" center>
        {text}
      </Txt>
      {action && onAction ? <Button title={action} onPress={onAction} small kind="secondary" style={{ marginTop: 4 }} /> : null}
    </View>
  );
}

export function ListRow({ icon, iconColor, iconBg, title, subtitle, right, onPress }: { icon: IconName; iconColor: string; iconBg: string; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.listRow, { opacity: pressed ? 0.7 : 1 }]}>
      <IconBubble name={icon} color={iconColor} bg={iconBg} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="h3" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt v="sub" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.faint} /> : null)}
    </Pressable>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginVertical: 2 }} />;
}

const styles = StyleSheet.create({
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 },
});
