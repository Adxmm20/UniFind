import { Suspense } from "react";
import { Box } from "@mui/material";
import { bookmarkState, eventCards, itemCards } from "./components/cardData";
import Header from "./components/Header";
import HomeTabs from "./components/HomeTabs";
import HomeTabsUrl from "./components/HomeTabsUrl";
import Slideshow, { type Slide } from "./components/Slideshow";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkIds } from "@/lib/bookmarks";
import { IMAGE_RE, imageIndex, itemImageIndex, listImages } from "@/lib/images";
import {
  getEventById,
  getEvents,
  getItemById,
  getRentals,
  getServices,
} from "@/lib/queries";
import { parseRecordId } from "@/lib/recordId";

// Slides come from public/img/trending/, whose base names are record ids, so
// each slide can link straight to its details page.
//
// A slide is also dropped when its record is gone: records can be deleted from
// their details page now, and a trending picture is a copy that the delete
// deliberately leaves on disk (nothing removes files). Without this check the
// slideshow would keep offering a link that 404s.
function getSlides(): Slide[] {
  return listImages("trending")
    .map((file) => ({ id: file.replace(IMAGE_RE, ""), file }))
    .filter(({ id }) => {
      const parsed = parseRecordId(id);
      if (!parsed) return false;
      return parsed.kind === "event"
        ? getEventById(parsed.id) !== undefined
        : getItemById(parsed.id) !== undefined;
    })
    .map(({ id, file }) => {
      return { id, href: `/details/${id}`, src: `/img/trending/${file}` };
    });
}

export default async function Home() {
  const user = await getSessionUser();
  const slides = getSlides();
  const eventImages = imageIndex("Events");
  const itemImages = itemImageIndex();

  // Rows become cards through the shared helpers, so the home grid and the
  // search results render a record the same way.
  const bookmark = bookmarkState(user, user ? getBookmarkIds(user.email) : null);
  const events = eventCards(getEvents(), eventImages, bookmark);
  const rentals = itemCards(getRentals(), itemImages, bookmark);
  const services = itemCards(getServices(), itemImages, bookmark);

  return (
    <>
      <Header user={user} />
      <Box component="main" id="content" tabIndex={-1}>
        <Slideshow slides={slides} />
        <Suspense
          fallback={
            <HomeTabs
              events={events}
              rentals={rentals}
              services={services}
              activeTab="events"
            />
          }
        >
          <HomeTabsUrl events={events} rentals={rentals} services={services} />
        </Suspense>
      </Box>
    </>
  );
}
