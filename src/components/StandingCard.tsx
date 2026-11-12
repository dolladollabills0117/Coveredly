import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { colors, fonts, space } from '../lib/theme';
import type { Standing } from '../lib/types';
import { Body, Card, H3, Pill, Row, Small } from './ui';

export const STANDING_LABEL = {
  good: { text: 'Good standing', tone: 'green' as const, icon: 'checkmark-circle' as const },
  attention: { text: 'Needs attention', tone: 'orange' as const, icon: 'alert-circle' as const },
  warning: { text: '30-day notice', tone: 'red' as const, icon: 'time' as const },
  removed: { text: 'Removed', tone: 'dark' as const, icon: 'close-circle' as const },
};

/** "Your standing": every Agent Standards measure, so agents always know where they stand. */
export function StandingCard({ standing }: { standing: Standing }) {
  const l = STANDING_LABEL[standing.status];
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <H3>Your standing</H3>
        <Pill label={l.text} tone={l.tone} icon={l.icon} />
      </Row>

      {standing.status === 'warning' && (
        <View style={{ backgroundColor: colors.redSoft, borderRadius: 14, padding: space(4), marginTop: space(4), gap: 6 }}>
          <Body style={{ fontFamily: fonts.semibold, color: colors.red }}>
            {standing.warningDaysLeft} day{standing.warningDaysLeft === 1 ? '' : 's'} left to improve
          </Body>
          {!!standing.warningReason && <Body>{standing.warningReason}</Body>}
          <Small style={{ color: colors.ink }}>Work on the items marked below. When they're back on track we'll clear the notice. Questions? hello@getcoveredly.com</Small>
        </View>
      )}
      {standing.status === 'attention' && (
        <Small style={{ marginTop: space(3), color: colors.ink }}>A few things need attention. Getting them back on track keeps your spot on Coveredly.</Small>
      )}

      <View style={{ marginTop: space(3) }}>
        {standing.checks.map((c, i) => (
          <Row key={c.id} style={{ alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <Ionicons name={c.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={c.ok ? colors.green : colors.orange} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body style={{ fontFamily: fonts.semibold }}>{c.label}</Body>
              <Small style={{ color: c.ok ? colors.inkSoft : colors.ink }}>{c.value}</Small>
              <Small style={{ fontSize: 12 }}>Target: {c.target}</Small>
            </View>
          </Row>
        ))}
      </View>
      <Pressable onPress={() => router.push('/standards')} style={{ marginTop: space(2) }}>
        <Body style={{ color: colors.orange, fontFamily: fonts.semibold }}>Read our Agent Standards →</Body>
      </Pressable>
    </Card>
  );
}
