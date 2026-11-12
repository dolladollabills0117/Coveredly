import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Body, Card, Eyebrow, H1, H3, IconBubble, Row, Screen, Small } from '../components/ui';
import { STANDARDS_INTRO, STANDARDS_LOOK_FOR, STANDARDS_REMOVAL, STANDARDS_STANDING } from '../config/agentStandards';
import { colors, fonts, space } from '../lib/theme';

/** Agent Standards: why leads are capped and how agents keep their spot. */
export default function Standards() {
  return (
    <Screen>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>
      <Eyebrow style={{ marginTop: space(5) }}>For agents</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Agent Standards</H1>
      <Body style={{ color: colors.inkSoft, marginTop: 8 }}>{STANDARDS_INTRO}</Body>

      <H3 style={{ marginTop: space(6), marginBottom: space(3) }}>What we look for</H3>
      <View style={{ gap: space(3) }}>
        {STANDARDS_LOOK_FOR.map((s) => (
          <Card key={s.title}>
            <Row style={{ alignItems: 'flex-start' }}>
              <IconBubble name={s.icon as any} />
              <View style={{ flex: 1, gap: 4 }}>
                <H3>{s.title}</H3>
                <Body style={{ color: colors.inkSoft }}>{s.body}</Body>
              </View>
            </Row>
          </Card>
        ))}
      </View>

      <Card style={{ marginTop: space(4), backgroundColor: colors.orangeSoft, shadowOpacity: 0 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="speedometer-outline" size={22} color={colors.orange} />
          <Body style={{ flex: 1 }}>{STANDARDS_STANDING}</Body>
        </Row>
      </Card>

      <H3 style={{ marginTop: space(6), marginBottom: space(3) }}>Notices and removal</H3>
      <Card>
        {STANDARDS_REMOVAL.map((p, i) => (
          <Body key={i} style={{ marginBottom: i < STANDARDS_REMOVAL.length - 1 ? space(3) : 0, fontSize: 14.5, lineHeight: 22 }}>{p}</Body>
        ))}
      </Card>

      <Pressable onPress={() => router.push('/terms')} style={{ marginTop: space(5), alignItems: 'center' }}>
        <Small style={{ textDecorationLine: 'underline', fontFamily: fonts.medium }}>Read the full Agent Terms</Small>
      </Pressable>
    </Screen>
  );
}
