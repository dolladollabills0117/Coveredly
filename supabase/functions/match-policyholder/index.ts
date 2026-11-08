// Edge Function: runs the Coveredly formula for the signed-in policyholder and
// creates a match waiting for admin approval. Also returns the ranked list to admins.
// Deploy: supabase functions deploy match-policyholder
import { createClient } from 'npm:@supabase/supabase-js@2';
import { rankAgents, type AgentProfile } from '../_shared/matching.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const AUTO_APPROVE = Deno.env.get('AUTO_APPROVE_MATCHES') === 'true';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Not signed in' }, 401);
  const body = await req.json().catch(() => ({}));
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single();

  // Admin may ask for the ranking of any policyholder; everyone else only themselves.
  const policyholderId: string = me?.role === 'admin' && body.policyholderId ? body.policyholderId : user.id;
  const rankOnly = me?.role === 'admin' && body.rankOnly;

  const { data: ph } = await admin.from('policyholders').select('*').eq('user_id', policyholderId).single();
  if (!ph) return json({ error: 'Quiz not completed' }, 400);

  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: agents }, { data: counts }, { data: names }] = await Promise.all([
    admin.from('agents').select('*'),
    admin.from('matches').select('agent_id').in('status', ['active', 'established', 'reported']).gte('approved_at', monthStart.toISOString()),
    admin.from('profiles').select('id, full_name').eq('role', 'agent'),
  ]);
  const nameById = new Map((names ?? []).map((n) => [n.id, n.full_name]));
  const profiles: AgentProfile[] = (agents ?? []).map((a) => ({
    id: a.user_id, name: nameById.get(a.user_id) ?? '', verified: a.verified, subscribed: a.plan_status === 'active', licensedStates: a.licensed_states, counties: a.counties,
    contactMethod: a.contact_method, languages: a.languages, explains: a.explains, advises: a.advises, speed: a.speed,
    bestLeadType: a.best_lead_type, lines: a.lines, monthlyCap: a.monthly_cap,
    matchedThisMonth: (counts ?? []).filter((c) => c.agent_id === a.user_id).length,
  }));
  const ranked = rankAgents({
    state: ph.state, county: ph.county, coverage: ph.coverage, language: ph.language, contactMethod: ph.contact_method,
    explainStyle: ph.explain_style, decisionStyle: ph.decision_style, timing: ph.timing, mattersMost: ph.matters_most,
  }, profiles).map((r) => ({ ...r, name: nameById.get(r.agentId) ?? '' }));
  if (rankOnly) return json({ ranked });

  const { data: open } = await admin.from('matches').select('id').eq('policyholder_id', policyholderId)
    .in('status', ['pending_approval', 'active', 'established']).limit(1);
  if (open?.length) return json({ ranked, matchId: open[0].id, existing: true });

  const top = ranked[0]?.score >= 0 ? ranked[0] : null;
  const { data: match, error } = await admin.from('matches').insert({
    policyholder_id: policyholderId, agent_id: top?.agentId ?? null, score: top?.score ?? -1,
    status: AUTO_APPROVE && top ? 'active' : 'pending_approval', approved_at: AUTO_APPROVE && top ? new Date().toISOString() : null,
  }).select().single();
  if (error) return json({ error: error.message }, 500);

  const { data: phName } = await admin.from('profiles').select('full_name').eq('id', policyholderId).single();
  await admin.from('activity').insert({
    type: 'match_suggested', match_id: match.id, actor_name: 'System',
    text: top ? `${phName?.full_name} → suggested ${top.name} (score ${top.score}). Waiting for your approval.` : `${phName?.full_name} has no eligible agent yet.`,
  });
  return json({ ranked, matchId: match.id });
});

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
