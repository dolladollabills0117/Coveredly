import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, space } from '../lib/theme';

export const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

export function Screen({ children, scroll = true, style, edges = ['top'] }: {
  children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle>; edges?: ('top' | 'bottom')[];
}) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.peach }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[{ padding: space(5), paddingBottom: space(12) }, style]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding: space(5) }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export const H1 = ({ children, style }: TextProps) => <Text style={[s.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: TextProps) => <Text style={[s.h2, style]}>{children}</Text>;
export const H3 = ({ children, style, numberOfLines }: TextProps) => <Text numberOfLines={numberOfLines} style={[s.h3, style]}>{children}</Text>;
export const Body = ({ children, style, numberOfLines }: TextProps) => <Text numberOfLines={numberOfLines} style={[s.body, style]}>{children}</Text>;
export const Small = ({ children, style, numberOfLines }: TextProps) => <Text numberOfLines={numberOfLines} style={[s.small, style]}>{children}</Text>;
export const Eyebrow = ({ children, style }: TextProps) => <Text style={[s.eyebrow, style]}>{children}</Text>;

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }: {
  title: string; onPress?: () => void; variant?: 'primary' | 'dark' | 'ghost' | 'outline' | 'danger' | 'success';
  icon?: keyof typeof Ionicons.glyphMap; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const bg = { primary: colors.orange, dark: colors.ink, ghost: 'transparent', outline: colors.white, danger: colors.redSoft, success: colors.green }[variant];
  const fg = { primary: colors.white, dark: colors.white, ghost: colors.ink, outline: colors.ink, danger: colors.red, success: colors.white }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [
        s.btn, small && s.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.ink },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 19} color={fg} />}
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [s.card, style, pressed && { transform: [{ scale: 0.985 }], opacity: 0.95 }]}>
      {children}
    </Pressable>
  );
}

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'orange' | 'green' | 'red' | 'dark'; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = {
    neutral: [colors.peach, colors.inkSoft], orange: [colors.orangeSoft, '#B85400'], green: [colors.greenSoft, colors.green],
    red: [colors.redSoft, colors.red], dark: [colors.ink, colors.white],
  }[tone];
  return (
    <View style={[s.pill, { backgroundColor: t[0] }]}>
      {icon && <Ionicons name={icon} size={12} color={t[1]} />}
      <Text style={[s.pillText, { color: t[1] }]}>{label}</Text>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: space(4) }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#A8998B" {...props} style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]} />
    </View>
  );
}

export function Stars({ value, onChange, size = 30 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`} disabled={!onChange} onPress={() => { tap(); onChange?.(n); }} hitSlop={6}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={colors.orange} />
        </Pressable>
      ))}
    </View>
  );
}

export function IconBubble({ name, color = colors.orange, bg = colors.orangeSoft, size = 44 }: {
  name: keyof typeof Ionicons.glyphMap; color?: string; bg?: string; size?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function Row({ children, style, gap = 3 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space(gap) }, style]}>{children}</View>;
}

export function Empty({ icon, title, body, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; children?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: space(10), gap: space(3) }}>
      <IconBubble name={icon} size={60} />
      <H3 style={{ textAlign: 'center' }}>{title}</H3>
      <Body style={{ textAlign: 'center', color: colors.inkSoft }}>{body}</Body>
      {children}
    </Card>
  );
}

export const Divider = () => <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space(4) }} />;

const s = StyleSheet.create({
  h1: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ink, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, color: colors.ink },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.orange },
  btn: { height: 54, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space(6) },
  btnSmall: { height: 40, paddingHorizontal: space(4) },
  btnText: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.1 },
  card: { backgroundColor: colors.cream, borderRadius: radius.lg, padding: space(5), ...shadow },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.semibold, fontSize: 12 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft, marginBottom: 6 },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: space(4),
    paddingVertical: 14, fontFamily: fonts.body, fontSize: 16, color: colors.ink,
  },
});
