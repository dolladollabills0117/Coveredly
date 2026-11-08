import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOD_MATCH_THRESHOLD } from '../../supabase/functions/_shared/matching';
import { api } from '../lib/backend';
import { colors, fonts, space } from '../lib/theme';
import type { Match } from '../lib/types';
import { Body, Button, Card, Eyebrow, H2, Row, Small } from './ui';

const LEVEL = {
  great: { icon: 'checkmark-circle', color: colors.green, text: 'Great fit' },
  partial: { icon: 'ellipse-outline', color: colors.orange, text: 'Partial fit' },
  miss: { icon: 'close-circle', color: colors.red, text: 'Not a fit' },
} as const;

/**
 * Shown when the best available agent is under 80%. The policyholder chooses to
 * match now anyway, or wait in the queue for an 80%+ match (and re-check any time).
 */
export function LowFitCard({ match }: { match: Match }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const hasAgent = match.score >= 0;
  const pct = Math.round(match.score);
  const waiting = match.status === 'waiting';

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setNote('');
    try { await fn(); } catch (e: any) { setNote(e.message); } finally { setBusy(null); }
  };

  return (
    <Card>
      <Eyebrow>{waiting ? 'In the queue' : 'Your match options'}</Eyebrow>
      {hasAgent ? (
        <Row style={{ marginTop: space(3), alignItems: 'center' }} gap={4}>
          <View style={st.ring}>
            <Body style={st.pct}>{pct}%</Body>
            <Small style={{ fontSize: 11 }}>fit</Small>
          </View>
          <View style={{ flex: 1 }}>
            <H2 style={{ fontSize: 21, lineHeight: 27 }}>
              {waiting ? `You're in line for an ${GOOD_MATCH_THRESHOLD}%+ match` : `Your best match right now is ${pct}% compatible`}
            </H2>
          </View>
        </Row>
      ) : (
        <H2 style={{ fontSize: 21, lineHeight: 27, marginTop: space(3) }}>No agent is available for you yet</H2>
      )}
      <Body style={{ color: colors.inkSoft, marginTop: space(3) }}>
        {!hasAgent
          ? "You're in the queue. We'll notify you the moment a licensed agent who fits you joins."
          : waiting
            ? `The best agent available today is a ${pct}% fit. We'll notify you as soon as an agent who's ${GOOD_MATCH_THRESHOLD}% or better opens up. Or you can match now.`
            : `We aim for ${GOOD_MATCH_THRESHOLD}% or higher. You can match with this licensed NJ agent now, or wait in the queue for a closer fit.`}
      </Body>

      {!!match.fit?.length && (
        <View style={{ marginTop: space(4), gap: 8 }}>
          {match.fit.map((f) => {
            const l = LEVEL[f.level];
            return (
              <Row key={f.label} gap={2}>
                <Ionicons name={l.icon} size={18} color={l.color} />
                <Body style={{ flex: 1 }}>{f.label}</Body>
                <Small style={{ color: l.color, fontFamily: fonts.semibold }}>{l.text}</Small>
              </Row>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: space(5), gap: 10 }}>
        {hasAgent && (
          <Button title={`Match me now (${pct}% fit)`} icon="flash" loading={busy === 'accept'}
            onPress={() => run('accept', () => api.acceptLowFit(match.id))} />
        )}
        {!waiting && hasAgent && (
          <Button title={`Wait for an ${GOOD_MATCH_THRESHOLD}%+ match`} variant="outline" icon="time-outline" loading={busy === 'wait'}
            onPress={() => run('wait', () => api.waitForBetter(match.id))} />
        )}
        {waiting && (
          <Button title="Check again for a better match" variant="outline" icon="refresh" loading={busy === 'recheck'}
            onPress={() => run('recheck', async () => {
              const s = await api.recheckMatch(match.id);
              setNote(s >= GOOD_MATCH_THRESHOLD ? '' : s < 0 ? 'Still no agent available. You stay in line.' : `Best right now is still ${Math.round(s)}%. You stay in line.`);
            })} />
        )}
      </View>
      {!!note && <Small style={{ marginTop: space(3), textAlign: 'center' }}>{note}</Small>}
    </Card>
  );
}

const st = StyleSheet.create({
  ring: { width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: colors.orange, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  pct: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26 },
});
