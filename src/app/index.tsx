import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { PolkaDots } from '../components/PolkaDots';
import { Body, H1, H3, Small, tap } from '../components/ui';
import { homeFor, useAuth } from '../lib/auth';
import { isDemo } from '../lib/backend';
import { colors, fonts, radius, shadow, space } from '../lib/theme';

export default function Welcome() {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (user) return <Redirect href={homeFor(user)} />;


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.peach }}>
      <PolkaDots />
      <View style={{ flex: 1, padding: space(6), justifyContent: 'space-between' }}>
        <Logo />
        <View>
          <H1 style={{ fontSize: 48, lineHeight: 54 }}>
            Insurance.{'\n'}Made <H1 style={{ fontSize: 48, lineHeight: 54, color: colors.orange, fontFamily: fonts.displayItalic }}>Human.</H1>
          </H1>
          <Body style={{ marginTop: space(4), color: colors.inkSoft, fontSize: 17, lineHeight: 26 }}>
            One licensed New Jersey agent who fits how you like to talk, the coverage you need, and where you live. No spam, ever.
          </Body>
        </View>
        <View style={{ gap: space(3) }}>
          <Path role="policyholder" icon="shield-checkmark-outline" title="I'm looking for coverage" body="Take the 2-minute quiz and meet your agent" />
          <Path role="agent" icon="briefcase-outline" title="I'm a licensed agent" body="Get matched leads that fit how you sell" />
          <Pressable onPress={() => router.push('/privacy')} style={{ alignItems: 'center' }}><Small style={{ textDecorationLine: 'underline' }}>Privacy Policy</Small></Pressable>
          {isDemo && <Small style={{ textAlign: 'center', marginTop: 4 }}>Demo mode · try agent@demo.com, policyholder@demo.com or admin@getcoveredly.com</Small>}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Path({ role, icon, title, body }: { role: 'policyholder' | 'agent'; icon: any; title: string; body: string }) {
  return (
    <Pressable onPress={() => { tap(); router.push({ pathname: '/auth', params: { role } }); }}
      style={({ pressed }) => [st.path, role === 'agent' && st.pathDark, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[st.icon, role === 'agent' && { backgroundColor: '#2A2A2A' }]}>
        <Ionicons name={icon} size={24} color={colors.orange} />
      </View>
      <View style={{ flex: 1 }}>
        <H3 style={role === 'agent' ? { color: colors.white } : undefined}>{title}</H3>
        <Small style={role === 'agent' ? { color: '#BDB3A9' } : undefined}>{body}</Small>
      </View>
      <Ionicons name="arrow-forward" size={20} color={role === 'agent' ? colors.white : colors.ink} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  path: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.cream, borderRadius: radius.lg, padding: 18, ...shadow },
  pathDark: { backgroundColor: colors.ink },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
});
