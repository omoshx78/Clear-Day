-- ClearDay database schema for Supabase (Postgres).
--
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor
-- → New query → paste this whole file → Run) before starting the backend.
--
-- Column names are quoted camelCase to match the field names used throughout
-- server/index.js and the frontend exactly — this keeps the JS code simple
-- (no snake_case <-> camelCase mapping layer needed).
--
-- The backend connects using the SERVICE ROLE key (server-side only, never
-- exposed to the browser), which bypasses Row Level Security entirely. RLS
-- is intentionally left off below because nothing ever talks to Supabase
-- directly from the frontend — every request goes through this Express API
-- first. If you later add direct client-side Supabase access, add RLS
-- policies before doing so.

create table if not exists users (
  id text primary key,
  phone text unique not null,
  "pinHash" text,
  "ageConfirmed" boolean default false,
  "failedPinAttempts" integer default 0,
  "lockedUntil" timestamptz,
  "createdAt" timestamptz default now(),
  addiction text,
  "quitDate" timestamptz,
  "weeklySpend" numeric default 0,
  "goalDays" integer default 21,
  "providerStatus" text,
  "providerDisplayName" text,
  "providerBio" text,
  "providerSpecialty" text,
  "providerCredentials" text,
  "providerAppliedAt" timestamptz,
  "institutionId" text,
  "isPro" boolean default false,
  "proExpiresAt" timestamptz,
  "reminderOptIn" boolean default false,
  "reminderTime" text default '19:00',
  "recoveryEmail" text,
  "pinResetCode" text,
  "pinResetExpiresAt" timestamptz,
  "loginCount" integer default 0
);
create index if not exists users_phone_idx on users (phone);
create index if not exists users_provider_status_idx on users ("providerStatus");
create index if not exists users_institution_id_idx on users ("institutionId");

create table if not exists sessions (
  token text primary key,
  "userId" text not null references users(id) on delete cascade,
  "createdAt" timestamptz default now()
);
create index if not exists sessions_user_id_idx on sessions ("userId");

create table if not exists checkins (
  id text primary key,
  "userId" text not null references users(id) on delete cascade,
  mood text,
  "cravingLevel" integer,
  note text,
  date timestamptz default now()
);
create index if not exists checkins_user_id_idx on checkins ("userId");

create table if not exists journal (
  id text primary key,
  "userId" text not null references users(id) on delete cascade,
  text text not null,
  trigger text,
  date timestamptz default now()
);
create index if not exists journal_user_id_idx on journal ("userId");

create table if not exists payments (
  id text primary key,
  "userId" text not null references users(id) on delete cascade,
  "checkoutRequestId" text unique,
  amount numeric,
  status text default 'pending',
  "createdAt" timestamptz default now(),
  "resultDesc" text,
  "resolvedAt" timestamptz
);
create index if not exists payments_checkout_request_id_idx on payments ("checkoutRequestId");
create index if not exists payments_user_id_idx on payments ("userId");

create table if not exists institutions (
  id text primary key,
  name text not null,
  type text not null,
  "contactPhone" text,
  status text default 'pending',
  "createdBy" text not null references users(id) on delete cascade,
  "inviteCode" text unique not null,
  "createdAt" timestamptz default now()
);
create index if not exists institutions_created_by_idx on institutions ("createdBy");
create index if not exists institutions_invite_code_idx on institutions ("inviteCode");

create table if not exists messages (
  id text primary key,
  "conversationId" text not null,
  "fromUserId" text not null references users(id) on delete cascade,
  "toUserId" text not null references users(id) on delete cascade,
  text text not null,
  date timestamptz default now()
);
create index if not exists messages_conversation_id_idx on messages ("conversationId");
create index if not exists messages_from_user_id_idx on messages ("fromUserId");
create index if not exists messages_to_user_id_idx on messages ("toUserId");

create table if not exists feedback (
  id text primary key,
  "userId" text references users(id) on delete set null,
  phone text,
  category text not null,
  message text not null,
  status text default 'open',
  date timestamptz default now()
);
create index if not exists feedback_status_idx on feedback (status);

-- ---------------------------------------------------------------------------
-- Migrations for existing databases
-- ---------------------------------------------------------------------------
-- The CREATE TABLE statements above are only read on a brand-new database —
-- if you already ran an earlier version of this file, "create table if not
-- exists" silently skips tables that already exist, so newly-added columns
-- never get added to your live table. Run the ALTER TABLE statements below
-- any time this file changes on a database you've already set up; they're
-- safe to re-run (IF NOT EXISTS) and safe to run on a brand-new database too
-- (the columns will already exist from the CREATE TABLE above, so these
-- become no-ops).

-- Added for the forgot-PIN / recovery-email feature:
alter table users add column if not exists "recoveryEmail" text;
alter table users add column if not exists "pinResetCode" text;
alter table users add column if not exists "pinResetExpiresAt" timestamptz;

-- Added to nudge repeat users who never added a recovery email:
alter table users add column if not exists "loginCount" integer default 0;

