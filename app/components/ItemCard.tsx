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
   * Absent when the record cannot be bookmarked — a review, say. Guests get the
   * control too, with `signedIn: false`; clicking it raises the login prompt.
   */
  bookmark?: { signedIn: boolean; saved: boolean };
};

export default function ItemCard({
  id,
  title,
  subtitle,
  meta,
  image,
  href,
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
          borderColor: "#2D6A4F",
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
          backgroundColor: "rgba(8, 28, 21, 0.05)",
        }}
      >
        {image ? (
          <Image src={image} alt={title} fill sizes={sizes} style={{ objectFit: "cover" }} />
        ) : null}
      </Box>

      <CardContent
        sx={{ display: "flex", flexDirection: "column", gap: 0.5, flexGrow: 1 }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#081C15" }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
        {meta ? (
          <Typography
            variant="caption"
            sx={{ mt: "auto", pt: 1, fontWeight: 600, color: "#2D6A4F" }}
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
