// Catches exactly the failure mode that's bitten this project four times
// now: a column gets added to schema.sql, but the live Supabase database
// was set up before that column existed, so "create table if not exists"
// silently skips it (that statement only runs on a brand-new database),
// and the feature that needs it fails later with a vague, unhelpful error
// — during real use, not at deploy time, which is the worst possible
// moment to discover it.
//
// This runs once at startup and does a lightweight canary SELECT for
// every column that's been added via a migration since the original
// schema.sql. A missing column makes Postgres/PostgREST return a real
// error, which is exactly what this is listening for. Doesn't block
// startup or crash anything — same "warn loudly, keep running" philosophy
// as the Daraja/Resend/Flutterwave mock-mode fallbacks — just prints a
// loud, specific, actionable warning to the server logs (visible on
// Render immediately after every deploy) naming exactly which migration
// to run and where to find it.
//
// Whenever a new migration is added to schema.sql's Migrations section,
// add the same {table, columns} entry here too, so drift on THIS column
// gets caught the same way.
import { supabase } from "./supabaseClient.js";

const MIGRATED_COLUMNS = [
  { table: "users", columns: ["recoveryEmail", "pinResetCode", "pinResetExpiresAt"], addedFor: "forgot-PIN / recovery email" },
  { table: "users", columns: ["loginCount"], addedFor: "repeat-user recovery-email nudge" },
  { table: "payments", columns: ["provider"], addedFor: "Flutterwave payment option" },
];

export async function checkSchema() {
  const missing = [];

  for (const { table, columns, addedFor } of MIGRATED_COLUMNS) {
    const { error } = await supabase.from(table).select(columns.join(",")).limit(1);
    if (error) {
      missing.push({ table, columns, addedFor, errorMessage: error.message });
    }
  }

  if (missing.length === 0) {
    console.log("[schema check] All migrated columns present — database is up to date.");
    return;
  }

  console.error("\n" + "=".repeat(70));
  console.error("[schema check] WARNING: your live database is missing columns that");
  console.error("this version of the code expects. The features listed below will");
  console.error("fail with a generic error until you run the matching migration.");
  console.error("Run server/schema.sql's \"Migrations for existing databases\" section");
  console.error("in your Supabase SQL Editor — specifically:\n");
  missing.forEach(({ table, columns, addedFor, errorMessage }) => {
    console.error(`  - Table "${table}", column(s) [${columns.join(", ")}] — needed for: ${addedFor}`);
    console.error(`    (${errorMessage})`);
  });
  console.error("=".repeat(70) + "\n");
}
