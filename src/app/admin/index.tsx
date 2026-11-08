import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Body, Button, Card, Empty, Eyebrow, H1, H3, Pill, Row, Screen, Small, tap } from '../../components/ui';
import { api } from '../../lib/backend';
import { timeAgo, useLive } from '../../lib/hooks';
import { colors, fonts, radius, space } from '../../lib/theme';

/** Same flow as the Matches tab on the sheet: formula suggests, you approve. */
export default function Approvals() {
  const { data } = useLive(() => api.listPendingMatches());
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <Screen>
      <Eyebrow>Admin</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Match approvals</H1>
      <Small style={{ marginTop: 6, marginBottom: space(6) }}>
        The formula ranks every agent (hard rules: language, verified license, licensed in their state, under monthly cap, writes a line they need). Contact info is shared only after you approve.
      </Small>
      {data && data.length === 0 && <Empty icon="checkmark-done-outline" title="All caught up" body="New policyholders will show up here as soon as they finish the quiz." />}
      <View style={{ gap: space(4) }}>
        {(data ?? []).map((p) => {
          const q = p.match.policyholder?.quiz;
          const choice = picked[p.match.id] ?? p.candidates.find((c) => c.score >= 0)?.agentId;
          return (
            <Card key={p.match.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <H3>{p.policyholderName}</H3>
                <Small>{timeAgo(p.match.createdAt)}</Small>
              </Row>
              <Small style={{ marginTop: 4 }}>{q?.coverage.join(', ')} · {q?.language} · {q?.contactMethod} · {q?.county} County</Small>
              <View style={{ marginTop: space(4), gap: 8 }}>
                {p.candidates.map((c) => {
                  const ok = c.score >= 0;
                  const on = choice === c.agentId;
                  return (
                    <Pressable key={c.agentId} disabled={!ok} onPress={() => { tap(); setPicked({ ...picked, [p.match.id]: c.agentId }); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: on ? colors.orangeSoft : colors.white, opacity: ok ? 1 : 0.55 }}>
                      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={ok ? colors.orange : colors.inkSoft} />
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontFamily: fonts.semibold }}>{c.name}</Body>
                        {!ok && <Small>{c.reasons.join(' · ')}</Small>}
                      </View>
                      <Pill label={ok ? `${c.score}` : 'No'} tone={ok ? (c.agentId === p.candidates[0].agentId ? 'orange' : 'neutral') : 'red'} />
                    </Pressable>
                  );
                })}
              </View>
              <Button title={choice ? 'Approve match' : 'No eligible agent'} disabled={!choice} loading={busy === p.match.id} style={{ marginTop: space(4) }}
                onPress={async () => { setBusy(p.match.id); try { await api.approveMatch(p.match.id, choice!); } finally { setBusy(null); } }} />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
