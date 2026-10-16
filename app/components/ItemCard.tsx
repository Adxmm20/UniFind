"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import BookmarkButton from "./bookmarks/BookmarkButton";

export type CardData = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  image?: string;
  /** When set, the whole card links here (e.g. /details/event-1). */
  href?: string;
  /**
   * A line under the subtitle that explains a *search* result ("by
   * josa_organizer") — the record's own fields cannot show why it matched. Only
   * the search page sets it, so a card still looks the same wherever it is
   * found.
   */
  note?: string;
  /**
   * Absent when the record cannot be bookmarked — a review, say. Guests get the
   * control too, with `signedIn: false`; clicking it raises the login prompt.
   */
  bookmark?: { signedIn: boolean; saved: boolean };
  /**
   * The record's own category — the facet the home grid filters on. Held apart
   * from `subtitle` even though events and items put the same value there, so a
   * card whose second line ever says something else cannot break the filter.
   */
  category?: string;
  /** Events only: what the home "Soonest / Latest" sorts order on. */
  startTime?: string;
  /** Items only: what the home price sorts order on (the raw number). */
  price?: number;
  /**
   * Where the record is: an event's venue, an item's location coverage. The one
   * facet the two record kinds agree on, which is what lets the home grid's
   * location filter read it for every tab. Note that only an event's card
   * *shows* it — as its `meta` line, the venue — while an item's card carries its
   * price there instead.
   */
  location?: string;
  /** Events only: whether the event counts for STAR points (see /post). */
  starPoints?: boolean;
};

export default function ItemCard({
  id,
  title,
  subtitle,
  meta,
  image,
  href,
  note,
  bookmark,
  sizes = "(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw",
}: CardData & { sizes?: string }) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 2,
        overflow: "hidden",
        transition:
          "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 3,
          borderColor: "var(--accent)",
        },
      }}
    >
      {/* Stretched link: an absolutely positioned overlay keeps the whole card
          clickable while leaving the bookmark button a *sibling*. Wrapping the
          card in <Link> instead would nest a <button> inside an <a>, which is
          invalid and breaks the button's keyboard handling. */}
      {href ? (
        <Link
          href={href}
          aria-label={`View details for ${title}`}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        />
      ) : null}

      {/* Blank placeholder when there is no image. */}
      <Box
        sx={{
          position: "relative",
          aspectRatio: "16 / 10",
          backgroundColor: "var(--surface-inset)",
        }}
      >
        {image ? (
          <Image src={image} alt={title} fill sizes={sizes} style={{ objectFit: "cover" }} />
        ) : null}
      </Box>

      <CardContent
        sx={{ display: "flex", flexDirection: "column", gap: 0.5, flexGrow: 1 }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--ink)" }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ color: "var(--ink-muted)" }}>
            {subtitle}
          </Typography>
        ) : null}
        {note ? (
          <Typography variant="caption" sx={{ color: "var(--ink-muted)" }}>
            {note}
          </Typography>
        ) : null}
        {meta ? (
          <Typography
            variant="caption"
            sx={{ mt: "auto", pt: 1, fontWeight: 600, color: "var(--accent)" }}
          >
            {meta}
          </Typography>
        ) : null}
      </CardContent>

      {bookmark ? (
        <BookmarkButton
          recordId={id}
          signedIn={bookmark.signedIn}
          saved={bookmark.saved}
        />
      ) : null}
    </Card>
  );
}
