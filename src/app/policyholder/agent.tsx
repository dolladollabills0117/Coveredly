import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LowFitCard } from '../../components/LowFitCard';
import { MatchCTA } from '../../components/MatchCTA';
import { MilestoneTimeline } from '../../components/Milestones';
import { Sheet } from '../../components/Sheet';
import { Body, Button, Card, Empty, Eyebrow, Field, H1, H3, Pill, Row, Screen, Small, Stars, tap } from '../../components/ui';
import { api } from '../../lib/backend';
import { colors, fonts, radius, space } from '../../lib/theme';
import { useMyMatch } from '../../lib/useMyMatch';

export default function MyAgent() {
  const { match, loaded } = useMyMatch();
  const [reviewOpen, setReviewOpen] = useState(false);

  if (!loaded) return <Screen><Body>Loading…</Body></Screen>;
  if (match && (match.status === 'low_fit' || match.status === 'waiting')) {
    return (
      <Screen>
        <Eyebrow>My agent</Eyebrow>
        <H1 style={{ marginTop: 4, marginBottom: space(6) }}>Almost there</H1>
        <LowFitCard match={match} />
      </Screen>
    );
  }
  if (!match || match.status === 'pending_approval') {
    return (
      <Screen>
        <Eyebrow>My agent</Eyebrow>
        <H1 style={{ marginTop: 4, marginBottom: space(6) }}>{match ? 'Almost there' : 'Meet your match'}</H1>
        <Empty icon={match ? 'hourglass-outline' : 'sparkles-outline'}
          title={match ? "We're hand-picking your agent" : 'No agent yet'}
          body={match ? "We match on your language, how you like to talk, the coverage you need and where you live. You'll get a notification the moment you're matched."
            : "Tap below and we'll match you with one licensed NJ agent who fits how you like to work."}>
          {!match && <View style={{ alignSelf: 'stretch', marginTop: space(2) }}><MatchCTA /></View>}
        </Empty>
      </Screen>
    );
  }
  const a = match.agent!;
  const canReview = !!match.milestones.sold && !match.milestones.review;

  return (
    <Screen>
      <Eyebrow>My agent</Eyebrow>
      <Card style={{ marginTop: space(3), alignItems: 'center', paddingVertical: space(7) }}>
        <View style={st.avatar}><Body style={st.avatarText}>{a.fullName.split(' ').map((w) => w[0]).join('')}</Body></View>
        <H1 style={{ marginTop: space(3), fontSize: 28 }}>{a.fullName}</H1>
        <Row gap={2} style={{ marginTop: 6 }}>
          <Pill label="Licensed in NJ" tone="green" icon="checkmark-circle" />
          {match.status === 'established' && <Pill label="Established 🎉" tone="orange" />}
        </Row>
        <Small style={{ marginTop: space(3), textAlign: 'center' }}>Speaks {a.languages.join(', ')} · Prefers {a.contactMethod}</Small>
        <View style={{ alignSelf: 'stretch', marginTop: space(5) }}><MatchCTA /></View>
      </Card>

      {canReview && (
        <Card style={{ marginTop: space(4), backgroundColor: colors.orange }}>
          <Row>
            <Ionicons name="star" size={28} color={colors.white} />
            <View style={{ flex: 1 }}>
              <H3 style={{ color: colors.white }}>Your policy is in place!</H3>
              <Small style={{ color: colors.white }}>Leave {a.fullName.split(' ')[0]} a quick review to make your relationship official.</Small>
            </View>
          </Row>
          <Button title="Leave a review" variant="dark" style={{ marginTop: space(4) }} onPress={() => setReviewOpen(true)} />
        </Card>
      )}

      <Card style={{ marginTop: space(4) }}>
        <H3 style={{ marginBottom: space(4) }}>Your journey together</H3>
        <MilestoneTimeline match={match} />
      </Card>

      <ReviewSheet visible={reviewOpen} onClose={() => setReviewOpen(false)} name={a.fullName}
        onSave={async (r) => { await api.submitReview(match.id, r); setReviewOpen(false); }} />
    </Screen>
  );
}

function ReviewSheet({ visible, onClose, onSave, name }: {
  visible: boolean; onClose: () => void; name: string; onSave: (r: { ease: number; wouldRecommend: boolean; comment?: string }) => Promise<void>;
}) {
  const [ease, setEase] = useState(0);
  const [rec, setRec] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet visible={visible} onClose={onClose} title={`Review ${name.split(' ')[0]}`}>
      <Small style={{ marginBottom: 8 }}>How easy was it to get started? ⭐</Small>
      <Stars value={ease} onChange={setEase} size={36} />
      <Small style={{ marginTop: space(5), marginBottom: 8 }}>Would you recommend your match to a friend? 💛</Small>
      <Row gap={2}>
        {[true, false].map((v) => (
          <Pressable key={String(v)} onPress={() => { tap(); setRec(v); }} style={[st.seg, rec === v && st.segOn]}>
            <Body style={{ color: rec === v ? colors.white : colors.ink, fontFamily: fonts.semibold }}>{v ? 'Yes' : 'No'}</Body>
          </Pressable>
        ))}
      </Row>
      <View style={{ marginTop: space(5) }}>
        <Field label="Anything we should know? (optional)" value={comment} onChangeText={setComment} multiline />
      </View>
      <Button title="Submit review" disabled={!ease || rec === null} loading={busy}
        onPress={async () => { setBusy(true); await onSave({ ease, wouldRecommend: rec!, comment: comment || undefined }); setBusy(false); }} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  avatar: { width: 88, height: 88, borderRadius: 30, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 32, color: colors.white },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.white },
  segOn: { backgroundColor: colors.ink },
});
