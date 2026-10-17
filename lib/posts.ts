// Server-only write path for records — the records half of this app's runtime
// writers, after auth (signup), bookmark toggles and the profile picture.
// Reads live in lib/queries.ts; everything here writes, over the read-write
// handle.
//
// A record's pictures are written into public/img/ beside the seeded ones and
// named after the ids the record's own counter produces ("E1301.jpg" for event
// 13's first picture), so every surface resolves them through lib/images.ts
// exactly as it resolves the seed data — there is no second image pathway. That
// does write into the working tree, which is what dev and a local `next start`
// serve; an immutable deployment would need a real object store, since files
// added at runtime are not part of the build.
//
// Creating and editing differ in one rule: an id is never handed out twice (see
// lib/imageId.ts). A picture an edit drops is retired rather than deleted, and
// the pictures it keeps are not touched, renamed or renumbered at all — so an
// edit can never change the URL of a picture that survived it.
import { getWriteDb } from "./db";
import { imageId, imageIds, imageSeqOf, type ImageKind } from "./imageId";
import { removeImages, retireImage, saveImage } from "./images";
import type { PostType } from "./postTypes";
import { getEventById, getItemById } from "./queries";
import { parseRecordId } from "./recordId";
import { MAX_PICTURES, pictureError } from "./upload";

export type CreateResult =
  | { ok: true; recordId: string }
  | { ok: false; error: string };

export type UpdateResult = CreateResult;
export type DeleteResult = { ok: true } | { ok: false; error: string };

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 2000;
const MAX_LINE = 160;
const MAX_UNIT = 40;

const PICTURE_FAILED = "The pictures could not be saved. Please try again.";
const NOT_FOUND = "That record could not be found.";
// The same message whether the record is missing from the caller's point of
// view or simply someone else's: the UI only ever offers these controls on a
// record the viewer owns, so both cases are a tampered request.
const NOT_YOURS = "You can only change your own posts.";
const STALE_PICTURE = "That picture is no longer part of this listing.";

// Where a record's pictures belong, and which id family names them. Rentals and
// services share the items table but not a folder or an id prefix — R<item_id>
// in public/img/Rental, S<item_id> in public/img/Services — which mirrors what
// itemImageIndex() resolves for the seed data.
const PICTURE_TARGET: Record<
  PostType,
  { folder: string; kind: ImageKind }
> = {
  event: { folder: "Events", kind: "event" },
  rent: { folder: "Rental", kind: "rental" },
  service: { folder: "Services", kind: "service" },
};

/** The pictures an edit keeps, in order, plus the files it adds. */
export type PictureEdit = {
  /** Ids the form kept. Anything stored but not listed here is retired. */
  keep: string[];
  pictures: File[];
};

export type EventDraft = {
  title: string;
  description: string;
  category: string;
  venue: string;
  /** The datetime-local value as entered: "YYYY-MM-DDTHH:MM". */
  startTime: string;
  endTime: string;
  starPoints: boolean;
  pictures: File[];
};

export type ItemDraft = {
  title: string;
  description: string;
  category: string;
  price: string;
  priceUnit: string;
  location: string;
  available: boolean;
  pictures: File[];
};

/** The same fields as a draft, with the picture set instead of just new files. */
export type EventEdit = Omit<EventDraft, "pictures"> & PictureEdit;
export type ItemEdit = Omit<ItemDraft, "pictures"> & PictureEdit;

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// The app stores and renders every timestamp as UTC wall-clock (lib/format.ts),
// so the time that was typed is stored verbatim and read back unchanged —
// converting it into the browser's zone would show the organiser a different
// time than the one they entered. Returns the column's "YYYY-MM-DD HH:MM:SS".
function eventTime(value: string): string | null {
  if (!DATETIME_RE.test(value)) return null;
  if (Number.isNaN(Date.parse(`${value}:00Z`))) return null;
  return `${value.replace("T", " ")}:00`;
}

function lineError(value: string, label: string, max: number): string | null {
  if (!value) return `${label} is required.`;
  if (value.length > max) {
    return `${label} must be ${max} characters or fewer.`;
  }
  return null;
}

// The per-file rules live in lib/upload.ts so the profile upload shares them.
function fileErrors(files: File[]): string | null {
  for (const file of files) {
    const invalid = pictureError(file);
    if (invalid) return invalid;
  }
  return null;
}

// One message at a time, like the login form: the first thing wrong stops the
// post.
function picturesError(files: File[]): string | null {
  if (files.length > MAX_PICTURES) {
    return `Add up to ${MAX_PICTURES} pictures.`;
  }
  return fileErrors(files);
}

// Writes a new record's pictures in order and returns their ids. A failure
// part-way removes what was already written and reports null, so the caller can
// delete the row too — a post that silently drops half the pictures the author
// picked is worse than no post. A brand-new record has no ids in use, so the
// sequence simply starts at 1.
async function attachPictures(
  target: { folder: string; kind: ImageKind },
  id: number,
  files: File[],
): Promise<string[] | null> {
  const stems: string[] = [];
  for (const [index, file] of files.entries()) {
    const stem = imageId(target.kind, id, index + 1);
    if (!(await saveImage(target.folder, stem, file))) {
      for (const written of stems) removeImages(target.folder, written);
      return null;
    }
    stems.push(stem);
  }
  return stems;
}

export async function createEvent(
  email: string,
  draft: EventDraft,
): Promise<CreateResult> {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const category = draft.category.trim();
  const venue = draft.venue.trim();

  const invalid =
    lineError(title, "Title", MAX_TITLE) ??
    lineError(description, "Description", MAX_DESCRIPTION) ??
    lineError(category, "Category", MAX_LINE) ??
    lineError(venue, "Venue", MAX_LINE) ??
    picturesError(draft.pictures);
  if (invalid) return { ok: false, error: invalid };

  const startTime = eventTime(draft.startTime);
  const endTime = eventTime(draft.endTime);
  if (!startTime || !endTime) {
    return { ok: false, error: "Enter a valid start and end time." };
  }
  // Both stamps are zero-padded ISO order, so the strings compare as times.
  if (startTime >= endTime) {
    return { ok: false, error: "The event has to end after it starts." };
  }

  const db = getWriteDb();
  const inserted = db
    .prepare(
      `INSERT INTO events
         (organizer_email, title, description, category, venue_name,
          start_time, end_time, star_points_eligible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      email,
      title,
      description,
      category,
      venue,
      startTime,
      endTime,
      draft.starPoints ? 1 : 0,
    );

  const id = Number(inserted.lastInsertRowid);

  if (draft.pictures.length > 0) {
    const stems = await attachPictures(PICTURE_TARGET.event, id, draft.pictures);
    if (!stems) {
      // A post without pictures renders the placeholder; a post that silently
      // drops the files the organiser picked is a bug, so the row goes with
      // them.
      db.prepare("DELETE FROM events WHERE event_id = ?").run(id);
      return { ok: false, error: PICTURE_FAILED };
    }
    db.prepare(
      "UPDATE events SET images = ?, image_seq = ? WHERE event_id = ?",
    ).run(JSON.stringify(stems), stems.length, id);
  }

  return { ok: true, recordId: `event-${id}` };
}

export async function createItem(
  email: string,
  type: "rent" | "service",
  draft: ItemDraft,
): Promise<CreateResult> {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const category = draft.category.trim();
  const priceUnit = draft.priceUnit.trim();
  const location = draft.location.trim();

  const invalid =
    lineError(title, "Title", MAX_TITLE) ??
    lineError(description, "Description", MAX_DESCRIPTION) ??
    lineError(category, "Category", MAX_LINE) ??
    lineError(priceUnit, "Price unit", MAX_UNIT) ??
    (location.length > MAX_LINE
      ? `Location must be ${MAX_LINE} characters or fewer.`
      : null) ??
    picturesError(draft.pictures);
  if (invalid) return { ok: false, error: invalid };

  const price = Number(draft.price.trim());
  if (!draft.price.trim() || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Enter a price of zero or more." };
  }

  const db = getWriteDb();
  const inserted = db
    .prepare(
      `INSERT INTO items
         (provider_email, title, description, item_type, category, price,
          price_unit, location_coverage, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      email,
      title,
      description,
      type,
      category,
      price,
      priceUnit,
      location || null,
      draft.available ? 1 : 0,
    );

  const id = Number(inserted.lastInsertRowid);

  if (draft.pictures.length > 0) {
    const stems = await attachPictures(PICTURE_TARGET[type], id, draft.pictures);
    if (!stems) {
      db.prepare("DELETE FROM items WHERE item_id = ?").run(id);
      return { ok: false, error: PICTURE_FAILED };
    }
    db.prepare(
      "UPDATE items SET images = ?, image_seq = ? WHERE item_id = ?",
    ).run(JSON.stringify(stems), stems.length, id);
  }

  return { ok: true, recordId: `item-${id}` };
}

type PictureOutcome =
  | { ok: true; ids: string[]; seq: number }
  | { ok: false; error: string };

// What a record's pictures should be after an edit, and the files that make it
// so. Anything fallible happens first: the new files are written before a single
// existing picture is touched, so an edit that fails half-way has changed
// nothing the site can see (the row still points at exactly what it did).
//
// The survivors keep their ids and their files; the dropped ones are retired to
// retired/; the new ones take the next numbers the record has *never* used,
// counted from the stored high-water mark and the stored array together — so
// removing the newest picture cannot free its number for the next upload.
async function editPictures(
  target: { folder: string; kind: ImageKind },
  recordId: number,
  stored: string[],
  storedSeq: number,
  edit: PictureEdit,
): Promise<PictureOutcome> {
  const storedSet = new Set(stored);
  if (edit.keep.some((id) => !storedSet.has(id))) {
    return { ok: false, error: STALE_PICTURE };
  }

  // Read in the record's own order, not the form's, so the gallery cannot be
  // rearranged by a tampered request — and duplicates in `keep` collapse.
  const keepSet = new Set(edit.keep);
  const kept = stored.filter((id) => keepSet.has(id));

  if (kept.length + edit.pictures.length > MAX_PICTURES) {
    return { ok: false, error: `Add up to ${MAX_PICTURES} pictures.` };
  }
  const invalid = fileErrors(edit.pictures);
  if (invalid) return { ok: false, error: invalid };

  const highest = Math.max(
    storedSeq,
    ...stored.map((id) => imageSeqOf(id, target.kind, recordId)),
    0,
  );

  const added: string[] = [];
  for (const [index, file] of edit.pictures.entries()) {
    const stem = imageId(target.kind, recordId, highest + index + 1);
    if (!(await saveImage(target.folder, stem, file))) {
      for (const written of added) removeImages(target.folder, written);
      return { ok: false, error: PICTURE_FAILED };
    }
    added.push(stem);
  }

  for (const id of stored) {
    if (!keepSet.has(id)) retireImage(target.folder, id);
  }

  return { ok: true, ids: [...kept, ...added], seq: highest + added.length };
}

export async function updateEvent(
  email: string,
  eventId: number,
  edit: EventEdit,
): Promise<UpdateResult> {
  // Loaded on the read connection: this is the same row the details page just
  // showed, and the UPDATE below re-states the owner so the check cannot be
  // raced.
  const current = getEventById(eventId);
  if (!current) return { ok: false, error: NOT_FOUND };
  if (current.organizer_email !== email) {
    return { ok: false, error: NOT_YOURS };
  }

  const title = edit.title.trim();
  const description = edit.description.trim();
  const category = edit.category.trim();
  const venue = edit.venue.trim();

  const invalid =
    lineError(title, "Title", MAX_TITLE) ??
    lineError(description, "Description", MAX_DESCRIPTION) ??
    lineError(category, "Category", MAX_LINE) ??
    lineError(venue, "Venue", MAX_LINE);
  if (invalid) return { ok: false, error: invalid };

  const startTime = eventTime(edit.startTime);
  const endTime = eventTime(edit.endTime);
  if (!startTime || !endTime) {
    return { ok: false, error: "Enter a valid start and end time." };
  }
  if (startTime >= endTime) {
    return { ok: false, error: "The event has to end after it starts." };
  }

  const pictures = await editPictures(
    PICTURE_TARGET.event,
    eventId,
    imageIds(current.images),
    current.image_seq,
    edit,
  );
  if (!pictures.ok) return pictures;

  const updated = getWriteDb()
    .prepare(
      `UPDATE events
          SET title = ?, description = ?, category = ?, venue_name = ?,
              start_time = ?, end_time = ?, star_points_eligible = ?,
              images = ?, image_seq = ?
        WHERE event_id = ? AND organizer_email = ?`,
    )
    .run(
      title,
      description,
      category,
      venue,
      startTime,
      endTime,
      edit.starPoints ? 1 : 0,
      pictures.ids.length > 0 ? JSON.stringify(pictures.ids) : null,
      pictures.seq,
      eventId,
      email,
    );

  if (updated.changes === 0) return { ok: false, error: NOT_YOURS };
  return { ok: true, recordId: `event-${eventId}` };
}

export async function updateItem(
  email: string,
  itemId: number,
  edit: ItemEdit,
): Promise<UpdateResult> {
  const current = getItemById(itemId);
  if (!current) return { ok: false, error: NOT_FOUND };
  if (current.provider_email !== email) {
    return { ok: false, error: NOT_YOURS };
  }

  const title = edit.title.trim();
  const description = edit.description.trim();
  const category = edit.category.trim();
  const priceUnit = edit.priceUnit.trim();
  const location = edit.location.trim();

  const invalid =
    lineError(title, "Title", MAX_TITLE) ??
    lineError(description, "Description", MAX_DESCRIPTION) ??
    lineError(category, "Category", MAX_LINE) ??
    lineError(priceUnit, "Price unit", MAX_UNIT) ??
    (location.length > MAX_LINE
      ? `Location must be ${MAX_LINE} characters or fewer.`
      : null);
  if (invalid) return { ok: false, error: invalid };

  const price = Number(edit.price.trim());
  if (!edit.price.trim() || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Enter a price of zero or more." };
  }

  // The type comes from the row, never from the form: a rental stays in
  // public/img/Rental and keeps its R prefix, and the item cannot be moved into
  // the other table by a tampered request.
  const pictures = await editPictures(
    PICTURE_TARGET[current.item_type],
    itemId,
    imageIds(current.images),
    current.image_seq,
    edit,
  );
  if (!pictures.ok) return pictures;

  const updated = getWriteDb()
    .prepare(
      `UPDATE items
          SET title = ?, description = ?, category = ?, price = ?,
              price_unit = ?, location_coverage = ?, is_available = ?,
              images = ?, image_seq = ?
        WHERE item_id = ? AND provider_email = ?`,
    )
    .run(
      title,
      description,
      category,
      price,
      priceUnit,
      location || null,
      edit.available ? 1 : 0,
      pictures.ids.length > 0 ? JSON.stringify(pictures.ids) : null,
      pictures.seq,
      itemId,
      email,
    );

  if (updated.changes === 0) return { ok: false, error: NOT_YOURS };
  return { ok: true, recordId: `item-${itemId}` };
}

// The one record delete, for events and items alike. It is a database operation
// and nothing else: the record's pictures stay exactly where they are on disk
// (unreferenced, and unreachable, because neither a record number nor a picture
// number is ever reused), and the cascade takes its bookmarks, RSVPs and
// reviews with it.
export function deleteRecord(email: string, id: string): DeleteResult {
  const parsed = parseRecordId(id);
  if (!parsed) return { ok: false, error: NOT_FOUND };

  const exists =
    parsed.kind === "event" ? getEventById(parsed.id) : getItemById(parsed.id);
  if (!exists) return { ok: false, error: NOT_FOUND };

  const db = getWriteDb();
  const deleted =
    parsed.kind === "event"
      ? db
          .prepare(
            "DELETE FROM events WHERE event_id = ? AND organizer_email = ?",
          )
          .run(parsed.id, email)
      : db
          .prepare("DELETE FROM items WHERE item_id = ? AND provider_email = ?")
          .run(parsed.id, email);

  if (deleted.changes === 0) return { ok: false, error: NOT_YOURS };
  return { ok: true };
}
