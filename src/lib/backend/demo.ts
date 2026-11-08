/**
 * Demo backend: runs entirely on the device (saved to AsyncStorage) with sample
 * agents and leads, so the app can be previewed before Supabase is connected.
 *
 * Demo logins (any password):
 *   agent@demo.com          → agent with sample leads
 *   policyholder@demo.com   → policyholder with an active match
 *   admin@getcoveredly.com  → admin
 *   any other email         → brand new account (goes through the quiz)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fitSummary, GOOD_MATCH_THRESHOLD, rankAgents, type AgentProfile } from '../../../supabase/functions/_shared/matching';
import { planById, type PlanId } from '../../config/plans';
import type {
  Activity, ActivityType, AdminAgent, AgentQuiz, AppNotification, Backend, FoundingRequest, LeadRating, LeadReport, Match,
  Message, MilestoneKey, PendingMatch, PolicyholderQuiz, Review, Role, User,
} from '../types';
import { AGENT_VISIBLE, OPEN_FOR_POLICYHOLDER } from '../types';

type AgentRow = AgentProfile & { userId: string; email: string; license: string; phone?: string; plan?: PlanId | null; planStatus?: 'active' | 'pending' | null };
interface DB {
  users: (User & { password: string })[];
  agents: AgentRow[];
  policyholders: (PolicyholderQuiz & { userId: string; email: string })[];
  matches: Omit<Match, 'policyholder' | 'agent'>[];
  ratings: LeadRating[];
  reviews: Review[];
  reports: LeadReport[];
  messages: Message[];
  activity: Activity[];
  notifications: AppNotification[];
  founding: FoundingRequest[];
  session: string | null;
}

const KEY = 'coveredly-demo-v3';
const AUTO_APPROVE = false; // mirrors the sheet: admin approves every match by hand
const now = () => new Date().toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): DB {
  const mk = (id: string, role: Role, email: string, fullName: string): User & { password: string } =>
    ({ id, role, email, fullName, quizDone: true, password: 'demo' });
  const users = [
    mk('u-admin', 'admin', 'admin@getcoveredly.com', 'Esme Solano'),
    mk('u-ag1', 'agent', 'agent@demo.com', 'Maria Delgado'),
    mk('u-ag2', 'agent', 'jordan@demo.com', 'Jordan Park'),
    mk('u-ag3', 'agent', 'priya@demo.com', 'Priya Shah'),
    mk('u-ph1', 'policyholder', 'policyholder@demo.com', 'Alex Rivera'),
    mk('u-ph2', 'policyholder', 'sam@demo.com', 'Sam Okafor'),
    mk('u-ph3', 'policyholder', 'dana@demo.com', 'Dana Lee'),
    mk('u-ph4', 'policyholder', 'chris@demo.com', 'Chris Moreno'),
    mk('u-ph5', 'policyholder', 'riley@demo.com', 'Riley Chen'),
  ];
  const base = { verified: true, licensedStates: ['New Jersey'], monthlyCap: 6 };
  const agents: AgentRow[] = [
    { ...base, id: 'u-ag1', userId: 'u-ag1', name: 'Maria Delgado', email: 'agent@demo.com', license: '1234567', phone: '(973) 555-0141',
      counties: ['Essex', 'Hudson'], contactMethod: 'Text or chat 💬', languages: ['English', 'Spanish'], explains: 'With examples and stories',
      advises: 'I present 2 or 3 options', speed: 'Within an hour', bestLeadType: 'Ready to buy now', lines: ['Auto', 'Home, renters or condo', 'Umbrella'], matchedThisMonth: 3, plan: 'founding', planStatus: 'active' },
    { ...base, id: 'u-ag2', userId: 'u-ag2', name: 'Jordan Park', email: 'jordan@demo.com', license: '2345678', counties: ['Bergen'],
      contactMethod: 'Phone call 📞', languages: ['English', 'Korean'], explains: 'Short and simple', advises: 'I recommend the best fit',
      speed: 'Same day', bestLeadType: 'Renewing soon', lines: ['Auto', 'Home, renters or condo', 'Life'], matchedThisMonth: 1, plan: 'dialogue', planStatus: 'active' },
    { ...base, id: 'u-ag3', userId: 'u-ag3', name: 'Priya Shah', email: 'priya@demo.com', license: '3456789', verified: false, counties: ['Middlesex'],
      contactMethod: 'Email 📧', languages: ['English', 'Hindi'], explains: 'Every detail', advises: 'I lay it all out and they choose',
      speed: 'Next business day', bestLeadType: 'Still shopping around', lines: ['Life', 'Umbrella'], matchedThisMonth: 0 },
  ];
  const ph = (userId: string, email: string, fullName: string, o: Partial<PolicyholderQuiz>) => ({
    userId, email, fullName, state: 'New Jersey', county: 'Essex', coverage: ['Auto'], language: 'English', contactMethod: 'Text or chat 💬',
    explainStyle: 'Walk me through it with examples', decisionStyle: "Show me 2 or 3 and I'll pick", timing: 'ASAP', mattersMost: 'Someone I can trust', ...o,
  });
  const policyholders = [
    ph('u-ph1', 'policyholder@demo.com', 'Alex Rivera', { coverage: ['Auto', 'Renters'], language: 'Either one is fine', phone: '(973) 555-0188' }),
    ph('u-ph2', 'sam@demo.com', 'Sam Okafor', { coverage: ['Home', 'Umbrella'], timing: 'Within a month', mattersMost: 'Fast answers', phone: '(862) 555-0102' }),
    ph('u-ph3', 'dana@demo.com', 'Dana Lee', { coverage: ['Condo'], language: 'Spanish', contactMethod: 'Email 📧', timing: 'In 1 to 3 months', phone: '(201) 555-0177' }),
    ph('u-ph4', 'chris@demo.com', 'Chris Moreno', { coverage: ['Auto', 'Life'], county: 'Hudson', mattersMost: 'Best price' }),
    ph('u-ph5', 'riley@demo.com', 'Riley Chen', { coverage: ['Life'], county: 'Bergen', contactMethod: 'Video or in person 🎥',
      explainStyle: 'Walk me through it with examples', decisionStyle: "Give me everything and I'll research it", timing: 'Just looking around', mattersMost: 'Best price' }),
  ];
  const matches: DB['matches'] = [
    { id: 'm1', policyholderId: 'u-ph1', agentId: 'u-ag1', score: 92.5, matchedBy: 'Formula', status: 'active', createdAt: ago(30),
      contactedAt: ago(29), milestones: { call: ago(28), quote: ago(5) } },
    { id: 'm2', policyholderId: 'u-ph2', agentId: 'u-ag1', score: 78, matchedBy: 'Formula', status: 'active', createdAt: ago(3), milestones: {} },
    { id: 'm3', policyholderId: 'u-ph3', agentId: 'u-ag1', score: 71.7, matchedBy: 'Formula', status: 'established', createdAt: ago(240),
      contactedAt: ago(238), milestones: { call: ago(238), quote: ago(200), sold: ago(150), review: ago(120) }, establishedAt: ago(120) },
    { id: 'm4', policyholderId: 'u-ph4', agentId: 'u-ag2', score: 0, matchedBy: 'Formula', status: 'pending_approval', createdAt: ago(1), milestones: {} },
  ];
  const seeded = {
    users, agents, policyholders, matches,
    ratings: [{ id: 'r1', matchId: 'm1', fit: 5, vsUsual: 'Better', note: 'Super responsive by text.', createdAt: ago(27) }],
    reviews: [{ matchId: 'm3', ease: 5, wouldRecommend: true, comment: 'Maria explained everything in Spanish. 10/10', createdAt: ago(120) }],
    reports: [],
    messages: [
      { id: 'msg1', matchId: 'm1', senderId: 'u-ag1', body: "Hi Alex! I'm Maria, your Coveredly match. Is now a good time to text about your auto + renters quote?", createdAt: ago(29) },
      { id: 'msg2', matchId: 'm1', senderId: 'u-ph1', body: 'Yes! Thanks for reaching out so fast.', createdAt: ago(28.9) },
      { id: 'msg3', matchId: 'm1', senderId: 'u-ag1', body: "Your quote is ready. I sent 3 options to your email. Let me know which you'd like to go with!", createdAt: ago(5) },
    ],
    activity: [
      { id: 'a1', type: 'established', matchId: 'm3', actorName: 'Maria Delgado', text: 'Maria Delgado & Dana Lee reached Established 🎉', createdAt: ago(120) },
      { id: 'a2', type: 'milestone', matchId: 'm1', actorName: 'Maria Delgado', text: 'Maria Delgado delivered a quote to Alex Rivera', createdAt: ago(5) },
      { id: 'a4', type: 'contacted', matchId: 'm1', actorName: 'Maria Delgado', text: 'Maria Delgado contacted Alex Rivera (in-app message)', createdAt: ago(29) },
      { id: 'a5', type: 'contacted', matchId: 'm3', actorName: 'Maria Delgado', text: 'Maria Delgado contacted Dana Lee', createdAt: ago(238) },
      { id: 'a3', type: 'match_suggested', matchId: 'm4', actorName: 'System', text: 'New policyholder Chris Moreno is waiting for match approval', createdAt: ago(1) },
    ],
    notifications: [],
    founding: [{ id: 'f1', agentId: 'u-ag3', agentName: 'Priya Shah', agentEmail: 'priya@demo.com', status: 'requested', createdAt: ago(2) }],
    session: null,
  } as DB;
  runMatching(seeded, 'u-ph5'); // Riley's best match is under 80%, so Riley gets the low-fit choice
  return seeded;
}

let db: DB | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<DB> {
  if (db) return db;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    db = raw ? JSON.parse(raw) : seed();
  } catch {
    db = seed();
  }
  return db!;
}
async function save() {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(db)); } catch {}
  listeners.forEach((l) => l());
}

const me = async () => {
  const d = await load();
  const u = d.users.find((x) => x.id === d.session);
  if (!u) throw new Error('Not signed in');
  return u;
};
function publicUser(d: DB, u: User & { password: string }): User {
  const { password, ...rest } = u;
  if (u.role !== 'agent') return rest;
  const a = d.agents.find((x) => x.userId === u.id);
  return { ...rest, plan: a?.plan && a.planStatus ? { id: a.plan, status: a.planStatus } : null };
}
const nameOf = (d: DB, id: string) => d.users.find((u) => u.id === id)?.fullName ?? 'Someone';

function log(d: DB, type: ActivityType, actorName: string, text: string, matchId?: string) {
  d.activity.unshift({ id: uid(), type, matchId, actorName, text, createdAt: now() });
}
function notify(d: DB, userId: string, n: Omit<AppNotification, 'id' | 'userId' | 'read' | 'createdAt'>) {
  d.notifications.unshift({ ...n, id: uid(), userId, read: false, createdAt: now() });
}

/** Same rule as the SQL trigger: all four milestones → Established + celebrate both sides. */
function checkEstablished(d: DB, m: DB['matches'][number]) {
  const ms = m.milestones;
  if (m.status !== 'established' && ms.call && ms.quote && ms.sold && ms.review) {
    m.status = 'established';
    m.establishedAt = now();
    const a = nameOf(d, m.agentId), p = nameOf(d, m.policyholderId);
    notify(d, m.agentId, { kind: 'established', title: "It's official! 🎉", body: `You and ${p} have an established relationship.`, matchId: m.id });
    notify(d, m.policyholderId, { kind: 'established', title: "You're covered! 🎉", body: `You and ${a} have an established relationship.`, matchId: m.id });
    log(d, 'established', a, `${a} & ${p} reached Established 🎉`, m.id);
  }
}

function hydrate(d: DB, m: DB['matches'][number], viewer: User): Match {
  const p = d.policyholders.find((x) => x.userId === m.policyholderId)!;
  const a = d.agents.find((x) => x.userId === m.agentId)!;
  const revealContact = AGENT_VISIBLE.includes(m.status);
  return {
    ...m,
    policyholder: viewer.role !== 'policyholder' ? {
      fullName: p.fullName, quiz: p,
      email: revealContact ? p.email : undefined, phone: revealContact ? p.phone : undefined,
    } : undefined,
    agent: a && (viewer.role !== 'policyholder' || AGENT_VISIBLE.includes(m.status) || m.status === 'pending_approval') ? { fullName: a.name, email: a.email, phone: a.phone, contactMethod: a.contactMethod, languages: a.languages } : undefined,
  };
}

function agentProfiles(d: DB): AgentProfile[] {
  const month = new Date().toISOString().slice(0, 7);
  return d.agents.map((a) => ({
    ...a,
    subscribed: a.planStatus === 'active',
    monthlyCap: planById(a.plan)?.leads ?? a.monthlyCap,
    matchedThisMonth: Math.max(a.matchedThisMonth,
      d.matches.filter((m) => m.agentId === a.userId && AGENT_VISIBLE.includes(m.status) && m.status !== 'replaced' && m.createdAt.startsWith(month)).length),
  }));
}

/** Runs the formula and creates a match (pending admin approval, like the sheet). */
/** Best eligible agent for a policyholder right now (or null). */
function bestFor(d: DB, policyholderId: string, excludeAgent?: string) {
  const p = d.policyholders.find((x) => x.userId === policyholderId)!;
  const ranked = rankAgents(p, agentProfiles(d).filter((a) => a.id !== excludeAgent));
  const top = ranked[0] && ranked[0].score >= 0 ? ranked[0] : null;
  return { p, top, fit: top ? fitSummary(top, p) : undefined };
}

/** Runs the formula. 80%+ goes to admin approval; below that, the policyholder decides. */
function runMatching(d: DB, policyholderId: string, excludeAgent?: string) {
  const { p, top, fit } = bestFor(d, policyholderId, excludeAgent);
  const good = !!top && top.score >= GOOD_MATCH_THRESHOLD;
  const m: DB['matches'][number] = {
    id: uid(), policyholderId, agentId: top?.agentId ?? '', score: top?.score ?? -1, matchedBy: 'Formula', fit,
    status: good ? (AUTO_APPROVE ? 'active' : 'pending_approval') : top ? 'low_fit' : 'waiting', createdAt: now(), milestones: {},
  };
  d.matches.push(m);
  log(d, 'match_suggested', 'System', good
    ? `${p.fullName} → suggested ${nameOf(d, top!.agentId)} (score ${top!.score}). Waiting for your approval.`
    : top ? `${p.fullName}'s best match is ${top.score}% (${nameOf(d, top.agentId)}), under ${GOOD_MATCH_THRESHOLD}%. They're choosing: match anyway or wait.`
    : `${p.fullName} has no eligible agent yet and is waiting in the queue.`, m.id);
  return m;
}

/** Re-run the formula for one queued match; promotes it to approval if it now clears the threshold. */
function recheck(d: DB, m: DB['matches'][number]) {
  const { p, top, fit } = bestFor(d, m.policyholderId);
  m.agentId = top?.agentId ?? ''; m.score = top?.score ?? -1; m.fit = fit;
  if (top && top.score >= GOOD_MATCH_THRESHOLD) {
    m.status = 'pending_approval';
    notify(d, m.policyholderId, { kind: 'matched', title: 'A great match just opened up 🧡', body: `We found a ${top.score}% match. Our team is confirming it now.`, matchId: m.id });
    log(d, 'match_suggested', 'System', `${p.fullName} moved out of the queue: ${nameOf(d, top.agentId)} is a ${top.score}% match. Waiting for your approval.`, m.id);
  }
  return m.score;
}

/** Re-check everyone waiting in the queue (after an agent is verified or starts a plan). */
function recheckQueue(d: DB) {
  d.matches.filter((m) => m.status === 'waiting').forEach((m) => recheck(d, m));
}

export const demoBackend: Backend = {
  mode: 'demo',
  async getUser() {
    const d = await load();
    const u = d.users.find((x) => x.id === d.session);
    return u ? publicUser(d, u) : null;
  },
  async signIn(email) {
    const d = await load();
    const u = d.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) throw new Error('No account with that email. Tap "Create account" instead.');
    d.session = u.id;
    await save();
    return publicUser(d, u);
  },
  async signUp(email, password, role, fullName) {
    const d = await load();
    if (d.users.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('That email already has an account. Sign in instead.');
    const u = { id: 'u-' + uid(), role, email: email.trim(), fullName, quizDone: false, password };
    d.users.push(u);
    d.session = u.id;
    await save();
    return publicUser(d, u);
  },
  async signOut() {
    const d = await load();
    d.session = null;
    await save();
  },

  async deleteAccount() {
    const d = await load(); const u = await me();
    d.users = d.users.filter((x) => x.id !== u.id);
    d.agents = d.agents.filter((x) => x.userId !== u.id);
    d.policyholders = d.policyholders.filter((x) => x.userId !== u.id);
    const mine = new Set(d.matches.filter((m) => m.agentId === u.id || m.policyholderId === u.id).map((m) => m.id));
    d.matches = d.matches.filter((m) => !mine.has(m.id));
    d.messages = d.messages.filter((m) => !mine.has(m.matchId));
    d.notifications = d.notifications.filter((n) => n.userId !== u.id);
    d.session = null;
    await save();
  },

  async saveAgentQuiz(q) {
    const d = await load(); const u = await me();
    const prev = d.agents.find((a) => a.userId === u.id);
    d.agents = d.agents.filter((a) => a.userId !== u.id);
    d.agents.push({
      plan: prev?.plan ?? null, planStatus: prev?.planStatus ?? null,
      id: u.id, userId: u.id, name: q.fullName, email: u.email, license: q.license, phone: q.phone, verified: false, monthlyCap: 6, matchedThisMonth: 0,
      licensedStates: q.licensedStates, counties: q.counties, contactMethod: q.contactMethod, languages: q.languages, explains: q.explains,
      advises: q.advises, speed: q.speed, bestLeadType: q.bestLeadType, lines: q.lines,
    });
    const usr = d.users.find((x) => x.id === u.id)!; usr.quizDone = true; usr.fullName = q.fullName;
    log(d, 'match_suggested', q.fullName, `New agent ${q.fullName} finished the quiz. Verify NJ license #${q.license}.`);
    await save();
  },
  async savePolicyholderQuiz(q) {
    const d = await load(); const u = await me();
    d.policyholders = d.policyholders.filter((p) => p.userId !== u.id);
    d.policyholders.push({ ...q, userId: u.id, email: u.email });
    const usr = d.users.find((x) => x.id === u.id)!; usr.quizDone = true; usr.fullName = q.fullName;
    await save();
  },
  async getMyQuiz() {
    const d = await load(); const u = await me();
    if (u.role === 'agent') {
      const a = d.agents.find((x) => x.userId === u.id);
      return a ? { ...a, fullName: a.name } : null;
    }
    return d.policyholders.find((x) => x.userId === u.id) ?? null;
  },
  async requestMatch() {
    const d = await load(); const u = await me();
    const open = d.matches.find((m) => m.policyholderId === u.id && OPEN_FOR_POLICYHOLDER.includes(m.status));
    if (!open) runMatching(d, u.id);
    await save();
  },

  async acceptLowFit(matchId) {
    const d = await load(); const u = await me();
    const m = d.matches.find((x) => x.id === matchId && x.policyholderId === u.id && (x.status === 'low_fit' || x.status === 'waiting'));
    if (!m) return;
    recheck(d, m); // use the freshest best agent
    if (m.status !== 'pending_approval' && m.agentId) {
      m.status = 'pending_approval';
      log(d, 'match_suggested', u.fullName, `${u.fullName} chose to match now with ${nameOf(d, m.agentId)} (${m.score}%). Waiting for your approval.`, m.id);
    }
    await save();
  },
  async waitForBetter(matchId) {
    const d = await load(); const u = await me();
    const m = d.matches.find((x) => x.id === matchId && x.policyholderId === u.id && x.status === 'low_fit');
    if (!m) return;
    m.status = 'waiting';
    log(d, 'match_suggested', u.fullName, `${u.fullName} chose to wait for a ${GOOD_MATCH_THRESHOLD}%+ match (best now: ${m.score}%).`, m.id);
    await save();
  },
  async recheckMatch(matchId) {
    const d = await load(); const u = await me();
    const m = d.matches.find((x) => x.id === matchId && x.policyholderId === u.id && (x.status === 'low_fit' || x.status === 'waiting'));
    if (!m) return -1;
    const score = recheck(d, m);
    await save();
    return score;
  },

  async listMyMatches() {
    const d = await load(); const u = await me();
    return d.matches
      .filter((m) => (u.role === 'agent' ? m.agentId === u.id && AGENT_VISIBLE.includes(m.status) : m.policyholderId === u.id))
      .map((m) => hydrate(d, m, u))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getMatch(id) {
    const d = await load(); const u = await me();
    const m = d.matches.find((x) => x.id === id);
    return m ? hydrate(d, m, u) : null;
  },
  async markContacted(matchId) {
    const d = await load(); const u = await me();
    const m = d.matches.find((x) => x.id === matchId)!;
    if (!m.contactedAt) {
      m.contactedAt = now();
      log(d, 'contacted', u.fullName, `${u.fullName} contacted ${nameOf(d, m.policyholderId)}`, m.id);
    }
    await save();
  },
  async logMilestone(matchId, key) {
    const d = await load(); const u = await me();
    const m = d.matches.find((x) => x.id === matchId)!;
    if (!m.milestones[key]) {
      m.milestones[key] = now();
      if (!m.contactedAt) m.contactedAt = now();
      const label = { call: 'had the first call with', quote: 'delivered a quote to', sold: 'sold a policy to' }[key];
      log(d, 'milestone', u.fullName, `${u.fullName} ${label} ${nameOf(d, m.policyholderId)}`, m.id);
      if (key === 'sold') {
        notify(d, m.policyholderId, { kind: 'milestone', title: 'Your policy is in place 🛡️', body: `Leave ${u.fullName} a quick review to make it official.`, matchId: m.id });
      }
      checkEstablished(d, m);
    }
    await save();
  },
  async rateLead(matchId, r) {
    const d = await load(); const u = await me();
    d.ratings.unshift({ ...r, id: uid(), matchId, createdAt: now() });
    log(d, 'rated', u.fullName, `${u.fullName} rated ${nameOf(d, d.matches.find((m) => m.id === matchId)!.policyholderId)} ${r.fit}/5 (${r.vsUsual.toLowerCase()} than usual)`, matchId);
    await save();
  },
  async listRatings(matchId) {
    const d = await load();
    return d.ratings.filter((r) => r.matchId === matchId);
  },
  async reportLead(matchId, reason, details) {
    const d = await load(); const u = await me();
    const m = d.matches.find((x) => x.id === matchId)!;
    d.reports.unshift({ id: uid(), matchId, agentId: u.id, reason, details, status: 'open', createdAt: now() });
    m.status = 'reported';
    log(d, 'reported', u.fullName, `${u.fullName} reported ${nameOf(d, m.policyholderId)} as a bad lead: ${reason}`, matchId);
    await save();
  },
  async getReport(matchId) {
    const d = await load();
    return d.reports.find((r) => r.matchId === matchId) ?? null;
  },
  async submitReview(matchId, r) {
    const d = await load(); const u = await me();
    const m = d.matches.find((x) => x.id === matchId)!;
    d.reviews.push({ ...r, matchId, createdAt: now() });
    m.milestones.review = now();
    log(d, 'review', u.fullName, `${u.fullName} reviewed ${nameOf(d, m.agentId)}: ${r.ease}/5${r.wouldRecommend ? ', would recommend' : ''}`, matchId);
    checkEstablished(d, m);
    await save();
  },

  async listMessages(matchId) {
    const d = await load();
    return d.messages.filter((m) => m.matchId === matchId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async sendMessage(matchId, body) {
    const d = await load(); const u = await me();
    d.messages.push({ id: uid(), matchId, senderId: u.id, body, createdAt: now() });
    const m = d.matches.find((x) => x.id === matchId)!;
    if (u.role === 'agent' && !m.contactedAt) {
      m.contactedAt = now();
      log(d, 'contacted', u.fullName, `${u.fullName} contacted ${nameOf(d, m.policyholderId)} (in-app message)`, matchId);
    }
    await save();
  },

  async listNotifications() {
    const d = await load(); const u = await me();
    return d.notifications.filter((n) => n.userId === u.id);
  },
  async markNotificationRead(id) {
    const d = await load();
    const n = d.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    await save();
  },

  async listPendingMatches(): Promise<PendingMatch[]> {
    const d = await load(); const u = await me();
    const profiles = agentProfiles(d);
    const order = { pending_approval: 0, low_fit: 1, waiting: 2 } as Record<string, number>;
    return d.matches.filter((m) => m.status in order).sort((a, b) => order[a.status] - order[b.status]).map((m) => {
      const p = d.policyholders.find((x) => x.userId === m.policyholderId)!;
      const ranked = rankAgents(p, profiles);
      const top = ranked[0]?.score >= 0 ? ranked[0] : null;
      return {
        queue: m.status === 'pending_approval' ? 'approval' as const : m.status === 'low_fit' ? 'deciding' as const : 'waiting' as const,
        match: hydrate(d, m, u),
        policyholderName: p.fullName,
        suggestedAgentName: top ? nameOf(d, top.agentId) : null,
        candidates: ranked.map((r) => ({ agentId: r.agentId, name: nameOf(d, r.agentId), score: r.score, reasons: r.reasons })),
      };
    });
  },
  async approveMatch(matchId, agentId) {
    const d = await load();
    const m = d.matches.find((x) => x.id === matchId)!;
    const p = d.policyholders.find((x) => x.userId === m.policyholderId)!;
    const scored = rankAgents(p, agentProfiles(d)).find((r) => r.agentId === agentId);
    m.matchedBy = m.agentId === agentId ? 'Formula' : 'Admin';
    m.agentId = agentId;
    m.score = scored?.score ?? m.score;
    m.status = 'active';
    m.createdAt = now();
    const a = nameOf(d, agentId);
    notify(d, agentId, { kind: 'matched', title: 'New lead matched ⚡', body: `${p.fullName} is ready to hear from you. Reach out fast!`, matchId });
    notify(d, m.policyholderId, { kind: 'matched', title: 'You have a match! 🧡', body: `Meet ${a}, your licensed NJ agent.`, matchId });
    log(d, 'match_approved', 'Admin', `You matched ${p.fullName} with ${a}`, matchId);
    await save();
  },
  async listReports() {
    const d = await load();
    return d.reports.map((r) => {
      const m = d.matches.find((x) => x.id === r.matchId)!;
      return { ...r, agentName: nameOf(d, r.agentId), policyholderName: nameOf(d, m.policyholderId) };
    });
  },
  async resolveReport(reportId, approve) {
    const d = await load();
    const r = d.reports.find((x) => x.id === reportId)!;
    const m = d.matches.find((x) => x.id === r.matchId)!;
    r.status = approve ? 'approved' : 'denied';
    if (approve) {
      m.status = 'replaced'; // no longer counts toward the cap
      notify(d, r.agentId, { kind: 'matched', title: 'Lead replacement approved', body: "We'll send you a replacement lead as soon as one matches.", matchId: m.id });
    } else {
      m.status = 'active';
      notify(d, r.agentId, { kind: 'matched', title: 'Lead report reviewed', body: 'This lead did not qualify for replacement and is back in your list.', matchId: m.id });
    }
    log(d, 'report_resolved', 'Admin', `Report on ${nameOf(d, m.policyholderId)} ${approve ? 'approved, replacement owed' : 'denied'}`, m.id);
    await save();
  },
  async listActivity() {
    return (await load()).activity;
  },
  async listAgents(): Promise<AdminAgent[]> {
    const d = await load();
    return agentProfiles(d).map((a) => {
      const row = d.agents.find((x) => x.id === a.id)!;
      return {
        id: a.id, fullName: a.name, email: row.email, license: row.license, verified: a.verified, matchedThisMonth: a.matchedThisMonth,
        plan: row.plan && row.planStatus === 'active' ? planById(row.plan)?.name : null,
        monthlyCap: a.monthlyCap, closed: d.matches.filter((m) => m.agentId === a.id && m.milestones.sold).length,
      };
    });
  },
  async setAgentVerified(agentId, verified) {
    const d = await load();
    d.agents.find((x) => x.id === agentId)!.verified = verified;
    if (verified) recheckQueue(d);
    await save();
  },

  async startCheckout(planId) {
    const d = await load(); const u = await me();
    const a = d.agents.find((x) => x.userId === u.id)!;
    if (planId === 'founding' && !d.founding.some((f) => f.agentId === u.id && f.status === 'redeemed'))
      throw new Error('Validate your founding agent code first.');
    const plan = planById(planId)!;
    a.plan = planId; a.planStatus = 'active'; a.monthlyCap = plan.leads;
    recheckQueue(d);
    log(d, 'match_approved', u.fullName, `${u.fullName} started the ${plan.name} plan ($${plan.price}/mo, ${plan.leads} leads)`);
    await save();
    return { activated: true };
  },
  async requestFounding() {
    const d = await load(); const u = await me();
    if (d.founding.some((f) => f.agentId === u.id)) return;
    d.founding.unshift({ id: uid(), agentId: u.id, agentName: u.fullName, agentEmail: u.email, status: 'requested', createdAt: now() });
    log(d, 'match_suggested', u.fullName, `${u.fullName} says they're a founding agent. Approve them in Agents to send a code.`);
    d.users.filter((x) => x.role === 'admin').forEach((ad) =>
      notify(d, ad.id, { kind: 'milestone', title: 'Founding agent request', body: `${u.fullName} is asking for founding agent pricing.` }));
    await save();
  },
  async getMyFoundingRequest() {
    const d = await load(); const u = await me();
    return d.founding.find((f) => f.agentId === u.id) ?? null;
  },
  async redeemFoundingCode(code) {
    const d = await load(); const u = await me();
    const f = d.founding.find((x) => x.agentId === u.id && x.status !== 'requested');
    if (!f || f.code?.toUpperCase() !== code.trim().toUpperCase()) throw new Error("That code doesn't match. Check the code we sent you.");
    f.status = 'redeemed';
    log(d, 'report_resolved', u.fullName, `${u.fullName} validated their founding agent code`);
    await save();
  },
  async listFoundingRequests() {
    return (await load()).founding;
  },
  async approveFounding(id) {
    const d = await load();
    const f = d.founding.find((x) => x.id === id)!;
    f.code = f.code ?? 'CF-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    f.status = 'approved';
    notify(d, f.agentId, { kind: 'milestone', title: "You're a founding agent 🧡", body: `Your code is ${f.code}. Enter it on the plan screen to lock in $39/month for life.` });
    log(d, 'match_approved', 'Admin', `You approved ${f.agentName} as a founding agent (code ${f.code})`);
    await save();
    return f.code;
  },

  subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

export async function resetDemo() {
  db = seed();
  await save();
}
