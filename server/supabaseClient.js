import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.\n" +
    "Create a free Supabase project, run server/schema.sql in its SQL Editor, then set:\n" +
    "  SUPABASE_URL=https://<your-project-ref>.supabase.co\n" +
    "  SUPABASE_SERVICE_ROLE_KEY=<service_role key, from Project Settings -> API>\n" +
    "See the README's \"Persistent database (Supabase)\" section for the full walkthrough."
  );
  process.exit(1);
}

// persistSession/autoRefreshToken are browser-auth features we don't use —
// this client only ever runs server-side with the service role key.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
