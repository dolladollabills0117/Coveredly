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
export interface StandingCheck { id: string; label: string; value: string; target: string; ok: boolean }
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

export function computeStanding(input: StandingInput, cfg = STANDARDS): Standing {
  const now = (input.now ?? new Date()).getTime();
  const t = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);
  const counted = input.leads.filter((l) => l.status === 'active' || l.status === 'established');
  const open = counted.filter((l) => l.status === 'active' && !l.soldAt);

  // 1. Prompt first contact
  const contactHours = counted.filter((l) => l.contactedAt).map((l) => (t(l.contactedAt) - t(l.matchedAt)) / H).filter((h) => h >= 0);
  const idle = open.filter((l) => !l.contactedAt && now - t(l.matchedAt) > cfg.contactWithinHours * H);
  const avgHours = contactHours.length ? contactHours.reduce((a, b) => a + b, 0) / contactHours.length : null;
  const c1: StandingCheck = {
    id: 'contact', label: 'Reaches new leads quickly', target: `Every new lead within ${cfg.contactWithinHours / 24} days`,
    ok: idle.length === 0,
    value: idle.length ? `${idle.length} lead${idle.length > 1 ? 's' : ''} not contacted yet`
      : avgHours === null ? 'No leads yet' : avgHours < 24 ? `${avgHours.toFixed(1)} hrs on average` : `${(avgHours / 24).toFixed(1)} days on average`,
  };

  // 2. Relationship maintenance
  const followed = open.filter((l) => l.lastTouchAt && now - t(l.lastTouchAt) <= cfg.followUpDays * D);
  const followRate = open.length ? followed.length / open.length : 1;
  const c2: StandingCheck = {
    id: 'followup', label: 'Keeps relationships warm', target: `${pct(cfg.minFollowUpRate)}+ of open leads contacted in the last ${cfg.followUpDays} days`,
    ok: open.length === 0 || followRate >= cfg.minFollowUpRate,
    value: open.length ? `${followed.length} of ${open.length} open leads (${pct(followRate)})` : 'No open leads',
  };

  // 3. Reviews
  const n = input.reviewScores.length;
  const avg = n ? input.reviewScores.reduce((a, b) => a + b, 0) / n : null;
  const c3: StandingCheck = {
    id: 'reviews', label: 'Earns great reviews', target: `${cfg.minReviewAvg}/5 or higher (after ${cfg.minReviewsToJudge} reviews)`,
    ok: n < cfg.minReviewsToJudge || (avg ?? 5) >= cfg.minReviewAvg,
    value: avg === null ? 'No reviews yet' : `${avg.toFixed(1)}/5 from ${n} review${n > 1 ? 's' : ''}`,
  };

  // 4. Closing
  const judged = counted.filter((l) => now - t(l.matchedAt) >= cfg.closeJudgeAfterDays * D);
  const sold = judged.filter((l) => l.soldAt).length;
  const closeRate = judged.length ? sold / judged.length : 0;
  const allSold = counted.filter((l) => l.soldAt).length;
  const c4: StandingCheck = {
    id: 'closing', label: 'Closes consistently', target: `${pct(cfg.minCloseRate)}+ of leads sold (after ${cfg.minLeadsToJudgeClose} leads)`,
    ok: judged.length < cfg.minLeadsToJudgeClose || closeRate >= cfg.minCloseRate,
    value: judged.length >= cfg.minLeadsToJudgeClose ? `${pct(closeRate)} sold (${sold} of ${judged.length})` : `${allSold} sold so far`,
  };

  // 5. Activity
  const touches = counted.map((l) => t(l.lastTouchAt ?? l.contactedAt)).filter((x) => !Number.isNaN(x));
  const lastTouch = touches.length ? Math.max(...touches) : NaN;
  const daysIdle = Number.isNaN(lastTouch) ? null : Math.floor((now - lastTouch) / D);
  const c5: StandingCheck = {
    id: 'active', label: 'Stays active', target: `Activity at least every ${cfg.idleDays} days while you have open leads`,
    ok: open.length === 0 || (daysIdle !== null && daysIdle <= cfg.idleDays) || (daysIdle === null && idle.length === 0),
    value: daysIdle === null ? 'No activity yet' : daysIdle === 0 ? 'Active today' : `Last active ${daysIdle} day${daysIdle > 1 ? 's' : ''} ago`,
  };

  const checks = [c1, c2, c3, c4, c5];
  const base: Standing = { status: checks.every((c) => c.ok) ? 'good' : 'attention', checks };
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
