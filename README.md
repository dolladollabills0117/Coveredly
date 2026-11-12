# Coveredly app (iOS + Android)

**▶ Live demo:** https://dolladollabills0117.github.io/Coveredly/ (sample data, works on any phone or computer; log in as `agent@demo.com`, `policyholder@demo.com` or `admin@getcoveredly.com` with any password)

One app, two sides:

- **Policyholders** take the quiz, see a profile with the personal-lines policies they may need, tap any policy for a short explainer, then **Find your agent match** or **Message your agent**.
- **Agents** take the agent quiz and get a mini CRM. It has lead cards with a 4-step milestone tracker, one-tap call/text/email (each tap logs "contacted" for admin), an **I sold a policy** button, a rating after every touchpoint, a **Report a bad lead** button, and a "Sell faster" tips tab.
- **Admin (you)** approve every match the formula suggests, see a live activity feed (contacted, quoted, sold, rated, reported, reviewed), approve or deny lead reports, and verify agent licenses.

A match becomes **Established** after these four milestones: first phone call → quote → policy sold → review. When the review comes in, both sides get a confetti celebration and a push notification.

**Agent plans:** after the quiz, agents choose **Rapport** ($99, 6 leads/mo), **Dialogue** ($189, 12) or **Fluency** ($349, 24). Founding agents tap **I am a founding agent**. You get notified, approve them in Admin → Agents, and they receive a code. Once they validate the code in the app, they unlock **$39/mo for 6 leads, for life**. Agents are only matched while they're verified *and* have an active plan, and the plan's lead count is their monthly cap.

**Agent Standards:** leads are capped, so spots go to agents who show up for their clients. Each agent's Profile has a **Your standing** card (first contact within 3 days, follow-up, reviews, close rate, activity). From Admin → Agents you can send a **30-day notice**, clear it, or remove the agent once the 30 days are up (this cancels their subscription). Agents must tick **I agree to the Agent Terms, Agent Standards and Privacy Policy** before paying. The app saves the exact terms version and server time as proof, and asks agents to agree again whenever the terms change.

**Long-term leads:** agents can mark a lead as long-term (shopping around, or a longer sale like life). Long-term leads aren't counted in the sales part of standing, get a 60-day check-in window instead of 30, and show separately in Sales Insights. The standing card has two calm sections: "What keeps your spot" (green ✓, or a red ! only for things that really affect standing, like a new lead not contacted within 3 days) and "In progress" (sales, shown with a half orange circle, never affecting standing). Run `0006_long_term_leads.sql` after 0005.

**Sales insights (Admin → Activity → Sales insights):** when agents log a sale they tick which policies they sold, and can add later sales on the same client ("Log another policy sold"). You get each line's average, typical, fastest and slowest days to sell, and its close rate, for everyone or one agent, over 90 days, 12 months or all time. After 5 sales of a line it suggests a time window based on your data (the number of days within which 80% of those sales closed), ready for updating the Agent Standards.

**Also:** polka-dot background (toggle in Profile, saved per device), and a Privacy Policy page reachable from welcome, sign-up, the plan screen and both profiles. The policy text is in `src/config/privacyPolicy.ts`.

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

**80% quality bar:** if the best available agent scores under 80% (`GOOD_MATCH_THRESHOLD` in the same file), the policyholder sees "Your best match right now is 72% compatible" with a plain-language fit breakdown. They choose **Match me now** (goes to your Approvals) or **Wait for an 80%+ match** (joins the queue, with a "Check again" button). The queue re-checks automatically whenever an agent is verified or starts a plan, and notifies anyone who now has an 80%+ match. Agents never see people in the queue. Run `supabase/migrations/0003_match_quality_queue.sql` after 0002.

Matching stays **manual-approval** like your sheet: the formula suggests, and you tap Approve in the admin tab. To skip approval, set the Supabase secret `AUTO_APPROVE_MATCHES=true`.

---

## Things to fill in
0. **Agent Terms of Service** (`src/config/agentTerms.ts`) and **Agent Standards** (`src/config/agentStandards.ts`): drafts written to protect you until your NJ attorney reviews them. If you change the terms, bump `AGENT_TERMS_VERSION` in `supabase/functions/_shared/standing.ts` and every agent is asked to agree again. The standards targets (3-day first contact, 75% follow-up, 3/5 reviews, 15% close rate, 14 days active, 30-day notice) are in `STANDARDS` in the same file.
0. **Privacy Policy:** `src/config/privacyPolicy.ts`. Have your NJ attorney review it, then publish the same text at getcoveredly.com/privacy (the stores require a public URL).

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

### 2. Payments (Stripe)

1. In Stripe, create 4 monthly recurring **Prices**: Rapport $99, Dialogue $189, Fluency $349, Founding $39.
2. Set the Supabase secrets, and deploy:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_PRICE_RAPPORT=price_... STRIPE_PRICE_DIALOGUE=price_... STRIPE_PRICE_FLUENCY=price_... STRIPE_PRICE_FOUNDING=price_... CHECKOUT_RETURN_URL=https://getcoveredly.com/agents
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
3. Stripe → Developers → Webhooks: add the `stripe-webhook` function URL, with events `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`. Then `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
4. Run `supabase/migrations/0002_plans_and_founding.sql` in the SQL Editor (after 0001).
5. Run `0003_match_quality_queue.sql`, `0004_agent_standards_terms.sql` and `0005_policy_sales.sql` too, then deploy `supabase functions deploy remove-agent` (it cancels the Stripe subscription when you remove an agent).

> **Apple / Google payment rules:** the app sends agents to Stripe's secure web checkout. US App Store and Google Play rules currently allow linking out to web payments for US users, and lead subscriptions are a B2B service. Confirm this when you submit. If a reviewer pushes back, the fallback is in-app purchase subscriptions (Apple/Google take a 15–30% cut).

### 3. App Store + Google Play (via Expo EAS, no Mac required)

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

---

## Rebuilding the live demo site (`docs/`)

The demo at GitHub Pages is the web version of the app in demo mode, bundled into one page:

```bash
# 1. temporarily set in app.json: plugins "expo-router" → ["expo-router", {"asyncRoutes": false}] and experiments.baseUrl → "/Coveredly"
npx expo export --platform web --output-dir /tmp/web-demo
# 2. undo the app.json change, then bundle and publish:
python3 scripts/build-demo-site.py /tmp/web-demo docs/index.html /Coveredly https://dolladollabills0117.github.io/Coveredly/
cp docs/index.html docs/404.html
```

