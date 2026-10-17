import type { CardData } from "./ItemCard";
import type { SessionUser } from "@/lib/auth";
import { priceLabel } from "@/lib/format";
import type { EventRow, ItemRow } from "@/lib/queries";

// Server-only: `images` comes from lib/images.ts, which reads the filesystem.
//
// A database row becomes the card ItemCard renders, in one place, so a record
// looks the same wherever it is found — the home grid and the search results
// both come through here and cannot drift apart.
export type BookmarkState = (recordId: string) => {
  signedIn: boolean;
  saved: boolean;
};

// Guests get the control too — `signedIn: false` makes it raise the login
// prompt instead of writing.
export function bookmarkState(
  user: SessionUser | null,
  saved: Set<string> | null,
): BookmarkState {
  return (recordId) => ({
    signedIn: user !== null,
    saved: saved ? saved.has(recordId) : false,
  });
}

const eventId = (event: EventRow) => `event-${event.event_id}`;

// The campus a record sits on, derived from where it actually is. The home
// toolbar's location filter offers campuses rather than the raw strings,
// because "Room 2.4, Blok D, Mahallah Salahuddin, IIUM Gombak" is an address,
// not something anyone filters by, and it would give every record an option of
// its own. The order matters: the first campus a value names wins. Anything
// that names none of them — an event in Negeri Sembilan, one on Perhentian
// Island — falls into "Others", which is a real option and only appears while
// something is in it.
const CAMPUSES: { label: string; marker: string }[] = [
  { label: "IIUM Gombak", marker: "gombak" },
  { label: "IIUM Kuantan", marker: "kuantan" },
  { label: "IIUM Pagoh", marker: "pagoh" },
];

const OTHER_CAMPUS = "Others";

function campusOf(location: string | null): string | undefined {
  if (!location) return undefined;
  const named = location.toLowerCase();
  return CAMPUSES.find((campus) => named.includes(campus.marker))?.label ?? OTHER_CAMPUS;
}

// The category the toolbar's filter groups by. The stored values are pairwise
// near-duplicates of one another — "Academic & Forum" beside "Academic & Talk",
// "Sports & Fitness" beside "Sports & Outdoor" — and each is carried by one or
// two records, so filtering on the raw string offers mostly options that match a
// single card. Every one of them is written "<primary> & <secondary>", so the
// bucket is the part before the ampersand: both Academic rows answer to
// "Academic", both Sports rows to "Sports", and a value with no ampersand
// (Laundry, Tutoring, Home Appliances) is its own bucket. Mechanical on purpose
// — a category posted later through /post cannot reintroduce a duplicate prefix,
// which is what a hand-written alias table would let happen.
function categoryOf(category: string): string {
  const [primary] = category.split("&");
  return primary.trim() || category;
}

// `note` is how the search page explains a hit that the record's own fields do
// not show — "by josa_organizer" on a card found through its organiser. Every
// other caller leaves it out, so home and bookmarks cards are untouched.
export function eventCards(
  events: EventRow[],
  images: Map<string, string>,
  bookmark: BookmarkState,
  note?: (event: EventRow) => string | undefined,
): CardData[] {
  return events.map((event) => {
    const id = eventId(event);
    return {
      id,
      title: event.title,
      subtitle: event.category,
      meta: event.venue_name,
      note: note?.(event),
      // The sort/filter facts the home toolbar needs. `startTime` is not shown
      // on a card (the venue is), but only an event can be sorted by date.
      // `category` is the grouped bucket, not the stored string `subtitle` shows.
      category: categoryOf(event.category),
      startTime: event.start_time,
      campus: campusOf(event.venue_name),
      // Truthy rather than `=== 1`, the same test the details page makes: the
      // column is a 0/1 int today but nothing in the type says it must be.
      starPoints: Boolean(event.star_points_eligible),
      image: event.banner_image_url
        ? images.get(event.banner_image_url.toLowerCase())
        : undefined,
      href: `/details/${id}`,
      bookmark: bookmark(id),
    };
  });
}

const itemId = (item: ItemRow) => `item-${item.item_id}`;

// Rentals and services are both items and card identically — same fields, same
// image index (itemImageIndex() merges public/img/Rental and
// public/img/Services) — so one mapping serves both, and they cannot drift
// apart. Only the surface they land on differs.
export function itemCards(
  items: ItemRow[],
  images: Map<string, string>,
  bookmark: BookmarkState,
  note?: (item: ItemRow) => string | undefined,
): CardData[] {
  return items.map((item) => {
    const id = itemId(item);
    return {
      id,
      title: item.title,
      subtitle: item.category,
      meta: priceLabel(item.price, item.price_unit),
      note: note?.(item),
      category: categoryOf(item.category),
      price: item.price,
      campus: campusOf(item.location_coverage),
      image: item.images ? images.get(item.images.toLowerCase()) : undefined,
      href: `/details/${id}`,
      bookmark: bookmark(id),
    };
  });
}
