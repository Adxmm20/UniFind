// One-off migration to the picture-id naming rule (lib/imageId.ts):
//
//   E101  event 1's picture number 1    public/img/Events/E101.jpg
//   R401  rental item 4's number 1      public/img/Rental/R401.jpg
//   S1001 service item 10's number 1    public/img/Services/S1001.jpg
//   P101  user 1's profile picture      public/img/pfp/P101.jpg
//
// It does three things:
//   1. renames the pictures under public/img/Events|Rental|Services
//   2. rewrites the picture columns of data/unifind.db in place
//   3. adds the per-record picture counters those ids are allocated from
//
// The database is altered, never re-seeded: `npm run db:reset` would drop the
// accounts created at runtime, which is exactly what the dump merge avoided
// too. Each step is skipped when it has already been done, so the script is
// idempotent — run it twice and the second run says so.
//
// Run once with:  node scripts/migrate-image-ids.mjs
import { DatabaseSync } from "node:sqlite";
import { existsSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The old stem each folder used, and the id its file is named after now.
const FOLDERS = [
  { dir: "Events", old: /^event-(\d+)$/i, id: (n) => `E${n}01` },
  { dir: "Rental", old: /^item-(\d+)$/i, id: (n) => `R${n}01` },
  { dir: "Services", old: /^service-(\d+)$/i, id: (n) => `S${n}01` },
];

// ---- 1. the pictures on disk ----------------------------------------------
for (const { dir, old, id } of FOLDERS) {
  const folder = path.join(root, "public", "img", dir);
  if (!existsSync(folder)) continue;

  for (const file of readdirSync(folder)) {
    const ext = path.extname(file).toLowerCase();
    const match = old.exec(file.slice(0, file.length - ext.length));
    if (!match) continue;

    const next = `${id(match[1])}${ext}`;
    if (next === file) continue; // already renamed
    if (existsSync(path.join(folder, next))) {
      console.log(`kept ${dir}/${file} — ${next} already exists`);
      continue;
    }
    renameSync(path.join(folder, file), path.join(folder, next));
    console.log(`renamed ${dir}/${file} -> ${next}`);
  }
}

// ---- 2. the database --------------------------------------------------------
const dbFile = path.join(root, "data", "unifind.db");
if (!existsSync(dbFile)) {
  console.log("no data/unifind.db — pictures renamed, nothing to migrate");
  process.exit(0);
}

const db = new DatabaseSync(dbFile);
const columnsOf = (table) =>
  db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);

const onPictureIds = !columnsOf("events").includes("banner_image_url");

if (!onPictureIds) {
  db.exec("PRAGMA foreign_keys = OFF;");
  // Everything below is one transaction: a failure half-way must not leave the
  // database with a user_id-less users table.
  db.exec("BEGIN;");

  // users: email stays the real identity (every child table references it), and
  // `user_id` becomes the number the profile picture's name needs. The table is
  // rebuilt because SQLite cannot add a primary key to an existing one; ids are
  // handed out in signup order, so accounts made at runtime keep sorting last.
  db.exec(`
    CREATE TABLE users_new (
      user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone_number  TEXT,
      profile_image TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users_new (user_id, email, password_hash, phone_number, created_at)
      SELECT ROW_NUMBER() OVER (ORDER BY created_at, email),
             email, password_hash, phone_number, created_at
        FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `);

  // events: one stem becomes an array of ids. NULL — a row with no picture —
  // stays NULL. The new column lands last rather than where db/schema.sql puts
  // it; column order is cosmetic here, since every query names its columns.
  db.exec(`
    ALTER TABLE events ADD COLUMN images TEXT;
    UPDATE events
       SET images = json_array('E' || event_id || '01')
     WHERE banner_image_url IS NOT NULL;
    ALTER TABLE events DROP COLUMN banner_image_url;
  `);

  // items: same column, but a rental's stem was "item-<n>" and a service's was
  // "service-<n>" — the prefix now says which of the two it is.
  db.exec(`
    UPDATE items
       SET images = json_array(
             CASE WHEN item_type = 'service' THEN 'S' ELSE 'R' END || item_id || '01'
           )
     WHERE images IS NOT NULL;
  `);

  db.exec("COMMIT;");
  db.exec("PRAGMA foreign_keys = ON;");
  console.log("migrated the picture columns to ids");
} else {
  console.log("data/unifind.db is already on the picture-id rule — left alone");
}

// ---- 3. the picture counters -------------------------------------------------
// An id is never handed out twice (see lib/imageId.ts), so each record needs the
// high-water mark its next picture's number is allocated from. A database that
// has just been through step 2 — or one that predates the counters — gets the
// column here and is backfilled from the arrays it already has.
//
// The backfill counts the pictures a record currently holds, which is exactly
// right for every row that exists before this rule: their ids all start at …01
// and run contiguously, so "how many" *is* the highest number in use. The
// running app keeps it exactly right from then on — every write recomputes the
// high-water mark from the stored counter and the stored array together, so
// removing a picture cannot free its number (lib/posts.ts).
// The three counters, and what each one is backfilled from: two picture columns
// hold a JSON array of ids, and users.profile_image holds a single id or NULL.
const COUNTERS = [
  { table: "events", column: "image_seq", field: "images", array: true },
  { table: "items", column: "image_seq", field: "images", array: true },
  { table: "users", column: "profile_image_seq", field: "profile_image", array: false },
];

for (const { table, column, field, array } of COUNTERS) {
  if (columnsOf(table).includes(column)) continue;

  db.exec("BEGIN;");
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0;`);
  db.exec(
    array
      ? // A JSON array of ids: however many it holds is the highest number used.
        `UPDATE ${table}
            SET ${column} = json_array_length(${field})
          WHERE ${field} IS NOT NULL;`
      : // A single id: either there is a picture or there is not, and an
        // account has only ever had one, so it is number 1.
        `UPDATE ${table} SET ${column} = 1 WHERE ${field} IS NOT NULL;`,
  );
  db.exec("COMMIT;");
  console.log(`added ${table}.${column}`);
}

const { u } = db.prepare("SELECT count(*) AS u FROM users").get();
const { e } = db.prepare("SELECT count(*) AS e FROM events").get();
const { i } = db.prepare("SELECT count(*) AS i FROM items").get();
db.close();

console.log(
  `data/unifind.db is on the picture-id rule (${u} users, ${e} events, ${i} items)`,
);
