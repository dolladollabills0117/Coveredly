import type { AgentProfile, FitItem, PolicyholderProfile } from '../../supabase/functions/_shared/matching';
import type { PlanId } from '../config/plans';
import type { Standing } from '../../supabase/functions/_shared/standing';
export type { Standing };

export type Role = 'agent' | 'policyholder' | 'admin';

export interface User {
  id: string;
  role: Role;
  email: string;
  fullName: string;
  phone?: string;
  quizDone: boolean;
  /** Agents only: their subscription. Agents without an active plan are sent to the plan screen. */
  plan?: { id: PlanId; status: 'active' | 'pending' } | null;
  /** Agents only: removed from Coveredly (can't subscribe again). */
  removed?: boolean;
  /** Agents only: version of the Agent Terms they agreed to, if any. */
  termsVersion?: string | null;
}

export interface FoundingRequest {
  id: string;
  agentId: string;
  agentName: string;
  agentEmail: string;
  status: 'requested' | 'approved' | 'redeemed';
  code?: string; // visible to admin and (after approval) to the agent
  createdAt: string;
}

/** The four milestones a match must hit to become "Established". */
export const MILESTONES = [
  { key: 'call', label: 'Initial phone call', icon: 'call-outline', by: 'agent' },
  { key: 'quote', label: 'Quote delivered', icon: 'document-text-outline', by: 'agent' },
  { key: 'sold', label: 'Policy sold', icon: 'shield-checkmark-outline', by: 'agent' },
  { key: 'review', label: 'Review left', icon: 'star-outline', by: 'policyholder' },
] as const;
export type MilestoneKey = (typeof MILESTONES)[number]['key'];

/** Personal lines an agent can record as sold (same names as the policyholder quiz). */
export const SALE_LINES = ['Auto', 'Home', 'Renters', 'Condo', 'Landlord / dwelling fire', 'Umbrella', 'Life'] as const;
export const LINE_LABEL: Record<string, string> = { Home: 'Homeowners', 'Landlord / dwelling fire': 'Landlord' };
export const lineLabel = (l: string) => LINE_LABEL[l] ?? l;

/** One policy sold on a match. A match can have several (e.g. auto now, life months later). */
export interface PolicySale { id: string; matchId: string; line: string; soldAt: string }

/** Raw data behind the admin Sales Insights screen. */
export interface InsightsData {
  leads: { matchId: string; agentId: string; agentName: string; matchedAt: string; requested: string[]; status: MatchStatus }[];
  sales: { matchId: string; agentId: string; agentName: string; line: string; matchedAt: string; soldAt: string }[];
}

/**
 * low_fit  = best match is under the threshold; policyholder is choosing (match anyway / wait)
 * waiting  = policyholder chose to wait in the queue for a better match
 */
export type MatchStatus = 'low_fit' | 'waiting' | 'pending_approval' | 'active' | 'established' | 'reported' | 'replaced';
/** Statuses where the agent knows about the match (and contact info is shared). */
export const AGENT_VISIBLE: MatchStatus[] = ['active', 'established', 'reported', 'replaced'];
/** Statuses that count as the policyholder's current match / place in line. */
export const OPEN_FOR_POLICYHOLDER: MatchStatus[] = ['low_fit', 'waiting', 'pending_approval', 'active', 'established'];

export interface Match {
  id: string;
  policyholderId: string;
  agentId: string;
  score: number;
  matchedBy: 'Formula' | 'Admin';
  status: MatchStatus;
  createdAt: string;
  contactedAt?: string;
  milestones: Partial<Record<MilestoneKey, string>>; // ISO timestamps
  /** Policies sold on this match, by line. The first one sets the "Policy sold" milestone. */
  sales?: PolicySale[];
  establishedAt?: string;
  /** What fits and what doesn't, in plain language (no agent identity). */
  fit?: FitItem[];
  // Joined data (only what each side is allowed to see)
  policyholder?: { fullName: string; email?: string; phone?: string; quiz: PolicyholderQuiz };
  agent?: { fullName: string; email?: string; phone?: string; contactMethod: string; languages: string[] };
}

export interface LeadRating {
  id: string;
  matchId: string;
  fit: number; // 1–5 (same as the agent check-in form)
  vsUsual: 'Better' | 'About the same' | 'Worse';
  note?: string;
  createdAt: string;
}

export interface Review {
  matchId: string;
  ease: number; // 1–5 (same as the policyholder check-in form)
  wouldRecommend: boolean;
  comment?: string;
  createdAt: string;
}

export interface LeadReport {
  id: string;
  matchId: string;
  agentId: string;
  reason: string;
  details?: string;
  status: 'open' | 'approved' | 'denied';
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export type ActivityType =
  | 'match_suggested' | 'match_approved' | 'contacted' | 'milestone' | 'rated' | 'reported'
  | 'report_resolved' | 'review' | 'established' | 'message';

export interface Activity {
  id: string;
  type: ActivityType;
  matchId?: string;
  actorName: string;
  text: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  kind: 'established' | 'matched' | 'milestone' | 'message';
  title: string;
  body: string;
  matchId?: string;
  read: boolean;
  createdAt: string;
}

export type AgentQuiz = Omit<AgentProfile, 'id' | 'name' | 'verified' | 'matchedThisMonth' | 'monthlyCap'> & {
  fullName: string;
  license: string;
  phone?: string;
};
export type PolicyholderQuiz = PolicyholderProfile & { fullName: string; phone?: string; zip?: string };

export interface PendingMatch {
  match: Match;
  /** approval = ready for you; deciding = policyholder choosing; waiting = in the queue for a better match */
  queue: 'approval' | 'deciding' | 'waiting';
  policyholderName: string;
  suggestedAgentName: string | null;
  candidates: { agentId: string; name: string; score: number; reasons: string[] }[];
}

/** Admin view of one policyholder and where they are in matching. */
export interface AdminPolicyholder {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  joinedAt?: string;
  quiz?: PolicyholderQuiz; // undefined = signed up but hasn't finished the quiz
  /** none = quiz done but never asked for a match */
  matchStatus: MatchStatus | 'none';
  matchId?: string;
  score?: number;
  agentName?: string;
  milestonesDone?: number;
}

export interface AdminAgent {
  id: string;
  fullName: string;
  email: string;
  license: string;
  verified: boolean;
  matchedThisMonth: number;
  monthlyCap: number;
  closed: number;
  plan?: string | null; // plan name + status, e.g. "Dialogue"
  standing: Standing;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
}

/** Everything the screens need. Implemented by the demo store and by Supabase. */
export interface Backend {
  mode: 'demo' | 'supabase';
  getUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string, role: Role, fullName: string): Promise<User>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;

  saveAgentQuiz(q: AgentQuiz): Promise<void>;
  savePolicyholderQuiz(q: PolicyholderQuiz): Promise<void>;
  getMyQuiz(): Promise<PolicyholderQuiz | AgentQuiz | null>;

  listMyMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | null>;
  markContacted(matchId: string): Promise<void>;
  logMilestone(matchId: string, key: 'call' | 'quote'): Promise<void>;
  /** Records the policies sold (by line). The first sale also completes the "Policy sold" milestone. */
  logSale(matchId: string, lines: string[]): Promise<void>;
  rateLead(matchId: string, r: Omit<LeadRating, 'id' | 'matchId' | 'createdAt'>): Promise<void>;
  listRatings(matchId: string): Promise<LeadRating[]>;
  reportLead(matchId: string, reason: string, details?: string): Promise<void>;
  getReport(matchId: string): Promise<LeadReport | null>;
  submitReview(matchId: string, r: Omit<Review, 'matchId' | 'createdAt'>): Promise<void>;
  requestMatch(): Promise<void>;
  /** Low-fit choices: go ahead with the best available agent, or wait in the queue. */
  acceptLowFit(matchId: string): Promise<void>;
  waitForBetter(matchId: string): Promise<void>;
  /** Re-run the formula now. Returns the new best score. */
  recheckMatch(matchId: string): Promise<number>;

  listMessages(matchId: string): Promise<Message[]>;
  sendMessage(matchId: string, body: string): Promise<void>;

  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;

  // Admin
  listPendingMatches(): Promise<PendingMatch[]>;
  approveMatch(matchId: string, agentId: string): Promise<void>;
  listReports(): Promise<(LeadReport & { agentName: string; policyholderName: string })[]>;
  resolveReport(reportId: string, approve: boolean): Promise<void>;
  listActivity(): Promise<Activity[]>;
  listAgents(): Promise<AdminAgent[]>;
  listPolicyholders(): Promise<AdminPolicyholder[]>;
  getInsightsData(): Promise<InsightsData>;
  setAgentVerified(agentId: string, verified: boolean): Promise<void>;

  // Agent plans & payment
  /** Starts checkout. Demo mode activates instantly; production returns a Stripe Checkout URL. */
  startCheckout(plan: PlanId): Promise<{ url?: string; activated?: boolean }>;
  requestFounding(): Promise<void>;
  getMyFoundingRequest(): Promise<FoundingRequest | null>;
  redeemFoundingCode(code: string): Promise<void>;
  listFoundingRequests(): Promise<FoundingRequest[]>;
  approveFounding(requestId: string): Promise<string>; // returns the code

  // Agent standards & terms
  getMyStanding(): Promise<Standing>;
  /** Records that the signed-in agent agreed to this version of the Agent Terms (server time). */
  acceptAgentTerms(version: string): Promise<void>;
  issueWarning(agentId: string, reason: string): Promise<void>;
  clearWarning(agentId: string): Promise<void>;
  /** Only allowed once the 30-day notice has run out. Cancels the subscription. */
  removeAgent(agentId: string): Promise<void>;

  /** Fires whenever data changes (realtime in Supabase, local in demo). Returns unsubscribe. */
  subscribe(cb: () => void): () => void;
}
