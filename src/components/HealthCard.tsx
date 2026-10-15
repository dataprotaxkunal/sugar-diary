import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { relDay, ymd } from '../lib/date';
import { availability, Availability, lastStatus, openSettings, PLAY_STORE_URL } from '../lib/healthConnect';
import { useStore } from '../lib/store';
import { space, useColors } from '../lib/theme';
import { useHealthSync } from '../lib/useHealthSync';
import { Button, Card, Divider, IconBubble, Row, success, Toggle, Txt } from './ui';

function androidRelease() {
  const c = (Platform as unknown as { constants?: { Release?: string } }).constants;
  return c?.Release ?? String(Platform.Version);
}

function ago(ts?: number) {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return relDay(ts);
}

export function HealthCard({ compact }: { compact?: boolean }) {
  const c = useColors();
  const { data, setHealth } = useStore();
  const { syncing, syncNow, connectNow } = useHealthSync();
  const [avail, setAvail] = useState<Availability | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const h = data.health;
  const status = avail ? lastStatus() : null;

  useEffect(() => {
    availability().then(setAvail);
  }, []);

  const imported = data.workouts.filter((w) => w.hcId).length;
  const stepsToday = data.steps[ymd(new Date())];

  const header = (
    <Row gap={space.md}>
      <IconBubble name="fitness" color="#4285F4" bg={c.cardAlt} size={44} />
      <View style={{ flex: 1 }}>
        <Txt v="h3">Google Fit & Health Connect</Txt>
        <Txt v="caption" color={h.connected ? c.good : c.sub} style={{ fontWeight: '600' }}>
          {h.connected ? (syncing ? 'Syncing…' : `Connected · synced ${ago(h.lastSync)}`) : 'Not connected'}
        </Txt>
      </View>
      {h.connected ? <Ionicons name="checkmark-circle" size={24} color={c.good} /> : null}
    </Row>
  );

  if (avail === 'unsupported' && !h.connected) {
    return (
      <Card>
        {header}
        <Txt v="sub">Works in the installed Sugar Diary app on Android. It isn't available in Expo Go or this preview.</Txt>
      </Card>
    );
  }

  if ((avail === 'not-installed' || avail === 'needs-update') && !h.connected) {
    const androidVer = Platform.OS === 'android' ? `Android ${androidRelease()}` : '';
    return (
      <Card>
        {header}
        <Txt v="sub">
          {avail === 'needs-update'
            ? 'Your phone reports that Health Connect isn’t ready yet. Open it once to finish setup, or update it from the Play Store, then come back here.'
            : 'Install Health Connect (free, by Google) so Sugar Diary can read your Google Fit workouts and steps.'}
        </Txt>
        {avail === 'needs-update' ? (
          <Button
            title="Open Health Connect"
            icon="open-outline"
            small
            onPress={() => {
              openSettings();
              setMsg('After setting it up, come back and tap “Check again”.');
            }}
          />
        ) : null}
        <Button title={avail === 'needs-update' ? 'Update on Play Store' : 'Get Health Connect'} icon="logo-google-playstore" small kind={avail === 'needs-update' ? 'secondary' : 'primary'} onPress={() => Linking.openURL(PLAY_STORE_URL)} />
        <Row gap={space.sm}>
          <Button title="Check again" icon="refresh-outline" small kind="ghost" onPress={() => availability().then(setAvail)} style={{ flex: 1 }} />
          <Button
            title="Try connecting"
            icon="link-outline"
            small
            kind="ghost"
            onPress={async () => {
              setMsg(null);
              const g = await connectNow();
              if (g && (g.exercise || g.steps || g.readGlucose || g.writeGlucose)) success();
              else setMsg('Health Connect didn’t respond. Open it once from your phone’s Settings → Apps → Health Connect (make sure it isn’t disabled), then try again.');
            }}
            style={{ flex: 1 }}
          />
        </Row>
        {msg ? (
          <Txt v="caption" color={c.warn}>
            {msg}
          </Txt>
        ) : null}
        <Txt v="caption">
          {androidVer}
          {status != null ? ` · status ${status}` : ''}
        </Txt>
      </Card>
    );
  }

  if (!h.connected) {
    return (
      <Card>
        {header}
        {!compact ? (
          <View style={{ gap: 8 }}>
            {[
              ['walk-outline', 'Walks and workouts from Google Fit appear automatically'],
              ['footsteps-outline', 'Daily steps on your home screen and charts'],
              ['water-outline', 'Your sugar readings are saved to Health Connect too'],
            ].map(([icon, text]) => (
              <Row key={text} gap={10}>
                <Ionicons name={icon as never} size={18} color={c.primary} />
                <Txt v="sub" style={{ flex: 1 }}>
                  {text}
                </Txt>
              </Row>
            ))}
          </View>
        ) : null}
        <Button
          title="Connect Google Fit"
          icon="link-outline"
          onPress={async () => {
            setMsg(null);
            const g = await connectNow();
            if (!g) setMsg('Couldn’t open Health Connect. Make sure it’s installed and try again.');
            else if (!(g.exercise || g.steps || g.readGlucose || g.writeGlucose)) setMsg('No access was allowed. Tap Connect again and switch on the items you want to share.');
            else success();
          }}
        />
        {msg ? (
          <Txt v="caption" color={c.bad}>
            {msg}
          </Txt>
        ) : null}
        {!compact ? <Txt v="caption">In the Google Fit app, open Profile → Settings → Sync with Health Connect and turn it on.</Txt> : null}
      </Card>
    );
  }

  return (
    <Card>
      {header}
      <Row gap={space.sm}>
        <Stat label="Workouts imported" value={String(imported)} />
        <Stat label="Steps today" value={stepsToday ? stepsToday.toLocaleString('en-IN') : '—'} />
      </Row>
      <Divider />
      <Row>
        <View style={{ flex: 1 }}>
          <Txt v="h3">Save my sugar readings</Txt>
          <Txt v="caption">Copies readings to Health Connect for other apps</Txt>
        </View>
        <Toggle value={h.saveReadings} onChange={(v) => setHealth({ saveReadings: v })} />
      </Row>
      <Row>
        <View style={{ flex: 1 }}>
          <Txt v="h3">Import readings from other apps</Txt>
          <Txt v="caption">E.g. a Bluetooth glucometer app</Txt>
        </View>
        <Toggle value={h.importReadings} onChange={(v) => setHealth({ importReadings: v })} />
      </Row>
      <Row gap={space.sm}>
        <Button title={syncing ? 'Syncing…' : 'Sync now'} icon="sync-outline" small kind="secondary" loading={syncing} onPress={() => syncNow()} style={{ flex: 1 }} />
        <Button title="Permissions" icon="shield-checkmark-outline" small kind="secondary" onPress={openSettings} style={{ flex: 1 }} />
      </Row>
      <Button title="Disconnect" kind="ghost" small onPress={() => setHealth({ connected: false })} />
    </Card>
  );

  function Stat({ label, value }: { label: string; value: string }) {
    return (
      <View style={{ flex: 1, backgroundColor: c.cardAlt, borderRadius: 14, padding: space.md, gap: 2 }}>
        <Txt v="h2" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
        <Txt v="caption">{label}</Txt>
      </View>
    );
  }
}
