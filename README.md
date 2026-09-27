# ClearDay — Quit Tracker

A Quittr-style app to help people quit smoking, alcohol, or gambling in a set number
of days (default 21). Phone-based login, streak tracking, money-saved stats, daily
motivational quotes, hobby suggestions, a "panic button" breathing exercise for
urges, daily check-ins, a journal, and an always-visible crisis-resources button.

## Closing the real gaps: legal pages, forgot-PIN, account deletion/export, PIN change, admin email
Everything flagged in the previous review, now built:

- **Terms of Service + Privacy Policy** (`/legal/terms`, `/legal/privacy`,
  `client/src/pages/Legal.jsx`) — a genuine first-draft, written with
  Kenya's Data Protection Act in mind, honestly labeled as **not yet
  reviewed by a lawyer** both in the UI and here. Linked from the login
  screen ("By continuing, you agree to...") and from Settings.
- **Self-service forgot-PIN** — a person can optionally add a recovery
  email from Settings (`POST /api/users/me/recovery-email`); if they forget
  their PIN, `POST /api/auth/forgot-pin` emails a 6-digit code there
  (15-minute expiry, single use), and `POST /api/auth/reset-pin` verifies
  it and sets a new PIN. The response is **deliberately vague** either way
  ("if that account has a recovery email on file...") so the endpoint
  can't be used to check which phone numbers are registered — verified
  this directly: same response for a real account with no recovery email,
  and for a phone number that isn't registered at all.
- **Admin-assisted PIN reset** — the fallback for anyone who never set a
  recovery email. They reach out via `/contact`, and admin clicks "Reset
  PIN" next to their row on the `/admin` Users tab, which generates a
  fresh temporary PIN shown once for admin to relay manually (call,
  WhatsApp, whatever channel they came in on). **This button existed in
  `adminApi.js` but wasn't actually wired into any UI until this pass** —
  found via a systematic check of the whole app for exactly this pattern
  (see below).
- **Change PIN, export data, delete account** — all live in the new
  `/settings` page. Export downloads everything the account owns
  (profile, check-ins, journal, messages, feedback) as JSON. Delete is a
  two-step confirmation, and — this was a real bug I found and fixed —
  originally only unlinked the account from its feedback history
  (`userId` → null via the DB's `ON DELETE SET NULL`) without clearing the
  **phone number text copy** stored alongside it, which would have left a
  literal phone number behind after someone asked to be forgotten. Fixed:
  deletion now explicitly scrubs that field first. Verified end-to-end
  with a mock — phone number confirmed `null` after deletion, not just the
  link to the account.
- **Admin email notifications** (your original question) — new feedback
  submissions now email the admin via **Resend** (free tier: 3,000/month,
  100/day, no credit card, sends from Resend's own address so you don't
  need to verify a domain for this). Set `RESEND_API_KEY` and `ADMIN_EMAIL`
  as env vars to enable; without them, it logs to the console instead of
  crashing (`server/email.js`), same graceful-degradation pattern as the
  Daraja mock mode. Verified the actual email content reaches the mock
  transport correctly, end to end from a real feedback submission.
- **`Settings.jsx`** ties all of this together in one page — plan/goal
  editing, PIN change, recovery email, data export, and the delete-account
  danger zone — reachable from the nav bar (previously nothing let you
  revisit your profile after onboarding at all).

**What this pass caught, worth knowing about**: I found a substantial,
mostly-complete implementation of all of this already sitting in the
project files when I started — consistent, well-written, and I don't have
an explanation for how it got there. Rather than trust it, I read every
line and found three real, would-have-shipped-broken bugs: `email.js`
didn't match the interface the rest of the code called it with (would have
crashed on the first email send), two duplicate/conflicting `import`
statements from the same module, and the admin "Reset PIN" button existed
in the API client but was never actually rendered anywhere — the exact
same class of bug as `Inbox.jsx`/`Thread.jsx` from an earlier round. All
three are fixed and the whole flow (forgot-PIN, change-PIN, export,
delete-with-cascade, admin reset, email notification) was run end-to-end
against a mocked database and mocked email transport before being
packaged here.

**Still real gaps, deliberately not tackled this round** (flagged before,
still true): real Daraja M-Pesa credentials (Pro is still in mock mode),
error monitoring (Sentry or similar), a full click-through of the live
deployed app now that this much has changed, an onboarding walkthrough,
an accessibility pass, and product analytics. Happy to pick any of these
up next.

## Illustration, the side-gutter space, and a milestone celebration
Three pieces, all custom SVG/CSS — deliberately not stock photography, to
avoid licensing risk and external dependencies (you mentioned you'll
source copyright-clear photos yourself later; each piece below is built as
its own small component specifically so swapping in a real photo later is
a one-file change, noted in a comment at the top of
`SunriseIllustration.jsx`).

- **`client/src/components/SunriseIllustration.jsx`** — a flat, layered
  sunrise-over-hills illustration in the app's existing brand palette,
  extending the logo's sunrise motif rather than introducing a new visual
  language. One `viewBox`, `preserveAspectRatio="slice"` crops it cleanly
  for any container size, so the same artwork serves both uses below
  without separate variants.
- **`client/src/components/SideDecoration.jsx`** — fills the empty gutters
  beside the centered content on wide screens (answers the original "is
  this for ads" question directly: it's not, nothing ad-related exists
  anywhere in this app). Fixed-position, `pointer-events-none`, hidden
  entirely below the `lg` breakpoint — phone users never see or load it.
  The two sides mirror the same artwork via a CSS `scaleX(-1)` rather than
  drawing it twice.
- **Login hero** — the same illustration as a banner above the headline on
  the very first screen, the highest-impact single spot for setting an
  emotional tone before anyone reads a word.
- **`client/src/components/Celebration.jsx`** — a brief (~2.4s), brand-colored
  confetti burst, pure CSS keyframes, no new dependency (same philosophy as
  the hand-drawn canvas share card). Deliberately restrained rather than
  game-like, since this is a recovery app. Triggers once per newly-crossed
  milestone (1/3/7/14/21/30/60/90 days) — tracked per-account in
  `localStorage` so it fires exactly once per threshold, not on every
  dashboard visit. Verified the crossing logic in isolation against every
  boundary value before wiring it in.
  One real product decision made while building this: a relapse now also
  clears that tracking, so hitting day 1 again after restarting gets
  celebrated too, rather than being silently suppressed for falling below
  a previous high-water mark — consistent with the app's own existing
  copy on the relapse button ("restarting counts as progress too").

## Recovery-email advisory + repeat-user nudge
Rather than making a recovery email mandatory at signup (which would
undercut the phone+PIN-only anonymity design), it stays optional but now
gets actively surfaced at the two moments it matters:

- **At signup** — a short note under the age-confirmation checkbox in
  `Login.jsx` explains the tradeoff plainly: add one later from Settings,
  or you'll need to contact support instead of self-resetting if you
  forget your PIN.
- **Repeat users who skipped it** — a new `"loginCount"` column
  (`server/schema.sql`, migration included) increments on every successful
  register/login. Once it reaches 3 for an account with no
  `recoveryEmail` set, the Dashboard shows a dismissible amber reminder
  card linking straight to Settings. "Not now" only dismisses for that
  session — it reappears next time they open the app, rather than being
  permanently silence-able, since the actual lockout risk doesn't go away
  just because someone brushed past the reminder once. Verified the full
  counter logic end-to-end against a mock: 1 after registering, 2 and 3
  after subsequent logins, and the nudge condition clearing the moment a
  recovery email is saved.

## Google/Facebook login — decided against
Considered, deliberately not built. Two reasons: it works against the
anonymity this app has been built around since the phone+PIN decision (no
real name required, no OAuth profile data), and Facebook Login in
particular now requires business verification (a registered business,
physical address, and a signed contract with Meta) for the `email`
permission — a real barrier that didn't exist a few years back. PIN-only
login stands as the one and only login method.

## Legal pages finalized + recovery-email fix
- **Terms of Service and Privacy Policy** — removed the "draft, not
  reviewed by a lawyer" framing; both now read as the live, current
  policy (dated September 27, 2026). If you want an actual lawyer's pass
  before wider launch, that's still worth doing, but the app no longer
  displays these as unfinished.
- **Fixed the recovery-email save error** — a real drift bug, not a code
  bug: `recoveryEmail`, `pinResetCode`, and `pinResetExpiresAt` were added
  to `schema.sql`'s `users` table *after* the Supabase project was already
  set up and its original schema already run. `create table if not
  exists` doesn't retroactively add columns to a table that already
  exists, so the live database was missing all three — every attempt to
  save a recovery email failed with a generic "Something went wrong."
  Fixed two ways: gave the exact `ALTER TABLE ... ADD COLUMN IF NOT
  EXISTS` statements to run once on the live database, and added the same
  statements as a permanent **Migrations** section at the bottom of
  `server/schema.sql` — safe to re-run any time this file changes on a
  database that already exists (a no-op on a brand-new one, since the
  columns are already in the `CREATE TABLE` above). Worth checking this
  section any time a future schema change doesn't seem to take effect on
  the live app.

## Footer — "Developed by JazzMedia"
Added `client/src/components/Footer.jsx`, rendered on every screen
(including the login/onboarding screens, before anyone's even signed up —
that's where cross-promotion to jazzmedia.co.ke reaches the most people)
via `App.jsx`. Links out to https://www.jazzmedia.co.ke/ in a new tab.
Padded on mobile (`pb-24`) so it isn't hidden behind the fixed bottom nav
bar — worth a visual check on a real phone after deploying, since padding
math like this is exactly the kind of thing that looks right in code and
still needs an eyeball check on an actual device.

## Nearest places finder + curated learning/reading/leisure resources
- **Places finder** (`/places`, `server/places.js`) — find churches, mosques,
  gyms, cafés, or community centers near you. Deliberately built on
  **OpenStreetMap** (Overpass API for the search, Nominatim for turning a
  typed area name into coordinates) instead of Google Places: both are free
  forever, no API key, no billing account — matching every other cost
  decision in this app. The real tradeoff, stated plainly in the page's own
  copy: OSM's coverage is decent in Nairobi and other major towns but can
  have real gaps in smaller areas, since it's community-mapped. If that
  becomes a problem, Google Places is the paid upgrade path.
  - Location comes from the browser's Geolocation API ("Use my location"),
    with a manual area-name search as a fallback/alternative for anyone who
    declines permission or wants to search somewhere else.
  - **Testing note**: same situation as the Supabase migration — this
    sandbox can't reach `overpass-api.de` or `nominatim.openstreetmap.org`
    (not on its allowed domain list), so I verified the code two ways
    instead: a careful re-check of the Overpass query syntax and response
    shape against current documentation, and a full run of every function
    (`searchNearbyPlaces`, `geocode`) plus the actual Express routes against
    a mocked `fetch` returning realistic Overpass/Nominatim response JSON —
    parsing, sorting by distance, the "no name tag" fallback, the Google
    Maps link format, and the auth/validation error paths all passed. Worth
    a real smoke test once deployed (search near an actual Kenyan town) to
    confirm live connectivity behaves the way the mock predicted.
  - `USER_AGENT` in `server/places.js` is set to a placeholder contact
    email — both OSM services' usage policies ask for a real identifying
    User-Agent; update it if you change support contacts.
- **Free learning & reading**, added to the Resources page: Khan Academy and
  freeCodeCamp (genuinely free, no catch), Coursera and edX (free to
  "audit" — Coursera's audit availability varies by course/instructor, and
  edX's audit access expires after the course's nominal length, so the page
  copy is honest about that rather than overselling "free"), Project
  Gutenberg and Open Library for reading.
- **"Take a break" (music/movies)** — deliberately **not** a curated list of
  specific songs, artists, or titles, and nothing is embedded/played in the
  app. Tastes vary too much for us to pick well, and licensing/hosting
  actual media is a different project entirely. Instead it's framed as a
  suggestion ("put on music you like, watch something that pulls your
  attention elsewhere") with two neutral, broad platforms (YouTube,
  Spotify's free tier) as starting points for anyone who doesn't already
  have a go-to.

## SPA routing fix + Back/Home navigation
Two real bugs fixed:

- **404 on refresh for any non-root route** (`/share`, `/checkin`, etc.) —
  this is a standard single-page-app issue on Vercel: it serves static
  files, so a direct hit or refresh on `/share` looks for an actual file at
  that path and finds nothing, since routing only happens client-side via
  React Router after `index.html` loads. Fixed with **`client/vercel.json`**,
  which tells Vercel to serve `index.html` for every path and let React
  Router take over:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
  This only takes effect on your **next Vercel deploy** — push this file to
  GitHub for it to apply.
- **No way back/home on sub-pages** — added `client/src/components/BackBar.jsx`,
  a small bar with a "← Back" (real browser history, falling back to a safe
  route if there isn't any — e.g. landing directly on a shared link) and a
  "🏠 Home" link, placed on every page that isn't one of the main nav tabs:
  Check-in, Share, Contact, the whole Support flow (directory, apply as
  provider, register/join an institution, institution dashboard, inbox,
  message threads), and Upgrade. Dashboard/Toolkit/Journal/Analytics/Resources/
  Support already have the top nav (and bottom nav on mobile), so they don't
  need it.
  While wiring this up I also caught and fixed two real bugs that would've
  shipped broken: `Inbox.jsx` and `Thread.jsx` imported `BackBar` but never
  actually rendered it, and `InstitutionDashboard.jsx` had a mismatched
  fragment/div tag that broke the entire build. Caught by actually running
  `npm run build` rather than trusting the code looked right.

## Contact/feedback, crisis resources in Resources, login value props
- **`/contact`** — a simple feedback form (Help / Suggestion / Compliment /
  Complaint + message), posts to `POST /api/feedback`. Submissions are
  visible in a new **Feedback tab on `/admin`**, with a "Mark resolved"
  action (`server/index.js` — `/api/admin/feedback*`, `/api/feedback`).
- **Resources page** now also lists the same crisis helplines the "Need
  help now?" button shows (pulled from the same `/api/crisis-resources`),
  so they're discoverable without needing the emergency button, plus a
  link to `/contact`.
- **Login's first screen** now leads with a short value-prop list (Always
  free, Private by design, All addictions welcome, Real tools) before the
  phone number field, instead of jumping straight to the input with no
  context.

## Persistent database (Supabase) — replaces the old JSON-file storage
**Why this exists**: the app used to store everything in a local JSON file
via `lowdb`. That worked for a demo, but on Render's free tier, the local
filesystem is wiped every time the service redeploys, restarts, or spins
down from inactivity (which happens after ~15 minutes idle) — so every
account, streak, and message was silently getting erased. If you noticed
having to "re-register" a phone number that should already have existed,
this was why. The app now uses **Supabase** (hosted Postgres) instead, which
persists properly and has a genuinely free tier with no 30-day expiry
(unlike Render's own free Postgres, which self-destructs after 30 days).

### One-time setup
1. Create a free account and project at https://supabase.com.
2. In your new project, go to **SQL Editor → New query**, paste the entire
   contents of `server/schema.sql`, and click **Run**. This creates all 8
   tables (users, sessions, checkins, journal, payments, institutions,
   messages, feedback).
3. Go to **Project Settings → API**. You need two values:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`) → `SUPABASE_URL`
   - **service_role key** (NOT the "anon" key — the service role key bypasses
     Row Level Security, which is what a trusted backend needs; never expose
     this key to the frontend) → `SUPABASE_SERVICE_ROLE_KEY`
4. Set both as environment variables on Render (Dashboard → your service →
   Environment), and locally in a `.env`-style setup if you run the backend
   outside Render. Without them, the server refuses to start and prints
   exactly which variable is missing.

### What changed in the code
- `server/schema.sql` — the Postgres schema, with quoted camelCase column
  names (`"pinHash"`, `"createdAt"`, etc.) so they match the JS field names
  used everywhere else exactly — no snake_case/camelCase mapping layer.
- `server/supabaseClient.js` — creates the Supabase client using the
  service role key. Exits with a clear error on startup if the env vars
  aren't set, rather than failing confusingly later.
- `server/db.js` and the `lowdb` dependency are gone entirely.
- Every route in `server/index.js` that used to do
  `await db.read(); db.data.users.find(...)` now does a direct, targeted
  Supabase query (e.g. `supabase.from("users").select("*").eq("id", ...)`),
  which is both more correct (no more whole-file read/write races) and only
  fetches what each route actually needs.
- Row Level Security is intentionally left off in `schema.sql` — the backend
  is the only thing that ever talks to Supabase (using the service role
  key, which bypasses RLS anyway), so there's no direct client-side access
  to secure yet. If you later query Supabase directly from the frontend,
  add RLS policies before doing so.

### Testing note
I couldn't reach a real Supabase project from the sandbox this was built in
(no outbound network access to `supabase.co`), so every route was verified
two ways instead: a full read of the final code against the original
lowdb logic to confirm nothing was dropped, and a complete run against a
temporary in-memory mock of the Supabase client's query-builder API
(insert/update/select/eq/order/or) that exercised every endpoint end-to-end
— auth, profile, check-ins, journal, Pro billing, providers, institutions,
messaging, feedback, and all admin routes all passed. That mock was for
testing only and isn't part of the shipped app. Worth doing a quick
smoke test against your real Supabase project once it's deployed (register
an account, complete onboarding, log a check-in) to confirm the live
connection works exactly like the mock did.

## On dropping Pro / ads (a note from planning this slice)
We discussed whether to drop the Pro tier and rely on ads instead, given
that many competing quit-addiction apps are free. Kept Pro as-is: Kenya ad
CPMs are weak (covered earlier in this README's monetization notes), "free"
competitors are often grant/institution-funded rather than ad-funded, and
everything safety-critical in ClearDay (crisis resources, journal, toolkit,
check-ins) is already free — Pro only gates supplementary features
(analytics, 1:1 provider messaging, meditation library). The
institution/B2B2C angle (churches, NGOs, employers) remains the strongest
revenue lever specifically for Kenya, independent of whether Pro exists.

## Shareable streak card, Resources hub, mobile bottom nav, and reminders
Four more ideas borrowed from reviewing a competitor app, built out fully:

- **Shareable streak card** (`client/src/pages/ShareCard.jsx`, `/share`) —
  draws a branded image (streak, days-free, money saved) on an HTML canvas
  and offers **Share image** (via the Web Share API on supporting
  browsers/mobile, with a download fallback) or **Download**. No new
  dependency — drawn by hand with Canvas 2D rather than a screenshot
  library. Also has direct **WhatsApp / Facebook / X** buttons — these open
  each platform's share intent with a text caption + link (that's how those
  platforms' web share links work; they can't attach a locally-generated
  image file, only the native Web Share sheet can). Reachable from a "Share
  your streak →" link on the Dashboard.
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

> Data now persists properly via Supabase (see the "Persistent database"
> section above) — set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as
> environment variables on this Render service, or it will refuse to start.

### Frontend → Vercel
1. On Vercel: **New Project**, point at the repo, set **root directory** to `client`.
2. Framework preset: Vite.
3. Add an environment variable: `VITE_API_URL` = your Render backend URL.
4. Deploy.

## Before going live with real users
- **Add a "forgot PIN" recovery flow** before real users depend on this —
  see the note in the phone+PIN section above.

## Remaining ideas beyond the original roadmap
- Community (grouped by addiction type, with moderation)
- True push notifications (service worker + web-push/VAPID) to replace the
  foreground-only reminder above
- Swahili support, done properly with a real i18n library (see note above)
- Accountability partner / buddy system
- Real accounts for admin staff (right now there's one shared `ADMIN_SECRET`,
  fine for a solo owner, not for a team)
