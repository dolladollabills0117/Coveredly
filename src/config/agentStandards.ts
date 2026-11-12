/**
 * Agent Standards page copy. The targets come from STANDARDS so the page always
 * matches what the standing card measures.
 */
import { STANDARDS } from '../../supabase/functions/_shared/standing';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export const STANDARDS_INTRO =
  'Coveredly caps the number of leads each agent receives so every agent on the platform gets real opportunities. Because spots are limited, we save them for agents who give every policyholder a great experience.';

export const STANDARDS_LOOK_FOR = [
  { icon: 'flash-outline', title: 'Prompt service', body: `You reach every new lead within ${STANDARDS.contactWithinHours / 24} days (sooner is better), the way they asked to be contacted.` },
  { icon: 'leaf-outline', title: 'Relationship building', body: `You stay in touch, including with leads who are still shopping around. We look for contact with at least ${pct(STANDARDS.minFollowUpRate)} of your open leads every ${STANDARDS.followUpDays} days.` },
  { icon: 'trending-up-outline', title: 'Consistent results', body: `Over time, your leads turn into quotes and policies. Once you have ${STANDARDS.minLeadsToJudgeClose} or more leads that are at least ${STANDARDS.closeJudgeAfterDays} days old, we look for at least ${pct(STANDARDS.minCloseRate)} of them sold.` },
  { icon: 'star-outline', title: 'Great reviews', body: `Policyholders rate their experience after every match. We look for an average of ${STANDARDS.minReviewAvg} out of 5 or higher once you have ${STANDARDS.minReviewsToJudge} reviews.` },
  { icon: 'pulse-outline', title: 'Staying active', body: `While you have open leads, we look for activity at least every ${STANDARDS.idleDays} days.` },
];

export const STANDARDS_STANDING =
  'Your Profile shows a "Your standing" card with each of these measures, so you always know where you stand. Nothing on it is hidden from you.';

export const STANDARDS_REMOVAL = [
  'We reserve the right to suspend or remove any agent from Coveredly who is inactive or does not respond to matched leads, receives consistently poor reviews, does not keep up with relationship maintenance, or otherwise does not meet these standards. This makes sure we never take an opportunity away from a great agent who would make the most of it.',
  `Before removing you for not meeting these standards, we will send you a written notice in the app explaining why and give you ${STANDARDS.warningDays} days to improve. If you improve, we clear the notice.`,
  'We may suspend or remove an agent immediately, without a notice period, for serious misconduct: a lapsed or revoked license, fraud or misrepresentation, harassment, misuse of policyholder information, or a violation of law.',
  'If you are removed, your subscription is canceled on the removal date and you will not be charged again. Payments already made are not refunded, except as required by law.',
  'Founding agent pricing ($39 per month for 6 leads) is locked in for life for as long as you keep an active subscription and meet these standards. It ends if you cancel or are removed.',
];
