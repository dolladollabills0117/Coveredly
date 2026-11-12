// Sanity checks: the TypeScript port must give the same numbers as the Google Sheet formula.
import { fitSummary, scoreAgent, suggestAgent, type AgentProfile, type PolicyholderProfile } from '../supabase/functions/_shared/matching.ts';
import assert from 'node:assert/strict';
import { computeStanding } from '../supabase/functions/_shared/standing.ts';

const ph: PolicyholderProfile = { state: 'New Jersey', county: 'Essex', coverage: ['Auto', 'Renters'], language: 'Spanish',
  contactMethod: 'Text or chat 💬', explainStyle: 'Walk me through it with examples', decisionStyle: "Show me 2 or 3 and I'll pick",
  timing: 'ASAP', mattersMost: 'Fast answers' };
const base: AgentProfile = { id: 'a', name: 'A', verified: true, licensedStates: ['New Jersey'], contactMethod: 'Email 📧',
  languages: ['English', 'Spanish'], explains: 'Short and simple', advises: 'I present 2 or 3 options', speed: 'Same day',
  bestLeadType: 'Renewing soon', lines: ['Auto'], monthlyCap: 6, matchedThisMonth: 0 };

// Hand calc (sheet): cov 25*1/2=12.5, contact 20*.5=10, explain 15*.5=7.5, decision 15*1=15, timing 10*.5=5, speed 15*.5=7.5
// pts=57.5, max=100 -> 57.5
assert.equal(scoreAgent(ph, base).score, 57.5);
// Not "Fast answers": speed weight 5, max 90. pts = 12.5+10+7.5+15+5+2.5 = 52.5 -> 58.3
assert.equal(scoreAgent({ ...ph, mattersMost: 'Best price' }, base).score, 58.3);
// Hard rules
assert.equal(scoreAgent(ph, { ...base, languages: ['English'] }).score, -1);
assert.equal(scoreAgent(ph, { ...base, verified: false }).score, -1);
assert.equal(scoreAgent(ph, { ...base, matchedThisMonth: 6 }).score, -1);
assert.equal(scoreAgent(ph, { ...base, subscribed: false }).score, -1);
assert.equal(scoreAgent(ph, { ...base, lines: ['Life'] }).score, -1);
assert.equal(scoreAgent(ph, { ...base, licensedStates: ['New York'] }).score, -1);
assert.equal(scoreAgent({ ...ph, language: 'Either one is fine' }, { ...base, languages: ['English'] }).score, 57.5);
// Perfect agent = 100
const perfect = { ...base, id: 'p', contactMethod: 'Text or chat 💬', explains: 'With examples and stories', speed: 'Within an hour',
  bestLeadType: 'Ready to buy now', lines: ['Auto', 'Home, renters or condo'] };
assert.equal(scoreAgent(ph, perfect).score, 100);
assert.equal(suggestAgent(ph, [base, perfect])?.agentId, 'p');
assert.equal(suggestAgent(ph, [{ ...base, verified: false }]), null);
// Landlord / dwelling fire: only agents who write it qualify; half credit when they write 1 of 2 needed lines
const landlordPh = { ...ph, coverage: ['Landlord / dwelling fire'] };
assert.equal(scoreAgent(landlordPh, base).score, -1);
assert.ok(scoreAgent(landlordPh, { ...base, lines: ['Landlord / dwelling fire'] }).score > 0);
const both = { ...ph, coverage: ['Auto', 'Landlord / dwelling fire'] };
assert.equal(scoreAgent(both, base).breakdown!.coverageFit, 12.5);
const fit = fitSummary(scoreAgent(ph, base), ph);
assert.deepEqual(fit.map((f) => f.level), ['partial', 'partial', 'partial', 'great', 'partial', 'partial']);
assert.ok(fitSummary(scoreAgent(ph, perfect), ph).every((f) => f.level === 'great'));
// ---- Agent standing
const now = new Date('2026-11-12T12:00:00Z');
const ago = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString();
const good = computeStanding({ now, reviewScores: [5, 4, 5], leads: [
  { status: 'active', matchedAt: ago(5), contactedAt: ago(4.9), lastTouchAt: ago(1) },
  { status: 'established', matchedAt: ago(40), contactedAt: ago(39.9), soldAt: ago(20), lastTouchAt: ago(20) },
] });
assert.equal(good.status, 'good');
const idle = computeStanding({ now, reviewScores: [], leads: [{ status: 'active', matchedAt: ago(5) }] });
assert.equal(idle.status, 'attention');
assert.equal(idle.checks.find((c) => c.id === 'contact')!.ok, false);
const badReviews = computeStanding({ now, reviewScores: [2, 2, 3], leads: [] });
assert.equal(badReviews.checks.find((c) => c.id === 'reviews')!.ok, false);
assert.equal(computeStanding({ now, reviewScores: [1, 1], leads: [] }).checks.find((c) => c.id === 'reviews')!.ok, true); // too few to judge
const noClose = computeStanding({ now, reviewScores: [], leads: Array.from({ length: 6 }, () => ({ status: 'active', matchedAt: ago(45), contactedAt: ago(44), lastTouchAt: ago(2) })) });
assert.equal(noClose.checks.find((c) => c.id === 'closing')!.ok, false);
const warned = computeStanding({ now, reviewScores: [], leads: [], warningAt: ago(10), warningReason: 'test' });
assert.equal(warned.status, 'warning');
assert.equal(warned.warningDaysLeft, 20);
assert.equal(computeStanding({ now, reviewScores: [], leads: [], warningAt: ago(31) }).warningDaysLeft, 0);
console.log('✓ matching formula matches the Google Sheet (16 checks)');
console.log('✓ agent standing rules (9 checks)');
