import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bookmarkState, eventCards, itemCards } from "@/app/components/cardData";
import Header from "@/app/components/Header";
import type { CardData } from "@/app/components/ItemCard";
import ProfilePage from "@/app/components/profile/ProfilePage";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkIds } from "@/lib/bookmarks";
import { formatDate } from "@/lib/format";
import { imageIndex, itemImageIndex } from "@/lib/images";
import {
  getAllUsernames,
  getEventsByOrganizer,
  getItemsByProvider,
  getReviewsForProvider,
  getUserByUsername,
} from "@/lib/queries";

// Unknown usernames fall through to notFound() below. (dynamicParams is not
// allowed here because cacheComponents is enabled.)
export function generateStaticParams() {
  return getAllUsernames().map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) return { title: "Not found · UniFind" };
  return {
    title: `${username} · UniFind`,
    description: `Events and rental listings from ${user.email}.`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const sessionUser = await getSessionUser();
  const user = getUserByUsername(username);
  if (!user) notFound();

  const local = user.email.slice(0, user.email.indexOf("@"));

  // Rows become cards through the one mapping (app/components/cardData.ts), so a
  // profile card carries the record's picture exactly like a home or search card
  // — building the CardData by hand here is what left the events imageless.
  // `bookmark` is still the *viewer's* bookmarks, not the profile owner's:
  // saving someone else's listing from their own page is the normal case, and a
  // guest gets `signedIn: false`, which raises the login prompt instead of
  // writing.
  const bookmark = bookmarkState(
    sessionUser,
    sessionUser ? getBookmarkIds(sessionUser.email) : null,
  );

  const events = eventCards(
    getEventsByOrganizer(user.email),
    imageIndex("Events"),
    bookmark,
  );

  const listings = itemCards(
    getItemsByProvider(user.email),
    itemImageIndex(),
    bookmark,
  );

  const reviews: CardData[] = getReviewsForProvider(user.email).map((review) => ({
    id: `review-${review.review_id}`,
    title: review.item_title,
    subtitle: review.comment ?? "No comment",
    meta: review.rating ? `${review.rating} / 5` : "Unrated",
  }));

  return (
    <>
      <Header user={sessionUser} />
      <ProfilePage
        user={{
          username: local,
          email: user.email,
          phone: user.phone_number,
          joined: formatDate(user.created_at),
        }}
        events={events}
        listings={listings}
        reviews={reviews}
      />
    </>
  );
}
