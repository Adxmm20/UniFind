import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/components/Header";
import DetailsView, {
  type DetailsData,
  type InfoRow,
} from "@/app/components/details/DetailsView";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkIds, parseRecordId } from "@/lib/bookmarks";
import {
  formatDate,
  formatDateTime,
  formatEventRange,
  priceLabel,
} from "@/lib/format";
import { imageIndex, itemImageIndex } from "@/lib/images";
import {
  getEventById,
  getEvents,
  getItemById,
  getItems,
  getUserByEmail,
  type EventRow,
  type ItemRow,
} from "@/lib/queries";

// The Details route: `id` is the record id used everywhere else ("event-1" /
// "item-1"). The page resolves the record, formats it for the view, and hands
// DetailsView plain data.
//
// Prerendering the known records keeps the build happy under cacheComponents;
// unknown ids still render on demand and hit notFound(). Items are read through
// getItems() rather than getRentals() so a service listing's details page
// counts as known too.
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

type RecordView = Omit<DetailsData, "recordId" | "bookmark">;

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
  const images = imageIndex("Events");
  const image = event.banner_image_url
    ? images.get(event.banner_image_url.toLowerCase())
    : undefined;

  return {
    kind: "Event",
    title: event.title,
    description: event.description,
    images: image ? [image] : [],
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
  const images = itemImageIndex();
  const image = item.images ? images.get(item.images.toLowerCase()) : undefined;
  const location = item.location_coverage ?? "Not specified";

  return {
    kind: item.item_type === "service" ? "Service" : "Rental",
    title: item.title,
    description: item.description,
    images: image ? [image] : [],
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
      />
    </>
  );
}
