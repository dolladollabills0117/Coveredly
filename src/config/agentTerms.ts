/**
 * Coveredly Agent Terms of Service.
 * ⚠️ Draft written to protect Coveredly until your New Jersey attorney reviews it.
 * When you change this text, bump AGENT_TERMS_VERSION in
 * supabase/functions/_shared/standing.ts so every agent is asked to agree again.
 */
import { AGENT_TERMS_VERSION, STANDARDS } from '../../supabase/functions/_shared/standing';

export const AGENT_TERMS_UPDATED = 'November 12, 2026';
export { AGENT_TERMS_VERSION };

export const AGENT_TERMS_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Agreement',
    body: [
      'These Agent Terms of Service ("Terms") are a binding agreement between you ("Agent," "you") and Coveredly ("Coveredly," "we," "us"). By checking the box to agree, subscribing to a plan, or using the Coveredly app or services (the "Services") as an agent, you agree to these Terms, our Agent Standards and our Privacy Policy, which are part of these Terms. If you do not agree, do not use the Services.',
    ],
  },
  {
    title: '2. Eligibility and Licensing',
    body: [
      'You must hold an active New Jersey insurance producer license with authority for each line of insurance you tell us you write, and keep it active while you use the Services. You must tell us within 5 business days if your license lapses, is suspended or revoked, or becomes subject to disciplinary action. We may verify your license at any time, and we do not match agents until we have verified them.',
      'If you are appointed with one or more carriers or are a captive agent, you are responsible for confirming that your carrier agreements permit you to receive referrals and leads from Coveredly.',
    ],
  },
  {
    title: '3. What Coveredly Does (and Does Not Do)',
    body: [
      'Coveredly introduces people seeking personal lines insurance ("Policyholders") to licensed agents based on stated preferences, needs and location. Coveredly is not an insurance company, agency or producer. We do not sell, solicit or negotiate insurance, give insurance advice, or bind coverage.',
      'Every match is reviewed and approved by Coveredly before contact information is shared. Plan limits are maximums: each plan provides up to the stated number of matched leads per month. We do not guarantee any number of leads, that any Policyholder will respond, buy a policy, or remain a client, or any amount of commission or income.',
    ],
  },
  {
    title: '4. Subscriptions and Billing',
    body: [
      'Plans are billed monthly in advance through our payment processor and renew automatically until canceled. You authorize us and our payment processor to charge your payment method for each billing period.',
      'You may cancel at any time by contacting us. Cancellation takes effect at the end of your current billing period, and you will not be charged again. Except as required by law or as provided in our Lead Replacement Policy, payments are non-refundable, including for partial months and unused leads.',
      'We may change plan prices or lead limits with at least 30 days\' notice. Changes apply starting with your next billing period after the notice. Founding agent pricing is governed by Section 5.',
    ],
  },
  {
    title: '5. Founding Agent Pricing',
    body: [
      'Founding agent pricing ($39 per month for up to 6 matched leads) is available by invitation only and requires a validated founding agent code. Once activated, it is locked in for life for as long as you keep an active subscription and meet our Agent Standards. It ends permanently if you cancel your subscription or are removed from the Services, and it cannot be transferred.',
    ],
  },
  {
    title: '6. Lead Replacement',
    body: [
      'If a matched lead qualifies under our Lead Replacement Policy, you may report it in the app. Approved reports are resolved with a replacement lead, not a refund, and do not count toward your monthly limit. Our decision on a report is final.',
    ],
  },
  {
    title: '7. Agent Standards, Notices and Removal',
    body: [
      'Because lead limits keep opportunities available to every agent, we keep spots for agents who meet our Agent Standards: prompt service, relationship maintenance, consistent results, good reviews and regular activity. The "Your standing" card in your Profile shows how you are measured.',
      `We reserve the right to suspend or remove any agent who is idle, does not respond to matched leads, receives consistently poor reviews, does not keep up with relationship maintenance, or otherwise does not meet our Agent Standards. Before removing you for not meeting the Agent Standards, we will give you written notice in the app and ${STANDARDS.warningDays} days to improve.`,
      'We may suspend or remove you immediately, without a notice period, for serious misconduct, including a lapsed or revoked license, fraud or misrepresentation, harassment, misuse of Policyholder information, or a violation of law or these Terms.',
      'If you are removed, your subscription is canceled on the removal date and you will not be charged again. Payments already made are not refunded, except as required by law.',
    ],
  },
  {
    title: '8. Use of Policyholder Information',
    body: [
      'Policyholder information is shared with you solely so you can provide the requested insurance services to that Policyholder. You may not sell, rent, share, transfer or disclose it to anyone else, add it to any list for unrelated marketing, or use it for any other purpose.',
      'You are solely responsible for complying with all laws that apply to your contact with Policyholders and your handling of their information, including the Telephone Consumer Protection Act, Do Not Call rules, CAN-SPAM, New Jersey insurance laws and regulations, and privacy and data security laws. You must honor any request from a Policyholder to stop contacting them, keep their information secure, and promptly tell us of any unauthorized access to it.',
    ],
  },
  {
    title: '9. Your Conduct',
    body: [
      'You agree to be honest and professional with every Policyholder; not misrepresent any policy, price, coverage, carrier or your relationship with Coveredly; not pressure, harass or mislead anyone; and not submit false information, false activity or false reports through the Services, or manipulate ratings or reviews.',
    ],
  },
  {
    title: '10. Independent Business',
    body: [
      'You are an independent business. Nothing in these Terms makes you an employee, partner, joint venturer or agent of Coveredly, and you may not hold yourself out as one. You are solely responsible for your insurance business, including licensing, carrier appointments, errors and omissions coverage, advice you give, policies you place, commissions, and taxes.',
    ],
  },
  {
    title: '11. Reviews, Ratings and Activity Data',
    body: [
      'Policyholders may review their experience with you, and you may rate leads. We use reviews, ratings and activity in the Services (such as contact, quotes, sales and messages) to operate matching, measure your standing, and improve the Services.',
    ],
  },
  {
    title: '12. Disclaimers',
    body: [
      'The Services are provided "as is" and "as available." To the fullest extent permitted by law, Coveredly disclaims all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose and non-infringement. We do not warrant that the Services will be uninterrupted or error-free, or that any Policyholder information is accurate or complete.',
    ],
  },
  {
    title: '13. Limitation of Liability',
    body: [
      'To the fullest extent permitted by law, Coveredly will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any lost profits, commissions, revenue or business opportunities. Our total liability for any claim relating to the Services or these Terms is limited to the amount you paid Coveredly in the 3 months before the event giving rise to the claim.',
    ],
  },
  {
    title: '14. Indemnification',
    body: [
      'You agree to defend, indemnify and hold harmless Coveredly and its owners, employees and contractors from any claims, losses, liabilities, damages, fines and expenses (including reasonable attorneys\' fees) arising from your insurance business, your contact with or advice to any Policyholder, your use of Policyholder information, or your breach of these Terms or any law.',
    ],
  },
  {
    title: '15. Changes to These Terms',
    body: [
      'We may update these Terms from time to time. If we make material changes, we will ask you to review and agree to the updated Terms in the app before you continue receiving leads. Continued use of the Services after agreeing means you accept the updated Terms.',
    ],
  },
  {
    title: '16. Governing Law and Disputes',
    body: [
      'These Terms are governed by the laws of the State of New Jersey, without regard to its conflict-of-law rules. Any dispute relating to these Terms or the Services will be brought exclusively in the state or federal courts located in New Jersey, and you consent to their jurisdiction.',
      'If any part of these Terms is found unenforceable, the rest remains in effect. Our failure to enforce any provision is not a waiver. These Terms, the Agent Standards and the Privacy Policy are the entire agreement between you and Coveredly about the Services.',
    ],
  },
  {
    title: '17. Contact',
    body: ['Questions about these Terms: hello@getcoveredly.com.'],
  },
];
