import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Eyebrow, H1, H2, H3, Pill, Row, Screen, Small, Toggle } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/backend';
import { timeAgo, useLive } from '../../lib/hooks';
import { usePrefs } from '../../lib/prefs';
import { colors, space } from '../../lib/theme';

export default function Agents() {
  const { data } = useLive(() => api.listAgents());
  const { data: founding } = useLive(() => api.listFoundingRequests());
  const { signOut } = useAuth();
  const { dots, setDots } = usePrefs();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const open = (founding ?? []).filter((f) => f.status !== 'redeemed');

  return (
    <Screen>
      <Eyebrow>Admin</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Agents</H1>

      {open.length > 0 && (
        <>
          <H2 style={{ marginTop: space(6), fontSize: 22 }}>Founding agent requests</H2>
          <Small style={{ marginTop: 4, marginBottom: space(4) }}>Check they're on your founding list, then approve. The agent gets their code in the app, and you can also send it to them yourself.</Small>
          <View style={{ gap: space(3) }}>
            {open.map((f) => (
              <Card key={f.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <H3>{f.agentName}</H3>
                    <Small>{f.agentEmail} · {timeAgo(f.createdAt)}</Small>
                  </View>
                  <Pill label={f.status === 'requested' ? 'Waiting' : 'Code sent'} tone={f.status === 'requested' ? 'orange' : 'green'} />
                </Row>
                {(f.code || codes[f.id]) ? (
                  <Body style={{ marginTop: space(3) }}>Code: <Body style={{ fontWeight: '700', letterSpacing: 1 }}>{f.code ?? codes[f.id]}</Body></Body>
                ) : (
                  <Button small title="Approve & send code" style={{ marginTop: space(3) }}
                    onPress={async () => { const c = await api.approveFounding(f.id); setCodes({ ...codes, [f.id]: c }); }} />
                )}
              </Card>
            ))}
          </View>
        </>
      )}

      <H2 style={{ marginTop: space(6), fontSize: 22 }}>All agents</H2>
      <Small style={{ marginTop: 4, marginBottom: space(4) }}>Turn on Verified only after you check their NJ license on the state's license search. Agents get matched only when they're verified and have an active plan.</Small>
      <View style={{ gap: space(3) }}>
        {(data ?? []).map((a) => (
          <Card key={a.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <H3>{a.fullName}</H3>
                <Small>{a.email} · NJ #{a.license}</Small>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Toggle value={a.verified} onValueChange={(v) => api.setAgentVerified(a.id, v)} />
                <Small style={{ fontSize: 11 }}>{a.verified ? 'Verified' : 'Unverified'}</Small>
              </View>
            </Row>
            <Row gap={6} style={{ marginTop: space(4) }}>
              <View><Body style={{ fontWeight: '700' }}>{a.plan ?? 'No plan'}</Body><Small>Plan</Small></View>
              <View><Body style={{ fontWeight: '700' }}>{a.matchedThisMonth}/{a.monthlyCap}</Body><Small>This month</Small></View>
              <View><Body style={{ fontWeight: '700' }}>{a.closed}</Body><Small>Sold</Small></View>
            </Row>
          </Card>
        ))}
      </View>

      <Card style={{ marginTop: space(6) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H3>Polka dot background</H3>
          <Toggle value={dots} onValueChange={setDots} />
        </Row>
      </Card>
      <Button title="Privacy Policy" variant="ghost" style={{ marginTop: space(4) }} onPress={() => router.push('/privacy')} />
      <Button title="Sign out" variant="outline" style={{ marginTop: space(2) }} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
