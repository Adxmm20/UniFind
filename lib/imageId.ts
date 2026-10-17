// The picture-id rule, pure: no database, no React, no node: import — the same
// split as lib/searchText.ts. The server (cardData, details, /post, the profile
// action) and the database's own values all have to agree on one naming rule,
// so it lives alone where nothing can drift.
//
//   E101  →  event 1's picture number 1
//   E1201 →  event 12's picture number 1
//   R401  →  rental item 4's picture number 1
//   S1001 →  service item 10's picture number 1
//   P101  →  user 1's profile picture number 1
//
// The number is a **per-record sequence that is never reused**, not a position.
// A record's `image_seq` (users' `profile_image_seq`) is the high-water mark it
// is allocated from, so E101 is the first picture event 1 ever created: remove
// it and the next one that record makes is E102, and E101 is gone for good.
// That is what makes a picture's URL permanent — editing a gallery never moves
// or renumbers the pictures it keeps (see lib/posts.ts).
//
// The id is also the file's stem: E101's picture is public/img/Events/E101.jpg.
// A row is resolved by name through lib/images.ts, so inserting, reordering or
// deleting rows can never shift which picture a card gets.
export type ImageKind = "event" | "rental" | "service" | "profile";

const PREFIX: Record<ImageKind, string> = {
  event: "E",
  rental: "R",
  service: "S",
  profile: "P",
};

// The sequence is zero-padded to two digits, which is what keeps the common ids
// unambiguous: "E101" is event 1's picture 1, never event 10's picture 1. It
// grows past 99 only if a record ever creates 100 pictures, and nothing parses
// the number back out positionally (imageSeqOf() below strips the record's own
// prefix first), so a longer id stays readable.
export function imageId(kind: ImageKind, recordId: number, seq: number): string {
  return `${PREFIX[kind]}${recordId}${String(seq).padStart(2, "0")}`;
}

// The sequence inside one of a record's own picture ids: "E103" belonging to
// event 1 is 3. The record's number is stripped first, so event 11's "E1101"
// can never be read as event 1's picture 101 — an id that does not carry this
// record's own prefix, or carries no number at all, reads as 0 and so cannot
// push the allocator forward.
export function imageSeqOf(
  id: string,
  kind: ImageKind,
  recordId: number,
): number {
  const prefix = `${PREFIX[kind]}${recordId}`;
  if (!id.startsWith(prefix)) return 0;
  const digits = id.slice(prefix.length);
  if (!/^\d+$/.test(digits)) return 0;
  return Number(digits);
}

// A record's picture column holds a JSON array of these ids. Anything the
// parser cannot make sense of — NULL, an empty string, a value written before
// the id rule existed, malformed JSON — reads as "no pictures", so a bad row
// degrades to the blank placeholder instead of breaking a render.
export function imageIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}
