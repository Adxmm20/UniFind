import { getDb, getWriteDb } from "./db";
import type { EventRow, ItemRow } from "./queries";
import { parseRecordId } from "./recordId";

export type BookmarkedEvent = EventRow & {
  bookmarked_at: string;
  bookmark_id: number;
};
export type BookmarkedItem = ItemRow & {
  bookmarked_at: string;
  bookmark_id: number;
};

export type ToggleResult =
  | { ok: true; bookmarked: boolean }
  | { ok: false; error: string };

// Record ids are "<kind>-<n>" ("event-1", "item-4") everywhere in this app — the
// same stem used for the picture filename. The parser now lives in
// lib/recordId.ts, which the edit/delete feature reads too.

// Every record the user has saved, as a set of record ids. One query for the
// whole page, which each page then folds into its CardData as a `bookmarked`
// flag.
export function getBookmarkIds(email: string): Set<string> {
  const rows = getDb()
    .prepare("SELECT event_id, item_id FROM bookmarks WHERE user_email = ?")
    .all(email) as unknown as { event_id: number | null; item_id: number | null }[];

  const ids = new Set<string>();
  for (const row of rows) {
    if (row.event_id !== null) ids.add(`event-${row.event_id}`);
    if (row.item_id !== null) ids.add(`item-${row.item_id}`);
  }
  return ids;
}

// A bookmark row points at an event *or* an item, so the two listings are two
// joins rather than one query with nullable halves.
//
// `bookmark_id` is selected as well as `created_at`: timestamps only resolve to
// the second, so several saves made in the same second tie, and the id is the
// only way to order them. The client sorts on the same pair, which keeps the
// "recently bookmarked" order stable when events and rentals are merged.
export function getBookmarkedEvents(email: string): BookmarkedEvent[] {
  return getDb()
    .prepare(
      `SELECT e.*, b.created_at AS bookmarked_at, b.bookmark_id AS bookmark_id
         FROM bookmarks b
         JOIN events e ON e.event_id = b.event_id
        WHERE b.user_email = ?
        ORDER BY b.created_at DESC, b.bookmark_id DESC`,
    )
    .all(email) as unknown as BookmarkedEvent[];
}

export function getBookmarkedItems(email: string): BookmarkedItem[] {
  return getDb()
    .prepare(
      `SELECT i.*, b.created_at AS bookmarked_at, b.bookmark_id AS bookmark_id
         FROM bookmarks b
         JOIN items i ON i.item_id = b.item_id
        WHERE b.user_email = ?
        ORDER BY b.created_at DESC, b.bookmark_id DESC`,
    )
    .all(email) as unknown as BookmarkedItem[];
}

function exists(kind: "event" | "item", id: number): boolean {
  const sql =
    kind === "event"
      ? "SELECT 1 AS hit FROM events WHERE event_id = ?"
      : "SELECT 1 AS hit FROM items WHERE item_id = ?";
  return getDb().prepare(sql).get(id) !== undefined;
}

export function toggleBookmark(email: string, recordId: string): ToggleResult {
  const parsed = parseRecordId(recordId);
  if (!parsed) return { ok: false, error: "That record could not be found." };

  // node:sqlite turns foreign keys on by default (and db/schema.sql re-asserts
  // `PRAGMA foreign_keys = ON`), so the write connection does enforce the
  // bookmark's REFERENCES — but a bad id would then arrive as a thrown
  // constraint error. Validate the target ourselves so it is a plain message.
  if (!exists(parsed.kind, parsed.id)) {
    return { ok: false, error: "That record could not be found." };
  }

  const column = parsed.kind === "event" ? "event_id" : "item_id";
  const db = getWriteDb();

  const current = db
    .prepare(
      `SELECT bookmark_id FROM bookmarks WHERE user_email = ? AND ${column} = ?`,
    )
    .get(email, parsed.id);

  if (current) {
    // Deletes every match, not just the first. There is no unique index on
    // (user_email, event_id) — adding one would mean a schema change and
    // `db:reset`, which would drop the accounts created at runtime — so
    // duplicates are cleaned up here instead of being prevented up front.
    db.prepare(
      `DELETE FROM bookmarks WHERE user_email = ? AND ${column} = ?`,
    ).run(email, parsed.id);
    return { ok: true, bookmarked: false };
  }

  db.prepare(
    `INSERT INTO bookmarks (user_email, ${column}) VALUES (?, ?)`,
  ).run(email, parsed.id);
  return { ok: true, bookmarked: true };
}
