import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useState } from 'react';
import { ColorValue, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconBubble, tap, Txt } from '../../components/ui';
import { useStore } from '../../lib/store';
import { radius, space, useColors } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const go = (path: '/log-sugar' | '/log-exercise' | '/medicine') => {
    onClose();
    setTimeout(() => router.push(path), 120);
  };
  const Item = ({ icon, color, bg, title, sub, path }: { icon: IconName; color: string; bg: string; title: string; sub: string; path: '/log-sugar' | '/log-exercise' | '/medicine' }) => (
    <Pressable onPress={() => go(path)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: pressed ? c.cardAlt : 'transparent' })}>
      <IconBubble name={icon} color={color} bg={bg} size={48} />
      <View style={{ flex: 1 }}>
        <Txt v="h3">{title}</Txt>
        <Txt v="sub">{sub}</Txt>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.faint} />
    </Pressable>
  );
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <Pressable style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.lg, paddingBottom: insets.bottom + space.lg, gap: 4 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.line, marginBottom: space.md }} />
          <Txt v="h2" style={{ marginBottom: space.sm, marginLeft: 4 }}>
            Add new
          </Txt>
          <Item icon="water" color={c.bad} bg={c.badSoft} title="Blood sugar" sub="Log a glucose reading" path="/log-sugar" />
          <Item icon="walk" color={c.ex} bg={c.exSoft} title="Exercise" sub="Walk, yoga, gym and more" path="/log-exercise" />
          <Item icon="medkit" color={c.med} bg={c.medSoft} title="Medicine" sub="Add a tablet or insulin with reminders" path="/medicine" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TabsLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useStore();
  const [sheet, setSheet] = useState(false);
  if (!data.profile.onboarded) return <Redirect href="/onboarding" />;

  const icon =
    (on: IconName, off: IconName) =>
    ({ focused, color }: { focused: boolean; color: ColorValue }) => <Ionicons name={focused ? on : off} size={24} color={color as string} />;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.faint,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line, height: 64 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
        <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarButton: () => (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Pressable
                  accessibilityLabel="Add new entry"
                  onPress={() => {
                    tap();
                    setSheet(true);
                  }}
                  style={({ pressed }) => ({
                    marginTop: -22,
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: c.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 4,
                    borderColor: c.bg,
                    elevation: 6,
                    shadowColor: c.primary,
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  })}
                >
                  <Ionicons name="add" size={32} color={c.onPrimary} />
                </Pressable>
              </View>
            ),
          }}
        />
        <Tabs.Screen name="reminders" options={{ title: 'Reminders', tabBarIcon: icon('alarm', 'alarm-outline') }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
      </Tabs>
      <AddSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  );
}
