import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/components/Header";
import EditForm from "@/app/components/post/EditForm";
import { getSessionUser } from "@/lib/auth";
import { imageIds } from "@/lib/imageId";
import { imageIndex, itemImageIndex, resolveImageEntries } from "@/lib/images";
import {
  getEventById,
  getEventCategories,
  getItemById,
  getItemCategories,
  getPriceUnits,
} from "@/lib/queries";
import { parseRecordId } from "@/lib/recordId";

// The edit route, and the one place a record is changed rather than created.
// It is a *page* rather than a dialog for a plain reason: the fields are the
// same grid /post uses, and a form that writes a record deserves a URL of its
// own — one can reload it, and the record's own page stays read-only.
//
// Nobody but the record's owner ever sees it. A guest, a signed-in stranger and
// a malformed or deleted id all get the same 404, so the page does not even say
// whether a record exists. That is cosmetic protection only: the write itself
// re-checks the owner in SQL (lib/posts.ts), so there is nothing to gain by
// reaching the form anyway.

// An edit page has no business being indexed.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseRecordId(id);
  const record = parsed
    ? parsed.kind === "event"
      ? getEventById(parsed.id)
      : getItemById(parsed.id)
    : undefined;
  return {
    title: record ? `Edit ${record.title} · UniFind` : "Not found · UniFind",
    robots: { index: false, follow: false },
  };
}

// The stored stamps are "YYYY-MM-DD HH:MM:SS" and the app reads them as UTC
// wall-clock (lib/format.ts), so the datetime-local field gets the same clock
// time back — no zone conversion in either direction (see lib/posts.ts).
function inputTime(stored: string): string {
  return stored.slice(0, 16).replace(" ", "T");
}

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = parseRecordId(id);
  if (!parsed) notFound();

  const user = await getSessionUser();
  if (!user) notFound();

  const event = parsed.kind === "event" ? getEventById(parsed.id) : undefined;
  const item = parsed.kind === "item" ? getItemById(parsed.id) : undefined;

  if (event && event.organizer_email === user.email) {
    return (
      <>
        <Header user={user} />
        <EditForm
          recordId={id}
          kind="event"
          category={event.category}
          // The vocabulary the catalogue already uses, so changing a category
          // offers the same names as posting one did.
          categories={getEventCategories()}
          priceUnits={getPriceUnits()}
          initial={{
            title: event.title,
            description: event.description,
            venue: event.venue_name,
            startTime: inputTime(event.start_time),
            endTime: inputTime(event.end_time),
            starPoints: event.star_points_eligible === 1,
          }}
          // Only the ids whose file really exists: a picture the form never
          // shows must not be dropped from the record by saving, and lib/posts
          // rejects an id it does not recognise, so the two lists have to agree.
          pictures={resolveImageEntries(
            imageIds(event.images),
            imageIndex("Events"),
          )}
          afterDelete={`/${user.username}`}
        />
      </>
    );
  }

  if (item && item.provider_email === user.email) {
    // The kind is read from the row, not guessed from the id — rentals and
    // services share the items table. It decides the picture folder the edit
    // writes into, but never moves the record between tables.
    const kind = item.item_type === "service" ? "service" : "rent";
    return (
      <>
        <Header user={user} />
        <EditForm
          recordId={id}
          kind={kind}
          category={item.category}
          categories={getItemCategories(item.item_type)}
          priceUnits={getPriceUnits()}
          initial={{
            title: item.title,
            description: item.description,
            price: String(item.price),
            priceUnit: item.price_unit ?? "",
            location: item.location_coverage ?? "",
            available: item.is_available === 1,
          }}
          pictures={resolveImageEntries(imageIds(item.images), itemImageIndex())}
          afterDelete={`/${user.username}`}
        />
      </>
    );
  }

  notFound();
}
