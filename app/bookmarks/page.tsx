import type { Metadata } from "next";
import Header from "@/app/components/Header";
import BookmarksGuest from "@/app/components/bookmarks/BookmarksGuest";
import BookmarksView, {
  type BookmarkCard,
} from "@/app/components/bookmarks/BookmarksView";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkedEvents, getBookmarkedItems } from "@/lib/bookmarks";
import { imageIndex, itemImageIndex } from "@/lib/images";

export const metadata: Metadata = {
  title: "Bookmarks · UniFind",
  description: "Events and rentals you have saved.",
};

function priceLabel(price: number, unit: string | null): string {
  return `RM ${price.toFixed(2)} ${(unit ?? "flat_rate").replace(/_/g, " ")}`;
}

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

  const rentals: BookmarkCard[] = getBookmarkedItems(user.email).map((item) => ({
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
  }));

  return (
    <>
      <Header user={user} />
      <BookmarksView events={events} rentals={rentals} />
    </>
  );
}
