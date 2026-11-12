// Edge Function: admin removes an agent after their 30-day notice has run out.
// Cancels the agent's Stripe subscription (no further charges), marks them removed and notifies them.
// Deploy: supabase functions deploy remove-agent   Secrets: STRIPE_SECRET_KEY
import { createClient } from 'npm:@supabase/supabase-js@2';
import { STANDARDS } from '../_shared/standing.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: 'Not signed in' }, 401);
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return json({ error: 'Admins only' }, 403);

  const { agentId } = await req.json();
  const { data: agent } = await db.from('agents').select('warning_at, removed_at, stripe_subscription_id').eq('user_id', agentId).single();
  if (!agent) return json({ error: 'Agent not found' }, 404);
  if (agent.removed_at) return json({ ok: true, alreadyRemoved: true });
  const noticeEnds = agent.warning_at ? new Date(agent.warning_at).getTime() + STANDARDS.warningDays * 86400_000 : Infinity;
  if (Date.now() < noticeEnds)
    return json({ error: `An agent can be removed only after their ${STANDARDS.warningDays}-day notice has run out.` }, 400);

  if (agent.stripe_subscription_id) {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${agent.stripe_subscription_id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` },
    });
    if (!res.ok && res.status !== 404) return json({ error: `Stripe could not cancel the subscription (${res.status}). Nothing was changed.` }, 502);
  }
  await db.from('agents').update({ removed_at: new Date().toISOString(), plan_status: 'canceled' }).eq('user_id', agentId);
  const { data: p } = await db.from('profiles').select('full_name').eq('id', agentId).single();
  await db.from('notifications').insert({ user_id: agentId, kind: 'milestone', title: 'Your Coveredly membership has ended',
    body: 'Your subscription has been canceled and you will not be charged again.' });
  await db.from('activity').insert({ type: 'reported', actor_name: 'Admin', text: `You removed ${p?.full_name ?? 'an agent'} from Coveredly` });
  return json({ ok: true });
});
