import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, View } from 'react-native';
import { Chip, IconBubble, Pill, Txt } from '../components/ui';
import { fmtClock, relDay, ymd } from '../lib/date';
import { activity, classify, ctxLabel, levelColors, levelLabel } from '../lib/health';
import { useStore } from '../lib/store';
import { space, useColors } from '../lib/theme';

type Entry = { kind: 'sugar' | 'exercise'; id: string; ts: number };

export default function History() {
  const c = useColors();
  const { data, deleteReading, deleteWorkout } = useStore();
  const [filter, setFilter] = useState<'all' | 'sugar' | 'exercise'>('all');

  const sections = useMemo(() => {
    const items: Entry[] = [];
    if (filter !== 'exercise') for (const r of data.readings) items.push({ kind: 'sugar', id: r.id, ts: r.ts });
    if (filter !== 'sugar') for (const w of data.workouts) items.push({ kind: 'exercise', id: w.id, ts: w.ts });
    items.sort((a, b) => b.ts - a.ts);
    const map = new Map<string, Entry[]>();
    for (const e of items) {
      const k = ymd(e.ts);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()].map(([k, list]) => ({ title: relDay(list[0].ts), key: k, data: list }));
  }, [data.readings, data.workouts, filter]);

  const confirmDelete = (e: Entry) =>
    Alert.alert('Delete this entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => (e.kind === 'sugar' ? deleteReading(e.id) : deleteWorkout(e.id)) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Blood sugar" selected={filter === 'sugar'} onPress={() => setFilter('sugar')} />
        <Chip label="Exercise" selected={filter === 'exercise'} onPress={() => setFilter('exercise')} />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.kind + e.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 60 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Txt v="sub" center style={{ marginTop: 60 }}>
            Nothing logged yet.
          </Txt>
        }
        renderSectionHeader={({ section }) => (
          <Txt v="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
            {section.title}
          </Txt>
        )}
        renderItem={({ item, index, section }) => {
          const first = index === 0;
          const last = index === section.data.length - 1;
          const wrap = { backgroundColor: c.card, paddingHorizontal: space.lg, paddingVertical: space.md, borderTopLeftRadius: first ? 18 : 0, borderTopRightRadius: first ? 18 : 0, borderBottomLeftRadius: last ? 18 : 0, borderBottomRightRadius: last ? 18 : 0, borderTopWidth: first ? 0 : 1, borderTopColor: c.line, flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md };
          if (item.kind === 'sugar') {
            const r = data.readings.find((x) => x.id === item.id);
            if (!r) return null;
            const l = classify(r.value, r.ctx, data.profile);
            const lc = levelColors(l, c);
            return (
              <Pressable onLongPress={() => confirmDelete(item)} style={wrap}>
                <View style={{ width: 54, alignItems: 'center' }}>
                  <Txt v="h2" color={lc.fg} style={{ fontVariant: ['tabular-nums'] }}>
                    {r.value}
                  </Txt>
                  <Txt v="caption">mg/dL</Txt>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="h3">{ctxLabel(r.ctx)}</Txt>
                  <Txt v="caption" numberOfLines={2}>
                    {fmtClock(r.ts)}
                    {r.note ? ` · ${r.note}` : ''}
                  </Txt>
                </View>
                <Pill text={levelLabel[l]} fg={lc.fg} bg={lc.bg} />
                <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={c.faint} />
                </Pressable>
              </Pressable>
            );
          }
          const w = data.workouts.find((x) => x.id === item.id);
          if (!w) return null;
          const a = activity(w.type);
          return (
            <Pressable onLongPress={() => confirmDelete(item)} style={wrap}>
              <View style={{ width: 54, alignItems: 'center' }}>
                <IconBubble name={a.icon as never} color={c.ex} bg={c.exSoft} size={38} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt v="h3">
                  {a.label} · {w.minutes} min
                </Txt>
                <Txt v="caption" numberOfLines={2}>
                  {fmtClock(w.ts)}
                  {w.note ? ` · ${w.note}` : ''}
                </Txt>
              </View>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={c.faint} />
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
