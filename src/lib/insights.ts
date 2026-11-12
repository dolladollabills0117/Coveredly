/**
 * Sales Insights math: how long each line of business takes to sell, overall and per agent.
 * Pure functions (no React) so they can be unit tested.
 */
import type { InsightsData } from './types';

export type Range = '90d' | '12m' | 'all';
export const RANGE_LABEL: Record<Range, string> = { '90d': 'Last 90 days', '12m': 'Last 12 months', all: 'All time' };
/** Lines shown on the insights screen, in display order. */
export const INSIGHT_LINES = ['Auto', 'Home', 'Renters', 'Condo', 'Landlord / dwelling fire', 'Umbrella', 'Life'];
/** Sales needed before we suggest a data-based time window for a line. */
export const MIN_SALES_FOR_SUGGESTION = 5;

const DAY = 86400_000;
const daysBetween = (a: string, b: string) => Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / DAY);

export interface LineStats {
  line: string;
  sold: number;
  avgDays: number | null;
  medianDays: number | null;
  fastestDays: number | null;
  slowestDays: number | null;
  requested: number; // leads (in range) that asked for this line
  requestedAndSold: number; // ...that bought this line
  closeRate: number | null;
  /** Sales on leads the agent marked long-term (shopping around, or a longer sale like life). */
  longTermSold: number;
  longTermAvgDays: number | null;
  /** Days within which 80% of this line's sales closed, rounded up to 5. Null until there's enough data. */
  suggestedWindow: number | null;
}

export interface AgentStats { agentId: string; agentName: string; sold: number; avgDays: number | null; leads: number; leadsWithSale: number }

export interface Insights {
  totalSold: number;
  avgDays: number | null;
  leads: number;
  leadsWithSale: number;
  lines: LineStats[];
  agents: AgentStats[];
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}
const median = (sorted: number[]) => {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function computeInsights(data: InsightsData, opts: { range: Range; agentId?: string; now?: Date }): Insights {
  const now = (opts.now ?? new Date()).getTime();
  const since = opts.range === '90d' ? now - 90 * DAY : opts.range === '12m' ? now - 365 * DAY : -Infinity;
  const mine = <T extends { agentId: string }>(x: T) => !opts.agentId || x.agentId === opts.agentId;
  const sales = data.sales.filter((s) => mine(s) && new Date(s.soldAt).getTime() >= since);
  const leads = data.leads.filter((l) => mine(l) && new Date(l.matchedAt).getTime() >= since && l.status !== 'replaced');
  const allSalesByMatch = new Map<string, string[]>();
  data.sales.forEach((s) => allSalesByMatch.set(s.matchId, [...(allSalesByMatch.get(s.matchId) ?? []), s.line]));

  const lines: LineStats[] = INSIGHT_LINES.map((line) => {
    const days = sales.filter((s) => s.line === line).map((s) => daysBetween(s.matchedAt, s.soldAt)).sort((a, b) => a - b);
    const ltDays = sales.filter((s) => s.line === line && s.longTerm).map((s) => daysBetween(s.matchedAt, s.soldAt));
    const asked = leads.filter((l) => l.requested.includes(line));
    const bought = asked.filter((l) => (allSalesByMatch.get(l.matchId) ?? []).includes(line));
    const p80 = percentile(days, 0.8);
    return {
      line, sold: days.length, avgDays: avg(days), medianDays: median(days),
      fastestDays: days.length ? days[0] : null, slowestDays: days.length ? days[days.length - 1] : null,
      longTermSold: ltDays.length, longTermAvgDays: avg(ltDays),
      requested: asked.length, requestedAndSold: bought.length, closeRate: asked.length ? bought.length / asked.length : null,
      suggestedWindow: days.length >= MIN_SALES_FOR_SUGGESTION && p80 !== null ? Math.max(5, Math.ceil(p80 / 5) * 5) : null,
    };
  });

  const agentIds = [...new Set([...data.leads.map((l) => l.agentId), ...data.sales.map((s) => s.agentId)])];
  const agents: AgentStats[] = agentIds.map((id) => {
    const aSales = data.sales.filter((s) => s.agentId === id && new Date(s.soldAt).getTime() >= since);
    const aLeads = data.leads.filter((l) => l.agentId === id && new Date(l.matchedAt).getTime() >= since && l.status !== 'replaced');
    return {
      agentId: id,
      agentName: data.leads.find((l) => l.agentId === id)?.agentName ?? data.sales.find((s) => s.agentId === id)?.agentName ?? '',
      sold: aSales.length, avgDays: avg(aSales.map((s) => daysBetween(s.matchedAt, s.soldAt))),
      leads: aLeads.length, leadsWithSale: aLeads.filter((l) => allSalesByMatch.has(l.matchId)).length,
    };
  }).sort((a, b) => b.sold - a.sold);

  return {
    totalSold: sales.length,
    avgDays: avg(sales.map((s) => daysBetween(s.matchedAt, s.soldAt))),
    leads: leads.length,
    leadsWithSale: leads.filter((l) => allSalesByMatch.has(l.matchId)).length,
    lines, agents,
  };
}

export const fmtDays = (d: number | null) => (d === null ? '–' : d < 1 ? '<1 day' : `${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}`);
export const fmtPct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)}%`);
