"use client";

import { Box, IconButton } from "@mui/material";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

// Ring spacing / timing. Panel size is responsive and comes from CSS custom
// properties (--slide-w / --slide-h) defined on .slideshow-glass in globals.css.
const GAP = 24; // extra spacing between panels
const AUTOPLAY_MS = 3500;

// Dot window: show 5 dots at a time, scroll to follow the active dot.
const VISIBLE_DOTS = 5;
const DOT_SIZE = 10;
const DOT_GAP = 8;
const DOT_STEP = DOT_SIZE + DOT_GAP;

const glassButtonSx = {
  position: "absolute",
  top: "45%",
  transform: "translateY(-50%)",
  zIndex: 2,
  color: "#081C15",
  fontSize: 26,
  fontWeight: 700,
  lineHeight: 1,
  backgroundColor: "rgba(255, 255, 255, 0.35)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  boxShadow: "0 4px 16px rgba(8, 28, 21, 0.15)",
  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.55)" },
} as const;

export default function Slideshow({ slides }: { slides: string[] }) {
  const count = slides.length;

  // Angle between panels and the radius multiplier that keeps them from
  // overlapping: R = (width / 2) / tan(180deg / count). Multiplied by the
  // responsive --slide-w in CSS so it scales with the panel size.
  const angle = count > 0 ? 360 / count : 0;
  const radiusMult =
    count > 1 ? Math.round((1 / (2 * Math.tan(Math.PI / count))) * 1e4) / 1e4 : 0;

  // Cumulative rotation (in slide steps) so the carousel always advances in the
  // same direction and loops forever instead of rewinding at the ends.
  const [rotation, setRotation] = useState(0);
  const [paused, setPaused] = useState(false);

  const activeIndex = count > 0 ? ((rotation % count) + count) % count : 0;

  const step = useCallback(
    (delta: number) => {
      if (count === 0) return;
      setRotation((prev) => prev + delta);
    },
    [count],
  );

  // Jump to a specific slide while keeping rotation moving forwards.
  const goToSlide = useCallback(
    (target: number) => {
      if (count === 0) return;
      setRotation((prev) => {
        const turns = Math.ceil((prev - target) / count);
        return target + turns * count;
      });
    },
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => setRotation((prev) => prev + 1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, count]);

  if (count === 0) {
    return null;
  }

  // Dot window geometry
  const visibleDots = Math.min(count, VISIBLE_DOTS);
  const dotsWindowWidth = visibleDots * DOT_SIZE + (visibleDots - 1) * DOT_GAP;
  const maxDotStart = Math.max(0, count - VISIBLE_DOTS);
  const dotStart = Math.min(
    Math.max(activeIndex - Math.floor(VISIBLE_DOTS / 2), 0),
    maxDotStart,
  );

  return (
    <Box
      component="section"
      sx={{ width: "100%", maxWidth: 1100, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}
    >
      <Box
        className="slideshow-glass"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 4,
          p: { xs: 2, md: 3 },
          pb: { xs: 6, md: 7 },
          backgroundColor: "rgba(255, 255, 255, 0.22)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.5)",
          boxShadow: "0 8px 32px rgba(8, 28, 21, 0.18)",
        }}
      >
        {/* 3D viewport */}
        <Box
          sx={{
            position: "relative",
            height: "calc(var(--slide-h) * 1.55)",
            perspective: "1200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Rotating ring */}
          <Box
            sx={{
              position: "relative",
              width: "var(--slide-w)",
              height: "var(--slide-h)",
              transformStyle: "preserve-3d",
              transform: `rotateY(${-rotation * angle}deg)`,
              transition: "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {slides.map((src, i) => (
              <Box
                key={src}
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 3,
                  overflow: "hidden",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: `rotateY(${i * angle}deg) translateZ(calc(var(--slide-w) * ${radiusMult} + ${GAP}px))`,
                  boxShadow:
                    i === activeIndex
                      ? "0 0 0 2px rgba(255,255,255,0.9), 0 12px 40px rgba(8, 28, 21, 0.45)"
                      : "0 6px 24px rgba(8, 28, 21, 0.25)",
                  transition: "box-shadow 0.4s ease",
                }}
              >
                <Image
                  src={src}
                  alt={`Slide ${i + 1}`}
                  fill
                  sizes="(max-width: 715px) 42vw, 390px"
                  priority={i === 0}
                  style={{ objectFit: "cover" }}
                />
                {/* glass sheen */}
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%)",
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Glass navigation arrows */}
        <IconButton
          aria-label="Previous slide"
          onClick={() => step(-1)}
          sx={{ ...glassButtonSx, left: { xs: 6, md: 16 } }}
        >
          ‹
        </IconButton>
        <IconButton
          aria-label="Next slide"
          onClick={() => step(1)}
          sx={{ ...glassButtonSx, right: { xs: 6, md: 16 } }}
        >
          ›
        </IconButton>

        {/* Glass dot indicators — a 5-wide window that scrolls to follow the active dot */}
        <Box
          sx={{
            position: "absolute",
            bottom: { xs: 12, md: 18 },
            left: "50%",
            transform: "translateX(-50%)",
            width: dotsWindowWidth,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: `${DOT_GAP}px`,
              transform: `translateX(${-dotStart * DOT_STEP}px)`,
              transition: "transform 0.35s ease",
            }}
          >
            {slides.map((src, i) => (
              <Box
                key={src}
                component="button"
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === activeIndex}
                onClick={() => goToSlide(i)}
                sx={{
                  flex: "0 0 auto",
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  p: 0,
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  transition: "background-color 0.3s ease, transform 0.3s ease",
                  backgroundColor:
                    i === activeIndex ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.5)",
                  transform: i === activeIndex ? "scale(1.3)" : "scale(1)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.8)" },
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
