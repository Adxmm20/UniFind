// Builds data/unifind.db from db/schema.sql + db/seed.sql using Node's built-in
// SQLite (node:sqlite) — no native dependencies.
//
// Default behaviour is non-destructive: if the database already exists it is
// left completely alone, so accounts created at runtime survive `npm run dev`
// and `npm run build` (both of which run this script via predev/prebuild).
//
// Pass --force (or run `npm run db:reset`) to drop and recreate every table for
// the original deterministic-from-scratch build. That also works while a dev
// server has the database open, because it drops tables rather than deleting
// the file.
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const dbFile = path.join(dataDir, "unifind.db");

const force = process.argv.includes("--force");

if (existsSync(dbFile) && !force) {
  console.log(
    `Kept existing ${path.relative(root, dbFile)} (run "npm run db:reset" to rebuild from scratch)`,
  );
  process.exit(0);
}

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbFile);
db.exec("PRAGMA foreign_keys = OFF;");
for (const table of ["reviews", "bookmarks", "event_rsvps", "items", "events", "users"]) {
  db.exec(`DROP TABLE IF EXISTS ${table}`);
}
db.exec("PRAGMA foreign_keys = ON;");
db.exec(readFileSync(path.join(root, "db", "schema.sql"), "utf8"));
db.exec(readFileSync(path.join(root, "db", "seed.sql"), "utf8"));

const { u } = db.prepare("SELECT count(*) AS u FROM users").get();
const { e } = db.prepare("SELECT count(*) AS e FROM events").get();
const { i } = db.prepare("SELECT count(*) AS i FROM items").get();
db.close();

console.log(`Seeded ${path.relative(root, dbFile)} (${u} users, ${e} events, ${i} items)`);
