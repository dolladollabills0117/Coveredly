import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Card, Checkbox, Eyebrow, H1, H3, Screen, Small } from '../components/ui';
import { AGENT_TERMS_SECTIONS, AGENT_TERMS_UPDATED, AGENT_TERMS_VERSION } from '../config/agentTerms';
import { homeFor, useAuth } from '../lib/auth';
import { api } from '../lib/backend';
import { colors, space } from '../lib/theme';

/**
 * Agent Terms of Service. Opened with ?accept=1 when a signed-in agent still needs to agree
 * to the current version (for example after the terms change).
 */
export default function Terms() {
  const { accept } = useLocalSearchParams<{ accept?: string }>();
  const { user, refresh } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const needsAgreement = accept === '1' && user?.role === 'agent' && user.termsVersion !== AGENT_TERMS_VERSION;

  return (
    <View style={{ flex: 1, backgroundColor: colors.peach }}>
      <Screen>
        {!needsAgreement && (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
        )}
        <Eyebrow style={{ marginTop: space(5) }}>For agents</Eyebrow>
        <H1 style={{ marginTop: 4 }}>Agent Terms of Service</H1>
        <Small style={{ marginTop: 6 }}>Last updated {AGENT_TERMS_UPDATED}</Small>
        {needsAgreement && (
          <Card style={{ marginTop: space(4), backgroundColor: colors.orangeSoft, shadowOpacity: 0 }}>
            <Body>We've updated our Agent Terms. Please review and agree to keep receiving matched leads.</Body>
          </Card>
        )}
        <Card style={{ marginTop: space(5) }}>
          {AGENT_TERMS_SECTIONS.map((sec, i) => (
            <View key={sec.title} style={{ paddingTop: i ? space(5) : 0, marginTop: i ? space(5) : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <H3 style={{ marginBottom: 8 }}>{sec.title}</H3>
              {sec.body.map((p) => <Body key={p.slice(0, 40)} style={{ fontSize: 14.5, lineHeight: 22, marginBottom: 10 }}>{p}</Body>)}
            </View>
          ))}
        </Card>
        <Pressable onPress={() => router.push('/standards')} style={{ marginTop: space(5), alignItems: 'center' }}>
          <Small style={{ textDecorationLine: 'underline' }}>Agent Standards</Small>
        </Pressable>
        <Pressable onPress={() => router.push('/privacy')} style={{ marginTop: space(3), alignItems: 'center' }}>
          <Small style={{ textDecorationLine: 'underline' }}>Privacy Policy</Small>
        </Pressable>
        {needsAgreement && <View style={{ height: 150 }} />}
      </Screen>

      {needsAgreement && (
        <SafeAreaView edges={['bottom']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space(5), paddingTop: space(3), backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Checkbox checked={agreed} onChange={setAgreed}
            label="I have read and agree to the Agent Terms of Service, Agent Standards and Privacy Policy." />
          {!!err && <Small style={{ color: colors.red, marginTop: 6 }}>{err}</Small>}
          <Button title="Agree and continue" style={{ marginTop: space(3) }} disabled={!agreed} loading={busy} onPress={async () => {
            setBusy(true); setErr('');
            try {
              await api.acceptAgentTerms(AGENT_TERMS_VERSION);
              await refresh();
              router.replace(homeFor({ ...user!, termsVersion: AGENT_TERMS_VERSION }));
            } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
          }} />
        </SafeAreaView>
      )}
    </View>
  );
}
