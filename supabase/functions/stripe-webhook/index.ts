// Edge Function: Stripe → Supabase. Activates, updates or cancels an agent's plan.
// In Stripe Dashboard → Developers → Webhooks, point to this function's URL and send:
//   checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. Deploy with --no-verify-jwt.
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const LEADS: Record<string, number> = { rapport: 6, dialogue: 12, fluency: 24, founding: 6 };
const NAMES: Record<string, string> = { rapport: 'Rapport', dialogue: 'Dialogue', fluency: 'Fluency', founding: 'Founding Agent' };

Deno.serve(async (req) => {
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature')!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch (e) {
    return new Response(`Bad signature: ${(e as Error).message}`, { status: 400 });
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const agentId = s.metadata?.agent_id, plan = s.metadata?.plan;
    if (agentId && plan) {
      await db.from('agents').update({
        plan, plan_status: 'active', monthly_cap: LEADS[plan], stripe_customer_id: s.customer as string, stripe_subscription_id: s.subscription as string,
      }).eq('user_id', agentId);
      const { data: p } = await db.from('profiles').select('full_name').eq('id', agentId).single();
      await db.from('activity').insert({ type: 'match_approved', actor_name: p?.full_name ?? 'Agent', text: `${p?.full_name} started the ${NAMES[plan]} plan` });
      await db.from('notifications').insert({ user_id: agentId, kind: 'milestone', title: "You're all set 🎉", body: `Your ${NAMES[plan]} plan is active. Matched leads are on the way.` });
    }
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const status = event.type === 'customer.subscription.deleted' ? 'canceled'
      : sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status === 'past_due' || sub.status === 'unpaid' ? 'past_due' : 'canceled';
    await db.from('agents').update({ plan_status: status }).eq('stripe_subscription_id', sub.id);
  }
  return new Response('ok');
});
