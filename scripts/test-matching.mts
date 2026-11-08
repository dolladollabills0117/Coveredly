// Sanity checks: the TypeScript port must give the same numbers as the Google Sheet formula.
import { scoreAgent, suggestAgent, type AgentProfile, type PolicyholderProfile } from '../supabase/functions/_shared/matching.ts';
import assert from 'node:assert/strict';

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
console.log('✓ matching formula matches the Google Sheet (11 checks)');
