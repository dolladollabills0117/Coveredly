import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, View } from 'react-native';
import { planById } from '../config/plans';
import { usePrefs } from '../lib/prefs';
import { useAuth } from '../lib/auth';
import { api, isDemo } from '../lib/backend';
import { resetDemo } from '../lib/backend/demo';
import { useLive } from '../lib/hooks';
import { colors, fonts, space } from '../lib/theme';
import { Body, Button, Card, Eyebrow, H1, H3, Pill, Row, Screen, Small, Toggle } from './ui';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { dots, setDots } = usePrefs();
  const plan = planById(user?.plan?.id);
  const { data: quiz } = useLive(() => api.getMyQuiz());
  const agent = user?.role === 'agent';
  const entries = quiz ? Object.entries(quiz).filter(([k, v]) =>
    !['fullName', 'userId', 'id', 'email', 'name', 'verified', 'matchedThisMonth', 'monthlyCap', 'licensedStates', 'license', 'phone', 'plan', 'planStatus', 'subscribed'].includes(k) && v && (!Array.isArray(v) || v.length)) : [];
  const label = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

  return (
    <Screen>
      <Eyebrow>{agent ? 'Agent profile' : 'My profile'}</Eyebrow>
      <H1 style={{ marginTop: 4 }}>{user?.fullName}</H1>
      <Small style={{ marginTop: 4 }}>{user?.email}</Small>
      {agent && quiz && (
        <View style={{ marginTop: space(3) }}>
          <Pill tone={(quiz as any).verified ? 'green' : 'orange'} icon={(quiz as any).verified ? 'checkmark-circle' : 'time-outline'}
            label={(quiz as any).verified ? 'NJ license verified' : 'License verification pending'} />
        </View>
      )}
      {agent && plan && (
        <Card style={{ marginTop: space(6), backgroundColor: colors.ink }}>
          <Small style={{ color: '#BDB3A9' }}>Your plan</Small>
          <H3 style={{ color: colors.white, marginTop: 2 }}>{plan.name} · ${plan.price}/month</H3>
          <Small style={{ color: '#E9DFD6', marginTop: 4 }}>Up to {plan.leads} matched leads a month{plan.id === 'founding' ? ' · locked in for life' : ''}. To change or cancel, email hello@getcoveredly.com.</Small>
        </Card>
      )}
      <Card style={{ marginTop: space(4) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <H3>Polka dot background</H3>
            <Small>The classic Coveredly look. Turn off for a plain background.</Small>
          </View>
          <Toggle value={dots} onValueChange={setDots} />
        </Row>
      </Card>
      <Card style={{ marginTop: space(4) }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
          <H3>My quiz answers</H3>
          <Button small variant="ghost" icon="create-outline" title="Retake" onPress={() => router.push(agent ? '/quiz/agent' : '/quiz/policyholder')} />
        </Row>
        {entries.map(([k, v]) => (
          <View key={k} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Small>{label(k)}</Small>
            <Body style={{ fontFamily: fonts.medium }}>{Array.isArray(v) ? v.join(', ') : String(v)}</Body>
          </View>
        ))}
      </Card>
      <Card style={{ marginTop: space(4) }}>
        <Row><Ionicons name="lock-closed-outline" size={20} color={colors.orange} />
          <Small style={{ flex: 1 }}>{agent
            ? 'Your license number is only used to verify you. Your contact info is shared only with policyholders you are matched with.'
            : "Your contact info is shared only with the one agent you're matched with. We don't sell your info, and we don't spam."}</Small></Row>
      </Card>
      <Pressable onPress={() => router.push('/privacy')}>
        <Card style={{ marginTop: space(4) }}>
          <Row><Ionicons name="document-text-outline" size={20} color={colors.orange} /><Body style={{ flex: 1, fontFamily: fonts.semibold }}>Privacy Policy</Body><Ionicons name="chevron-forward" size={18} color={colors.inkSoft} /></Row>
        </Card>
      </Pressable>
      <Button title="Sign out" variant="outline" style={{ marginTop: space(6) }} onPress={async () => { await signOut(); router.replace('/'); }} />
      <Button title="Delete my account" variant="ghost" style={{ marginTop: 8 }} onPress={async () => {
        const really = Platform.OS === 'web'
          ? window.confirm('Delete your account and all your data? This cannot be undone.')
          : await new Promise<boolean>((res) => Alert.alert('Delete account?', 'This permanently deletes your account, matches and messages.', [
              { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
              { text: 'Delete', style: 'destructive', onPress: () => res(true) },
            ]));
        if (!really) return;
        await api.deleteAccount(); await signOut(); router.replace('/');
      }} />
      {isDemo && <Button title="Reset demo data" variant="ghost" style={{ marginTop: 8 }} onPress={async () => { await resetDemo(); await signOut(); router.replace('/'); }} />}
    </Screen>
  );
}
