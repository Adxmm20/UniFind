"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";
import BookmarkButton from "../bookmarks/BookmarkButton";
import RecordActions from "../RecordActions";
import { ChevronDown } from "./Chevron";
import DetailsChat from "./DetailsChat";
import ImageGallery from "./ImageGallery";

export type InfoRow = { label: string; value: string; href?: string };

// Everything the view needs, already formatted by the Server Component, so the
// only thing that crosses the boundary is plain data (see app/details/[id]).
export type DetailsData = {
  recordId: string;
  kind: "Event" | "Rental" | "Service";
  title: string;
  description: string;
  /** Resolved picture URLs; empty when the record's stem has no file. */
  images: string[];
  pills: string[];
  details: InfoRow[];
  provider: InfoRow[];
  bookmark: { signedIn: boolean; saved: boolean };
  /**
   * Present only when the viewer owns the record: it adds Edit and Delete, and
   * `afterDelete` is where deleting it should land (the owner's profile, since
   * the page itself has nothing left to show). This is the UI half of the rule —
   * the actions re-check the owner in SQL, so a tampered page cannot write.
   */
  manage?: { afterDelete: string };
};

// The bars are their own surfaces sitting on the wallpaper, so they use the
// surface/ink tokens (like the cards) rather than the --on-bg variables.
const BAR_BG = "var(--surface-2)";
const INK = "var(--ink)";
const MUTED = "var(--ink-muted)";

function Value({ row }: { row: InfoRow }) {
  if (!row.href) {
    return (
      <Typography variant="body2" sx={{ color: INK }}>
        {row.value}
      </Typography>
    );
  }

  const linkSx = {
    color: INK,
    wordBreak: "break-all",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  } as const;

  // Internal links stay client-side; mailto: and anything else is a plain
  // anchor. MUI's `component` prop accepts Link here because this is already a
  // Client Component — it could not cross the Server boundary.
  return row.href.startsWith("/") ? (
    <Typography component={Link} href={row.href} variant="body2" sx={linkSx}>
      {row.value}
    </Typography>
  ) : (
    <Typography component="a" href={row.href} variant="body2" sx={linkSx}>
      {row.value}
    </Typography>
  );
}

function InfoRows({ rows }: { rows: InfoRow[] }) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: MUTED }}>
        Nothing to show here yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      {rows.map((row) => (
        <Box
          key={row.label}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "170px 1fr" },
            columnGap: 2,
            rowGap: 0.25,
            alignItems: "baseline",
          }}
        >
          <Typography variant="body2" sx={{ color: MUTED, fontWeight: 600 }}>
            {row.label}
          </Typography>
          <Value row={row} />
        </Box>
      ))}
    </Stack>
  );
}

function DetailBar({
  title,
  defaultExpanded,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  return (
    <Accordion
      disableGutters
      square
      defaultExpanded={defaultExpanded}
      sx={{
        backgroundColor: BAR_BG,
        backgroundImage: "none",
        borderRadius: 2,
        border: "1px solid var(--ink-line)",
        boxShadow: "none",
        margin: 0,
        // MUI draws a hairline divider above each bar and re-adds vertical
        // margin while expanded; neither belongs on a rounded standalone bar.
        "&:before": { display: "none" },
        "&.Mui-expanded": { margin: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ChevronDown />}
        sx={{
          px: { xs: 2, md: 3 },
          color: INK,
          "& .MuiAccordionSummary-content": { my: 1.75 },
          "& .MuiAccordionSummary-expandIconWrapper": { color: INK },
        }}
      >
        <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pt: 0, pb: 2.5 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

export default function DetailsView({
  recordId,
  kind,
  title,
  description,
  images,
  pills,
  details,
  provider,
  bookmark,
  manage,
}: DetailsData) {
  return (
    <Box
      component="main"
      id="content"
      tabIndex={-1}
      sx={{
        width: "100%",
        maxWidth: 1400,
        mx: "auto",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 4, md: 6 },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          },
          gap: { xs: 3, md: 5 },
          alignItems: "start",
        }}
      >
        <ImageGallery images={images} title={title} />

        <Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              {/* The label the id prefix used to guess — now read from the
                  record itself, so a service says Service. */}
              <Typography
                variant="overline"
                sx={{ color: "var(--on-bg-muted)", fontWeight: 700 }}
              >
                {kind}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "var(--on-bg)",
                  textDecoration: "underline",
                  textDecorationThickness: 3,
                  textUnderlineOffset: 8,
                }}
              >
                {title}
              </Typography>
            </Box>
            <Box
              sx={{
                ml: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              {/* The owner's controls sit beside the bookmark one, not over it:
                  neither surface has a hover here, so both are always visible —
                  the same shape BookmarkButton uses with variant="inline". */}
              {manage ? (
                <RecordActions
                  recordId={recordId}
                  afterDelete={manage.afterDelete}
                  variant="inline"
                />
              ) : null}
              <BookmarkButton
                recordId={recordId}
                signedIn={bookmark.signedIn}
                saved={bookmark.saved}
                variant="inline"
              />
            </Box>
          </Box>

          <Stack spacing={1.25} sx={{ alignItems: "flex-start", mt: 2.5 }}>
            {pills.map((pill, i) => (
              <Chip
                key={`${i}-${pill}`}
                label={pill}
                sx={{
                  height: 34,
                  borderRadius: 999,
                  backgroundColor: "var(--pill-bg)",
                  color: "var(--pill-ink)",
                  fontWeight: 600,
                }}
              />
            ))}
          </Stack>
        </Box>
      </Box>

      <Stack spacing={2} sx={{ mt: { xs: 4, md: 6 } }}>
        <DetailBar title="Description" defaultExpanded>
          <Typography
            variant="body1"
            sx={{ color: INK, whiteSpace: "pre-line", maxWidth: "80ch" }}
          >
            {description}
          </Typography>
        </DetailBar>

        <DetailBar title="Details">
          <InfoRows rows={details} />
        </DetailBar>

        <DetailBar title={kind === "Event" ? "Organiser" : "Provider"}>
          <InfoRows rows={provider} />
        </DetailBar>
      </Stack>

      {/* Self-portalling: the launcher and panel render at <body>, so they sit
          outside .page-shell (the colour-filtered subtree) and this element adds
          no layout of its own. */}
      <DetailsChat
        recordId={recordId}
        kind={kind}
        signedIn={bookmark.signedIn}
      />
    </Box>
  );
}
