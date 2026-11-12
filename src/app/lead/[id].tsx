import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { MilestoneTimeline } from '../../components/Milestones';
import { Sheet } from '../../components/Sheet';
import { Body, Button, Card, Divider, Eyebrow, Field, H1, H3, Pill, Row, Screen, Small, Stars, tap } from '../../components/ui';
import { LEAD_REPLACEMENT_POLICY } from '../../config/leadReplacementPolicy';
import { api } from '../../lib/backend';
import { timeAgo, useLive } from '../../lib/hooks';
import { colors, fonts, radius, space } from '../../lib/theme';
import type { LeadRating } from '../../lib/types';

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: m } = useLive(() => api.getMatch(id), [id]);
  const { data: ratings } = useLive(() => api.listRatings(id), [id]);
  const { data: report } = useLive(() => api.getReport(id), [id]);
  const [rateOpen, setRateOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [soldOpen, setSoldOpen] = useState(false);

  if (!m) return <Screen><Body>Loading…</Body></Screen>;
  const q = m.policyholder?.quiz;
  const p = m.policyholder;
  const locked = m.status === 'reported' || m.status === 'replaced';

  const reach = (kind: 'tel' | 'sms' | 'mailto') => {
    const v = kind === 'mailto' ? p?.email : p?.phone;
    if (!v) return;
    api.markContacted(m.id);
    Linking.openURL(`${kind}:${kind === 'mailto' ? v : v.replace(/[^\d+]/g, '')}`).catch(() => {});
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={26} color={colors.ink} /></Pressable>

      <View style={{ marginTop: space(4), gap: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Eyebrow>Matched {timeAgo(m.createdAt)}</Eyebrow>
          <Pill label={`${Math.round(m.score)}% fit`} tone="orange" icon="sparkles" />
        </Row>
        <H1>{p?.fullName}</H1>
        <Small>{q?.county ? `${q.county} County, ` : ''}{q?.state}{q?.zip ? ` ${q.zip}` : ''}</Small>
      </View>

      {m.status === 'established' && (
        <Card style={[st.banner, { backgroundColor: colors.greenSoft }]}>
          <Ionicons name="heart" size={22} color={colors.green} />
          <Body style={{ flex: 1, fontFamily: fonts.semibold, color: colors.green }}>Established relationship 🎉</Body>
        </Card>
      )}
      {report && (
        <Card style={[st.banner, { backgroundColor: report.status === 'denied' ? colors.peachDeep : colors.redSoft }]}>
          <Ionicons name="flag" size={20} color={colors.red} />
          <Body style={{ flex: 1 }}>
            Reported: {report.reason}. {report.status === 'open' ? 'Our team is reviewing it.' : report.status === 'approved' ? 'Approved. A replacement lead is on the way.' : 'Not approved for replacement.'}
          </Body>
        </Card>
      )}

      {/* Quick contact: tapping logs "contacted" for the admin */}
      <Row style={{ marginTop: space(5) }} gap={2}>
        {[
          { k: 'tel' as const, icon: 'call', label: 'Call', ok: !!p?.phone },
          { k: 'sms' as const, icon: 'chatbubble', label: 'Text', ok: !!p?.phone },
          { k: 'mailto' as const, icon: 'mail', label: 'Email', ok: !!p?.email },
        ].map((c) => (
          <Pressable key={c.k} disabled={!c.ok || locked} onPress={() => { tap(); reach(c.k); }} style={[st.quick, (!c.ok || locked) && { opacity: 0.4 }]}>
            <Ionicons name={c.icon as any} size={22} color={colors.ink} />
            <Small style={{ color: colors.ink }}>{c.label}</Small>
          </Pressable>
        ))}
        <Pressable disabled={locked} onPress={() => { tap(); router.push(`/chat/${m.id}`); }} style={[st.quick, { backgroundColor: colors.ink }, locked && { opacity: 0.4 }]}>
          <Ionicons name="chatbubbles" size={22} color={colors.white} />
          <Small style={{ color: colors.white }}>In-app</Small>
        </Pressable>
      </Row>
      <Small style={{ marginTop: 8 }}>
        {m.contactedAt ? `✓ Marked contacted ${timeAgo(m.contactedAt)}` : 'Not contacted yet. Tapping call, text, email or messaging logs it automatically.'}
      </Small>

      {/* Big "sold" button */}
      {!m.milestones.sold && !locked && (
        <Button title="I sold a policy 🎉" variant="success" icon="shield-checkmark" style={{ marginTop: space(5) }} onPress={() => setSoldOpen(true)} />
      )}

      <Card style={{ marginTop: space(5) }}>
        <H3 style={{ marginBottom: space(4) }}>Relationship milestones</H3>
        <MilestoneTimeline match={m} />
        {!locked && (
          <Row gap={2} style={{ marginTop: space(5), flexWrap: 'wrap' }}>
            {!m.milestones.call && <Button small variant="outline" icon="call-outline" title="Log first call" onPress={() => api.logMilestone(m.id, 'call')} />}
            {!m.milestones.quote && <Button small variant="outline" icon="document-text-outline" title="Log quote" onPress={() => api.logMilestone(m.id, 'quote')} />}
          </Row>
        )}
        {m.milestones.sold && !m.milestones.review && (
          <Small style={{ marginTop: space(4) }}>Waiting on {p?.fullName?.split(' ')[0]}'s review. We've nudged them. Ask them to tap "Leave a review" in their app.</Small>
        )}
      </Card>

      <Card style={{ marginTop: space(4) }}>
        <H3 style={{ marginBottom: space(3) }}>How they like to work</H3>
        {[
          ['shield-outline', 'Needs', q?.coverage.join(', ')],
          ['chatbubble-ellipses-outline', 'Reach them by', q?.contactMethod],
          ['language-outline', 'Language', q?.language],
          ['bulb-outline', 'Explain it', q?.explainStyle],
          ['compass-outline', 'Decides by', q?.decisionStyle],
          ['time-outline', 'Timing', q?.timing],
          ['ribbon-outline', 'Matters most', q?.mattersMost],
        ].map(([icon, k, v]) => (
          <Row key={k} style={{ paddingVertical: 8 }}>
            <Ionicons name={icon as any} size={18} color={colors.orange} />
            <Small style={{ width: 96 }}>{k}</Small>
            <Body style={{ flex: 1, fontFamily: fonts.medium }}>{v}</Body>
          </Row>
        ))}
      </Card>

      <Card style={{ marginTop: space(4) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H3>Your check-ins</H3>
          <Button small variant="dark" icon="star" title="Rate" onPress={() => setRateOpen(true)} />
        </Row>
        <Small style={{ marginTop: 4 }}>Rate this lead after every touchpoint. It trains the matching formula.</Small>
        {(ratings ?? []).map((r: LeadRating) => (
          <View key={r.id} style={{ marginTop: space(4) }}>
            <Row style={{ justifyContent: 'space-between' }}><Stars value={r.fit} size={16} /><Small>{timeAgo(r.createdAt)}</Small></Row>
            <Small style={{ marginTop: 4 }}>{r.vsUsual} than usual leads{r.note ? ` · "${r.note}"` : ''}</Small>
          </View>
        ))}
      </Card>

      {!report && m.status === 'active' && (
        <Pressable onPress={() => setReportOpen(true)} style={st.report}>
          <Ionicons name="flag-outline" size={18} color={colors.red} />
          <Body style={{ color: colors.red, fontFamily: fonts.semibold }}>Report a bad lead</Body>
        </Pressable>
      )}

      <SoldSheet visible={soldOpen} onClose={() => setSoldOpen(false)} name={p?.fullName ?? ''} onConfirm={async () => {
        await api.logMilestone(m.id, 'sold'); setSoldOpen(false); setRateOpen(true);
      }} />
      <RateSheet visible={rateOpen} onClose={() => setRateOpen(false)} onSave={async (r) => { await api.rateLead(m.id, r); setRateOpen(false); }} />
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} onSave={async (reason, details) => { await api.reportLead(m.id, reason, details); setReportOpen(false); }} />
    </Screen>
  );
}

function SoldSheet({ visible, onClose, onConfirm, name }: { visible: boolean; onClose: () => void; onConfirm: () => Promise<void>; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet visible={visible} onClose={onClose} title="Policy sold? 🛡️">
      <Body style={{ color: colors.inkSoft, marginBottom: space(5) }}>
        Nice work! We'll log the sale, let admin know, and ask {name.split(' ')[0]} for a quick review. Once they leave it, you're officially Established.
      </Body>
      <Button title="Yes, I sold a policy" variant="success" loading={busy} onPress={async () => { setBusy(true); await onConfirm(); setBusy(false); }} />
      <Button title="Not yet" variant="ghost" onPress={onClose} style={{ marginTop: 8 }} />
    </Sheet>
  );
}

function RateSheet({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (r: Omit<LeadRating, 'id' | 'matchId' | 'createdAt'>) => Promise<void> }) {
  const [fit, setFit] = useState(0);
  const [vs, setVs] = useState<LeadRating['vsUsual'] | null>(null);
  const [note, setNote] = useState('');
  return (
    <Sheet visible={visible} onClose={onClose} title="Rate this experience">
      <Small style={{ marginBottom: 8 }}>How good a fit was this person? ⭐</Small>
      <Stars value={fit} onChange={setFit} size={36} />
      <Small style={{ marginTop: space(5), marginBottom: 8 }}>Compared with your usual leads, this one was: 📊</Small>
      <Row gap={2}>
        {(['Better', 'About the same', 'Worse'] as const).map((o) => (
          <Pressable key={o} onPress={() => { tap(); setVs(o); }} style={[st.seg, vs === o && st.segOn]}>
            <Small style={{ color: vs === o ? colors.white : colors.ink, fontFamily: fonts.semibold }}>{o}</Small>
          </Pressable>
        ))}
      </Row>
      <View style={{ marginTop: space(5) }}>
        <Field label="Anything we should know? (optional)" value={note} onChangeText={setNote} multiline />
      </View>
      <Button title="Save rating" disabled={!fit || !vs} onPress={async () => { await onSave({ fit, vsUsual: vs!, note: note || undefined }); setFit(0); setVs(null); setNote(''); }} />
    </Sheet>
  );
}

function ReportSheet({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (reason: string, details?: string) => Promise<void> }) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  return (
    <Sheet visible={visible} onClose={onClose} title="Report a bad lead">
      <Card style={{ backgroundColor: colors.peach, shadowOpacity: 0, marginBottom: space(4) }}>
        <Eyebrow>Lead replacement policy</Eyebrow>
        <Small style={{ marginTop: 6, color: colors.ink }}>{LEAD_REPLACEMENT_POLICY.summary}</Small>
        <Small style={{ marginTop: 6 }}>Report within {LEAD_REPLACEMENT_POLICY.windowDays} days of the match.</Small>
      </Card>
      <View style={{ gap: 8 }}>
        {LEAD_REPLACEMENT_POLICY.reasons.map((r) => (
          <Pressable key={r.id} onPress={() => { tap(); setReason(r.label); }} style={[st.reason, reason === r.label && st.reasonOn]}>
            <Ionicons name={reason === r.label ? 'radio-button-on' : 'radio-button-off'} size={20} color={reason === r.label ? colors.red : colors.inkSoft} />
            <Body style={{ flex: 1 }}>{r.label}</Body>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: space(4) }}>
        <Field label="Details (what you tried, dates, etc.)" value={details} onChangeText={setDetails} multiline />
      </View>
      <Button title="Submit report" variant="dark" icon="flag" disabled={!reason} onPress={() => onSave(reason!, details || undefined)} />
      <Divider />
      <Small style={{ textAlign: 'center' }}>Reported leads are paused while we review. You'll get a notification with the decision.</Small>
    </Sheet>
  );
}

const st = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space(4), shadowOpacity: 0, padding: space(4) },
  quick: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.cream, borderRadius: radius.md, paddingVertical: 14 },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: space(6), padding: space(4) },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.white },
  segOn: { backgroundColor: colors.ink },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'transparent' },
  reasonOn: { borderColor: colors.red },
});
