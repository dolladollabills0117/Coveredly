// Quiz questions, word-for-word from the Coveredly Tally forms ("Find Your Agent Match" and "Founding Agent Profile").
import type { Question } from '../components/Quiz';
import {
  AG_ADVISE, AG_EXPLAIN, AG_LEAD_TYPE, AG_LINES, AG_SPEED, CONTACT_METHODS, PH_COVERAGE, PH_DECISION, PH_EXPLAIN, PH_MATTERS, PH_TIMING,
} from '../../supabase/functions/_shared/matching';

export const NJ_COUNTIES = ['Atlantic', 'Bergen', 'Burlington', 'Camden', 'Cape May', 'Cumberland', 'Essex', 'Gloucester', 'Hudson', 'Hunterdon',
  'Mercer', 'Middlesex', 'Monmouth', 'Morris', 'Ocean', 'Passaic', 'Salem', 'Somerset', 'Sussex', 'Union', 'Warren'];

export const POLICYHOLDER_QUIZ: Question[] = [
  { id: 'state', type: 'single', title: 'Which state do you live in? 📍', options: ['New Jersey', 'Another state'] },
  { id: 'county', type: 'single', title: 'Which county? 🗺️', hint: 'Helps us match you with an agent near you.', options: NJ_COUNTIES },
  { id: 'coverage', type: 'multi', title: 'What kind of coverage are you looking for? 🛡️', hint: 'Pick all that apply. We currently match personal insurance and life insurance only.', options: [...PH_COVERAGE] },
  { id: 'contactMethod', type: 'single', title: 'How do you want to hear from your agent? 📩', options: [...CONTACT_METHODS] },
  { id: 'language', type: 'single', title: 'What language do you prefer? 🗣️', options: ['English', 'Spanish', 'Either one is fine', 'Other (type it in)'], otherLabel: 'Other (type it in)' },
  { id: 'explainStyle', type: 'single', title: 'How should your agent explain things? 💡', options: [...PH_EXPLAIN] },
  { id: 'decisionStyle', type: 'single', title: 'How do you like to make decisions? 🧭', options: [...PH_DECISION] },
  { id: 'timing', type: 'single', title: 'How soon do you need coverage? ⏳', options: [...PH_TIMING] },
  { id: 'mattersMost', type: 'single', title: 'What matters most in an agent? 🎯', options: [...PH_MATTERS] },
  { id: 'contact', type: 'text', title: "Lastly... let's keep the connection alive! 🔗",
    hint: "Your contact info is shared only with the one agent you're matched with, and only once you're matched. We don't share your quiz answers, and we don't spam.",
    fields: [{ id: 'phone', label: 'Your phone number', placeholder: '(973) 555-0100', optional: true, keyboard: 'phone-pad' }, { id: 'zip', label: 'ZIP code', placeholder: '07102', optional: true, keyboard: 'number-pad' }] },
];

export const AGENT_QUIZ: Question[] = [
  { id: 'contactMethod', type: 'single', title: 'How do you prefer to talk with clients? 📱', options: [...CONTACT_METHODS] },
  { id: 'languages', type: 'multi', title: 'What languages can you serve clients in? 🗣️', options: ['English', 'Spanish', 'Other (type it in)'], otherLabel: 'Other (type it in)' },
  { id: 'explains', type: 'single', title: 'How do you explain coverage? 💡', options: [...AG_EXPLAIN] },
  { id: 'advises', type: 'single', title: 'How do you advise clients? 🧭', options: [...AG_ADVISE] },
  { id: 'speed', type: 'single', title: 'How fast can you reach a brand-new lead? ⚡', options: [...AG_SPEED] },
  { id: 'bestLeadType', type: 'single', title: 'Which leads do you work best with? 🎯', options: [...AG_LEAD_TYPE] },
  { id: 'lines', type: 'multi', title: 'Which lines do you write? 🛡️', options: [...AG_LINES] },
  { id: 'counties', type: 'multi', title: 'Which NJ counties do you mainly serve? 🗺️', hint: 'Optional. Used to break ties between equally good matches.', options: NJ_COUNTIES, optional: true },
  { id: 'id', type: 'text', title: "What's your name and NJ producer license number? 🪪",
    hint: 'Your license number is only used to verify you and is never shared.',
    fields: [{ id: 'license', label: 'NJ license number', placeholder: 'e.g. 1234567', keyboard: 'number-pad' }, { id: 'phone', label: 'Your phone number', placeholder: '(973) 555-0100', optional: true, keyboard: 'phone-pad' }] },
];
