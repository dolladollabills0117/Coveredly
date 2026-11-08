import type { AgentProfile, PolicyholderProfile } from '../../supabase/functions/_shared/matching';

export type Role = 'agent' | 'policyholder' | 'admin';

export interface User {
  id: string;
  role: Role;
  email: string;
  fullName: string;
  phone?: string;
  quizDone: boolean;
}

/** The four milestones a match must hit to become "Established". */
export const MILESTONES = [
  { key: 'call', label: 'Initial phone call', icon: 'call-outline', by: 'agent' },
  { key: 'quote', label: 'Quote delivered', icon: 'document-text-outline', by: 'agent' },
  { key: 'sold', label: 'Policy sold', icon: 'shield-checkmark-outline', by: 'agent' },
  { key: 'review', label: 'Review left', icon: 'star-outline', by: 'policyholder' },
] as const;
export type MilestoneKey = (typeof MILESTONES)[number]['key'];

export type MatchStatus = 'pending_approval' | 'active' | 'established' | 'reported' | 'replaced';

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
  establishedAt?: string;
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
  policyholderName: string;
  suggestedAgentName: string | null;
  candidates: { agentId: string; name: string; score: number; reasons: string[] }[];
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
  logMilestone(matchId: string, key: Exclude<MilestoneKey, 'review'>): Promise<void>;
  rateLead(matchId: string, r: Omit<LeadRating, 'id' | 'matchId' | 'createdAt'>): Promise<void>;
  listRatings(matchId: string): Promise<LeadRating[]>;
  reportLead(matchId: string, reason: string, details?: string): Promise<void>;
  getReport(matchId: string): Promise<LeadReport | null>;
  submitReview(matchId: string, r: Omit<Review, 'matchId' | 'createdAt'>): Promise<void>;
  requestMatch(): Promise<void>;

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
  setAgentVerified(agentId: string, verified: boolean): Promise<void>;

  /** Fires whenever data changes (realtime in Supabase, local in demo). Returns unsubscribe. */
  subscribe(cb: () => void): () => void;
}
