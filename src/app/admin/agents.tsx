import { router } from 'expo-router';
import { Switch, View } from 'react-native';
import { Body, Button, Card, Eyebrow, H1, H3, Row, Screen, Small } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/backend';
import { useLive } from '../../lib/hooks';
import { colors, space } from '../../lib/theme';

export default function Agents() {
  const { data } = useLive(() => api.listAgents());
  const { signOut } = useAuth();
  return (
    <Screen>
      <Eyebrow>Admin</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Agents</H1>
      <Small style={{ marginTop: 6, marginBottom: space(6) }}>Turn on Verified only after you check their NJ license on the state's license search. Unverified agents never get matched.</Small>
      <View style={{ gap: space(3) }}>
        {(data ?? []).map((a) => (
          <Card key={a.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <H3>{a.fullName}</H3>
                <Small>{a.email} · NJ #{a.license}</Small>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Switch value={a.verified} onValueChange={(v) => api.setAgentVerified(a.id, v)} trackColor={{ true: colors.orange, false: colors.line }} thumbColor={colors.white} />
                <Small style={{ fontSize: 11 }}>{a.verified ? 'Verified' : 'Unverified'}</Small>
              </View>
            </Row>
            <Row gap={6} style={{ marginTop: space(4) }}>
              <View><Body style={{ fontWeight: '700' }}>{a.matchedThisMonth}/{a.monthlyCap}</Body><Small>This month</Small></View>
              <View><Body style={{ fontWeight: '700' }}>{a.closed}</Body><Small>Policies sold</Small></View>
            </Row>
          </Card>
        ))}
      </View>
      <Button title="Sign out" variant="outline" style={{ marginTop: space(8) }} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
