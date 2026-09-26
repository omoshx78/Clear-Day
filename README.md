# ClearDay — Quit Tracker

A Quittr-style app to help people quit smoking, alcohol, or gambling in a set number
of days (default 21). Phone-based login, streak tracking, money-saved stats, daily
motivational quotes, hobby suggestions, a "panic button" breathing exercise for
urges, daily check-ins, a journal, and an always-visible crisis-resources button.

## Shareable streak card, Resources hub, mobile bottom nav, and reminders
Four more ideas borrowed from reviewing a competitor app, built out fully:

- **Shareable streak card** (`client/src/pages/ShareCard.jsx`, `/share`) —
  draws a branded image (streak, days-free, money saved) on an HTML canvas
  and offers **Share** (via the Web Share API on supporting browsers/mobile,
  with a download fallback) or **Download**. No new dependency — drawn by
  hand with Canvas 2D rather than a screenshot library. Reachable from a
  "Share your streak →" link on the Dashboard.
- **Resources hub** (`client/src/pages/Resources.jsx`, `/resources`) — real,
  verified links to AA Kenya, the global NA meeting finder, and Gamblers
  Anonymous; a short recovery-awareness calendar (Alcohol Awareness Month,
  World No Tobacco Day, International Overdose Awareness Day, National
  Recovery Month); and a "Talk to someone" section pointing at the existing
  provider directory and crisis button. Every organization link was checked
  against a live source rather than guessed.
- **Mobile bottom nav** (`client/src/components/BottomNav.jsx`) — a
  thumb-reachable tab bar (Home / Toolkit / raised Check-in button / Journal
  / Resources), shown only below the `sm` breakpoint. The existing top
  `NavBar` still renders on all sizes (now also linking to Resources) — the
  bottom bar is additive for mobile, not a replacement, to avoid disrupting
  desktop navigation.
- **Daily reminder opt-in** — a toggle + time picker on the Dashboard
  (`POST /api/users/me/reminders` persists the preference). **Important
  limitation**: this uses the browser's `Notification` API checked once a
  minute in `App.jsx` — it only fires while ClearDay is open in that
  browser tab. It is **not** a true push notification (that needs a service
  worker registration plus a server-side push subsystem — e.g. `web-push`
  with VAPID keys — which isn't built yet). Treat the current version as a
  placeholder that proves the preference/UI, not something to promise users
  as "we'll remind you even with the app closed."

## Unified daily Check-in hub (inspired by a competitor review)
Replaces the old scattered flow (a craving slider buried on the dashboard,
breathing exercise only reachable from the Toolkit) with one guided daily
ritual, similar to how some other recovery apps structure a "daily pulse":

- **`client/src/pages/CheckIn.jsx`** — a four-step flow at `/checkin`:
  mood (5-point: Struggling/Low/Okay/Good/Great) → craving level + optional
  note → guided breathing (skippable) → a closing screen with a quote and a
  coping-tool suggestion. Finishing writes one check-in record.
- **`client/src/components/BreathingExercise.jsx`** — the breathing timer
  was extracted out of the Craving Toolkit into its own component so both
  the Toolkit and this new flow share the same code instead of duplicating it.
- **Dashboard** now shows a single "Start today's check-in" button instead
  of an inline form, and once done for the day, shows which mood was logged.
- **Mood was already accepted by the check-in API** (`server/index.js`) but
  never actually collected anywhere in the UI — this closes that gap, and
  `GET /api/analytics` now also returns `moodCounts`, shown as a simple bar
  breakdown on the Pro Analytics page.

## Login: phone number + PIN (replaces OTP)
No third-party SMS/email dependency for the core login flow — the person
sets a 4-6 digit PIN at signup (same mental model as their M-Pesa PIN) and
uses it to log in, instead of receiving a one-time code.

- **`server/auth.js`** — PINs are hashed with Node's built-in `crypto.scrypt`
  (no extra dependency), never stored or returned in plaintext. `pinHash` is
  stripped from every API response (see `sanitizeUser()` in `index.js`).
- **Lockout protection**: 5 wrong PIN attempts locks the account for 15
  minutes (`server/auth.js` — `MAX_FAILED_ATTEMPTS`, `LOCKOUT_MS`).
- **Flow**: enter phone → `GET /api/auth/check-phone` tells the frontend
  whether to show a PIN-login box or a "create a PIN" registration form
  (with a required 18+ confirmation checkbox, stored as `ageConfirmed` on
  the user — a lightweight self-attestation, not a document/birthdate
  check; consult a lawyer if you need something more rigorous for Kenya's
  requirements around gambling/alcohol content).
- **No name, age (beyond the 18+ checkbox), or gender collected** —
  deliberately minimal, in keeping with the anonymity-first design used
  throughout this app (see the Support-providers slice above).
- **"Remember this device" on web**: sessions never expire server-side
  (`db.data.sessions`), and the token lives in the browser's `localStorage`.
  That's the whole mechanism — no separate device-linking needed. A person
  stays logged in until they explicitly log out or clear browser data;
  opening the app in a different browser requires PIN entry again.
- **Forgotten PIN**: there's no recovery flow yet (no SMS/email channel to
  reset through). Worth adding before real users rely on this — the
  natural options are wiring the SMS gateway mentioned in `daraja.js`'s
  sibling note for a reset code, or an admin-assisted reset via the
  `/admin` dashboard.

## Theming (dark-mode aware)
The app now uses CSS variables (`client/src/index.css`) mapped into Tailwind
as semantic colors (`client/tailwind.config.js`): `bg-page`, `bg-surface`,
`text-ink`, `text-muted`, `text-faint`, `border-subtle`, `bg-subtlebg`. These
automatically switch between light and dark palettes based on the visitor's
OS/browser preference (`prefers-color-scheme`), the same mechanism the
standalone preview HTML always used — the deployed React app didn't have
this before and looked flat/white regardless of the visitor's system theme.
Use these semantic classes instead of hardcoded `bg-white` / `text-slate-*`
/ `border-slate-*` in any new screens so they stay theme-aware. The two
solid dark buttons (`bg-slate-800`) are intentional brand accents, not
surface colors, and don't need to change with the theme.

## Mini-game & quote refresh (final slice)
- **Streak-linked tree** (`client/src/components/TreeVisual.jsx`) — a generative
  SVG tree on the dashboard that grows fuller with each clean day (seed → sapling
  → full canopy by day 60), sprouts fruit once the user's goal is reached, and has
  a "water your tree" button with a small droplet animation. Deterministic by
  streak count, so the same streak always renders the same tree.
- **Quotes refresh on every visit** — the dashboard's quote used to be fixed for
  the whole calendar day; it now picks a new one every time the dashboard loads
  (including every login), and the server (`server/index.js`) tracks the last
  quote shown to each user in memory so it never repeats immediately back-to-back.

Note: Swahili support was tried in an earlier iteration and removed — the
translations weren't rendering correctly, so the app is English-only for now.
If you want to revisit localization later, `server/data-quotes.js`,
`data-hobbies.js`, and `data-crisis.js` are the content files to extend, and
the UI strings would need a proper i18n library rather than the ad hoc
approach used before.

## Admin dashboard — tracking how your app is doing (final slice)
- **Owner login**: `/admin/login` — enter your `ADMIN_SECRET` (the same value
  used for the curl-based review in the previous slice). This is a separate
  login from regular users — it's yours alone, not something shown in the
  app's normal navigation.
- **`/admin` — Overview tab**: total users, users active in the last 24h/7d
  (a real usage signal, not just signups), Pro subscriber count and estimated
  monthly revenue (KES), a 7-day signup chart, addiction-type breakdown,
  engagement totals (check-ins, journal entries, messages sent), and
  provider/institution counts by status.
- **Review tab**: the same provider/institution approval queue from the
  previous slice, now with Approve/Reject buttons instead of curl commands.
- **Users tab**: every user's phone, addiction, streak, and Pro status —
  enough to actually run the business. Journal entries and message content
  are never exposed here, on purpose.
- **How "active" is tracked**: `server/auth.js` records a lightweight
  in-memory "last seen" timestamp on every authenticated request. It's kept
  in memory (not written to disk) deliberately — this avoids a real race
  condition we hit during testing, where a background disk write could
  collide with a route's own read-modify-write and silently drop data (e.g.
  a user's onboarding profile). The trade-off: activity data resets on
  server restart, which is fine for a live "who's using the app right now"
  view but isn't a permanent audit log. If you need persistent analytics
  later, log activity events to a proper database instead of overloading the
  user record.
- **Set a real `ADMIN_SECRET` before deploying** — this is the single
  credential that gates both the review actions and this dashboard.

## Support providers & institution accounts (latest slice)
- **Support providers** — anyone (counselors, chaplains, pastors, imams, peer-recovery
  coaches) can apply from `/support/apply-provider`. Applications start `pending` and
  need admin review before they appear in the public directory (`/support/directory`).
- **1:1 messaging** — a regular user can message a verified provider, gated by Pro
  (matches the Pro plan's "1:1 messaging" feature). Providers can always reply for
  free — the gate is on *starting* a conversation with a provider, not on providers
  responding.
- **Institutions** — churches, mosques, NACADA-affiliated centers, rehabs, employers,
  and NGOs can register from `/support/register-institution`. Once verified, they get
  an invite code and a dashboard (`/support/institution-dashboard`) showing only
  **aggregated, anonymized** member stats (member count, average streak, goal-reached
  count, addiction-type breakdown) — never individual names, phones, journal entries,
  or messages.
- **Joining a cohort** — any user can enter an institution's invite code at
  `/support/join-institution` to have their (anonymized) progress count toward that
  institution's dashboard.
- **Admin review (MVP tooling)** — there's no admin UI yet. Review and verify
  applications with curl/Postman using the `ADMIN_SECRET` env var as an
  `x-admin-secret` header:
  ```bash
  # List pending provider applications
  curl http://localhost:4000/api/admin/providers/pending -H "x-admin-secret: dev-admin-secret"
  # Verify one
  curl -X POST http://localhost:4000/api/admin/providers/<userId>/verify -H "x-admin-secret: dev-admin-secret"

  # Same pattern for institutions
  curl http://localhost:4000/api/admin/institutions/pending -H "x-admin-secret: dev-admin-secret"
  curl -X POST http://localhost:4000/api/admin/institutions/<id>/verify -H "x-admin-secret: dev-admin-secret"
  ```
  **Set a real `ADMIN_SECRET` before deploying** — the default (`dev-admin-secret`)
  is printed as a warning on server start and is not safe for production.

## Pro tier + M-Pesa billing (latest slice)
- **`server/daraja.js`** — Safaricom Daraja STK Push integration. Runs in
  **mock mode** automatically when `DARAJA_CONSUMER_KEY` isn't set: no real
  request goes to Safaricom, and the payment auto-confirms after ~3 seconds so
  you can build and test the full upgrade flow before you have Daraja
  credentials. Set the env vars listed at the top of that file (consumer
  key/secret, shortcode, passkey, callback URL) to go live against the
  sandbox, then production.
- **`/upgrade`** — plan details + "Pay with M-Pesa" button, polls for payment
  confirmation, shows a spinner while waiting for the STK push result.
- **`/analytics`** — first Pro-gated feature: craving level by day of week.
  Returns HTTP 402 with `{ upgradeRequired: true }` if the user isn't Pro;
  the frontend catches that and shows an upgrade prompt instead of an error.
- Pro status (`isPro`, `proExpiresAt`) is now returned on `/api/users/me` and
  shown as a badge in the nav bar.
- Payments are tracked in `db.data.payments` (pending → paid/failed), keyed
  by Safaricom's `CheckoutRequestID` so the async callback can be matched
  back to the right user.

**Going live**: create a Daraja app at https://developer.safaricom.co.ke,
grab its sandbox consumer key/secret, and set `DARAJA_CALLBACK_URL` to your
deployed Render backend's `/api/pro/callback` (Safaricom needs a public
HTTPS URL — it can't reach `localhost`). Test with Safaricom's sandbox test
phone numbers before switching `DARAJA_ENV` to `production` with your real
shortcode and passkey.

## What's new in this slice
- **Real accounts** — phone number + PIN login (replaces the old local-device-only
  identity, and the OTP flow from an earlier slice — see the phone+PIN section
  above). See `server/auth.js`.
- **Crisis resources** — a persistent "Need help now?" button, visible on every
  screen (even before login), linking to NACADA (1192), Befrienders Kenya, and
  other Kenya helplines. Never gated behind auth or payment.
- **Daily motivational quotes** — one on the dashboard (same all day), a fresh
  random one every time the Craving Toolkit is opened.
- **Hobby suggestions** — addiction-specific alternative activities on the
  dashboard, rotating weekly.

## Stack
- **Backend:** Node + Express, JSON file storage via `lowdb` (no native deps — deploys
  cleanly anywhere, including Render's free tier).
- **Frontend:** React + Vite + Tailwind CSS, React Router.

## Project structure
```
quit-app/
  server/    Express API (port 4000 locally)
  client/    React app (port 5173 locally)
```

## Run locally

**Backend**
```bash
cd server
npm install
npm run dev        # http://localhost:4000
```

**Frontend** (in a second terminal)
```bash
cd client
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev             # http://localhost:5173
```

## Deploy

### Option A — Render Blueprint (backend only, one click)
This repo includes a `render.yaml` at its root, so you can use Render's
**New → Blueprint** flow instead of setting up the web service by hand:

1. Push this repo to GitHub (see the private-repo note below).
2. On Render: **New → Blueprint**, select the repo. Render reads `render.yaml`
   and pre-fills a web service pointed at `server/`.
3. Click **Apply**. Render will prompt you for the `sync: false` env vars
   (`ADMIN_SECRET`, and the `DARAJA_*` credentials if you have them yet —
   safe to leave blank for now, since `server/daraja.js` runs in mock mode
   without them).
4. Once deployed, note the service URL (e.g. `https://clearday-backend.onrender.com`)
   for the frontend's `VITE_API_URL` in Option B below.

**If Render says it can't access the repo**: this almost always means its
GitHub App isn't authorized for that specific repo — common right after
making a repo private. Fix: on GitHub, go to **Settings → Integrations →
Applications → Installed GitHub Apps → Render → Configure**, then under
"Repository access" add the repo (or switch to "All repositories"). Retry
the Blueprint import on Render afterward.

### Option B — Backend on Render, Frontend on Vercel (manual setup)
1. Push this repo to GitHub.
2. On Render: **New → Web Service**, point at the repo, set **root directory** to `server`.
3. Build command: `npm install` — Start command: `npm start`.
4. Render assigns a URL like `https://your-app.onrender.com` — note it for the frontend step.

> Note: Render's free tier has an ephemeral filesystem, so `data.json` (including
> user accounts and sessions) resets on redeploy/restart. Fine for a demo/MVP; for
> production, swap `lowdb` for a real database (Postgres via Render, or Supabase).

### Frontend → Vercel
1. On Vercel: **New Project**, point at the repo, set **root directory** to `client`.
2. Framework preset: Vite.
3. Add an environment variable: `VITE_API_URL` = your Render backend URL.
4. Deploy.

## Before going live with real users
- **Add a "forgot PIN" recovery flow** before real users depend on this —
  see the note in the phone+PIN section above.
- **Move off lowdb** to a real database before you have real user data at stake.

## Remaining ideas beyond the original roadmap
- Community (grouped by addiction type, with moderation)
- True push notifications (service worker + web-push/VAPID) to replace the
  foreground-only reminder above
- Swahili support, done properly with a real i18n library (see note above)
- Accountability partner / buddy system
- Real accounts for admin staff (right now there's one shared `ADMIN_SECRET`,
  fine for a solo owner, not for a team)
