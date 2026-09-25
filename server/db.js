import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "data.json");

const defaultData = { users: [], checkins: [], journal: [], sessions: [], payments: [], institutions: [], messages: [] };

const adapter = new JSONFile(file);
export const db = new Low(adapter, defaultData);

export async function initDb() {
  await db.read();
  db.data ||= defaultData;
  db.data.sessions ||= [];
  db.data.payments ||= [];
  db.data.institutions ||= [];
  db.data.messages ||= [];
  await db.write();
}
