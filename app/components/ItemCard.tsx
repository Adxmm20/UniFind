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
   * The facet the home grid's **category** filter groups by — the leading word
   * of the stored category ("Academic & Forum" → "Academic"), so the options
   * cannot duplicate each other (see `categoryOf()` in cardData.ts). It is
   * therefore *not* necessarily what `subtitle` shows; the two are held apart
   * for exactly that reason, and it is also why a card whose second line ever
   * says something else cannot break the filter.
   */
  category?: string;
  /** Events only: what the home "Soonest / Latest" sorts order on. */
  startTime?: string;
  /** Items only: what the home price sorts order on (the raw number). */
  price?: number;
  /**
   * The campus the record sits on — `IIUM Gombak` / `IIUM Kuantan` /
   * `IIUM Pagoh` / `Others` — which is what the home grid's location filter
   * groups by, because the record's own location string is often a full address
   * ("Room 2.4, Blok D, Mahallah Salahuddin, IIUM Gombak") rather than
   * something anyone filters by. See `cardData.ts` for the rule. Note that only
   * an event's card *shows* where it is — as its `meta` line, the full venue —
   * while an item's card carries its price there instead.
   */
  campus?: string;
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
