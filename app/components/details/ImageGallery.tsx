"use client";

import { Box, Dialog, IconButton, Typography } from "@mui/material";
import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "./Chevron";

// The details page's gallery, in the shape a store page uses: one framed hero
// with a row of thumbnails under it, and a full-screen viewer behind a click.
// The hero carries its own previous/next arrows while there is more than one
// picture, so the common case — step through the gallery — needs no click into
// the viewer first.
//
// It is data-driven, which is the whole point: a record with one picture gets
// the hero and *no* strip, and the strip only ever shows pictures that are
// really there — nothing is faked to fill slots. A record with more than
// `VISIBLE` pictures shows the ones around the active one, with the count of
// the rest on the last tile (Steam's "+N").
//
// The hero shows a cropped 16/10 picture (the same convention as ItemCard) and
// the viewer shows the record's *original* file — a plain <img> pointed at the
// public path, not the optimised crop — so the whole picture is visible at full
// size. Every picture keeps its own id and its own URL for the life of the
// record (see lib/imageId.ts), so a thumbnail can never point at a different
// picture than the one it shows.
const VISIBLE = 4;

export default function ImageGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const count = images.length;
  const multiple = count > 1;
  const active = count ? index % count : 0;
  const current = images[active];

  // The window of thumbnails under the hero: all of them while they fit, and
  // otherwise a run that always contains the active one.
  const start =
    count <= VISIBLE
      ? 0
      : Math.min(Math.max(active - VISIBLE + 1, 0), count - VISIBLE);
  const visible = images.slice(start, start + VISIBLE);
  const beyond = count - (start + VISIBLE);

  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  // The viewer is one screen with the arrows, so the keys that already mean
  // "next/previous" in every other viewer work here too. Escape is MUI's own
  // dialog close.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  }

  // The side arrows of the viewer: they float over the picture rather than
  // taking a column of their own, so the picture keeps the whole stage.
  const arrowSx = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: { xs: 44, sm: 52 },
    height: { xs: 44, sm: 52 },
    color: "var(--viewer-ink)",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.24)" },
  } as const;

  // The hero's own pair of arrows — the same gesture the viewer offers, on the
  // picture a visitor actually sees. They are *siblings* of the hero's zoom
  // button, not children of it (a <button> may not contain a <button>), so the
  // click that lands on an arrow never reaches the zoom underneath; laying them
  // over a photograph they take the `--overlay-*` set, like the slideshow's
  // arrows, and high contrast turns that translucent surface solid for free.
  const heroArrowSx = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
    width: { xs: 40, sm: 48 },
    height: { xs: 40, sm: 48 },
    color: "var(--overlay-ink)",
    backgroundColor: "var(--overlay-bg)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 6px 20px var(--overlay-shadow)",
    transition: "background-color 0.2s ease",
    "&:hover": { backgroundColor: "var(--overlay-bg-hover)" },
  } as const;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Grey placeholder when the record's stem has no file — the same
          convention as ItemCard's blank image box. */}
      <Box
        sx={{
          position: "relative",
          aspectRatio: "16 / 10",
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: "var(--surface-inset)",
          border: "1px solid var(--ink-hairline)",
        }}
      >
        {current ? (
          <Box
            component="button"
            type="button"
            onClick={() => setZoomed(true)}
            aria-label={`View the full-size image of ${title}`}
            sx={{
              position: "absolute",
              inset: 0,
              display: "block",
              p: 0,
              border: 0,
              backgroundColor: "transparent",
              cursor: "zoom-in",
              "&:focus-visible": {
                outline: "var(--focus-ring-width) solid var(--focus-ring)",
                outlineOffset: "-3px",
              },
            }}
          >
            <Image
              src={current}
              alt={title}
              fill
              sizes="(max-width: 900px) 100vw, 55vw"
              style={{ objectFit: "cover" }}
              priority
            />
          </Box>
        ) : null}

        {/* Only a record with somewhere to go shows an arrow: a one-picture
            record gets the bare hero, exactly as it gets no strip. */}
        {multiple ? (
          <>
            <IconButton
              onClick={() => go(-1)}
              aria-label="Show the previous image"
              sx={{ ...heroArrowSx, left: { xs: 8, sm: 12 } }}
            >
              <ChevronLeft size={24} />
            </IconButton>
            <IconButton
              onClick={() => go(1)}
              aria-label="Show the next image"
              sx={{ ...heroArrowSx, right: { xs: 8, sm: 12 } }}
            >
              <ChevronRight size={24} />
            </IconButton>
          </>
        ) : null}
      </Box>

      {multiple ? (
        <Box
          role="group"
          aria-label="Choose an image"
          sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}
        >
          {visible.map((src, offset) => {
            const i = start + offset;
            // The last tile carries how many more there are when the run does
            // not reach the end — the "+N" that tells a visitor a gallery is
            // longer than the row suggests.
            const more = beyond > 0 && offset === visible.length - 1;
            return (
              <Box
                key={i}
                component="button"
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={i === active}
                sx={{
                  position: "relative",
                  width: 72,
                  height: 54,
                  p: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                  borderRadius: 1.5,
                  border: "2px solid",
                  // On the wallpaper, so the active edge comes from the on-bg
                  // family — a hard-coded ink would vanish as the page fades to
                  // green (the same rule as the section headings).
                  borderColor: i === active ? "var(--on-bg)" : "transparent",
                  opacity: i === active ? 1 : 0.6,
                  transition: "opacity 0.15s ease, border-color 0.15s ease",
                  "&:hover": { opacity: 1 },
                }}
              >
                <Image src={src} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />
                {more ? (
                  <Box
                    aria-hidden
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(8, 28, 21, 0.62)",
                      color: "#eaf7ec",
                      fontWeight: 700,
                    }}
                  >
                    +{beyond}
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ) : null}

      {/* The viewer. A photo is judged against a neutral dark backdrop, so this
          is the one surface that does not follow the theme — see --viewer-* in
          globals.css. It is a portal at <body>, so the colour filters, which
          apply to .page-shell, never touch it (the same reason the drawer and
          the dialogs live outside the shell). */}
      <Dialog
        open={zoomed && Boolean(current)}
        onClose={() => setZoomed(false)}
        fullScreen
        aria-label={`Full-size image of ${title}`}
        slotProps={{
          paper: {
            onKeyDown,
            sx: {
              backgroundColor: "var(--viewer-bg)",
              backgroundImage: "none",
              color: "var(--viewer-ink)",
              boxShadow: "none",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: { xs: 2, sm: 3 },
            py: 1.25,
            borderBottom: "1px solid var(--viewer-line)",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: "var(--viewer-ink-muted)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </Typography>
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="body2"
              aria-live="polite"
              sx={{ color: "var(--viewer-ink-muted)", fontVariantNumeric: "tabular-nums" }}
            >
              {active + 1} of {count}
            </Typography>
            <IconButton
              onClick={() => setZoomed(false)}
              aria-label="Close the full-size image"
              sx={{
                color: "var(--viewer-ink)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.14)" },
              }}
            >
              <Box component="span" aria-hidden sx={{ fontSize: "1.25rem", lineHeight: 1 }}>
                ✕
              </Box>
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            position: "relative",
            flexGrow: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 1.5, sm: 3 },
          }}
        >
          {/* The original file at its own aspect ratio, bounded by the stage —
              no `fill`, no object-fit crop. */}
          <Box
            component="img"
            src={current}
            alt={title}
            sx={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              borderRadius: 1.5,
            }}
          />
          {multiple ? (
            <>
              <IconButton
                onClick={() => go(-1)}
                aria-label="Show the previous image"
                sx={{ ...arrowSx, left: { xs: 4, sm: 12 } }}
              >
                <ChevronLeft size={26} />
              </IconButton>
              <IconButton
                onClick={() => go(1)}
                aria-label="Show the next image"
                sx={{ ...arrowSx, right: { xs: 4, sm: 12 } }}
              >
                <ChevronRight size={26} />
              </IconButton>
            </>
          ) : null}
        </Box>

        {multiple ? (
          <Box
            role="group"
            aria-label="Choose an image"
            sx={{
              display: "flex",
              gap: 1,
              px: { xs: 2, sm: 3 },
              py: 2,
              justifyContent: "center",
              overflowX: "auto",
              borderTop: "1px solid var(--viewer-line)",
            }}
          >
            {images.map((src, i) => (
              <Box
                key={i}
                component="button"
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={i === active}
                sx={{
                  position: "relative",
                  flex: "0 0 auto",
                  width: 76,
                  height: 52,
                  p: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                  borderRadius: 1,
                  border: "2px solid",
                  borderColor:
                    i === active ? "var(--viewer-ink)" : "transparent",
                  opacity: i === active ? 1 : 0.55,
                  transition: "opacity 0.15s ease, border-color 0.15s ease",
                  "&:hover": { opacity: 1 },
                }}
              >
                <Image src={src} alt="" fill sizes="76px" style={{ objectFit: "cover" }} />
              </Box>
            ))}
          </Box>
        ) : null}
      </Dialog>
    </Box>
  );
}
