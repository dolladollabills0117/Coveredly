import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Body, Card, Empty, Eyebrow, H1, H3, Pill, Row, Screen, Small, tap } from '../components/ui';
import { useAuth } from '../lib/auth';
import { api } from '../lib/backend';
import { useLive } from '../lib/hooks';
import { computeInsights, fmtDays, fmtPct, MIN_SALES_FOR_SUGGESTION, RANGE_LABEL, type Range } from '../lib/insights';
import { colors, fonts, radius, space } from '../lib/theme';
import { lineLabel } from '../lib/types';

/** Admin: how long each line of business takes to sell, overall and per agent. */
export default function SalesInsights() {
  const { user } = useAuth();
  const { data } = useLive(() => (user?.role === 'admin' ? api.getInsightsData() : Promise.resolve(null)), [user?.role]);
  const [range, setRange] = useState<Range>('12m');
  const [agentId, setAgentId] = useState<string | undefined>();

  if (user === undefined) return null;
  if (user?.role !== 'admin') return <Redirect href="/" />;

  const ins = data ? computeInsights(data, { range, agentId }) : null;
  const everyone = data ? computeInsights(data, { range }) : null;
  const agentName = everyone?.agents.find((a) => a.agentId === agentId)?.agentName;

  return (
    <Screen>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin'))} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>
      <Eyebrow style={{ marginTop: space(5) }}>Admin</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Sales insights</H1>
      <Small style={{ marginTop: 6 }}>
        How long each type of policy takes to sell, counted from the day the match was approved to the day the agent logged the sale.
        Use it to set fair Agent Standards from your own numbers.
      </Small>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipRow} contentContainerStyle={st.chipRowInner}>
        {(Object.keys(RANGE_LABEL) as Range[]).map((r) => <Chip key={r} on={range === r} label={RANGE_LABEL[r]} onPress={() => setRange(r)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[st.chipRow, { marginTop: 0 }]} contentContainerStyle={st.chipRowInner}>
        <Chip on={!agentId} label="All agents" onPress={() => setAgentId(undefined)} />
        {(everyone?.agents ?? []).map((a) => <Chip key={a.agentId} on={agentId === a.agentId} label={a.agentName} onPress={() => setAgentId(a.agentId)} />)}
      </ScrollView>

      {ins && (
        <>
          <Row gap={2}>
            {[
              ['Policies sold', String(ins.totalSold)],
              ['Avg. time to sell', fmtDays(ins.avgDays)],
              ['Leads with a sale', `${ins.leadsWithSale}/${ins.leads}`],
            ].map(([l, v]) => (
              <Card key={l} style={{ flex: 1, padding: space(3), alignItems: 'center' }}>
                <Body style={st.big}>{v}</Body>
                <Small style={{ fontSize: 11, textAlign: 'center' }}>{l}</Small>
              </Card>
            ))}
          </Row>

          <H3 style={{ marginTop: space(6), marginBottom: space(3) }}>By line of business{agentName ? ` · ${agentName}` : ''}</H3>
          {ins.totalSold === 0 && ins.leads === 0 ? (
            <Empty icon="bar-chart-outline" title="No data in this range yet" body="Numbers appear here as agents log sales." />
          ) : (
            <View style={{ gap: space(3) }}>
              {ins.lines.map((l) => (
                <Card key={l.line}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <H3>{lineLabel(l.line)}</H3>
                    <Pill label={`${l.sold} sold`} tone={l.sold ? 'green' : 'neutral'} />
                  </Row>
                  {l.sold ? (
                    <>
                      <Row gap={6} style={{ marginTop: space(3) }}>
                        <View><Body style={st.big}>{fmtDays(l.avgDays)}</Body><Small>Average</Small></View>
                        <View><Body style={st.big}>{fmtDays(l.medianDays)}</Body><Small>Typical (median)</Small></View>
                      </Row>
                      <Small style={{ marginTop: 6 }}>Fastest {fmtDays(l.fastestDays)} · slowest {fmtDays(l.slowestDays)}</Small>
                      {l.longTermSold > 0 && (
                        <Small style={{ marginTop: 4 }}>Long-term leads: {l.longTermSold} sold · avg {fmtDays(l.longTermAvgDays)}</Small>
                      )}
                    </>
                  ) : (
                    <Small style={{ marginTop: 6 }}>No sales of this line yet.</Small>
                  )}
                  <Small style={{ marginTop: 6, color: colors.ink }}>
                    Close rate: {l.requested ? `${l.requestedAndSold} of ${l.requested} lead${l.requested === 1 ? '' : 's'} who asked for it (${fmtPct(l.closeRate)})` : 'no leads asked for it yet'}
                  </Small>
                  <View style={st.suggest}>
                    <Ionicons name="bulb-outline" size={16} color={colors.orange} />
                    <Small style={{ flex: 1, color: colors.ink }}>
                      {l.suggestedWindow
                        ? `Data-based window: ${l.suggestedWindow} days (80% of these sales closed within it)`
                        : `Suggested window appears after ${MIN_SALES_FOR_SUGGESTION} sales (${l.sold} so far)`}
                    </Small>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {!agentId && (everyone?.agents.length ?? 0) > 0 && (
            <>
              <H3 style={{ marginTop: space(6), marginBottom: space(3) }}>By agent</H3>
              <Card>
                {everyone!.agents.map((a, i) => (
                  <Pressable key={a.agentId} onPress={() => { tap(); setAgentId(a.agentId); }}
                    style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontFamily: fonts.semibold }}>{a.agentName}</Body>
                        <Small>{a.sold} sold · avg {fmtDays(a.avgDays)} · {a.leadsWithSale}/{a.leads} leads with a sale</Small>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
                    </Row>
                  </Pressable>
                ))}
              </Card>
            </>
          )}
          <Small style={{ marginTop: space(5) }}>
            Close rates include leads that are still in progress, so recent months read lower until those leads have had time to close.
          </Small>
        </>
      )}
    </Screen>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={[st.chip, on && st.chipOn]}>
      <Body style={[st.chipText, on && { color: colors.white }]}>{label}</Body>
    </Pressable>
  );
}

const st = StyleSheet.create({
  chipRow: { marginHorizontal: -space(5), marginTop: space(4), marginBottom: space(3) },
  chipRowInner: { paddingHorizontal: space(5), gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5 },
  big: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  suggest: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: space(3), backgroundColor: colors.orangeSoft, borderRadius: 12, padding: 10 },
});
