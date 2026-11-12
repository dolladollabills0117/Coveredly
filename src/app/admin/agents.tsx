import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { STANDARDS } from '../../../supabase/functions/_shared/standing';
import { STANDING_LABEL } from '../../components/StandingCard';
import { Body, Button, Card, Eyebrow, H1, H2, H3, Pill, Row, Screen, Small, Toggle } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/backend';
import { timeAgo, useLive } from '../../lib/hooks';
import { usePrefs } from '../../lib/prefs';
import { colors, fonts, radius, space } from '../../lib/theme';
import type { AdminAgent } from '../../lib/types';

export default function Agents() {
  const { data } = useLive(() => api.listAgents());
  const { data: founding } = useLive(() => api.listFoundingRequests());
  const { signOut } = useAuth();
  const { dots, setDots } = usePrefs();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const open = (founding ?? []).filter((f) => f.status !== 'redeemed');
  const order = { warning: 0, attention: 1, good: 2, removed: 3 };
  const agents = [...(data ?? [])].sort((a, b) => order[a.standing.status] - order[b.standing.status]);

  return (
    <Screen>
      <Eyebrow>Admin</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Agents</H1>

      {open.length > 0 && (
        <>
          <H2 style={{ marginTop: space(6), fontSize: 22 }}>Founding agent requests</H2>
          <Small style={{ marginTop: 4, marginBottom: space(4) }}>Check they&apos;re on your founding list, then approve. The agent gets their code in the app, and you can also send it to them yourself.</Small>
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
      <Small style={{ marginTop: 4, marginBottom: space(4) }}>
        Turn on Verified only after you check their NJ license on the state&apos;s license search. Agents get matched only when they&apos;re verified and have an active plan.
        Agents who need attention are listed first.
      </Small>
      <View style={{ gap: space(3) }}>
        {agents.map((a) => <AgentCard key={a.id} a={a} />)}
      </View>

      <Card style={{ marginTop: space(6) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H3>Polka dot background</H3>
          <Toggle value={dots} onValueChange={setDots} />
        </Row>
      </Card>
      <Button title="Agent Standards" variant="ghost" style={{ marginTop: space(4) }} onPress={() => router.push('/standards')} />
      <Button title="Agent Terms" variant="ghost" onPress={() => router.push('/terms')} />
      <Button title="Privacy Policy" variant="ghost" onPress={() => router.push('/privacy')} />
      <Button title="Sign out" variant="outline" style={{ marginTop: space(2) }} onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}

function AgentCard({ a }: { a: AdminAgent }) {
  const s = a.standing;
  const l = STANDING_LABEL[s.status];
  const failing = s.checks.filter((c) => !c.ok);
  const [writing, setWriting] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const suggested = failing.map((c) => `${c.label}: ${c.value}.`).join(' ');

  return (
    <Card style={s.status === 'removed' ? { opacity: 0.6 } : undefined}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <H3>{a.fullName}</H3>
          <Small>{a.email} · NJ #{a.license}</Small>
        </View>
        {s.status !== 'removed' && (
          <View style={{ alignItems: 'center' }}>
            <Toggle value={a.verified} onValueChange={(v) => api.setAgentVerified(a.id, v)} />
            <Small style={{ fontSize: 11 }}>{a.verified ? 'Verified' : 'Unverified'}</Small>
          </View>
        )}
      </Row>
      <Row gap={6} style={{ marginTop: space(4) }}>
        <View><Body style={{ fontWeight: '700' }}>{a.plan ?? 'No plan'}</Body><Small>Plan</Small></View>
        <View><Body style={{ fontWeight: '700' }}>{a.matchedThisMonth}/{a.monthlyCap}</Body><Small>This month</Small></View>
        <View><Body style={{ fontWeight: '700' }}>{a.closed}</Body><Small>Sold</Small></View>
      </Row>
      <Small style={{ marginTop: space(3), fontSize: 12 }}>
        {a.termsAcceptedAt ? `Agreed to Agent Terms (version ${a.termsVersion}) ${timeAgo(a.termsAcceptedAt)}` : 'Has not agreed to the Agent Terms yet'}
      </Small>

      {/* Standing */}
      <View style={{ marginTop: space(4), paddingTop: space(3), borderTopWidth: 1, borderTopColor: colors.line, gap: 6 }}>
        <Row gap={2}>
          <Pill label={s.status === 'warning' ? `30-day notice · ${s.warningDaysLeft} days left` : l.text} tone={l.tone} icon={l.icon} />
        </Row>
        {s.status === 'warning' && !!s.warningReason && <Small style={{ color: colors.ink }}>Notice sent {timeAgo(s.warningAt)}: {s.warningReason}</Small>}
        {failing.map((c) => (
          <Row key={c.id} gap={2} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="alert-circle" size={16} color={colors.orange} style={{ marginTop: 2 }} />
            <Small style={{ flex: 1, color: colors.ink }}>{c.label}: {c.value}</Small>
          </Row>
        ))}
        {failing.length === 0 && s.status !== 'removed' && <Small>Meeting every standard.</Small>}
      </View>

      {/* Actions */}
      {s.status !== 'removed' && (
        <View style={{ marginTop: space(3), gap: 8 }}>
          {s.status !== 'warning' && !writing && (
            <Button small variant="outline" icon="time-outline" title={`Send ${STANDARDS.warningDays}-day notice`}
              onPress={() => { setReason(suggested); setWriting(true); }} />
          )}
          {writing && (
            <>
              <Small>Reason the agent will see:</Small>
              <TextInput value={reason} onChangeText={setReason} multiline placeholder="What needs to improve"
                placeholderTextColor="#A8998B"
                style={{ backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, padding: 12, minHeight: 80, fontFamily: fonts.body, fontSize: 15, color: colors.ink, textAlignVertical: 'top' }} />
              <Row gap={2}>
                <Button small title="Send notice" style={{ flex: 1 }} disabled={!reason.trim()} loading={busy}
                  onPress={() => run(async () => { await api.issueWarning(a.id, reason.trim()); setWriting(false); })} />
                <Button small variant="ghost" title="Cancel" onPress={() => setWriting(false)} />
              </Row>
            </>
          )}
          {s.status === 'warning' && (
            <>
              <Button small variant="outline" icon="checkmark-circle-outline" title="Clear notice (they improved)" loading={busy && !confirmRemove}
                onPress={() => run(() => api.clearWarning(a.id))} />
              {!confirmRemove ? (
                <Button small variant="danger" icon="close-circle-outline" disabled={(s.warningDaysLeft ?? 1) > 0}
                  title={(s.warningDaysLeft ?? 1) > 0 ? `Remove agent (available in ${s.warningDaysLeft} days)` : 'Remove agent'}
                  onPress={() => setConfirmRemove(true)} />
              ) : (
                <View style={{ backgroundColor: colors.redSoft, borderRadius: radius.md, padding: 12, gap: 8 }}>
                  <Small style={{ color: colors.ink }}>This cancels {a.fullName}&apos;s subscription (no further charges), stops new matches and ends any founding pricing. It can&apos;t be undone.</Small>
                  <Row gap={2}>
                    <Button small variant="danger" title="Yes, remove" style={{ flex: 1 }} loading={busy} onPress={() => run(() => api.removeAgent(a.id))} />
                    <Button small variant="ghost" title="Cancel" onPress={() => setConfirmRemove(false)} />
                  </Row>
                </View>
              )}
            </>
          )}
          {!!err && <Small style={{ color: colors.red }}>{err}</Small>}
        </View>
      )}
    </Card>
  );
}
