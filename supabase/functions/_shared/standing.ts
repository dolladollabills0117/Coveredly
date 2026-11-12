/**
 * Agent Standards: the numbers behind each agent's "standing", plus the version of the
 * Agent Terms they must agree to. No imports, so the app and the Edge Functions share it.
 *
 * Change a target here and the Agent Standards page, the standing card and the admin
 * view all update together.
 */

/** Bump this (YYYY-MM-DD) whenever src/config/agentTerms.ts changes. Agents are asked to agree again. */
export const AGENT_TERMS_VERSION = '2026-11-12';

export const STANDARDS = {
  contactWithinHours: 72, // reach every new lead within 3 days
  followUpDays: 30, // each open lead gets some contact at least every 30 days...
  minFollowUpRate: 0.75, // ...for at least 75% of open leads
  minReviewAvg: 3, // average policyholder review (1–5)...
  minReviewsToJudge: 3, // ...once there are at least 3 reviews
  minCloseRate: 0.15, // at least 15% of leads become a sold policy...
  minLeadsToJudgeClose: 6, // ...once 6+ leads are at least...
  closeJudgeAfterDays: 30, // ...30 days old
  idleDays: 14, // no activity at all for 14 days while holding open leads = idle
  warningDays: 30, // notice period before removal
};

export interface StandingLead {
  status: string; // match status
  matchedAt: string;
  contactedAt?: string;
  soldAt?: string;
  lastTouchAt?: string; // latest call/quote/sale/message/rating by the agent
  /** Agent marked this lead as long-term (shopping around, or a longer sale like life). */
  longTerm?: boolean;
}

export interface StandingInput {
  leads: StandingLead[];
  reviewScores: number[]; // policyholder review "ease" scores, 1–5
  warningAt?: string;
  warningReason?: string;
  removedAt?: string;
  now?: Date;
}

export type StandingStatus = 'good' | 'attention' | 'warning' | 'removed';
/**
 * standing = can affect the agent's spot (shown with a red ! when not met)
 * progress = sales in progress; shown calmly and never affects standing
 */
export type StandingKind = 'standing' | 'progress';
export interface StandingCheck {
  id: string; kind: StandingKind; label: string; value: string; target: string; ok: boolean;
  /** progress checks: how many leads are still being worked (shows the calm half circle). */
  inProgress?: number;
}
export interface Standing {
  status: StandingStatus;
  checks: StandingCheck[];
  warningAt?: string;
  warningReason?: string;
  warningDaysLeft?: number;
  removedAt?: string;
}

const H = 3600_000;
const D = 24 * H;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function computeStanding(input: StandingInput, cfg = STANDARDS): Standing {
  const now = (input.now ?? new Date()).getTime();
  const t = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);
  const counted = input.leads.filter((l) => l.status === 'active' || l.status === 'established');
  const open = counted.filter((l) => l.status === 'active' && !l.soldAt);

  // 1. First contact (applies to every lead, long-term or not)
  const contactHours = counted.filter((l) => l.contactedAt).map((l) => (t(l.contactedAt) - t(l.matchedAt)) / H).filter((h) => h >= 0);
  const idle = open.filter((l) => !l.contactedAt && now - t(l.matchedAt) > cfg.contactWithinHours * H);
  const avgHours = contactHours.length ? contactHours.reduce((a, b) => a + b, 0) / contactHours.length : null;
  const c1: StandingCheck = {
    id: 'contact', kind: 'standing', label: 'Reaching out to new leads', target: `Say hello within ${cfg.contactWithinHours / 24} days of a match`,
    ok: idle.length === 0,
    value: idle.length ? `${plural(idle.length, 'new lead')} still waiting to hear from you`
      : avgHours === null ? 'No leads yet' : `You usually reach out in ${avgHours < 24 ? `${avgHours.toFixed(1)} hours` : `${(avgHours / 24).toFixed(1)} days`}`,
  };

  // 2. Staying in touch (long-term leads get twice as long between check-ins)
  const windowFor = (l: StandingLead) => (l.longTerm ? cfg.followUpDays * 2 : cfg.followUpDays) * D;
  // A lead is "in touch" if there was contact within its window, or it was matched within that window
  // (a brand-new lead can't be overdue for a check-in yet).
  const followed = open.filter((l) => (l.lastTouchAt && now - t(l.lastTouchAt) <= windowFor(l)) || now - t(l.matchedAt) <= windowFor(l));
  const followRate = open.length ? followed.length / open.length : 1;
  const c2: StandingCheck = {
    id: 'followup', kind: 'standing', label: 'Staying in touch',
    target: `A check-in with most open leads every ${cfg.followUpDays} days (${cfg.followUpDays * 2} for long-term leads)`,
    ok: open.length === 0 || followRate >= cfg.minFollowUpRate,
    value: open.length ? `In touch with ${followed.length} of ${open.length} open leads` : 'No open leads right now',
  };

  // 3. Reviews
  const n = input.reviewScores.length;
  const avg = n ? input.reviewScores.reduce((a, b) => a + b, 0) / n : null;
  const c3: StandingCheck = {
    id: 'reviews', kind: 'standing', label: 'Client reviews', target: `${cfg.minReviewAvg}/5 or higher once you have ${cfg.minReviewsToJudge} reviews`,
    ok: n < cfg.minReviewsToJudge || (avg ?? 5) >= cfg.minReviewAvg,
    value: avg === null ? 'No reviews yet' : `${avg.toFixed(1)}/5 from ${plural(n, 'review')}`,
  };

  // 4. Activity
  const touches = counted.map((l) => t(l.lastTouchAt ?? l.contactedAt)).filter((x) => !Number.isNaN(x));
  const lastTouch = touches.length ? Math.max(...touches) : NaN;
  const daysIdle = Number.isNaN(lastTouch) ? null : Math.floor((now - lastTouch) / D);
  const c4: StandingCheck = {
    id: 'active', kind: 'standing', label: 'Staying active', target: `Some activity every ${cfg.idleDays} days while you have open leads`,
    ok: open.length === 0 || (daysIdle !== null && daysIdle <= cfg.idleDays) || (daysIdle === null && idle.length === 0),
    value: daysIdle === null ? 'No activity yet' : daysIdle === 0 ? 'Active today' : `Last active ${plural(daysIdle, 'day')} ago`,
  };

  // 5. Sales in progress: shown calmly, never affects standing. Long-term leads aren't counted.
  const regular = counted.filter((l) => !l.longTerm);
  const judged = regular.filter((l) => now - t(l.matchedAt) >= cfg.closeJudgeAfterDays * D);
  const sold = judged.filter((l) => l.soldAt).length;
  const closeRate = judged.length ? sold / judged.length : 0;
  const allSold = counted.filter((l) => l.soldAt).length;
  const longTermOpen = open.filter((l) => l.longTerm).length;
  const c5: StandingCheck = {
    id: 'closing', kind: 'progress', label: 'Policies sold',
    target: `Around ${pct(cfg.minCloseRate)} of leads over time. Long-term leads aren't counted.`,
    ok: judged.length < cfg.minLeadsToJudgeClose || closeRate >= cfg.minCloseRate,
    inProgress: open.length,
    value: [
      open.length ? `Working on ${plural(open.length, 'open lead')}${longTermOpen ? ` (${longTermOpen} long-term)` : ''}` : null,
      allSold === 1 ? '1 client has bought a policy so far' : `${allSold} clients have bought a policy so far`,
    ].filter(Boolean).join(' · '),
  };

  const checks = [c1, c2, c3, c4, c5];
  // Only "standing" checks can change the agent's status. Sales in progress never do.
  const base: Standing = { status: checks.every((c) => c.ok || c.kind === 'progress') ? 'good' : 'attention', checks };
  if (input.removedAt) return { ...base, status: 'removed', removedAt: input.removedAt };
  if (input.warningAt) {
    const left = Math.max(0, Math.ceil((t(input.warningAt) + cfg.warningDays * D - now) / D));
    return { ...base, status: 'warning', warningAt: input.warningAt, warningReason: input.warningReason, warningDaysLeft: left };
  }
  return base;
}

/** Latest of several ISO timestamps (ignores blanks). */
export function latest(...isos: (string | undefined | null)[]) {
  const xs = isos.filter(Boolean) as string[];
  return xs.length ? xs.reduce((a, b) => (a > b ? a : b)) : undefined;
}
