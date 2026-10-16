import type { Metadata } from "next";
import { Box, Chip, Typography } from "@mui/material";
import Header from "@/app/components/Header";
import BookmarkButton from "@/app/components/bookmarks/BookmarkButton";
import { getSessionUser } from "@/lib/auth";
import { getBookmarkIds, parseRecordId } from "@/lib/bookmarks";
import { getEvents, getItems } from "@/lib/queries";

// Placeholder Details route. `id` is the record id used everywhere else
// ("event-1" / "item-1"). The real event/rental details get built here later.
//
// Prerendering the known records keeps the build happy under cacheComponents;
// unknown ids still render on demand. Items are read through getItems() rather
// than getRentals() so a service listing's details page counts as known too.
export function generateStaticParams() {
  return [
    ...getEvents().map((event) => ({ id: `event-${event.event_id}` })),
    ...getItems().map((item) => ({ id: `item-${item.item_id}` })),
  ];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `${id} · UniFind`,
    description: `Details for ${id}.`,
  };
}

export default async function DetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const kind = id.startsWith("event-")
    ? "Event"
    : id.startsWith("item-")
      ? "Rental"
      : "Record";

  const bookmarkIds = user ? getBookmarkIds(user.email) : null;
  const bookmarkable = parseRecordId(id) !== null;

  return (
    <>
      <Header user={user} />
      <Box
        component="main"
        sx={{ width: "100%", maxWidth: 900, mx: "auto", px: { xs: 2, sm: 3, md: 4 }, py: 6 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Chip label={kind} size="small" sx={{ fontWeight: 600 }} />
          {bookmarkable ? (
            <BookmarkButton
              recordId={id}
              signedIn={user !== null}
              saved={bookmarkIds ? bookmarkIds.has(id) : false}
            />
          ) : null}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "var(--on-bg)", mb: 1 }}>
          Details
        </Typography>
        <Typography
          variant="h6"
          sx={{ fontFamily: "var(--font-geist-mono)", color: "var(--on-bg-muted)", mb: 3 }}
        >
          {id}
        </Typography>
        <Box
          sx={{
            border: "1px dashed",
            borderColor: "var(--on-bg-line)",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography variant="body1" sx={{ color: "var(--on-bg-muted)" }}>
            This page is a placeholder. The {kind.toLowerCase()} details will be
            built here.
          </Typography>
        </Box>
      </Box>
    </>
  );
}
