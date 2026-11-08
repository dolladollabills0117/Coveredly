import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MilestoneDots, progressOf } from '../../components/Milestones';
import { Body, Card, Eyebrow, H1, H2, H3, IconBubble, Pill, Row, Screen, Small } from '../../components/ui';
import { POLICY_TYPES } from '../../config/policies';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/backend';
import { useLive } from '../../lib/hooks';
import { colors, fonts, radius, space } from '../../lib/theme';
import type { PolicyholderQuiz } from '../../lib/types';
import { useMyMatch } from '../../lib/useMyMatch';

export default function PolicyholderHome() {
  const { user } = useAuth();
  const { data: quiz } = useLive(() => api.getMyQuiz() as Promise<PolicyholderQuiz | null>);
  const { match } = useMyMatch();
  const wants = new Set(quiz?.coverage ?? []);
  const recommended = POLICY_TYPES.filter((p) => wants.has(p.matchLine));
  const more = POLICY_TYPES.filter((p) => !wants.has(p.matchLine));
  const initials = (user?.fullName ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const PolicyTile = ({ p, highlight }: { p: (typeof POLICY_TYPES)[number]; highlight?: boolean }) => (
    <Card onPress={() => router.push(`/policy/${p.id}`)} style={[st.tile, highlight && { borderColor: colors.orange, borderWidth: 1.5 }]}>
      <IconBubble name={p.icon as any} bg={highlight ? colors.orange : colors.orangeSoft} color={highlight ? colors.white : colors.orange} />
      <H3 style={{ marginTop: space(3) }}>{p.name}</H3>
      <Small numberOfLines={2} style={{ marginTop: 2 }}>{p.tagline}</Small>
    </Card>
  );

  return (
    <Screen>
      {/* Profile header */}
      <Row style={{ marginBottom: space(6) }}>
        <View style={st.avatar}><Body style={st.avatarText}>{initials}</Body></View>
        <View style={{ flex: 1 }}>
          <Small>Welcome back</Small>
          <H2>{user?.fullName}</H2>
          <Small>{quiz?.county ? `${quiz.county} County, ` : ''}{quiz?.state ?? 'New Jersey'}</Small>
        </View>
      </Row>

      {/* Match status */}
      {!match && (
        <Card style={{ backgroundColor: colors.ink }} onPress={() => router.push('/policyholder/agent')}>
          <Row>
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow>Next step</Eyebrow>
              <H3 style={{ color: colors.white }}>Find your agent match</H3>
              <Small style={{ color: '#BDB3A9' }}>One licensed NJ agent, picked for how you like to work.</Small>
            </View>
            <Ionicons name="arrow-forward-circle" size={40} color={colors.orange} />
          </Row>
        </Card>
      )}
      {match?.status === 'pending_approval' && (
        <Card>
          <Row>
            <IconBubble name="hourglass-outline" />
            <View style={{ flex: 1 }}>
              <H3>We're finding your match</H3>
              <Small>Our team hand-checks every match. You'll get a notification soon.</Small>
            </View>
          </Row>
        </Card>
      )}
      {(match?.status === 'active' || match?.status === 'established') && (
        <Card onPress={() => router.push('/policyholder/agent')}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={3} style={{ flex: 1 }}>
              <View style={[st.avatar, { width: 48, height: 48, backgroundColor: colors.orange }]}>
                <Body style={[st.avatarText, { color: colors.white, fontSize: 17 }]}>{match.agent?.fullName.split(' ').map((w) => w[0]).join('')}</Body>
              </View>
              <View style={{ flex: 1 }}>
                <Small>Your agent</Small>
                <H3>{match.agent?.fullName}</H3>
              </View>
            </Row>
            {match.status === 'established' ? <Pill label="Established 🎉" tone="green" /> : <Pill label={`${progressOf(match)}/4`} tone="orange" />}
          </Row>
          <View style={{ marginTop: space(4) }}><MilestoneDots match={match} /></View>
        </Card>
      )}

      {recommended.length > 0 && (
        <>
          <H2 style={{ marginTop: space(8) }}>Recommended for you</H2>
          <Small style={{ marginTop: 4, marginBottom: space(4) }}>Based on what you told us. Tap to learn more.</Small>
          <View style={st.grid}>{recommended.map((p) => <PolicyTile key={p.id} p={p} highlight />)}</View>
        </>
      )}
      <H2 style={{ marginTop: space(8) }}>{recommended.length ? 'Other coverage to consider' : 'Coverage you may need'}</H2>
      <Small style={{ marginTop: 4, marginBottom: space(4) }}>Personal lines we can match you for in New Jersey.</Small>
      <View style={st.grid}>{more.map((p) => <PolicyTile key={p.id} p={p} />)}</View>
    </Screen>
  );
}

const st = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.orange },
  avatarText: { fontFamily: fonts.display, fontSize: 22, color: colors.orange },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  tile: { width: '47.8%', padding: space(4), borderRadius: radius.lg, borderWidth: 1.5, borderColor: 'transparent' },
});
