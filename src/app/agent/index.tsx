import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MilestoneDots, progressOf } from '../../components/Milestones';
import { Body, Card, Empty, Eyebrow, H1, H3, Pill, Row, Screen, Small, tap } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/backend';
import { timeAgo, useLive } from '../../lib/hooks';
import { colors, fonts, radius, space } from '../../lib/theme';
import type { Match } from '../../lib/types';

const FILTERS = ['All', 'New', 'Working', 'Established', 'Reported'] as const;
const bucket = (m: Match): (typeof FILTERS)[number] =>
  m.status === 'established' ? 'Established' : m.status === 'reported' || m.status === 'replaced' ? 'Reported' : !m.contactedAt ? 'New' : 'Working';

export default function Leads() {
  const { user } = useAuth();
  const { data: leads } = useLive(() => api.listMyMatches());
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const list = (leads ?? []).filter((m) => filter === 'All' || bucket(m) === filter);
  const count = (f: (typeof FILTERS)[number]) => (leads ?? []).filter((m) => bucket(m) === f).length;
  const sold = (leads ?? []).filter((m) => m.milestones.sold).length;

  return (
    <Screen>
      <Eyebrow>Good to see you</Eyebrow>
      <H1 style={{ marginTop: 4 }}>{user?.fullName?.split(' ')[0]}'s leads</H1>

      <View style={st.stats}>
        {[
          { n: count('New'), l: 'New', c: colors.orange },
          { n: count('Working'), l: 'Working', c: colors.ink },
          { n: sold, l: 'Sold', c: colors.green },
          { n: count('Established'), l: 'Established', c: colors.green },
        ].map((s) => (
          <View key={s.l} style={st.stat}>
            <Body style={[st.statN, { color: s.c }]}>{s.n}</Body>
            <Small>{s.l}</Small>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(5), marginBottom: space(4) }}
        contentContainerStyle={{ paddingHorizontal: space(5), gap: 8 }}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => { tap(); setFilter(f); }} style={[st.chip, filter === f && st.chipOn]}>
            <Body style={[st.chipText, filter === f && { color: colors.white }]}>{f}{f !== 'All' ? ` · ${count(f)}` : ''}</Body>
          </Pressable>
        ))}
      </ScrollView>

      {leads && list.length === 0 && (
        <Empty icon="people-outline" title={filter === 'All' ? 'Your first lead is on its way' : `No ${filter.toLowerCase()} leads`}
          body={filter === 'All' ? "We'll ping you the moment a policyholder matches with you. Reach out fast. Speed wins." : 'Try another filter.'} />
      )}

      <View style={{ gap: space(3) }}>
        {list.map((m) => {
          const b = bucket(m);
          const q = m.policyholder?.quiz;
          return (
            <Card key={m.id} onPress={() => router.push(`/lead/${m.id}`)}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Row gap={2}>
                    <H3>{m.policyholder?.fullName}</H3>
                    {b === 'New' && <View style={st.hot}><Ionicons name="flame" size={12} color={colors.white} /><Small style={{ color: colors.white, fontFamily: fonts.bold, fontSize: 11 }}>HOT</Small></View>}
                  </Row>
                  <Small>{q?.coverage.join(' · ')} · {q?.county ? `${q.county} County` : q?.state}</Small>
                </View>
                <Pill label={`${Math.round(m.score)}% fit`} tone="orange" />
              </Row>
              <View style={{ marginVertical: space(4) }}><MilestoneDots match={m} /></View>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={2}>
                  <Pill tone={b === 'Established' ? 'green' : b === 'Reported' ? 'red' : b === 'New' ? 'dark' : 'neutral'}
                    label={b === 'Established' ? 'Established 🎉' : b === 'Reported' ? (m.status === 'replaced' ? 'Replaced' : 'Under review') : `${progressOf(m)}/4 milestones`} />
                  <Small>{q?.contactMethod}</Small>
                </Row>
                <Small>{timeAgo(m.createdAt)}</Small>
              </Row>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  stats: { flexDirection: 'row', backgroundColor: colors.cream, borderRadius: radius.lg, paddingVertical: 16, marginVertical: space(5) },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statN: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 14 },
  hot: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.orange, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
});
