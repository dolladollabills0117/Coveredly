// Edge Function: runs the Coveredly formula.
//   { action: 'request' }                 policyholder asks for a match (default)
//   { action: 'recheck', matchId }        re-run for a low_fit / waiting match ("Check again")
//   { action: 'accept', matchId }         policyholder chooses to match with the best available agent
//   { action: 'rank', policyholderId }    admin: ranked list of every agent
//   { action: 'recheckQueue' }            admin / service: re-check everyone waiting in the queue
// 80%+ goes to admin approval. Below that, the policyholder decides (match anyway or wait).
// Deploy: supabase functions deploy match-policyholder
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { fitSummary, GOOD_MATCH_THRESHOLD, rankAgents, type AgentProfile } from '../_shared/matching.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const AUTO_APPROVE = Deno.env.get('AUTO_APPROVE_MATCHES') === 'true';
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function rankFor(db: SupabaseClient, policyholderId: string) {
  const { data: ph } = await db.from('policyholders').select('*').eq('user_id', policyholderId).single();
  if (!ph) return null;
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: agents }, { data: counts }, { data: names }] = await Promise.all([
    db.from('agents').select('*'),
    db.from('matches').select('agent_id').in('status', ['active', 'established', 'reported']).gte('approved_at', monthStart.toISOString()),
    db.from('profiles').select('id, full_name').in('role', ['agent', 'policyholder']),
  ]);
  const nameById = new Map((names ?? []).map((n: any) => [n.id, n.full_name]));
  const profiles: AgentProfile[] = (agents ?? []).map((a: any) => ({
    id: a.user_id, name: nameById.get(a.user_id) ?? '', verified: a.verified, subscribed: a.plan_status === 'active',
    licensedStates: a.licensed_states, counties: a.counties, contactMethod: a.contact_method, languages: a.languages, explains: a.explains,
    advises: a.advises, speed: a.speed, bestLeadType: a.best_lead_type, lines: a.lines, monthlyCap: a.monthly_cap,
    matchedThisMonth: (counts ?? []).filter((c: any) => c.agent_id === a.user_id).length,
  }));
  const quiz = {
    state: ph.state, county: ph.county, coverage: ph.coverage, language: ph.language, contactMethod: ph.contact_method,
    explainStyle: ph.explain_style, decisionStyle: ph.decision_style, timing: ph.timing, mattersMost: ph.matters_most,
  };
  const ranked = rankAgents(quiz, profiles).map((r) => ({ ...r, name: nameById.get(r.agentId) ?? '' }));
  const top = ranked[0]?.score >= 0 ? ranked[0] : null;
  return { ranked, top, fit: top ? fitSummary(top, quiz) : null, phName: nameById.get(policyholderId) ?? 'A policyholder' };
}

const log = (db: SupabaseClient, matchId: string, actor: string, text: string) =>
  db.from('activity').insert({ type: 'match_suggested', match_id: matchId, actor_name: actor, text });

/** Re-run one queued match; move it to approval if it now clears the threshold. */
async function recheck(db: SupabaseClient, m: any) {
  const r = await rankFor(db, m.policyholder_id);
  if (!r) return -1;
  const good = !!r.top && r.top.score >= GOOD_MATCH_THRESHOLD;
  await db.from('matches').update({
    agent_id: r.top?.agentId ?? null, score: r.top?.score ?? -1, fit: r.fit, ...(good ? { status: 'pending_approval' } : {}),
  }).eq('id', m.id);
  if (good && m.status !== 'pending_approval') {
    await db.from('notifications').insert({ user_id: m.policyholder_id, kind: 'matched', match_id: m.id,
      title: 'A great match just opened up 🧡', body: `We found a ${r.top!.score}% match. Our team is confirming it now.` });
    await log(db, m.id, 'System', `${r.phName} moved out of the queue: ${r.top!.name} is a ${r.top!.score}% match. Waiting for your approval.`);
  }
  return r.top?.score ?? -1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, serviceKey);
  const auth = req.headers.get('Authorization') ?? '';
  const body = await req.json().catch(() => ({}));
  const action: string = body.action ?? (body.rankOnly ? 'rank' : 'request');

  // The Stripe webhook calls recheckQueue with the service key.
  const isService = auth === `Bearer ${serviceKey}`;
  let userId: string | null = null, role: string | null = null;
  if (!isService) {
    const { data: { user } } = await createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } }).auth.getUser();
    if (!user) return json({ error: 'Not signed in' }, 401);
    userId = user.id;
    role = (await db.from('profiles').select('role').eq('id', user.id).single()).data?.role ?? null;
  }
  const isAdmin = isService || role === 'admin';

  if (action === 'rank') {
    if (!isAdmin) return json({ error: 'Admins only' }, 403);
    return json({ ranked: (await rankFor(db, body.policyholderId))?.ranked ?? [] });
  }

  if (action === 'recheckQueue') {
    if (!isAdmin) return json({ error: 'Admins only' }, 403);
    const { data: queue } = await db.from('matches').select('*').eq('status', 'waiting');
    for (const m of queue ?? []) await recheck(db, m);
    return json({ checked: queue?.length ?? 0 });
  }

  if (action === 'recheck' || action === 'accept') {
    const { data: m } = await db.from('matches').select('*').eq('id', body.matchId).eq('policyholder_id', userId).in('status', ['low_fit', 'waiting']).maybeSingle();
    if (!m) return json({ error: 'Nothing to re-check' }, 404);
    const score = await recheck(db, m);
    if (action === 'accept') {
      const { data: fresh } = await db.from('matches').select('status, agent_id, score').eq('id', m.id).single();
      if (fresh?.status !== 'pending_approval' && fresh?.agent_id) {
        await db.from('matches').update({ status: 'pending_approval' }).eq('id', m.id);
        const { data: p } = await db.from('profiles').select('full_name').eq('id', userId).single();
        await log(db, m.id, p?.full_name ?? 'Policyholder', `${p?.full_name} chose to match now with the best available agent (${fresh.score}%). Waiting for your approval.`);
      }
    }
    return json({ score });
  }

  // action === 'request'
  const policyholderId = userId!;
  const { data: open } = await db.from('matches').select('id').eq('policyholder_id', policyholderId)
    .in('status', ['low_fit', 'waiting', 'pending_approval', 'active', 'established']).limit(1);
  if (open?.length) return json({ matchId: open[0].id, existing: true });

  const r = await rankFor(db, policyholderId);
  if (!r) return json({ error: 'Quiz not completed' }, 400);
  const good = !!r.top && r.top.score >= GOOD_MATCH_THRESHOLD;
  const status = good ? (AUTO_APPROVE ? 'active' : 'pending_approval') : r.top ? 'low_fit' : 'waiting';
  const { data: match, error } = await db.from('matches').insert({
    policyholder_id: policyholderId, agent_id: r.top?.agentId ?? null, score: r.top?.score ?? -1, fit: r.fit, status,
    approved_at: status === 'active' ? new Date().toISOString() : null,
  }).select().single();
  if (error) return json({ error: error.message }, 500);
  await log(db, match.id, 'System', good
    ? `${r.phName} → suggested ${r.top!.name} (score ${r.top!.score}). Waiting for your approval.`
    : r.top ? `${r.phName}'s best match is ${r.top.score}% (${r.top.name}), under ${GOOD_MATCH_THRESHOLD}%. They're choosing: match anyway or wait.`
    : `${r.phName} has no eligible agent yet and is waiting in the queue.`);
  return json({ matchId: match.id, status, score: r.top?.score ?? -1 });
});
