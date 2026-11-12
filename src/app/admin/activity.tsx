import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Body, Card, Eyebrow, H1, Row, Screen, Small } from '../../components/ui';
import { api } from '../../lib/backend';
import { timeAgo, useLive } from '../../lib/hooks';
import { colors, space } from '../../lib/theme';
import type { ActivityType } from '../../lib/types';

const ICON: Record<ActivityType, [string, string]> = {
  match_suggested: ['sparkles-outline', colors.orange], match_approved: ['git-compare-outline', colors.orange],
  contacted: ['call-outline', colors.ink], milestone: ['flag-outline', colors.ink], rated: ['star-outline', colors.orange],
  reported: ['alert-circle-outline', colors.red], report_resolved: ['checkmark-circle-outline', colors.inkSoft],
  review: ['chatbox-ellipses-outline', colors.green], established: ['heart', colors.green], message: ['chatbubble-outline', colors.inkSoft],
};

/** Everything agents and policyholders do: contacted, quoted, sold, rated, reported, reviewed. */
export default function ActivityFeed() {
  const { data } = useLive(() => api.listActivity());
  const { data: agents } = useLive(() => api.listAgents());
  const all = data ?? [];
  const stat = (t: ActivityType) => all.filter((a) => a.type === t).length;
  return (
    <Screen>
      <Eyebrow>Admin</Eyebrow>
      <H1 style={{ marginTop: 4, marginBottom: space(5) }}>Activity</H1>
      <Row gap={2} style={{ marginBottom: space(5) }}>
        {[['Contacted', stat('contacted')], ['Sold', (agents ?? []).reduce((s, a) => s + a.closed, 0)], ['Established', stat('established')], ['Reports', stat('reported')]].map(([l, n]) => (
          <Card key={l as string} style={{ flex: 1, padding: space(3), alignItems: 'center' }}>
            <Body style={{ fontFamily: 'Fraunces_600SemiBold', fontSize: 24, lineHeight: 30 }}>{n}</Body>
            <Small style={{ fontSize: 11 }}>{l}</Small>
          </Card>
        ))}
      </Row>
      <Card onPress={() => router.push('/insights')} style={{ marginBottom: space(4), backgroundColor: colors.ink }}>
        <Row>
          <Ionicons name="bar-chart" size={24} color={colors.orange} />
          <View style={{ flex: 1 }}>
            <Body style={{ color: colors.white, fontWeight: '600' }}>Sales insights</Body>
            <Small style={{ color: '#BDB3A9' }}>How long each line takes to sell, by agent</Small>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </Row>
      </Card>
      <Card>
        {all.map((a, i) => {
          const [icon, color] = ICON[a.type] ?? ['ellipse-outline', colors.inkSoft];
          return (
            <View key={a.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <Ionicons name={icon as any} size={20} color={color} />
              <View style={{ flex: 1 }}>
                <Body>{a.text}</Body>
                <Small>{timeAgo(a.createdAt)}</Small>
              </View>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
