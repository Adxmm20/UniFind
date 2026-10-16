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
      category: event.category,
      startTime: event.start_time,
      location: event.venue_name,
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
      category: item.category,
      price: item.price,
      location: item.location_coverage ?? undefined,
      image: item.images ? images.get(item.images.toLowerCase()) : undefined,
      href: `/details/${id}`,
      bookmark: bookmark(id),
    };
  });
}
