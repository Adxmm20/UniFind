import { Suspense } from "react";
import Header from "./components/Header";
import HomeTabs from "./components/HomeTabs";
import HomeTabsUrl from "./components/HomeTabsUrl";
import type { CardData } from "./components/ItemCard";
import Slideshow, { type Slide } from "./components/Slideshow";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkIds } from "@/lib/bookmarks";
import { IMAGE_RE, imageIndex, itemImageIndex, listImages } from "@/lib/images";
import { getEvents, getRentals } from "@/lib/queries";

// Slides come from public/img/trending/, whose base names are record ids, so
// each slide can link straight to its details page.
function getSlides(): Slide[] {
  return listImages("trending").map((file) => {
    const id = file.replace(IMAGE_RE, "");
    return { id, href: `/details/${id}`, src: `/img/trending/${file}` };
  });
}

function priceLabel(price: number, unit: string | null): string {
  return `RM ${price.toFixed(2)} ${(unit ?? "flat_rate").replace(/_/g, " ")}`;
}

export default async function Home() {
  const user = await getSessionUser();
  const slides = getSlides();
  const eventImages = imageIndex("Events");
  const itemImages = itemImageIndex();

  // Guests get the control too — `signedIn: false` makes it raise the login
  // prompt instead of writing.
  const bookmarkIds = user ? getBookmarkIds(user.email) : null;
  const bookmark = (recordId: string) => ({
    signedIn: user !== null,
    saved: bookmarkIds ? bookmarkIds.has(recordId) : false,
  });

  const events: CardData[] = getEvents().map((event) => ({
    id: `event-${event.event_id}`,
    title: event.title,
    subtitle: event.category,
    meta: event.venue_name,
    image: event.banner_image_url
      ? eventImages.get(event.banner_image_url.toLowerCase())
      : undefined,
    href: `/details/event-${event.event_id}`,
    bookmark: bookmark(`event-${event.event_id}`),
  }));

  const rentals: CardData[] = getRentals().map((item) => ({
    id: `item-${item.item_id}`,
    title: item.title,
    subtitle: item.category,
    meta: priceLabel(item.price, item.price_unit),
    image: item.images ? itemImages.get(item.images.toLowerCase()) : undefined,
    href: `/details/item-${item.item_id}`,
    bookmark: bookmark(`item-${item.item_id}`),
  }));

  return (
    <>
      <Header user={user} />
      <Slideshow slides={slides} />
      <Suspense
        fallback={<HomeTabs events={events} rentals={rentals} activeTab="events" />}
      >
        <HomeTabsUrl events={events} rentals={rentals} />
      </Suspense>
    </>
  );
}
