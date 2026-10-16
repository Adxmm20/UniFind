import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/components/Header";
import type { CardData } from "@/app/components/ItemCard";
import ProfilePage from "@/app/components/profile/ProfilePage";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkIds } from "@/lib/bookmarks";
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

function priceLabel(price: number, unit: string | null): string {
  return `RM ${price.toFixed(2)} ${(unit ?? "flat_rate").replace(/_/g, " ")}`;
}

// Deterministic (UTC, fixed locale) so the string is identical on server and
// client — avoids hydration drift.
function formatDate(value: string): string {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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

  // The viewer's bookmarks, not the profile owner's — saving someone else's
  // listing from their own page is the normal case. Guests get the control with
  // `signedIn: false`, which raises the login prompt instead of writing.
  const bookmarkIds = sessionUser ? getBookmarkIds(sessionUser.email) : null;
  const bookmark = (recordId: string) => ({
    signedIn: sessionUser !== null,
    saved: bookmarkIds ? bookmarkIds.has(recordId) : false,
  });

  const events: CardData[] = getEventsByOrganizer(user.email).map((event) => ({
    id: `event-${event.event_id}`,
    title: event.title,
    subtitle: event.category,
    meta: event.venue_name,
    href: `/details/event-${event.event_id}`,
    bookmark: bookmark(`event-${event.event_id}`),
  }));

  const listings: CardData[] = getItemsByProvider(user.email).map((item) => ({
    id: `item-${item.item_id}`,
    title: item.title,
    subtitle: item.category,
    meta: priceLabel(item.price, item.price_unit),
    href: `/details/item-${item.item_id}`,
    bookmark: bookmark(`item-${item.item_id}`),
  }));

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
