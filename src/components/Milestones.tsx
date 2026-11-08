import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { timeAgo } from '../lib/hooks';
import { colors, fonts } from '../lib/theme';
import { MILESTONES, type Match } from '../lib/types';
import { Body, Small } from './ui';

export const progressOf = (m: Match) => MILESTONES.filter((x) => m.milestones[x.key]).length;

/** Compact 4-dot progress bar for lists. */
export function MilestoneDots({ match }: { match: Match }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {MILESTONES.map((x) => (
        <View key={x.key} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: match.milestones[x.key] ? colors.orange : colors.line }} />
      ))}
    </View>
  );
}

/** Vertical timeline used on lead / agent detail screens. */
export function MilestoneTimeline({ match }: { match: Match }) {
  return (
    <View>
      {MILESTONES.map((x, i) => {
        const done = match.milestones[x.key];
        const last = i === MILESTONES.length - 1;
        return (
          <View key={x.key} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={[st.dot, done ? st.dotDone : null]}>
                <Ionicons name={done ? 'checkmark' : (x.icon as any)} size={16} color={done ? colors.white : colors.inkSoft} />
              </View>
              {!last && <View style={[st.bar, done ? { backgroundColor: colors.orange } : null]} />}
            </View>
            <View style={{ paddingBottom: last ? 0 : 18, flex: 1, paddingTop: 5 }}>
              <Body style={{ fontFamily: fonts.semibold }}>{x.label}</Body>
              <Small>{done ? `Done ${timeAgo(done)}` : x.by === 'agent' ? 'Logged by the agent' : 'Left by the policyholder'}</Small>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.peach, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.orange, borderColor: colors.orange },
  bar: { width: 2, flex: 1, backgroundColor: colors.line, marginVertical: 2 },
});
