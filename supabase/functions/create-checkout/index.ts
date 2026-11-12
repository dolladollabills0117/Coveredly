// Edge Function: creates a Stripe Checkout session (monthly subscription) for the signed-in agent.
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_RAPPORT, STRIPE_PRICE_DIALOGUE, STRIPE_PRICE_FLUENCY, STRIPE_PRICE_FOUNDING,
//          CHECKOUT_RETURN_URL (e.g. https://getcoveredly.com/agents/welcome)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AGENT_TERMS_VERSION } from '../_shared/standing.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const PRICES: Record<string, string | undefined> = {
  rapport: Deno.env.get('STRIPE_PRICE_RAPPORT'),
  dialogue: Deno.env.get('STRIPE_PRICE_DIALOGUE'),
  fluency: Deno.env.get('STRIPE_PRICE_FLUENCY'),
  founding: Deno.env.get('STRIPE_PRICE_FOUNDING'),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Not signed in' }, 401);

  const { plan } = await req.json();
  const price = PRICES[plan];
  if (!price) return json({ error: 'Unknown plan' }, 400);
  if (plan === 'founding') {
    const { data: f } = await admin.from('founding_requests').select('status').eq('agent_id', user.id).maybeSingle();
    if (f?.status !== 'redeemed') return json({ error: 'Validate your founding agent code first.' }, 403);
  }
  const { data: agent } = await admin.from('agents').select('stripe_customer_id, removed_at, terms_version').eq('user_id', user.id).single();
  if (!agent) return json({ error: 'Finish the agent quiz first.' }, 400);
  if (agent.removed_at) return json({ error: 'This account has been removed from Coveredly.' }, 403);
  if (agent.terms_version !== AGENT_TERMS_VERSION) return json({ error: 'Please agree to the Agent Terms first.' }, 403);

  const back = Deno.env.get('CHECKOUT_RETURN_URL') ?? 'https://getcoveredly.com';
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[agent_id]': user.id,
    'metadata[plan]': plan,
    'subscription_data[metadata][agent_id]': user.id,
    'subscription_data[metadata][plan]': plan,
    success_url: `${back}?checkout=success`,
    cancel_url: `${back}?checkout=canceled`,
  });
  if (agent.stripe_customer_id) form.set('customer', agent.stripe_customer_id);
  else form.set('customer_email', user.email!);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const session = await res.json();
  if (!res.ok) return json({ error: session.error?.message ?? 'Stripe error' }, 500);
  await admin.from('agents').update({ plan, plan_status: 'pending' }).eq('user_id', user.id);
  return json({ url: session.url });
});

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
