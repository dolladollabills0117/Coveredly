import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Logo } from '../components/Logo';
import { Body, Button, Eyebrow, Field, H1, Screen, Small } from '../components/ui';
import { homeFor, useAuth } from '../lib/auth';
import { isDemo } from '../lib/backend';
import { colors, space } from '../lib/theme';
import type { Role } from '../lib/types';

export default function Auth() {
  const { role = 'policyholder' } = useLocalSearchParams<{ role: Role }>();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(isDemo ? 'signin' : 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(isDemo ? (role === 'agent' ? 'agent@demo.com' : 'policyholder@demo.com') : '');
  const [password, setPassword] = useState(isDemo ? 'demo' : '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const agent = role === 'agent';

  const go = async () => {
    setErr(''); setBusy(true);
    try {
      const u = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, role, name);
      // An agent who signs in on the policyholder path (or vice versa) still lands on their own side.
      router.replace(homeFor(u));
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: space(6) }}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Logo size={22} />
        <Eyebrow style={{ marginTop: space(8) }}>{agent ? 'For licensed agents' : 'For policyholders'}</Eyebrow>
        <H1 style={{ marginTop: 6 }}>{mode === 'signup' ? (agent ? 'Join the founding agents' : 'Find your agent match') : 'Welcome back'}</H1>
        <Body style={{ color: colors.inkSoft, marginTop: 8, marginBottom: space(6) }}>
          {mode === 'signup'
            ? agent ? 'Create your account, then take the 3-minute agent quiz so we can send you leads that fit.' : 'Create your account, then answer a few quick questions. We do the matching.'
            : 'Sign in to pick up where you left off.'}
        </Body>
        {mode === 'signup' && <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete="password" />
        {!!err && <Small style={{ color: colors.red, marginBottom: space(3) }}>{err}</Small>}
        <Button title={mode === 'signup' ? 'Create account' : 'Sign in'} onPress={go} loading={busy}
          disabled={!email || !password || (mode === 'signup' && !name)} variant={agent ? 'dark' : 'primary'} />
        <View style={{ alignItems: 'center', marginTop: space(5) }}>
          <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(''); }}>
            <Body style={{ color: colors.inkSoft }}>
              {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
              <Body style={{ color: colors.orange, fontWeight: '600' }}>{mode === 'signin' ? 'Create account' : 'Sign in'}</Body>
            </Body>
          </Pressable>
        </View>
        <Small style={{ textAlign: 'center', marginTop: space(8) }}>
          {agent
            ? 'Your license number is only used to verify you and is never shared.'
            : 'Your contact info is shared only with the one agent you are matched with, and only once you are matched.'}
        </Small>
        <Pressable onPress={() => router.push('/privacy')} style={{ alignItems: 'center', marginTop: space(3) }}>
          <Small style={{ textDecorationLine: 'underline' }}>By continuing you agree to our Privacy Policy</Small>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
