import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/components/Header";
import DetailsView, {
  type DetailsData,
  type InfoRow,
} from "@/app/components/details/DetailsView";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkIds } from "@/lib/bookmarks";
import { parseRecordId } from "@/lib/recordId";
import {
  formatDate,
  formatDateTime,
  formatEventRange,
  priceLabel,
} from "@/lib/format";
import { imageIds } from "@/lib/imageId";
import { imageIndex, itemImageIndex, resolveImages } from "@/lib/images";
import {
  getEventById,
  getEvents,
  getItemById,
  getItems,
  getUserByEmail,
  type EventRow,
  type ItemRow,
} from "@/lib/queries";

export function generateStaticParams() {
  return [
    ...getEvents().map((event) => ({ id: `event-${event.event_id}` })),
    ...getItems().map((item) => ({ id: `item-${item.item_id}` })),
  ];
}

// A record must exist to describe it, so the page has no title of its own to
// fall back on — the same shape as the profile route's metadata.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseRecordId(id);
  if (!parsed) return { title: "Not found · UniFind" };

  const record =
    parsed.kind === "event" ? getEventById(parsed.id) : getItemById(parsed.id);
  if (!record) return { title: "Not found · UniFind" };

  const description =
    record.description.length > 160
      ? `${record.description.slice(0, 157).trimEnd()}…`
      : record.description;
  return { title: `${record.title} · UniFind`, description };
}

type RecordView = Omit<DetailsData, "recordId" | "bookmark" | "manage">;

function usernameOf(email: string): string {
  return email.split("@")[0];
}

// The third bar's rows. Contact details come from the users table, and the
// handle doubles as the profile route the rest of the app links to.
function providerRows(email: string): InfoRow[] {
  const provider = getUserByEmail(email);
  const username = usernameOf(email);
  const rows: InfoRow[] = [
    { label: "Username", value: username, href: `/${username}` },
    { label: "Email", value: email, href: `mailto:${email}` },
  ];
  if (provider?.phone_number) {
    rows.push({ label: "Phone", value: provider.phone_number });
  }
  if (provider) {
    rows.push({ label: "Member since", value: formatDate(provider.created_at) });
  }
  return rows;
}

function eventView(event: EventRow): RecordView {
  return {
    kind: "Event",
    title: event.title,
    description: event.description,
    // The whole gallery, in the order the record stores it — ImageGallery
    // renders the hero, arrows and thumbnails by itself once there is more than
    // one.
    images: resolveImages(imageIds(event.images), imageIndex("Events")),
    pills: [
      event.category,
      event.venue_name,
      formatEventRange(event.start_time, event.end_time),
    ],
    details: [
      { label: "Category", value: event.category },
      { label: "Venue", value: event.venue_name },
      { label: "Starts", value: formatDateTime(event.start_time) },
      { label: "Ends", value: formatDateTime(event.end_time) },
      {
        label: "Star points",
        value: event.star_points_eligible ? "Eligible" : "Not eligible",
      },
      { label: "Listed on", value: formatDate(event.created_at) },
    ],
    provider: providerRows(event.organizer_email),
  };
}

// Rentals and services are the same row shape, so one builder serves both —
// only the label differs, and it comes from item_type rather than the id.
function itemView(item: ItemRow): RecordView {
  const location = item.location_coverage ?? "Not specified";

  return {
    kind: item.item_type === "service" ? "Service" : "Rental",
    title: item.title,
    description: item.description,
    images: resolveImages(imageIds(item.images), itemImageIndex()),
    pills: [item.category, priceLabel(item.price, item.price_unit), location],
    details: [
      { label: "Category", value: item.category },
      { label: "Price", value: priceLabel(item.price, item.price_unit) },
      { label: "Location coverage", value: location },
      {
        label: "Availability",
        value: item.is_available ? "Available" : "Unavailable",
      },
      { label: "Listed on", value: formatDate(item.created_at) },
    ],
    provider: providerRows(item.provider_email),
  };
}

export default async function DetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();

  const parsed = parseRecordId(id);
  if (!parsed) notFound();

  const event = parsed.kind === "event" ? getEventById(parsed.id) : undefined;
  const item = parsed.kind === "item" ? getItemById(parsed.id) : undefined;

  let view: RecordView;
  if (event) view = eventView(event);
  else if (item) view = itemView(item);
  else notFound();

  const bookmarkIds = user ? getBookmarkIds(user.email) : null;

  // Edit/Delete appear only for the account that posted the record, and the
  // controls' `afterDelete` is that account's own profile — the page being
  // viewed has nothing left to show once the record is gone. Whether the
  // *render* offers them is cosmetic: lib/posts.ts re-checks the owner inside
  // the UPDATE/DELETE itself.
  const ownerEmail = event?.organizer_email ?? item?.provider_email ?? null;

  return (
    <>
      <Header user={user} />
      <DetailsView
        {...view}
        recordId={id}
        bookmark={{
          signedIn: user !== null,
          saved: bookmarkIds ? bookmarkIds.has(id) : false,
        }}
        manage={
          user && ownerEmail === user.email
            ? { afterDelete: `/${user.username}` }
            : undefined
        }
      />
    </>
  );
}
