/**
 * Coveredly Privacy Policy. Shown in the app at /privacy (both agent and policyholder sides).
 * ⚠️ Have your New Jersey attorney review before launch, and publish the same text at
 * getcoveredly.com/privacy (Apple and Google both require a public privacy policy URL).
 */
export const PRIVACY_EFFECTIVE_DATE = 'November 8, 2026';
export const PRIVACY_CONTACT = 'hello@getcoveredly.com';

export const PRIVACY_SUMMARY = {
  policyholder: [
    'We never sell your information, and we never share it for advertising.',
    'Your name and contact details go to one person only: the licensed agent you are matched with, and only after the match is approved.',
    'Your quiz answers are used to find your match. Your agent sees only what helps them serve you.',
    'You can delete your account and data at any time from your Profile.',
  ],
  agent: [
    'We never sell your information, and we never share it for advertising.',
    'Your name and contact details go only to the policyholders you are matched with.',
    'Your NJ producer license number is used solely to verify you and is never shown to anyone.',
    'Card payments are handled by our payment processor. We never see or store your card number.',
  ],
};

export const PRIVACY_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Scope and Acceptance',
    body: [
      'This Privacy Policy ("Policy") describes how Coveredly ("Coveredly," "we," "us," or "our") collects, uses, discloses, and safeguards personal information in connection with the Coveredly mobile application, website, and related services (collectively, the "Services"). This Policy applies to individuals seeking personal lines insurance coverage ("Policyholders") and to licensed insurance producers who use the Services ("Agents") (each, a "User").',
      'By creating an account or otherwise using the Services, you acknowledge that you have read and understood this Policy. If you do not agree with this Policy, please do not use the Services.',
    ],
  },
  {
    title: '2. Information We Collect',
    body: [
      'Account Information. Your name, email address, telephone number (if provided), and password credentials.',
      'Questionnaire Responses. For Policyholders: state, county and ZIP code of residence; the types of coverage sought; preferred language; and communication, explanation, decision-making, and timing preferences. For Agents: communication and advisory style, languages spoken, lines of authority written, geographic service area, and lead preferences.',
      'Professional Credentials. For Agents: New Jersey insurance producer license number, which is used solely to verify licensure.',
      'Relationship and Activity Data. Messages exchanged through the Services; relationship milestones (such as initial contact, quotes, policy placement, and reviews); ratings; lead quality reports; and related timestamps.',
      'Payment Information. Agent subscription payments are processed by our third-party payment processor. Coveredly does not receive or store full payment card numbers. We retain only limited billing records, such as subscription plan, status, and transaction identifiers.',
      'Device Information. Push-notification tokens and limited technical information necessary to deliver and secure the Services.',
    ],
  },
  {
    title: '3. How We Use Information',
    body: [
      'We use personal information solely to: (a) match Policyholders with a compatible licensed Agent; (b) enable communication between matched Users; (c) verify Agent licensure; (d) administer Agent subscriptions; (e) send service-related notifications, including match and milestone notifications; (f) review lead quality reports and administer our Lead Replacement Policy; (g) evaluate and improve the quality of our matching using aggregated or de-identified information; (h) maintain the security and integrity of the Services; and (i) comply with applicable law.',
    ],
  },
  {
    title: '4. No Sale or Sharing of Personal Information',
    body: [
      'Coveredly does not sell, rent, lease, or trade personal information to any third party, and does not share personal information for cross-context behavioral advertising or targeted advertising, as those terms are defined under applicable law, including the New Jersey Data Privacy Act. We do not provide personal information to data brokers, lead resellers, marketers, or insurance carriers.',
    ],
  },
  {
    title: '5. Disclosure Limited to Your Matched Counterpart',
    body: [
      'The only disclosure of personal information between Users occurs directly between a Policyholder and the single Agent with whom that Policyholder has been matched, and only after Coveredly has approved the match.',
      'Policyholder to Agent: the matched Agent receives the Policyholder\'s name, contact information, general location (state, county, and ZIP code), coverage interests, and stated communication preferences, solely so that the Agent may provide the requested insurance services.',
      'Agent to Policyholder: the matched Policyholder receives the Agent\'s name, contact information, languages spoken, preferred communication method, and licensure status. An Agent\'s license number is never disclosed to Policyholders.',
      'Messages exchanged through the Services are visible only to the two matched Users and, where necessary to operate, secure, or support the Services or to investigate a lead quality report, to authorized Coveredly personnel. Ratings and lead quality reports submitted by Agents are not disclosed to Policyholders.',
      'Users who receive information through the Services agree to use it only for the purpose of the insurance relationship and in compliance with applicable law, and not to sell, transfer, or otherwise disclose it.',
    ],
  },
  {
    title: '6. Service Providers and Legal Requirements',
    body: [
      'We engage a limited number of service providers to host our database, process payments, and deliver notifications. These providers process personal information only on our behalf and under our instructions, are contractually prohibited from using it for any other purpose, and do not receive it for their own commercial use.',
      'We may also disclose personal information where required by law, subpoena, or court order; to protect the rights, property, or safety of Coveredly, our Users, or the public; or in connection with a merger, acquisition, or sale of assets, in which case the successor entity will be bound by the commitments in this Policy.',
    ],
  },
  {
    title: '7. Consent to Communications',
    body: [
      'By providing a telephone number or email address, you consent to receive calls, text messages, and emails regarding your match from Coveredly and, once matched, from your matched counterpart. Message and data rates may apply. You may opt out of text messages at any time by replying STOP, and you may withdraw consent to further contact by emailing us.',
    ],
  },
  {
    title: '8. Data Retention',
    body: [
      'We retain personal information only for as long as your account is active or as reasonably necessary to provide the Services, resolve disputes, enforce our agreements, and satisfy legal, regulatory, tax, and accounting obligations. When information is no longer required, we delete or de-identify it.',
    ],
  },
  {
    title: '9. Data Security',
    body: [
      'We maintain administrative, technical, and physical safeguards designed to protect personal information, including encryption in transit, access controls that restrict each User to his or her own records and matched relationships, and restricted administrative access. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    title: '10. Your Rights and Choices',
    body: [
      'Subject to applicable law, including the New Jersey Data Privacy Act, you may have the right to: confirm whether we process your personal information; access, correct, or delete it; obtain a portable copy; and opt out of the sale of personal information, targeted advertising, or certain profiling (Coveredly does not engage in these activities).',
      'You may delete your account at any time in the app under Profile → Delete my account. To exercise any other right, email ' + PRIVACY_CONTACT + '. We will respond within the time required by law, and you may appeal any decision by replying to our response. We will not discriminate against you for exercising your rights.',
    ],
  },
  {
    title: '11. Children',
    body: [
      'The Services are intended for individuals 18 years of age or older. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us and we will delete it.',
    ],
  },
  {
    title: '12. Changes to This Policy',
    body: [
      'We may update this Policy from time to time. If we make material changes, we will notify you in the app or by email before the changes take effect. Your continued use of the Services after the effective date constitutes acceptance of the updated Policy.',
    ],
  },
  {
    title: '13. Contact Us',
    body: [
      'Questions or requests regarding this Policy may be directed to Coveredly at ' + PRIVACY_CONTACT + '.',
    ],
  },
];
