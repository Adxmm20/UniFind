import { getDb } from "./db";

export type UserRow = {
  user_id: number;
  email: string;
  password_hash: string;
  phone_number: string | null;
  /** Picture id ("P101") or null; resolved to a URL by lib/images.ts. */
  profile_image: string | null;
  /** The high-water mark picture ids are allocated from. Never reused. */
  profile_image_seq: number;
  created_at: string;
};

export type EventRow = {
  event_id: number;
  organizer_email: string;
  title: string;
  description: string;
  category: string;
  venue_name: string;
  start_time: string;
  end_time: string;
  star_points_eligible: number;
  /** JSON array of picture ids ("E101", "E102", …). See lib/imageId.ts. */
  images: string | null;
  /** The high-water mark picture ids are allocated from. Never reused. */
  image_seq: number;
  created_at: string;
};

export type ItemRow = {
  item_id: number;
  provider_email: string;
  title: string;
  description: string;
  item_type: "rent" | "service";
  category: string;
  price: number;
  price_unit: string | null;
  location_coverage: string | null;
  /** JSON array of picture ids ("R401" rental / "S1001" service). */
  images: string | null;
  /** The high-water mark picture ids are allocated from. Never reused. */
  image_seq: number;
  is_available: number;
  created_at: string;
};

export type ReviewRow = {
  review_id: number;
  item_id: number;
  reviewer_email: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
};

export type BookmarkRow = {
  bookmark_id: number;
  user_email: string;
  event_id: number | null;
  item_id: number | null;
  created_at: string;
};

export type RsvpRow = {
  rsvp_id: number;
  event_id: number;
  user_email: string;
  registered_at: string;
};

function all<T>(sql: string, ...params: (string | number)[]): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}

function one<T>(sql: string, ...params: (string | number)[]): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}

// ---- events ----------------------------------------------------------------

export function getEvents(): EventRow[] {
  return all<EventRow>("SELECT * FROM events ORDER BY start_time, event_id");
}

export function getEventsByOrganizer(email: string): EventRow[] {
  return all<EventRow>(
    "SELECT * FROM events WHERE organizer_email = ? ORDER BY start_time, event_id",
    email,
  );
}

// The Details route resolves one record by its id rather than scanning the
// list, so the page stays correct however many records exist.
export function getEventById(eventId: number): EventRow | undefined {
  return one<EventRow>("SELECT * FROM events WHERE event_id = ?", eventId);
}

// ---- items -----------------------------------------------------------------

export function getRentals(): ItemRow[] {
  return all<ItemRow>(
    "SELECT * FROM items WHERE item_type = 'rent' ORDER BY item_id",
  );
}

// The home page's third tab. A service is an item whose picture lives in
// public/img/Services as service-<n> rather than item-<n>, which itemImageIndex()
// resolves without the caller needing to know the type.
export function getServices(): ItemRow[] {
  return all<ItemRow>(
    "SELECT * FROM items WHERE item_type = 'service' ORDER BY item_id",
  );
}

// Every listing, rentals and services alike. The home page reads the two types
// through getRentals()/getServices() because they get a tab each, but the
// Details route prerenders all record ids from this.
export function getItems(): ItemRow[] {
  return all<ItemRow>("SELECT * FROM items ORDER BY item_id");
}

export function getItemsByProvider(email: string): ItemRow[] {
  return all<ItemRow>(
    "SELECT * FROM items WHERE provider_email = ? ORDER BY item_id",
    email,
  );
}

// The Details route's counterpart to getEventById: one listing by id, whatever
// its item_type.
export function getItemById(itemId: number): ItemRow | undefined {
  return one<ItemRow>("SELECT * FROM items WHERE item_id = ?", itemId);
}

// ---- search ----------------------------------------------------------------

// Search is not SQL here: lib/search.ts scores the rows themselves so that the
// results page, the suggestion endpoint and the cards' "by <handle>" note all
// share one matcher. The queries above (getEvents/getItems/getAllUsernames) are
// all it needs. See *Search* in AGENTS.md.

// ---- users -----------------------------------------------------------------

const USERNAME_SQL = "substr(email, 1, instr(email, '@') - 1)";

export function getAllUsernames(): string[] {
  return all<{ username: string }>(
    `SELECT ${USERNAME_SQL} AS username FROM users ORDER BY username`,
  ).map((row) => row.username);
}

export function getUserByUsername(username: string): UserRow | undefined {
  return one<UserRow>(
    `SELECT * FROM users WHERE ${USERNAME_SQL} = ? COLLATE NOCASE LIMIT 1`,
    username,
  );
}

export function getUserByEmail(email: string): UserRow | undefined {
  return one<UserRow>("SELECT * FROM users WHERE email = ? LIMIT 1", email);
}

// ---- reviews ---------------------------------------------------------------

export type ProviderReview = ReviewRow & { item_title: string };

export function getReviewsForProvider(email: string): ProviderReview[] {
  return all<ProviderReview>(
    `SELECT r.*, i.title AS item_title
       FROM reviews r
       JOIN items i ON i.item_id = r.item_id
      WHERE i.provider_email = ?
      ORDER BY r.created_at DESC`,
    email,
  );
}

export function getReviewsForItem(itemId: number): ReviewRow[] {
  return all<ReviewRow>(
    "SELECT * FROM reviews WHERE item_id = ? ORDER BY created_at DESC",
    itemId,
  );
}

// ---- bookmarks / rsvps -----------------------------------------------------

export function getBookmarksForUser(email: string): BookmarkRow[] {
  return all<BookmarkRow>(
    "SELECT * FROM bookmarks WHERE user_email = ? ORDER BY created_at DESC",
    email,
  );
}

export function getRsvpsForUser(email: string): RsvpRow[] {
  return all<RsvpRow>(
    "SELECT * FROM event_rsvps WHERE user_email = ? ORDER BY registered_at DESC",
    email,
  );
}

// ---- posting ---------------------------------------------------------------

// The /post form offers these as dropdowns so a new record reuses the
// vocabulary the catalogue already has instead of inventing near-duplicates
// ("Academic & Talk" vs "Academic and Talk"). The action still trims whatever
// it receives — these only shape the form.
export function getEventCategories(): string[] {
  return all<{ category: string }>(
    "SELECT DISTINCT category FROM events ORDER BY category",
  ).map((row) => row.category);
}

export function getItemCategories(itemType: "rent" | "service"): string[] {
  return all<{ category: string }>(
    "SELECT DISTINCT category FROM items WHERE item_type = ? ORDER BY category",
    itemType,
  ).map((row) => row.category);
}

export function getPriceUnits(): string[] {
  return all<{ unit: string }>(
    "SELECT DISTINCT price_unit AS unit FROM items WHERE price_unit IS NOT NULL ORDER BY unit",
  ).map((row) => row.unit);
}

