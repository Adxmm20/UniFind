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
  pictureOwnerIndex,
} from "@/lib/queries";
import { parseRecordId } from "@/lib/recordId";

// Slides come from public/img/trending/, whose base names are normally record
// ids (`event-1`, `item-4`), so each slide can link straight to its details
// page. A base name that is a *picture* id instead (`S1001`) is resolved to the
// record that carries it through pictureOwnerIndex(), so a slide may be named
// after the picture as well.
//
// A slide is also dropped when its record is gone: records can be deleted from
// their details page now, and a trending picture is a copy that the delete
// deliberately leaves on disk (nothing removes files). Without this check the
// slideshow would keep offering a link that 404s. When two files resolve to one
// record the later one is skipped — a slide links to the record, not the file,
// so a duplicate would only be a second link to the same page.
function getSlides(): Slide[] {
  const owners = pictureOwnerIndex();
  const seen = new Set<string>();
  const slides: Slide[] = [];

  for (const file of listImages("trending")) {
    const stem = file.replace(IMAGE_RE, "");
    const recordId = parseRecordId(stem)
      ? stem
      : owners.get(stem.toLowerCase());
    if (!recordId || seen.has(recordId)) continue;

    const parsed = parseRecordId(recordId);
    if (!parsed) continue;
    const exists =
      parsed.kind === "event" ? getEventById(parsed.id) : getItemById(parsed.id);
    if (!exists) continue;

    seen.add(recordId);
    slides.push({
      id: recordId,
      href: `/details/${recordId}`,
      src: `/img/trending/${file}`,
    });
  }

  return slides;
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
