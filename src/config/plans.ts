// Agent subscription plans. Prices are display copy; the real charge comes from the
// matching Stripe Price (see README → Payments). Leads per month = the agent's monthly cap.
export type PlanId = 'rapport' | 'dialogue' | 'fluency' | 'founding';

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // USD per month
  leads: number; // matched leads per month
  blurb: string;
  badge?: string;
}

export const PLANS: Plan[] = [
  { id: 'rapport', name: 'Rapport', price: 99, leads: 6, blurb: 'Build your book one great-fit conversation at a time.' },
  { id: 'dialogue', name: 'Dialogue', price: 189, leads: 12, blurb: 'A steady flow of matched leads for a growing practice.', badge: 'Most popular' },
  { id: 'fluency', name: 'Fluency', price: 349, leads: 24, blurb: 'For high-volume agents ready to say yes to every match.', badge: 'Best value per lead' },
];

export const FOUNDING_PLAN: Plan = {
  id: 'founding', name: 'Founding Agent', price: 39, leads: 6, blurb: 'Locked in for life for our founding agents, as long as you meet our Agent Standards.', badge: 'Invite only',
};

export const planById = (id?: string | null) => [...PLANS, FOUNDING_PLAN].find((p) => p.id === id);
