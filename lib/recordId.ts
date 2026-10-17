// Record ids, pure: no database, no React, no node: import — the same split as
// lib/imageId.ts and lib/searchText.ts.
//
// Every record in the app is named "<kind>-<n>": "event-1", "item-4". That one
// string is the details route's parameter *and* the id the bookmark, assistant,
// edit and delete actions are handed, so the parser lives here where every
// caller can share it. It used to sit in lib/bookmarks.ts, which is server-only
// (it opens the database), and this feature gave it a second home to be read
// from.
export type RecordKind = "event" | "item";

export type RecordRef = { kind: RecordKind; id: number };

const RECORD_RE = /^(event|item)-(\d+)$/;

export function parseRecordId(recordId: string): RecordRef | null {
  const match = RECORD_RE.exec(recordId);
  if (!match) return null;
  return { kind: match[1] as RecordKind, id: Number(match[2]) };
}

/** The id builders a form and the actions both write: "event-1", "item-4". */
export function recordId(kind: RecordKind, id: number): string {
  return `${kind}-${id}`;
}
