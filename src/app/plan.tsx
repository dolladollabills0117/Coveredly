import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Field, H1, H2, H3, Pill, Row, Screen, Small, tap } from '../components/ui';
import { FOUNDING_PLAN, PLANS, type Plan, type PlanId } from '../config/plans';
import { useAuth } from '../lib/auth';
import { api, isDemo } from '../lib/backend';
import { useLive } from '../lib/hooks';
import { colors, fonts, radius, space } from '../lib/theme';

/** Shown to agents right after the quiz (and any time they have no active plan). */
export default function ChoosePlan() {
  const { user, refresh, signOut } = useAuth();
  const { data: founding, reload } = useLive(() => api.getMyFoundingRequest(), [user?.id]);
  const [picked, setPicked] = useState<PlanId | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  // While Stripe checkout is open, watch for the webhook to activate the plan.
  useEffect(() => api.subscribe(() => { refresh(); }), [refresh]);

  if (!user) return null;
  if (user.role !== 'agent') return <Redirect href="/" />;
  if (user.plan?.status === 'active') return <Redirect href="/agent" />;

  // Default to the founding plan once the code is validated, otherwise Dialogue.
  const selected: PlanId = picked ?? (founding?.status === 'redeemed' ? 'founding' : 'dialogue');
  const plan = [...PLANS, FOUNDING_PLAN].find((p) => p.id === selected)!;
  const run = async (key: string, fn: () => Promise<void>) => {
    setErr(''); setBusy(key);
    try { await fn(); } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };

  const pay = () => run('pay', async () => {
    const r = await api.startCheckout(selected);
    if (r.url) {
      setWaiting(true);
      await WebBrowser.openBrowserAsync(r.url);
      await refresh();
    } else {
      await refresh();
      router.replace('/agent');
    }
  });


  if (waiting) {
    return (
      <Screen>
        <Eyebrow style={{ marginTop: space(10) }}>Almost there</Eyebrow>
        <H1 style={{ marginTop: 6 }}>Finishing your payment…</H1>
        <Body style={{ color: colors.inkSoft, marginTop: 8 }}>
          Complete checkout in the browser window. This screen updates by itself as soon as your payment goes through.
        </Body>
        <Button title="I've finished paying" style={{ marginTop: space(6) }} onPress={async () => { await refresh(); }} />
        <Button title="Choose a different plan" variant="ghost" style={{ marginTop: 8 }} onPress={() => setWaiting(false)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Eyebrow>Last step</Eyebrow>
      <H1 style={{ marginTop: 6 }}>Choose your plan</H1>
      <Body style={{ color: colors.inkSoft, marginTop: 8, marginBottom: space(6) }}>
        Every lead is a real New Jersey resident matched to how you work. You only get matched once your plan is active.
      </Body>

      <View style={{ gap: space(3) }}>
        {founding?.status === 'redeemed' && <PlanCard p={FOUNDING_PLAN} on={selected === 'founding'} onPick={setPicked} />}
        {PLANS.map((p) => <PlanCard key={p.id} p={p} on={selected === p.id} onPick={setPicked} />)}
      </View>

      {!!err && <Small style={{ color: colors.red, marginTop: space(4) }}>{err}</Small>}
      <Button title={`Continue · $${plan.price}/month`} icon="lock-closed" style={{ marginTop: space(5) }} loading={busy === 'pay'} onPress={pay} />
      <Small style={{ textAlign: 'center', marginTop: 8 }}>
        {isDemo ? 'Demo mode: no card is charged.' : 'Secure checkout by Stripe.'} Billed monthly. Cancel anytime.
      </Small>

      {/* Founding agents */}
      <Card style={{ marginTop: space(8), backgroundColor: colors.ink }}>
        <Row>
          <Ionicons name="ribbon" size={26} color={colors.orange} />
          <H2 style={{ color: colors.white, fontSize: 22, flex: 1 }}>Founding agent?</H2>
        </Row>
        {founding?.status === 'redeemed' ? (
          <Body style={{ color: '#E9DFD6', marginTop: 8 }}>Code validated ✓ Your $39/month founding plan is selected above. Locked in for life.</Body>
        ) : !founding ? (
          <>
            <Body style={{ color: '#E9DFD6', marginTop: 8, marginBottom: space(4) }}>
              If you joined our founding list, tap below. We'll confirm and send you a code that locks in $39/month for 6 leads, for life.
            </Body>
            <Button title="I am a founding agent" variant="primary" loading={busy === 'req'} onPress={() => run('req', async () => { await api.requestFounding(); reload(); })} />
          </>
        ) : (
          <>
            <Body style={{ color: '#E9DFD6', marginTop: 8, marginBottom: space(4) }}>
              {founding.status === 'requested'
                ? "Request received! We're confirming you're on the founding list. You'll get a notification with your code."
                : "You're approved! Enter the code we sent you."}
            </Body>
            <Field label="Founding agent code" labelColor="#CFC4B9" placeholder="CF-XXXXXX" autoCapitalize="characters" value={code} onChangeText={setCode}
              style={{ backgroundColor: '#242424', color: colors.white, borderColor: '#3A3A3A' }} />
            <Button title="Validate code" variant="primary" disabled={!code.trim()} loading={busy === 'code'}
              onPress={() => run('code', async () => { await api.redeemFoundingCode(code); reload(); })} />
          </>
        )}
      </Card>

      <Pressable onPress={() => router.push('/privacy')} style={{ marginTop: space(6), alignItems: 'center' }}>
        <Small style={{ textDecorationLine: 'underline' }}>Privacy Policy</Small>
      </Pressable>
      <Pressable onPress={async () => { await signOut(); router.replace('/'); }} style={{ marginTop: space(3), alignItems: 'center' }}>
        <Small>Sign out</Small>
      </Pressable>
    </Screen>
  );
}

function PlanCard({ p, on, onPick }: { p: Plan; on: boolean; onPick: (id: PlanId) => void }) {
  return (
    <Pressable onPress={() => { tap(); onPick(p.id); }} style={[st.plan, on && st.planOn, p.id === 'founding' && { borderColor: on ? colors.orange : colors.ink }]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={2}>
          <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.orange : colors.inkSoft} />
          <H3>{p.name}</H3>
        </Row>
        {p.badge && <Pill label={p.badge} tone={p.id === 'founding' ? 'dark' : 'orange'} />}
      </Row>
      <Row style={{ alignItems: 'flex-end', marginTop: space(3) }} gap={1}>
        <H1 style={{ fontSize: 38, lineHeight: 42 }}>${p.price}</H1>
        <Small style={{ marginBottom: 6 }}>/month</Small>
      </Row>
      <Body style={{ fontFamily: fonts.semibold, marginTop: 2 }}>Up to {p.leads} matched leads a month</Body>
      <Small style={{ marginTop: 4 }}>{p.blurb}</Small>
      <Small style={{ marginTop: 6, color: colors.orange }}>≈ ${Math.round(p.price / p.leads)} per lead{p.id === 'founding' ? ' · locked in for life' : ''}</Small>
    </Pressable>
  );
}

const st = StyleSheet.create({
  plan: { backgroundColor: colors.cream, borderRadius: radius.lg, padding: space(5), borderWidth: 2, borderColor: 'transparent' },
  planOn: { borderColor: colors.orange, backgroundColor: colors.white },
});
