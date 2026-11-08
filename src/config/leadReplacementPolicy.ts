/**
 * LEAD REPLACEMENT POLICY
 * --------------------------------------------------------------------------
 * ⚠️ Paste the exact wording from the agents page of getcoveredly.com here.
 * The app shows `summary` on the report sheet, and agents pick one of `reasons`.
 * Admin approves or denies each report; an approved report re-matches a new lead.
 */
export const LEAD_REPLACEMENT_POLICY = {
  windowDays: 14, // TODO: confirm against the site policy
  summary:
    'If a matched lead is not a real opportunity, report it and our team will review it. Approved reports get a replacement lead at no cost and do not count toward your monthly cap.',
  reasons: [
    { id: 'bad_contact', label: 'Wrong or disconnected phone / email' },
    { id: 'unreachable', label: "Couldn't reach them after several tries" },
    { id: 'out_of_area', label: 'Lives outside New Jersey' },
    { id: 'not_shopping', label: "Says they never asked / aren't shopping" },
    { id: 'duplicate', label: 'Already my client, or a duplicate lead' },
    { id: 'wrong_line', label: "Needs a line I don't write (e.g. commercial)" },
    { id: 'other', label: 'Something else' },
  ],
};
