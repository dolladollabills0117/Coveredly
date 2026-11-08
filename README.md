# Coveredly app (iOS + Android)

One app, two sides:

- **Policyholders** take the quiz, see a profile with the personal-lines policies they may need, tap any policy for a short explainer, then **Find your agent match** or **Message your agent**.
- **Agents** take the agent quiz and get a mini CRM. It has lead cards with a 4-step milestone tracker, one-tap call/text/email (each tap logs "contacted" for admin), an **I sold a policy** button, a rating after every touchpoint, a **Report a bad lead** button, and a "Sell faster" tips tab.
- **Admin (you)** approve every match the formula suggests, see a live activity feed (contacted, quoted, sold, rated, reported, reviewed), approve or deny lead reports, and verify agent licenses.

A match becomes **Established** after these four milestones: first phone call → quote → policy sold → review. When the review comes in, both sides get a confetti celebration and a push notification.

Built with Expo (React Native) + Supabase. One codebase ships to both the App Store and Google Play.

---

## Try it right now (demo mode)

With no Supabase keys, the app runs on sample data saved on the device.

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `w` to open it in a browser.

| Log in as | What you'll see |
| --- | --- |
| `agent@demo.com` | Maria, an agent with 3 leads at different stages |
| `policyholder@demo.com` | Alex, matched with Maria, 2 of 4 milestones done |
| `admin@getcoveredly.com` | Your admin dashboard |
| any other email | A brand-new account that goes through the quiz |

Any password works in demo mode. Profile → **Reset demo data** starts over.

---

## The matching formula

`supabase/functions/_shared/matching.ts` is a 1:1 port of the **Scores** formula in your `Coveredly_Matching_Sheet`:

- **Hard rules** (agent is skipped if any fail): language matches (or "Either one is fine"), license verified, under the monthly cap, writes at least one line the person asked for, and **licensed in the person's state**. That last one is the location rule.
- **Score out of 100:** coverage fit 25, contact method 20, explanation style 15, decision style 15, timing fit 10, speed 15 if they chose "Fast answers" (otherwise 5).
- **Tie-breaker** (new): same county first, then whichever agent has fewer matches this month.

Every number from your **Key** tab is in `MATCHING_CONFIG` at the top of that file. Change a number there the same way you would on the sheet. `npm test` checks the code against hand-calculated sheet results.

Matching stays **manual-approval** like your sheet: the formula suggests, and you tap Approve in the admin tab. To skip approval, set the Supabase secret `AUTO_APPROVE_MATCHES=true`.

---

## Things to fill in

1. **Lead replacement policy wording:** `src/config/leadReplacementPolicy.ts`. Paste the exact text and reasons from the agents page of getcoveredly.com.
2. **Policy explainers:** `src/config/policies.ts` (plain-English copy; edit freely).
3. **Sell-faster tips:** `src/config/tips.ts`.
4. **Logo:** `src/components/Logo.tsx` draws a placeholder wordmark, and `assets/icon.png` is a placeholder icon. Swap in your real logo files.

---

## Going live

### 1. Supabase (backend: logins, database, chat, notifications)

1. Create a free project at supabase.com.
2. In **SQL Editor**, paste and run `supabase/migrations/0001_coveredly.sql`.
3. Deploy the server functions (install the Supabase CLI first):
   ```bash
   supabase link --project-ref YOUR_REF
   supabase functions deploy match-policyholder
   supabase functions deploy send-push
   supabase functions deploy delete-account
   ```
4. **Database → Webhooks:** create a webhook on table `notifications`, event `INSERT`, that calls the Edge Function `send-push`. This is what sends push notifications.
5. Copy `.env.example` to `.env` and paste your Project URL and anon key.
6. Sign up once in the app with hello@getcoveredly.com, then run this in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'hello@getcoveredly.com';
   ```

### 2. App Store + Google Play (via Expo EAS, no Mac required)

You need an Apple Developer account ($99/yr) and a Google Play Console account ($25 once).

```bash
npm install -g eas-cli
eas login
eas init                       # links the project and enables push notifications
eas build --platform all       # builds the iOS + Android release apps in the cloud
eas submit --platform ios      # uploads to App Store Connect / TestFlight
eas submit --platform android  # uploads to Google Play
```

Store listings also need a **privacy policy URL** and a **support URL** (pages on getcoveredly.com work), screenshots, and a description. In-app account deletion, which Apple requires, is already built in under Profile.

---

## Project map

```
src/app/                 screens (file = route)
  index.tsx              welcome: two paths, agent vs policyholder
  auth.tsx               sign in / create account
  quiz/                  agent + policyholder quizzes (same questions as your Tally forms)
  agent/                 Leads CRM · Sell faster tips · Profile
  lead/[id].tsx          lead detail: contact, milestones, sold, rate, report
  policyholder/          Home (policy profile) · My agent · Profile
  policy/[id].tsx        policy explainer + Find match / Message agent
  chat/[id].tsx          in-app messaging
  admin/                 Approvals · Activity · Reports · Agents
src/config/              all editable copy (policies, tips, quiz, replacement policy)
src/lib/backend/         demo.ts (sample data) and supabase.ts (production)
supabase/                database schema, security rules, server functions
```
