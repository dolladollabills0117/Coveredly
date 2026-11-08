import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCTA } from '../../components/MatchCTA';
import { Body, Card, Eyebrow, H1, H3, IconBubble, Row, Screen, Small } from '../../components/ui';
import { POLICY_TYPES } from '../../config/policies';
import { colors, space } from '../../lib/theme';

export default function PolicyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = POLICY_TYPES.find((x) => x.id === id);
  if (!p) return null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.peach }}>
      <Screen>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={26} color={colors.ink} /></Pressable>
        <View style={{ marginTop: space(5) }}>
          <IconBubble name={p.icon as any} size={68} />
          <Eyebrow style={{ marginTop: space(5) }}>Personal lines</Eyebrow>
          <H1 style={{ marginTop: 4 }}>{p.name} insurance</H1>
          <Body style={{ color: colors.inkSoft, marginTop: 6 }}>{p.tagline}</Body>
        </View>
        <Card style={{ marginTop: space(6) }}>
          <H3>What it is</H3>
          <Body style={{ marginTop: 6 }}>{p.what}</Body>
        </Card>
        <Card style={{ marginTop: space(3) }}>
          <H3 style={{ marginBottom: 6 }}>What it usually covers</H3>
          {p.covers.map((c) => (
            <Row key={c} style={{ paddingVertical: 6, alignItems: 'flex-start' }} gap={2}>
              <Ionicons name="checkmark-circle" size={20} color={colors.orange} />
              <Body style={{ flex: 1 }}>{c}</Body>
            </Row>
          ))}
        </Card>
        <Card style={{ marginTop: space(3) }}>
          <H3>Who needs it</H3>
          <Body style={{ marginTop: 6 }}>{p.whoNeeds}</Body>
        </Card>
        <Card style={{ marginTop: space(3), backgroundColor: colors.orangeSoft, shadowOpacity: 0 }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Ionicons name="bulb" size={22} color={colors.orange} />
            <Body style={{ flex: 1 }}><Body style={{ fontWeight: '700' }}>Pro tip: </Body>{p.tip}</Body>
          </Row>
        </Card>
        <Small style={{ marginTop: space(4), textAlign: 'center' }}>General info only. Your agent will explain exactly what your policy covers.</Small>
        <View style={{ height: 90 }} />
      </Screen>
      <SafeAreaView edges={['bottom']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space(5), paddingTop: space(3), backgroundColor: colors.peach, borderTopWidth: 1, borderTopColor: colors.line }}>
        <MatchCTA />
      </SafeAreaView>
    </View>
  );
}
