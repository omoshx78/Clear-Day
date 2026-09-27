-- Migration for databases that already ran the original schema.sql
-- (i.e. your live Supabase project). Adds the columns needed for
-- optional recovery-email + forgot-PIN, and is safe to run more than
-- once (IF NOT EXISTS guards every column add).
--
-- Run this in Supabase's SQL Editor the same way you ran schema.sql.
-- If you're setting up a BRAND NEW project instead, you don't need this
-- file — the updated schema.sql already includes these columns.

alter table users add column if not exists "recoveryEmail" text;
alter table users add column if not exists "pinResetCode" text;
alter table users add column if not exists "pinResetExpiresAt" timestamptz;
