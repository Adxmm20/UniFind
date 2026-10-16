// Server-only write path for /post — the third thing in this app that writes at
// runtime, after auth (signup) and bookmark toggles. Reads live in
// lib/queries.ts; everything here inserts, over the read-write handle.
//
// A posted picture is written into public/img/ beside the seeded ones and named
// after the new record's stem ("event-13.jpg", "service-19.jpg"), so every
// surface resolves it through lib/images.ts exactly as it resolves the seed
// data — there is no second image pathway. That does write into the working
// tree, which is what dev and a local `next start` serve; an immutable
// deployment would need a real object store, since files added at runtime are
// not part of the build.
import fs from "node:fs";
import path from "node:path";
import { getWriteDb } from "./db";
import type { PostType } from "./postTypes";

export type CreateResult =
  | { ok: true; recordId: string }
  | { ok: false; error: string };

// Raster formats only: an uploaded SVG would run its own scripts on this origin,
// and the seeded pictures are all jpg anyway.
const UPLOAD_RE = /\.(png|jpe?g|webp|gif|avif)$/i;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 2000;
const MAX_LINE = 160;
const MAX_UNIT = 40;

const PICTURE_FAILED = "The picture could not be saved. Please try again.";

// Where a new record's picture belongs, and the stem it must be named after.
// Rentals and services share the items table but not a folder or a stem family
// — item-<n> in public/img/Rental, service-<n> in public/img/Services — which
// mirrors what itemImageIndex() resolves for the seed data.
const PICTURE_TARGET: Record<
  PostType,
  { folder: string; stem: (id: number) => string }
> = {
  event: { folder: "Events", stem: (id) => `event-${id}` },
  rent: { folder: "Rental", stem: (id) => `item-${id}` },
  service: { folder: "Services", stem: (id) => `service-${id}` },
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
  picture: File | null;
};

export type ItemDraft = {
  title: string;
  description: string;
  category: string;
  price: string;
  priceUnit: string;
  location: string;
  available: boolean;
  picture: File | null;
};

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

function pictureError(file: File | null): string | null {
  if (!file) return null;
  if (file.size > MAX_IMAGE_BYTES) return "The picture must be 5 MB or smaller.";
  if (!UPLOAD_RE.test(file.name)) {
    return "The picture must be a JPG, PNG, WebP, GIF or AVIF file.";
  }
  return null;
}

// Writes the upload beside the seeded pictures and returns the stem to store.
function savePicture(
  type: PostType,
  id: number,
  name: string,
  bytes: Buffer,
): string {
  const target = PICTURE_TARGET[type];
  const stem = target.stem(id);
  const dir = path.join(process.cwd(), "public", "img", target.folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${stem}${path.extname(name).toLowerCase()}`), bytes);
  return stem;
}

async function attachPicture(
  type: PostType,
  id: number,
  file: File,
): Promise<string | null> {
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    return savePicture(type, id, file.name, bytes);
  } catch {
    return null;
  }
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
    pictureError(draft.picture);
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

  if (draft.picture) {
    const stem = await attachPicture("event", id, draft.picture);
    if (!stem) {
      // A post without a picture renders the placeholder; a post that silently
      // drops the file the organiser picked is a bug, so the row goes with it.
      db.prepare("DELETE FROM events WHERE event_id = ?").run(id);
      return { ok: false, error: PICTURE_FAILED };
    }
    db.prepare("UPDATE events SET banner_image_url = ? WHERE event_id = ?").run(
      stem,
      id,
    );
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
    pictureError(draft.picture);
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

  if (draft.picture) {
    const stem = await attachPicture(type, id, draft.picture);
    if (!stem) {
      db.prepare("DELETE FROM items WHERE item_id = ?").run(id);
      return { ok: false, error: PICTURE_FAILED };
    }
    db.prepare("UPDATE items SET images = ? WHERE item_id = ?").run(stem, id);
  }

  return { ok: true, recordId: `item-${id}` };
}
