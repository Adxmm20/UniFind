"use client";

import { Box, Card, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import BookmarkButton from "./bookmarks/BookmarkButton";
import type { CardData } from "./ItemCard";

// The list-view counterpart to ItemCard: the same record, laid out as a row.
// Kept separate rather than adding a `layout` prop, because the two share
// almost no markup beyond the bookmark button.
export default function ItemRow({
  id,
  title,
  subtitle,
  meta,
  image,
  href,
  bookmark,
}: CardData) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 2,
        borderRadius: 2,
        overflow: "hidden",
        p: 1.5,
        // Room for the bookmark button so a long title never runs under it.
        pr: 7,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": { boxShadow: 3, borderColor: "#2D6A4F" },
      }}
    >
      {href ? (
        <Link
          href={href}
          aria-label={`View details for ${title}`}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        />
      ) : null}

      <Box
        sx={{
          position: "relative",
          // Bigger than it strictly needs to be for a row, because the row is
          // full content width (up to 1400) and a postage-stamp thumbnail in a
          // 1300px card reads as an empty card.
          width: { xs: 96, sm: 148 },
          height: { xs: 74, sm: 110 },
          flexShrink: 0,
          borderRadius: 1.5,
          overflow: "hidden",
          backgroundColor: "rgba(8, 28, 21, 0.05)",
        }}
      >
        {image ? (
          <Image src={image} alt={title} fill sizes="160px" style={{ objectFit: "cover" }} />
        ) : null}
      </Box>

      <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 0.25 }}>
        <Typography
          variant="subtitle1"
          noWrap
          sx={{ fontWeight: 700, color: "#081C15" }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" noWrap color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
        {meta ? (
          <Typography variant="caption" noWrap sx={{ fontWeight: 600, color: "#2D6A4F" }}>
            {meta}
          </Typography>
        ) : null}
      </Box>

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
