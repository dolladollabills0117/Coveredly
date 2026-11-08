import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Body, Card, Eyebrow, H1, H3, Row, Screen, Small } from '../components/ui';
import { PRIVACY_EFFECTIVE_DATE, PRIVACY_SECTIONS, PRIVACY_SUMMARY } from '../config/privacyPolicy';
import { useAuth } from '../lib/auth';
import { colors, fonts, space } from '../lib/theme';

/** Privacy Policy: reachable from both the agent and policyholder sides (and before sign-up). */
export default function Privacy() {
  const { user } = useAuth();
  const side = user?.role === 'agent' ? 'agent' : 'policyholder';
  return (
    <Screen>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>
      <Eyebrow style={{ marginTop: space(5) }}>Your data, protected</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Privacy Policy</H1>
      <Small style={{ marginTop: 6 }}>Effective {PRIVACY_EFFECTIVE_DATE}</Small>

      <Card style={{ marginTop: space(6), backgroundColor: colors.ink }}>
        <Row><Ionicons name="shield-checkmark" size={22} color={colors.orange} /><H3 style={{ color: colors.white }}>The short version{user?.role === 'agent' ? ' for agents' : user ? ' for policyholders' : ''}</H3></Row>
        <View style={{ marginTop: space(3), gap: 10 }}>
          {(user?.role === 'admin' ? [...PRIVACY_SUMMARY.policyholder, ...PRIVACY_SUMMARY.agent.slice(1)] : PRIVACY_SUMMARY[side]).map((s) => (
            <Row key={s} gap={2} style={{ alignItems: 'flex-start' }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.orange} style={{ marginTop: 2 }} />
              <Body style={{ color: '#F1E8DF', flex: 1 }}>{s}</Body>
            </Row>
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: space(4) }}>
        {PRIVACY_SECTIONS.map((sec, i) => (
          <View key={sec.title} style={{ paddingTop: i ? space(5) : 0, marginTop: i ? space(5) : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <H3 style={{ marginBottom: 8 }}>{sec.title}</H3>
            {sec.body.map((p) => <Body key={p.slice(0, 40)} style={{ fontSize: 14.5, lineHeight: 22, marginBottom: 10, fontFamily: fonts.body }}>{p}</Body>)}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
