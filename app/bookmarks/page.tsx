import type { Metadata } from "next";
import Header from "@/app/components/Header";
import BookmarksGuest from "@/app/components/bookmarks/BookmarksGuest";
import BookmarksView, {
  type BookmarkCard,
} from "@/app/components/bookmarks/BookmarksView";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkedEvents, getBookmarkedItems } from "@/lib/bookmarks";
import { priceLabel } from "@/lib/format";
import { imageIndex, itemImageIndex } from "@/lib/images";

export const metadata: Metadata = {
  title: "Bookmarks · UniFind",
  description: "Events, rentals and services you have saved.",
};

// Every card here is bookmarked by definition, so `bookmarked` is always true —
// which is what renders the toggle in its filled state, ready to unsave.
export default async function BookmarksPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <>
        <Header user={null} />
        <BookmarksGuest />
      </>
    );
  }

  const eventImages = imageIndex("Events");
  const itemImages = itemImageIndex();

  const events: BookmarkCard[] = getBookmarkedEvents(user.email).map((event) => ({
    id: `event-${event.event_id}`,
    title: event.title,
    subtitle: event.category,
    meta: event.venue_name,
    image: event.banner_image_url
      ? eventImages.get(event.banner_image_url.toLowerCase())
      : undefined,
    href: `/details/event-${event.event_id}`,
    bookmarkedAt: event.bookmarked_at,
    bookmarkId: event.bookmark_id,
    startTime: event.start_time,
    bookmark: { signedIn: true, saved: true },
  }));

  const bookmarkedItems = getBookmarkedItems(user.email);

  const itemCard = (item: (typeof bookmarkedItems)[number]): BookmarkCard => ({
    id: `item-${item.item_id}`,
    title: item.title,
    subtitle: item.category,
    meta: priceLabel(item.price, item.price_unit),
    image: item.images ? itemImages.get(item.images.toLowerCase()) : undefined,
    href: `/details/item-${item.item_id}`,
    bookmarkedAt: item.bookmarked_at,
    bookmarkId: item.bookmark_id,
    price: item.price,
    bookmark: { signedIn: true, saved: true },
  });

  // Rentals and services share the items table, so they are split here on
  // item_type — the filter has an entry for each, and a service must not be
  // filed under Rentals.
  const rentals: BookmarkCard[] = bookmarkedItems
    .filter((item) => item.item_type !== "service")
    .map(itemCard);
  const services: BookmarkCard[] = bookmarkedItems
    .filter((item) => item.item_type === "service")
    .map(itemCard);

  return (
    <>
      <Header user={user} />
      <BookmarksView events={events} rentals={rentals} services={services} />
    </>
  );
}
