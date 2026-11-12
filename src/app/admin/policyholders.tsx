import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Body, Card, Empty, Eyebrow, H1, H3, Pill, Row, Screen, Small, tap } from '../../components/ui';
import { api } from '../../lib/backend';
import { useLive } from '../../lib/hooks';
import { colors, fonts, radius, space } from '../../lib/theme';
import type { AdminPolicyholder } from '../../lib/types';

type Bucket = 'All' | 'Needs action' | 'Waiting' | 'Matched' | 'Established' | 'No match yet';
const FILTERS: Bucket[] = ['All', 'Needs action', 'Waiting', 'Matched', 'Established', 'No match yet'];

const STATUS: Record<AdminPolicyholder['matchStatus'], { label: string; tone: 'neutral' | 'orange' | 'green' | 'red' | 'dark'; bucket: Bucket }> = {
  none: { label: 'No match yet', tone: 'neutral', bucket: 'No match yet' },
  low_fit: { label: 'Under 80%: choosing', tone: 'orange', bucket: 'Waiting' },
  waiting: { label: 'Waiting for 80%+', tone: 'orange', bucket: 'Waiting' },
  pending_approval: { label: 'Needs your approval', tone: 'dark', bucket: 'Needs action' },
  active: { label: 'Matched', tone: 'green', bucket: 'Matched' },
  established: { label: 'Established 🎉', tone: 'green', bucket: 'Established' },
  reported: { label: 'Reported by agent', tone: 'red', bucket: 'Needs action' },
  replaced: { label: 'Replaced', tone: 'neutral', bucket: 'No match yet' },
};

/** Every policyholder, their contact info, quiz answers and where they are in matching. */
export default function Policyholders() {
  const { data } = useLive(() => api.listPolicyholders());
  const [filter, setFilter] = useState<Bucket>('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const all = data ?? [];
  const bucketOf = (p: AdminPolicyholder) => (p.quiz ? STATUS[p.matchStatus].bucket : 'No match yet');
  const count = (b: Bucket) => (b === 'All' ? all.length : all.filter((p) => bucketOf(p) === b).length);
  const term = q.trim().toLowerCase();
  const list = all
    .filter((p) => filter === 'All' || bucketOf(p) === filter)
    .filter((p) => !term || [p.fullName, p.email, p.phone, p.quiz?.county, p.agentName].some((v) => v?.toLowerCase().includes(term)));

  return (
    <Screen>
      <Eyebrow>Admin</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Policyholders</H1>
      <Small style={{ marginTop: 6, marginBottom: space(5) }}>Everyone who signed up, their contact info, quiz answers and where they are in matching. Tap a person for details.</Small>

      <View style={st.search}>
        <Ionicons name="search" size={18} color={colors.inkSoft} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search name, email, phone or county" placeholderTextColor="#A8998B"
          style={st.searchInput} autoCapitalize="none" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(5), marginVertical: space(4) }}
        contentContainerStyle={{ paddingHorizontal: space(5), gap: 8 }}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => { tap(); setFilter(f); }} style={[st.chip, filter === f && st.chipOn]}>
            <Body style={[st.chipText, filter === f && { color: colors.white }]}>{f} · {count(f)}</Body>
          </Pressable>
        ))}
      </ScrollView>

      {data && list.length === 0 && (
        <Empty icon="people-outline" title={all.length ? 'No one matches that' : 'No policyholders yet'}
          body={all.length ? 'Try a different search or filter.' : 'People show up here as soon as they create an account.'} />
      )}

      <View style={{ gap: space(3) }}>
        {list.map((p) => {
          const s = p.quiz ? STATUS[p.matchStatus] : { label: 'Quiz not finished', tone: 'neutral' as const };
          const expanded = open === p.id;
          return (
            <Card key={p.id} onPress={() => setOpen(expanded ? null : p.id)}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <H3>{p.fullName || 'No name yet'}</H3>
                  <Small selectable>{p.email}</Small>
                  {!!p.phone && <Small selectable>{p.phone}</Small>}
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkSoft} />
              </Row>
              <Row gap={2} style={{ marginTop: space(3), flexWrap: 'wrap' }}>
                <Pill label={s.label} tone={s.tone} />
                {p.agentName && (p.matchStatus === 'active' || p.matchStatus === 'established' || p.matchStatus === 'pending_approval') && (
                  <Small>{p.matchStatus === 'pending_approval' ? 'Suggested: ' : 'Agent: '}{p.agentName}</Small>
                )}
                {p.score !== undefined && <Small>· {Math.round(p.score)}% fit</Small>}
              </Row>
              {p.quiz && <Small style={{ marginTop: 6 }}>{p.quiz.coverage.join(', ')} · {p.quiz.county ? `${p.quiz.county} County` : p.quiz.state}</Small>}

              {expanded && (
                <View style={st.details}>
                  {p.quiz ? (
                    [
                      ['Location', [p.quiz.county && `${p.quiz.county} County`, p.quiz.state, p.quiz.zip].filter(Boolean).join(', ')],
                      ['Needs', p.quiz.coverage.join(', ')],
                      ['Reach them by', p.quiz.contactMethod],
                      ['Language', p.quiz.language],
                      ['Explain it', p.quiz.explainStyle],
                      ['Decides by', p.quiz.decisionStyle],
                      ['Timing', p.quiz.timing],
                      ['Matters most', p.quiz.mattersMost],
                    ].map(([k, v]) => (
                      <Row key={k} style={{ paddingVertical: 5, alignItems: 'flex-start' }}>
                        <Small style={{ width: 100 }}>{k}</Small>
                        <Body style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14.5 }}>{v}</Body>
                      </Row>
                    ))
                  ) : (
                    <Small>Signed up but hasn't finished the quiz yet.</Small>
                  )}
                  {(p.matchStatus === 'active' || p.matchStatus === 'established') && (
                    <Small style={{ marginTop: 8 }}>Milestones: {p.milestonesDone}/4 done</Small>
                  )}
                  {p.matchStatus === 'pending_approval' && (
                    <Pressable onPress={() => router.push('/admin')} style={{ marginTop: 10 }}>
                      <Body style={{ color: colors.orange, fontFamily: fonts.semibold }}>Review in Approvals →</Body>
                    </Pressable>
                  )}
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.line },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5 },
  details: { marginTop: space(4), paddingTop: space(3), borderTopWidth: 1, borderTopColor: colors.line },
});
