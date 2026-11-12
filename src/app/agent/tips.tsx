import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Body, Card, Eyebrow, H1, H3, IconBubble, Row, Screen, Small } from '../../components/ui';
import { LEAD_TIPS } from '../../config/tips';
import { colors, space } from '../../lib/theme';

export default function Tips() {
  return (
    <Screen>
      <Eyebrow>Playbook</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Keep the lead hot, sell fast 🔥</H1>
      <Body style={{ color: colors.inkSoft, marginTop: 8, marginBottom: space(6) }}>
        Coveredly leads already fit how you work. These habits turn a good match into an established relationship.
      </Body>
      <Card onPress={() => router.push('/standards')} style={{ backgroundColor: colors.orangeSoft, shadowOpacity: 0, marginBottom: space(4) }}>
        <Row>
          <Ionicons name="ribbon" size={24} color={colors.orange} />
          <View style={{ flex: 1 }}>
            <H3>These habits keep your spot</H3>
            <Small style={{ color: colors.ink }}>Coveredly keeps agents who build real relationships, close consistently and earn great reviews.</Small>
            <Small style={{ color: colors.orange, marginTop: 4 }}>See our Agent Standards →</Small>
          </View>
        </Row>
      </Card>
      <Card style={{ backgroundColor: colors.ink, marginBottom: space(4) }}>
        <Row>
          <Ionicons name="trophy" size={26} color={colors.orange} />
          <View style={{ flex: 1 }}>
            <H3 style={{ color: colors.white }}>The road to Established</H3>
            <Small style={{ color: '#BDB3A9' }}>First call → Quote → Policy sold → Review</Small>
          </View>
        </Row>
      </Card>
      <View style={{ gap: space(3) }}>
        {LEAD_TIPS.map((t, i) => (
          <Card key={t.title}>
            <Row style={{ alignItems: 'flex-start' }}>
              <IconBubble name={t.icon as any} />
              <View style={{ flex: 1, gap: 4 }}>
                <Small style={{ color: colors.orange }}>Tip {i + 1}</Small>
                <H3>{t.title}</H3>
                <Body style={{ color: colors.inkSoft }}>{t.body}</Body>
              </View>
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
