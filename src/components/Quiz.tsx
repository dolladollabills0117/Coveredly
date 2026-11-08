import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, space } from '../lib/theme';
import { Body, Button, Eyebrow, Field, H1, Small, tap } from './ui';

export type Question =
  | { id: string; type: 'single' | 'multi'; title: string; hint?: string; options: string[]; otherLabel?: string; optional?: boolean }
  | { id: string; type: 'text'; title: string; hint?: string; fields: { id: string; label: string; placeholder?: string; optional?: boolean; keyboard?: 'phone-pad' | 'number-pad' | 'default' }[] };

export type Answers = Record<string, string | string[]>;

export function Quiz({ eyebrow, questions, onDone, gate }: {
  eyebrow: string;
  questions: Question[];
  onDone: (a: Answers) => Promise<void>;
  /** Return a message to stop the quiz on this step (e.g. "not in your state yet"). */
  gate?: (qid: string, a: Answers) => { title: string; body: string } | null;
}) {
  const [i, setI] = useState(0);
  const [a, setA] = useState<Answers>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState<{ title: string; body: string } | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const q = questions[i];

  const valueOf = (qq: Question): string | string[] | undefined => a[qq.id];
  const valid = (() => {
    if (q.type === 'text') return q.fields.every((f) => f.optional || String(a[f.id] ?? '').trim().length > 0);
    const v = valueOf(q);
    if (q.optional) return true;
    if (q.type === 'multi') return Array.isArray(v) && v.length > 0 && (!v.includes(q.otherLabel ?? '§') || !!other[q.id]?.trim());
    return !!v && (v !== q.otherLabel || !!other[q.id]?.trim());
  })();

  const animateTo = (n: number) => {
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setI(n);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const finalAnswers = (): Answers => {
    const out: Answers = { ...a };
    questions.forEach((qq) => {
      if (qq.type === 'text' || !qq.otherLabel) return;
      const typed = other[qq.id]?.trim();
      const v = out[qq.id];
      if (Array.isArray(v)) out[qq.id] = v.map((x) => (x === qq.otherLabel ? typed ?? '' : x)).filter(Boolean);
      else if (v === qq.otherLabel) out[qq.id] = typed ?? '';
    });
    return out;
  };

  const next = async () => {
    const g = gate?.(q.id, a);
    if (g) return setStopped(g);
    if (i < questions.length - 1) return animateTo(i + 1);
    setBusy(true);
    try { await onDone(finalAnswers()); } finally { setBusy(false); }
  };

  const pick = (opt: string) => {
    tap();
    if (q.type === 'multi') {
      const cur = (a[q.id] as string[]) ?? [];
      setA({ ...a, [q.id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] });
    } else {
      setA({ ...a, [q.id]: opt });
    }
  };

  if (stopped) {
    return (
      <SafeAreaView style={st.wrap}>
        <View style={{ flex: 1, justifyContent: 'center', padding: space(6), gap: space(4) }}>
          <H1>{stopped.title}</H1>
          <Body style={{ color: colors.inkSoft }}>{stopped.body}</Body>
          <Button title="Go back" variant="outline" onPress={() => setStopped(null)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.wrap}>
      <View style={st.top}>
        <Pressable onPress={() => i > 0 && animateTo(i - 1)} hitSlop={12} style={{ opacity: i > 0 ? 1 : 0 }}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <View style={st.track}><View style={[st.fill, { width: `${((i + 1) / questions.length) * 100}%` }]} /></View>
        <Small>{i + 1}/{questions.length}</Small>
      </View>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView contentContainerStyle={{ padding: space(6), paddingTop: space(4) }} keyboardShouldPersistTaps="handled">
          <Eyebrow>{eyebrow}</Eyebrow>
          <H1 style={{ marginTop: 8, marginBottom: q.hint ? 8 : 24 }}>{q.title}</H1>
          {q.hint && <Body style={{ color: colors.inkSoft, marginBottom: 24 }}>{q.hint}</Body>}

          {q.type === 'text' ? q.fields.map((f) => (
            <Field key={f.id} label={f.label + (f.optional ? ' (optional)' : '')} placeholder={f.placeholder} keyboardType={f.keyboard}
              value={String(a[f.id] ?? '')} onChangeText={(t) => setA({ ...a, [f.id]: t })} />
          )) : (
            <View style={{ gap: 10 }}>
              {q.options.map((opt, idx) => {
                const v = a[q.id];
                const on = Array.isArray(v) ? v.includes(opt) : v === opt;
                return (
                  <Pressable key={opt} onPress={() => pick(opt)} style={[st.opt, on && st.optOn]}>
                    <View style={[st.badge, on && st.badgeOn]}>
                      {q.type === 'multi'
                        ? <Ionicons name={on ? 'checkmark' : 'add'} size={16} color={on ? colors.white : colors.inkSoft} />
                        : <Body style={[st.badgeText, on && { color: colors.white }]}>{String.fromCharCode(65 + idx)}</Body>}
                    </View>
                    <Body style={{ flex: 1, fontFamily: on ? fonts.semibold : fonts.medium }}>{opt}</Body>
                  </Pressable>
                );
              })}
              {q.otherLabel && (Array.isArray(a[q.id]) ? (a[q.id] as string[]).includes(q.otherLabel) : a[q.id] === q.otherLabel) && (
                <TextInput autoFocus placeholder="Type it in" placeholderTextColor="#A8998B" style={st.otherInput}
                  value={other[q.id] ?? ''} onChangeText={(t) => setOther({ ...other, [q.id]: t })} />
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
      <View style={{ padding: space(6), paddingTop: 0 }}>
        <Button title={i === questions.length - 1 ? 'Finish' : 'Next'} icon={i === questions.length - 1 ? 'sparkles' : 'arrow-forward'}
          disabled={!valid} loading={busy} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.peach },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space(5), paddingTop: space(2) },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.peachDeep, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.orange, borderRadius: 3 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.md, padding: 16, borderWidth: 1.5, borderColor: 'transparent' },
  optOn: { borderColor: colors.orange, backgroundColor: colors.cream },
  badge: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: colors.orange },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft },
  otherInput: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.orange, padding: 16, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
});
