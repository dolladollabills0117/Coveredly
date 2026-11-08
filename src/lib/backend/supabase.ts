/**
 * Production backend (Supabase). Turned on when EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_ANON_KEY are set (see .env.example).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { FoundingRequest, AgentQuiz, AppNotification, Backend, Match, MilestoneKey, PolicyholderQuiz, Role, User } from '../types';

let sb: SupabaseClient;
export function supabaseClient() {
  if (!sb) {
    sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web' },
    });
  }
  return sb;
}

const ok = <T,>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

async function uidOrThrow() {
  const { data } = await supabaseClient().auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
}

async function profile(id: string): Promise<User | null> {
  const s = supabaseClient();
  const { data } = await s.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const u: User = { id: data.id, role: data.role, email: data.email, fullName: data.full_name, phone: data.phone ?? undefined, quizDone: data.quiz_done };
  if (u.role === 'agent') {
    const { data: a } = await s.from('agents').select('plan, plan_status').eq('user_id', id).maybeSingle();
    u.plan = a?.plan && (a.plan_status === 'active' || a.plan_status === 'pending') ? { id: a.plan, status: a.plan_status } : null;
  }
  return u;
}

const foundingFromRow = (r: any, p?: any): FoundingRequest => ({
  id: r.id, agentId: r.agent_id, status: r.status, code: r.code ?? undefined, createdAt: r.created_at,
  agentName: p?.full_name ?? '', agentEmail: p?.email ?? '',
});

const phFromRow = (r: any): PolicyholderQuiz => ({
  fullName: '', state: r.state, county: r.county ?? undefined, zip: r.zip ?? undefined, coverage: r.coverage, language: r.language,
  contactMethod: r.contact_method, explainStyle: r.explain_style, decisionStyle: r.decision_style, timing: r.timing, mattersMost: r.matters_most,
});

async function hydrate(rows: any[]): Promise<Match[]> {
  if (!rows.length) return [];
  const s = supabaseClient();
  const ids = [...new Set(rows.flatMap((r) => [r.policyholder_id, r.agent_id]).filter(Boolean))];
  const [profiles, phs, ags] = await Promise.all([
    s.from('profiles').select('id, full_name, email, phone').in('id', ids),
    s.from('policyholders').select('*').in('user_id', ids),
    s.from('agents').select('user_id, contact_method, languages').in('user_id', ids),
  ]);
  const P = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const PH = new Map((phs.data ?? []).map((p) => [p.user_id, p]));
  const AG = new Map((ags.data ?? []).map((a) => [a.user_id, a]));
  return rows.map((r) => {
    const pp = P.get(r.policyholder_id), ap = P.get(r.agent_id), ph = PH.get(r.policyholder_id), ag = AG.get(r.agent_id);
    const milestones: Match['milestones'] = {};
    (['call', 'quote', 'sold', 'review'] as MilestoneKey[]).forEach((k) => { if (r['m_' + k]) milestones[k] = r['m_' + k]; });
    return {
      id: r.id, policyholderId: r.policyholder_id, agentId: r.agent_id, score: Number(r.score), matchedBy: r.matched_by, status: r.status,
      createdAt: r.approved_at ?? r.created_at, contactedAt: r.contacted_at ?? undefined, establishedAt: r.established_at ?? undefined, milestones, fit: r.fit ?? undefined,
      policyholder: pp && ph ? { fullName: pp.full_name, email: pp.email, phone: pp.phone ?? undefined, quiz: { ...phFromRow(ph), fullName: pp.full_name } } : undefined,
      agent: ap ? { fullName: ap.full_name, email: ap.email, phone: ap.phone ?? undefined, contactMethod: ag?.contact_method ?? '', languages: ag?.languages ?? [] } : undefined,
    };
  });
}

async function invokeMatch(body: Record<string, unknown>) {
  const { data, error } = await supabaseClient().functions.invoke('match-policyholder', { body });
  if (error || data?.error) throw new Error(data?.error ?? error?.message);
  return data;
}

export const supabaseBackend: Backend = {
  mode: 'supabase',
  async getUser() {
    const { data } = await supabaseClient().auth.getSession();
    return data.session ? profile(data.session.user.id) : null;
  },
  async signIn(email, password) {
    const { data } = ok(await supabaseClient().auth.signInWithPassword({ email: email.trim(), password }) as any) as any;
    return (await profile(data?.user?.id ?? (await uidOrThrow())))!;
  },
  async signUp(email, password, role: Role, fullName) {
    const r = await supabaseClient().auth.signUp({ email: email.trim(), password, options: { data: { role, full_name: fullName } } });
    if (r.error) throw new Error(r.error.message);
    if (!r.data.session) throw new Error('Check your email to confirm your account, then sign in.');
    return (await profile(r.data.user!.id))!;
  },
  async signOut() {
    await supabaseClient().auth.signOut();
  },

  async deleteAccount() {
    const { error } = await supabaseClient().functions.invoke('delete-account', { body: {} });
    if (error) throw new Error(error.message);
    await supabaseClient().auth.signOut();
  },

  async saveAgentQuiz(q: AgentQuiz) {
    const s = supabaseClient(); const id = await uidOrThrow();
    ok(await s.from('agents').upsert({
      user_id: id, license: q.license, licensed_states: q.licensedStates, counties: q.counties ?? [], contact_method: q.contactMethod,
      languages: q.languages, explains: q.explains, advises: q.advises, speed: q.speed, best_lead_type: q.bestLeadType, lines: q.lines,
    }));
    ok(await s.from('profiles').update({ full_name: q.fullName, phone: q.phone, quiz_done: true }).eq('id', id));
  },
  async savePolicyholderQuiz(q: PolicyholderQuiz) {
    const s = supabaseClient(); const id = await uidOrThrow();
    ok(await s.from('policyholders').upsert({
      user_id: id, state: q.state, county: q.county, zip: q.zip, coverage: q.coverage, language: q.language, contact_method: q.contactMethod,
      explain_style: q.explainStyle, decision_style: q.decisionStyle, timing: q.timing, matters_most: q.mattersMost,
    }));
    ok(await s.from('profiles').update({ full_name: q.fullName, phone: q.phone, quiz_done: true }).eq('id', id));
  },
  async getMyQuiz() {
    const s = supabaseClient(); const id = await uidOrThrow(); const me = await profile(id);
    if (me?.role === 'agent') {
      const { data: a } = await s.from('agents').select('*').eq('user_id', id).maybeSingle();
      return a ? { fullName: me.fullName, license: a.license, licensedStates: a.licensed_states, counties: a.counties, contactMethod: a.contact_method,
        languages: a.languages, explains: a.explains, advises: a.advises, speed: a.speed, bestLeadType: a.best_lead_type, lines: a.lines } : null;
    }
    const { data: p } = await s.from('policyholders').select('*').eq('user_id', id).maybeSingle();
    return p ? { ...phFromRow(p), fullName: me?.fullName ?? '' } : null;
  },
  async requestMatch() {
    await invokeMatch({ action: 'request' });
  },
  async acceptLowFit(matchId) { await invokeMatch({ action: 'accept', matchId }); },
  async waitForBetter(mid) { ok(await supabaseClient().rpc('wait_for_better', { mid })); },
  async recheckMatch(matchId) { return (await invokeMatch({ action: 'recheck', matchId })).score ?? -1; },

  async listMyMatches() {
    const s = supabaseClient(); const id = await uidOrThrow();
    const rows = ok(await s.from('matches').select('*').or(`agent_id.eq.${id},policyholder_id.eq.${id}`).order('created_at', { ascending: false }));
    return hydrate(rows ?? []);
  },
  async getMatch(id) {
    const rows = ok(await supabaseClient().from('matches').select('*').eq('id', id));
    return (await hydrate(rows ?? []))[0] ?? null;
  },
  async markContacted(mid) { ok(await supabaseClient().rpc('mark_contacted', { mid })); },
  async logMilestone(mid, k) { ok(await supabaseClient().rpc('log_milestone', { mid, k })); },
  async rateLead(mid, r) { ok(await supabaseClient().rpc('rate_lead', { mid, p_fit: r.fit, p_vs: r.vsUsual, p_note: r.note ?? null })); },
  async listRatings(mid) {
    const rows = ok(await supabaseClient().from('lead_ratings').select('*').eq('match_id', mid).order('created_at', { ascending: false }));
    return (rows ?? []).map((r: any) => ({ id: r.id, matchId: r.match_id, fit: r.fit, vsUsual: r.vs_usual, note: r.note, createdAt: r.created_at }));
  },
  async reportLead(mid, reason, details) { ok(await supabaseClient().rpc('report_lead', { mid, p_reason: reason, p_details: details ?? null })); },
  async getReport(mid) {
    const { data: r } = await supabaseClient().from('lead_reports').select('*').eq('match_id', mid).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return r ? { id: r.id, matchId: r.match_id, agentId: r.agent_id, reason: r.reason, details: r.details, status: r.status, createdAt: r.created_at } : null;
  },
  async submitReview(mid, r) {
    ok(await supabaseClient().rpc('submit_review', { mid, p_ease: r.ease, p_recommend: r.wouldRecommend, p_comment: r.comment ?? null }));
  },

  async listMessages(mid) {
    const rows = ok(await supabaseClient().from('messages').select('*').eq('match_id', mid).order('created_at'));
    return (rows ?? []).map((m: any) => ({ id: m.id, matchId: m.match_id, senderId: m.sender_id, body: m.body, createdAt: m.created_at }));
  },
  async sendMessage(mid, body) { ok(await supabaseClient().from('messages').insert({ match_id: mid, body })); },

  async listNotifications() {
    const rows = ok(await supabaseClient().from('notifications').select('*').order('created_at', { ascending: false }).limit(50));
    return (rows ?? []).map((n: any): AppNotification => ({ id: n.id, userId: n.user_id, kind: n.kind, title: n.title, body: n.body, matchId: n.match_id, read: n.read, createdAt: n.created_at }));
  },
  async markNotificationRead(id) { ok(await supabaseClient().from('notifications').update({ read: true }).eq('id', id)); },

  async listPendingMatches() {
    const s = supabaseClient();
    const order: Record<string, number> = { pending_approval: 0, low_fit: 1, waiting: 2 };
    const rows = ok(await s.from('matches').select('*').in('status', Object.keys(order)).order('created_at'));
    const matches = (await hydrate(rows ?? [])).sort((a, b) => order[a.status] - order[b.status]);
    return Promise.all(matches.map(async (m) => {
      const { data } = await s.functions.invoke('match-policyholder', { body: { action: 'rank', policyholderId: m.policyholderId } });
      const ranked: any[] = data?.ranked ?? [];
      const top = ranked[0]?.score >= 0 ? ranked[0] : null;
      return {
        queue: m.status === 'pending_approval' ? 'approval' as const : m.status === 'low_fit' ? 'deciding' as const : 'waiting' as const,
        match: m, policyholderName: m.policyholder?.fullName ?? '', suggestedAgentName: top?.name ?? null,
        candidates: ranked.map((r) => ({ agentId: r.agentId, name: r.name, score: r.score, reasons: r.reasons })),
      };
    }));
  },
  async approveMatch(mid, agentId) {
    const s = supabaseClient();
    const { data } = await s.functions.invoke('match-policyholder', {
      body: { action: 'rank', policyholderId: (await this.getMatch(mid))?.policyholderId },
    });
    const score = (data?.ranked ?? []).find((r: any) => r.agentId === agentId)?.score ?? -1;
    ok(await s.rpc('approve_match', { mid, p_agent: agentId, p_score: score }));
  },
  async listReports() {
    const s = supabaseClient();
    const rows = ok(await s.from('lead_reports').select('*').order('created_at', { ascending: false }));
    const matches = await hydrate(ok(await s.from('matches').select('*').in('id', (rows ?? []).map((r: any) => r.match_id))) ?? []);
    return (rows ?? []).map((r: any) => {
      const m = matches.find((x) => x.id === r.match_id);
      return { id: r.id, matchId: r.match_id, agentId: r.agent_id, reason: r.reason, details: r.details, status: r.status, createdAt: r.created_at,
        agentName: m?.agent?.fullName ?? '', policyholderName: m?.policyholder?.fullName ?? '' };
    });
  },
  async resolveReport(rid, approve) { ok(await supabaseClient().rpc('resolve_report', { rid, p_approve: approve })); },
  async listActivity() {
    const rows = ok(await supabaseClient().from('activity').select('*').order('created_at', { ascending: false }).limit(200));
    return (rows ?? []).map((a: any) => ({ id: a.id, type: a.type, matchId: a.match_id, actorName: a.actor_name, text: a.text, createdAt: a.created_at }));
  },
  async listAgents() {
    const s = supabaseClient();
    const [agents, profiles, matches] = await Promise.all([
      s.from('agents').select('*'), s.from('profiles').select('id, full_name, email').eq('role', 'agent'), s.from('matches').select('agent_id, status, m_sold, approved_at'),
    ]);
    const month = new Date().toISOString().slice(0, 7);
    return (agents.data ?? []).map((a: any) => {
      const p = (profiles.data ?? []).find((x: any) => x.id === a.user_id);
      const mine = (matches.data ?? []).filter((m: any) => m.agent_id === a.user_id);
      return { id: a.user_id, fullName: p?.full_name ?? '', email: p?.email ?? '', license: a.license, verified: a.verified, monthlyCap: a.monthly_cap,
        plan: a.plan_status === 'active' ? a.plan : a.plan_status ? `${a.plan} (${a.plan_status})` : null,
        matchedThisMonth: mine.filter((m: any) => m.approved_at?.startsWith(month) && m.status !== 'replaced').length,
        closed: mine.filter((m: any) => m.m_sold).length };
    });
  },
  async setAgentVerified(id, verified) {
    ok(await supabaseClient().from('agents').update({ verified }).eq('user_id', id));
    if (verified) await invokeMatch({ action: 'recheckQueue' }).catch(() => {}); // a new agent may help people waiting
  },

  async startCheckout(plan) {
    const { data, error } = await supabaseClient().functions.invoke('create-checkout', { body: { plan } });
    if (error || data?.error) throw new Error(data?.error ?? error?.message);
    return { url: data.url };
  },
  async requestFounding() { ok(await supabaseClient().rpc('request_founding')); },
  async getMyFoundingRequest() {
    const id = await uidOrThrow();
    const { data } = await supabaseClient().from('founding_requests').select('*').eq('agent_id', id).maybeSingle();
    return data ? foundingFromRow(data) : null;
  },
  async redeemFoundingCode(code) { ok(await supabaseClient().rpc('redeem_founding_code', { p_code: code })); },
  async listFoundingRequests() {
    const s = supabaseClient();
    const rows = ok(await s.from('founding_requests').select('*').order('created_at', { ascending: false })) ?? [];
    const { data: ps } = await s.from('profiles').select('id, full_name, email').in('id', rows.map((r: any) => r.agent_id));
    return rows.map((r: any) => foundingFromRow(r, (ps ?? []).find((p: any) => p.id === r.agent_id)));
  },
  async approveFounding(rid) { return ok(await supabaseClient().rpc('approve_founding', { rid })) as string; },

  subscribe(cb) {
    const ch = supabaseClient().channel('coveredly-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, cb)
      .subscribe();
    const { data } = supabaseClient().auth.onAuthStateChange(() => cb());
    return () => { supabaseClient().removeChannel(ch); data.subscription.unsubscribe(); };
  },
};
