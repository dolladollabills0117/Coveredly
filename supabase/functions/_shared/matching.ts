/**
 * Coveredly matching formula, ported 1:1 from the "Scores" tab of
 * Coveredly_Matching_Sheet (Google Sheets) and its "Key" tab.
 *
 * This file has NO imports so it runs unchanged in two places:
 *   - the mobile app (demo mode + previews), and
 *   - the Supabase Edge Function `match-policyholder` (production).
 *
 * To change how matching works, edit the tables in MATCHING_CONFIG below —
 * exactly like changing a number on the Key tab. To plug in a completely
 * different formula, replace `scoreAgent` (keep its signature).
 */

// ---------- Quiz answer vocabularies (exact text from the Tally quizzes) ----------

export const CONTACT_METHODS = ['Text or chat 💬', 'Phone call 📞', 'Email 📧', 'Video or in person 🎥'] as const;
export const PH_COVERAGE = ['Auto', 'Home', 'Renters', 'Condo', 'Umbrella', 'Landlord / dwelling fire', 'Life', 'Not sure yet'] as const;
export const PH_LANGUAGES = ['English', 'Spanish', 'Either one is fine', 'Other'] as const;
export const PH_EXPLAIN = ['Keep it short and simple', 'Walk me through it with examples', 'Give me every detail'] as const;
export const PH_DECISION = ['Tell me the best option', "Show me 2 or 3 and I'll pick", "Give me everything and I'll research it"] as const;
export const PH_TIMING = ['ASAP', 'Within a month', 'In 1 to 3 months', 'Just looking around'] as const;
export const PH_MATTERS = ['Best price', 'Someone I can trust', 'Fast answers'] as const;

export const AG_LANGUAGES = ['English', 'Spanish', 'Other'] as const;
export const AG_EXPLAIN = ['Short and simple', 'With examples and stories', 'Every detail'] as const;
export const AG_ADVISE = ['I recommend the best fit', 'I present 2 or 3 options', 'I lay it all out and they choose'] as const;
export const AG_SPEED = ['Within an hour', 'Same day', 'Next business day'] as const;
export const AG_LEAD_TYPE = ['Ready to buy now', 'Renewing soon', 'Still shopping around'] as const;
export const AG_LINES = ['Auto', 'Home, renters or condo', 'Landlord / dwelling fire', 'Umbrella', 'Life'] as const;

// ---------- Profiles ----------

export interface PolicyholderProfile {
  state: string; // e.g. "New Jersey"
  county?: string;
  coverage: string[]; // PH_COVERAGE values
  language: string; // PH_LANGUAGES value, or the typed-in language
  contactMethod: string;
  explainStyle: string;
  decisionStyle: string;
  timing: string;
  mattersMost: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  verified: boolean; // admin checked the NJ license
  subscribed?: boolean; // has an active paid plan (false = never matched)
  licensedStates: string[]; // location hard rule
  counties?: string[]; // optional, used only to break ties
  contactMethod: string;
  languages: string[]; // e.g. ["English","Spanish","Portuguese"]
  explains: string;
  advises: string;
  speed: string;
  bestLeadType: string;
  lines: string[]; // AG_LINES values
  monthlyCap: number;
  matchedThisMonth: number;
}

// ---------- The Key tab ----------

type Grid = Record<string, Record<string, number>>;

export const MATCHING_CONFIG = {
  weights: {
    coverageFit: 25,
    contactMethod: 20,
    explainStyle: 15,
    decisionStyle: 15,
    timingFit: 10,
    speedIfFastAnswers: 15,
    speedEveryoneElse: 5,
  },
  // rows = policyholder, columns = agent
  contact: {
    'Text or chat 💬': { 'Text or chat 💬': 1, 'Phone call 📞': 0, 'Email 📧': 0.5, 'Video or in person 🎥': 0 },
    'Phone call 📞': { 'Text or chat 💬': 0, 'Phone call 📞': 1, 'Email 📧': 0, 'Video or in person 🎥': 0.5 },
    'Email 📧': { 'Text or chat 💬': 0.5, 'Phone call 📞': 0, 'Email 📧': 1, 'Video or in person 🎥': 0 },
    'Video or in person 🎥': { 'Text or chat 💬': 0, 'Phone call 📞': 0.5, 'Email 📧': 0, 'Video or in person 🎥': 1 },
  } as Grid,
  explain: {
    'Keep it short and simple': { 'Short and simple': 1, 'With examples and stories': 0.5, 'Every detail': 0 },
    'Walk me through it with examples': { 'Short and simple': 0.5, 'With examples and stories': 1, 'Every detail': 0.5 },
    'Give me every detail': { 'Short and simple': 0, 'With examples and stories': 0.5, 'Every detail': 1 },
  } as Grid,
  decision: {
    'Tell me the best option': { 'I recommend the best fit': 1, 'I present 2 or 3 options': 0.5, 'I lay it all out and they choose': 0 },
    "Show me 2 or 3 and I'll pick": { 'I recommend the best fit': 0.5, 'I present 2 or 3 options': 1, 'I lay it all out and they choose': 0.5 },
    "Give me everything and I'll research it": { 'I recommend the best fit': 0, 'I present 2 or 3 options': 0.5, 'I lay it all out and they choose': 1 },
  } as Grid,
  timing: {
    ASAP: { 'Ready to buy now': 1, 'Renewing soon': 0.5, 'Still shopping around': 0 },
    'Within a month': { 'Ready to buy now': 1, 'Renewing soon': 0.5, 'Still shopping around': 0 },
    'In 1 to 3 months': { 'Ready to buy now': 0.5, 'Renewing soon': 1, 'Still shopping around': 0.5 },
    'Just looking around': { 'Ready to buy now': 0, 'Renewing soon': 0.5, 'Still shopping around': 1 },
  } as Grid,
  speedCredit: { 'Within an hour': 1, 'Same day': 0.5, 'Next business day': 0 } as Record<string, number>,
  /** Location hard rule: agent must be licensed in the policyholder's state. */
  requireLicensedInState: true,
  /** States Coveredly currently serves (the quiz turns everyone else away). */
  servedStates: ['New Jersey'],
};

const has = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());

export interface ScoreResult {
  agentId: string;
  score: number; // 0–100, or -1 if the agent fails a hard rule
  reasons: string[]; // why an agent was skipped (for the admin screen)
  breakdown?: Record<string, number>;
}

/** Same math as the Scores tab formula. */
export function scoreAgent(ph: PolicyholderProfile, ag: AgentProfile, cfg = MATCHING_CONFIG): ScoreResult {
  const cov = ph.coverage.join(', ');
  const lines = ag.lines.join(', ');
  const nAuto = +has(cov, 'Auto');
  const nHome = +(has(cov, 'Home') || has(cov, 'Renters') || has(cov, 'Condo'));
  const nUmb = +has(cov, 'Umbrella');
  const nLife = +has(cov, 'Life');
  // Landlord / dwelling fire is its own line (not counted on the original sheet).
  const nLandlord = +has(cov, 'Landlord');
  const need = nAuto + nHome + nUmb + nLife + nLandlord;
  const haveLines = nAuto * +has(lines, 'Auto') + nHome * +has(lines, 'Home') + nUmb * +has(lines, 'Umbrella') + nLife * +has(lines, 'Life')
    + nLandlord * +has(lines, 'Landlord');

  const reasons: string[] = [];
  if (!ag.verified) reasons.push('Agent not verified');
  if (ag.subscribed === false) reasons.push('No active plan');
  if (!(ag.matchedThisMonth < ag.monthlyCap)) reasons.push('Agent is at monthly cap');
  const langOk = ph.language === 'Either one is fine' || has(ag.languages.join(', '), ph.language);
  if (!langOk) reasons.push(`Doesn't speak ${ph.language}`);
  if (!(need === 0 || haveLines > 0)) reasons.push("Doesn't write any requested line");
  if (cfg.requireLicensedInState && !ag.licensedStates.some((s) => s.toLowerCase() === ph.state.toLowerCase()))
    reasons.push(`Not licensed in ${ph.state}`);
  if (reasons.length) return { agentId: ag.id, score: -1, reasons };

  const w = cfg.weights;
  const sw = ph.mattersMost === 'Fast answers' ? w.speedIfFastAnswers : w.speedEveryoneElse;
  const b = {
    coverageFit: w.coverageFit * (need === 0 ? 1 : haveLines / need),
    contactMethod: w.contactMethod * (cfg.contact[ph.contactMethod]?.[ag.contactMethod] ?? 0),
    explainStyle: w.explainStyle * (cfg.explain[ph.explainStyle]?.[ag.explains] ?? 0),
    decisionStyle: w.decisionStyle * (cfg.decision[ph.decisionStyle]?.[ag.advises] ?? 0),
    timingFit: w.timingFit * (cfg.timing[ph.timing]?.[ag.bestLeadType] ?? 0),
    speed: sw * (cfg.speedCredit[ag.speed] ?? 0),
  };
  const pts = Object.values(b).reduce((a, x) => a + x, 0);
  const mx = w.coverageFit + w.contactMethod + w.explainStyle + w.decisionStyle + w.timingFit + sw;
  return { agentId: ag.id, score: Math.round((1000 * pts) / mx) / 10, reasons, breakdown: b };
}

/**
 * Ranks every agent. Highest score wins (same as MAX + MATCH on the Matches tab).
 * Ties are broken by: same county first, then the agent with fewer matches this month.
 */
export function rankAgents(ph: PolicyholderProfile, agents: AgentProfile[], cfg = MATCHING_CONFIG) {
  const byId = new Map(agents.map((a) => [a.id, a]));
  return agents
    .map((a) => scoreAgent(ph, a, cfg))
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      const ax = byId.get(x.agentId)!, ay = byId.get(y.agentId)!;
      const cx = +!!(ph.county && ax.counties?.includes(ph.county));
      const cy = +!!(ph.county && ay.counties?.includes(ph.county));
      if (cy !== cx) return cy - cx;
      return ax.matchedThisMonth - ay.matchedThisMonth;
    });
}

/** Returns the suggested agent, or null for "No eligible agent". */
export function suggestAgent(ph: PolicyholderProfile, agents: AgentProfile[], cfg = MATCHING_CONFIG) {
  const top = rankAgents(ph, agents, cfg)[0];
  return top && top.score >= 0 ? top : null;
}

// ---------- Fit quality ----------

/**
 * Minimum score for a "good" match. Below this, the policyholder is told their best
 * match right now is less compatible, and chooses: match anyway, or wait in the queue.
 */
export const GOOD_MATCH_THRESHOLD = 80;

export type FitLevel = 'great' | 'partial' | 'miss';
export interface FitItem { label: string; level: FitLevel }

const FIT_LABELS: Record<string, string> = {
  coverageFit: 'Writes the coverage you need',
  contactMethod: 'How you want to be contacted',
  explainStyle: 'How things get explained',
  decisionStyle: 'How you like to decide',
  timingFit: 'Your timing',
  speed: 'How fast they reply',
};

/** Plain-language summary of a score (safe to show the policyholder: no agent identity). */
export function fitSummary(r: ScoreResult, ph: PolicyholderProfile, cfg = MATCHING_CONFIG): FitItem[] {
  if (!r.breakdown) return [];
  const w = cfg.weights;
  const max: Record<string, number> = {
    coverageFit: w.coverageFit, contactMethod: w.contactMethod, explainStyle: w.explainStyle, decisionStyle: w.decisionStyle,
    timingFit: w.timingFit, speed: ph.mattersMost === 'Fast answers' ? w.speedIfFastAnswers : w.speedEveryoneElse,
  };
  return Object.entries(r.breakdown).map(([k, v]) => ({
    label: FIT_LABELS[k] ?? k,
    level: v >= max[k] - 1e-9 ? 'great' : v > 0 ? 'partial' : 'miss',
  }));
}
