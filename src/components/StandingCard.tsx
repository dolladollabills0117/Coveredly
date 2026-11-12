import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { colors, fonts, space } from '../lib/theme';
import type { Standing } from '../lib/types';
import { Body, Card, H3, Pill, Row, Small } from './ui';

export const STANDING_LABEL = {
  good: { text: 'Good standing', tone: 'green' as const, icon: 'checkmark-circle' as const },
  attention: { text: 'Affects your standing', tone: 'red' as const, icon: 'alert-circle' as const },
  warning: { text: '30-day notice', tone: 'red' as const, icon: 'time' as const },
  removed: { text: 'Removed', tone: 'dark' as const, icon: 'close-circle' as const },
};

/** Half-filled orange circle: "in progress", calm, never a problem. */
export function HalfCircle({ size = 18 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.orange, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', backgroundColor: colors.orange }} />
    </View>
  );
}

/**
 * "Your standing". Two calm sections:
 *  - What keeps your spot: things that can affect standing (green ✓, or red ! when not met)
 *  - In progress: sales, shown with a half orange circle. Never affects standing.
 */
export function StandingCard({ standing }: { standing: Standing }) {
  const l = STANDING_LABEL[standing.status];
  const keep = standing.checks.filter((c) => c.kind === 'standing');
  const progress = standing.checks.filter((c) => c.kind === 'progress');
  const redCount = keep.filter((c) => !c.ok).length;

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
          <Small style={{ color: colors.ink }}>Take care of the items marked in red below and we&apos;ll clear the notice. Questions? hello@getcoveredly.com</Small>
        </View>
      )}
      {standing.status === 'good' && (
        <Small style={{ marginTop: space(3) }}>You&apos;re all set. Keep doing what you&apos;re doing.</Small>
      )}
      {standing.status === 'attention' && (
        <Small style={{ marginTop: space(3), color: colors.ink }}>
          {redCount === 1 ? 'One thing' : `${redCount} things`} below can affect your spot on Coveredly. A quick fix puts you right back in good standing.
        </Small>
      )}

      <Small style={{ marginTop: space(5), fontFamily: fonts.semibold, color: colors.ink, letterSpacing: 0.3 }}>What keeps your spot</Small>
      <View style={{ marginTop: 4 }}>
        {keep.map((c, i) => (
          <Row key={c.id} style={{ alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <Ionicons name={c.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={c.ok ? colors.green : colors.red} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body style={{ fontFamily: fonts.semibold }}>{c.label}</Body>
              <Small style={{ color: c.ok ? colors.inkSoft : colors.red }}>{c.value}</Small>
              <Small style={{ fontSize: 12 }}>{c.target}</Small>
            </View>
          </Row>
        ))}
      </View>

      {progress.length > 0 && (
        <>
          <Small style={{ marginTop: space(5), fontFamily: fonts.semibold, color: colors.ink, letterSpacing: 0.3 }}>In progress</Small>
          <View style={{ marginTop: 4 }}>
            {progress.map((c) => (
              <Row key={c.id} style={{ alignItems: 'flex-start', paddingVertical: 10 }}>
                <View style={{ marginTop: 2 }}>
                  {c.ok && !c.inProgress ? <Ionicons name="checkmark-circle" size={20} color={colors.green} /> : <HalfCircle />}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body style={{ fontFamily: fonts.semibold }}>{c.label}</Body>
                  <Small>{c.value}</Small>
                  <Small style={{ fontSize: 12 }}>
                    {c.ok && !c.inProgress ? c.target : 'Still nurturing. Good relationships take time, and this never affects your standing.'}
                  </Small>
                </View>
              </Row>
            ))}
          </View>
        </>
      )}

      <Pressable onPress={() => router.push('/standards')} style={{ marginTop: space(3) }}>
        <Body style={{ color: colors.orange, fontFamily: fonts.semibold }}>Read our Agent Standards →</Body>
      </Pressable>
    </Card>
  );
}
