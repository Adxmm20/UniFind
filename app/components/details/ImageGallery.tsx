"use client";

import { Box, Dialog, IconButton } from "@mui/material";
import Image from "next/image";
import { useState } from "react";
import { ChevronRight } from "./Chevron";

// The layout's image viewer. It is data-driven: a record with one picture gets
// a plain hero, and the next-image scrim, its arrow and the thumbnail strip
// appear by themselves once a record carries a gallery. Nothing is faked to
// fill the slots.
//
// The hero fills its 16/10 frame and therefore crops (the same convention as
// ItemCard). Clicking it opens a lightbox that shows the record's *original*
// file — a plain <img> pointed at the public path, not the optimised crop — so
// the whole picture is visible at full size.
export default function ImageGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const multiple = images.length > 1;
  const active = images.length ? index % images.length : 0;
  const current = images[active];

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

        {multiple ? (
          <Box
            sx={{
              position: "absolute",
              inset: "0 0 0 auto",
              zIndex: 1,
              width: { xs: 48, md: 64 },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(8, 28, 21, 0.35)",
            }}
          >
            <IconButton
              size="small"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              aria-label="Show next image"
              sx={{
                width: 36,
                height: 36,
                color: "var(--overlay-ink)",
                backgroundColor: "var(--overlay-bg)",
                "&:hover": { backgroundColor: "var(--overlay-bg-hover)" },
              }}
            >
              <ChevronRight size={22} />
            </IconButton>
          </Box>
        ) : null}
      </Box>

      {multiple ? (
        <Box
          role="group"
          aria-label="Choose an image"
          sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}
        >
          {images.map((src, i) => (
            <Box
              key={src}
              component="button"
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              sx={{
                position: "relative",
                width: 64,
                height: 64,
                p: 0,
                cursor: "pointer",
                overflow: "hidden",
                borderRadius: 1.5,
                border: "2px solid",
                borderColor: i === active ? "var(--ink)" : "transparent",
                opacity: i === active ? 1 : 0.65,
                transition: "opacity 0.15s ease, border-color 0.15s ease",
                "&:hover": { opacity: 1 },
              }}
            >
              <Image src={src} alt="" fill sizes="64px" style={{ objectFit: "cover" }} />
            </Box>
          ))}
        </Box>
      ) : null}

      {/* Full-size lightbox. The paper stays transparent so the picture reads
          against the dimmed backdrop, and the close control floats over it. */}
      <Dialog
        open={zoomed && Boolean(current)}
        onClose={() => setZoomed(false)}
        aria-label={`Full-size image of ${title}`}
        maxWidth={false}
        fullWidth={false}
        slotProps={{
          paper: {
            sx: {
              m: 2,
              maxWidth: "none",
              backgroundColor: "transparent",
              backgroundImage: "none",
              boxShadow: "none",
              overflow: "visible",
            },
          },
        }}
      >
        <Box sx={{ position: "relative", display: "flex" }}>
          {/* The original file at its own aspect ratio, bounded by the
              viewport — no `fill`, no object-fit crop. */}
          <Box
            component="img"
            src={current}
            alt={title}
            sx={{
              display: "block",
              maxWidth: "92vw",
              maxHeight: "86vh",
              width: "auto",
              height: "auto",
              borderRadius: 2,
            }}
          />
          <IconButton
            onClick={() => setZoomed(false)}
            aria-label="Close full-size image"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 36,
              height: 36,
              color: "var(--overlay-ink)",
              backgroundColor: "var(--overlay-bg)",
              "&:hover": { backgroundColor: "var(--overlay-bg-hover)" },
            }}
          >
            <Box component="span" aria-hidden sx={{ fontSize: "1.25rem", lineHeight: 1 }}>
              ✕
            </Box>
          </IconButton>
        </Box>
      </Dialog>
    </Box>
  );
}
