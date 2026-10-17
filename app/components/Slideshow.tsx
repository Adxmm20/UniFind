"use client";

import { Box, IconButton, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePrefs } from "./a11y/prefsContext";

// A slide is named after the record it represents ("event-1", "item-4"), so it
// can link straight to that record's details page.
export type Slide = { id: string; href: string; src: string };

// --- coverflow stage --------------------------------------------------------
// The active slide sits flat in the middle inside a thin, pale frame; its two
// neighbours sit either side of the arrow buttons and lean *away* from the
// middle, so their inner edge (the one beside the arrow) is the tall, near one
// and their outer edge falls away small. Every other slide waits further out at
// zero opacity, which is what lets a change animate instead of snapping.
//
// The lean is a plain rotateY about each panel's own centre, so the browser's
// perspective projection does the work: turning a panel away from the middle
// swings its inner half in front of the screen plane — magnified — and drops
// its outer half behind it to shrink, like a book opening towards the edges.
//
// Panel size is responsive and comes from --slide-w / --slide-h on
// .slideshow-glass in globals.css.
const TILT_DEG = 26;
const SIDE_SCALE = 0.88;
const PERSPECTIVE = 1600; // camera distance; smaller is more dramatic
const SIDE_SHIFT = 0.99; // neighbour offset, as a multiple of --slide-w
const FAR_SHIFT = 1.85; // where the off-stage slides wait
const AUTOPLAY_MS = 3500;

// The slide frames borrow the app bar's colour (--surface-2, which the MUI theme
// pins on the AppBar too) so the carousel's chrome sits in the same neutral as
// the bar rather than a hard black — and follows the theme with it.
const FRAME_COLOR = "var(--surface-2)";

// SIDE_SCALE is what keeps the neighbours inside the stage. Now that they turn
// away from the middle, the corner that gets magnified is the *inner* one:
// PERSPECTIVE / (PERSPECTIVE - sin(TILT) * w * S / 2) has to stay under
// 1 / SIDE_SCALE for every width the clamp in globals.css can produce, or the
// tall inner edges clip against the stage's top and bottom. That ceiling is why
// SIDE_SCALE cannot go much above 0.9.
function coverflowTransform(rel: number): string {
  if (rel === 0) return "translate(-50%, -50%)";
  const dir = rel < 0 ? -1 : 1;
  const shift = Math.abs(rel) === 1 ? SIDE_SHIFT : FAR_SHIFT;
  return (
    `translate(-50%, -50%) translateX(calc(var(--slide-w) * ${dir * shift}))` +
    ` rotateY(${dir * TILT_DEG}deg) scale(${SIDE_SCALE})`
  );
}

// Dot window: show 5 dots at a time, scroll to follow the active dot.
const VISIBLE_DOTS = 5;
const DOT_SIZE = 10;
const DOT_GAP = 8;
const DOT_STEP = DOT_SIZE + DOT_GAP;

// The window is `overflow: hidden` so it can mask the 5-dot scroll, which also
// means it clips at its padding box. Its content box is exactly DOT_SIZE tall,
// so the active dot's 1.3x scale (plus its own shadow) used to get shaved off
// the top and bottom — this padding is what gives them room. Horizontal padding
// has to stay 0 so the window is still exactly dotsWindowWidth wide.
const DOT_PAD = 6;

// Fastest the carousel may move: one step per NAV_LOCK_MS, from an arrow, a dot
// or the autoplay tick following a click. Without it the arrows can be spammed
// faster than the panel transition (0.85s) can keep up.
const NAV_LOCK_MS = 500;

// Sits its own light surface, so it reads the same over the paler top of the
// wallpaper as over the deep green it fades to.
const arrowSx = {
  position: "absolute",
  top: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 5,
  width: { xs: 40, md: 52 },
  height: { xs: 40, md: 52 },
  color: "var(--overlay-ink)",
  fontSize: { xs: "1.375rem", md: "1.875rem" },
  fontWeight: 700,
  lineHeight: 1,
  backgroundColor: "var(--overlay-bg)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  boxShadow: "0 6px 20px var(--overlay-shadow)",
  transition: "background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
  "&:hover": { backgroundColor: "var(--overlay-bg-hover)" },
  // The pinned `color` above would otherwise outrank MUI's own disabled rule.
  // `pointerEvents` is the exception: MUI turns it *off* while disabled, which
  // would let a click fall straight through the arrow onto the slide behind it
  // — during the cooldown the arrow sits over the neighbour panel, so that
  // stray click would open the wrong record. The arrow keeps its own square
  // instead, with the cursor the dots already use, so a cooldown click simply
  // goes nowhere.
  "&.Mui-disabled": {
    color: "var(--overlay-ink-disabled)",
    backgroundColor: "var(--overlay-bg-disabled)",
    pointerEvents: "auto",
    cursor: "default",
  },
};

export default function Slideshow({ slides }: { slides: Slide[] }) {
  const { reducedMotion } = usePrefs();
  const count = slides.length;

  // Cumulative rotation (in slide steps) so the carousel always advances in the
  // same direction and loops forever instead of rewinding at the ends.
  const [rotation, setRotation] = useState(0);
  const [paused, setPaused] = useState(false);
  // True for NAV_LOCK_MS after an accepted move. Both the guard and the arrows'
  // disabled state read it, so the lock cannot silently drop a click on an
  // arrow that still looks live.
  const [locked, setLocked] = useState(false);

  const activeIndex = count > 0 ? ((rotation % count) + count) % count : 0;

  // A click cannot land twice in one React batch, so `locked` is committed
  // before the next handler runs and needs no timestamp to enforce. Only an
  // accepted move restarts the timer, so a dropped click never extends it.
  const step = useCallback(
    (delta: number) => {
      if (count === 0 || locked) return;
      setLocked(true);
      setTimeout(() => setLocked(false), NAV_LOCK_MS);
      setRotation((prev) => prev + delta);
    },
    [count, locked],
  );

  // Jump to a specific slide while keeping rotation moving forwards.
  const goToSlide = useCallback(
    (target: number) => {
      if (count === 0 || locked) return;
      // Re-clicking the active dot is a no-op, so it must not eat the lock.
      if (target === activeIndex) return;
      setLocked(true);
      setTimeout(() => setLocked(false), NAV_LOCK_MS);
      setRotation((prev) => {
        const turns = Math.ceil((prev - target) / count);
        return target + turns * count;
      });
    },
    [count, locked, activeIndex],
  );

  // Autoplay deliberately bypasses the lock: at 3.5s it cannot collide with it,
  // and hovering pauses it, so the only candidate is a tap landing right after a
  // tick (which simply moves twice). Locking it too would instead swallow a tap
  // on arrows that look live.
  //
  // Reduced motion stops it entirely — a carousel that advances on its own is
  // the exact thing that preference is about (the panel's own transition is cut
  // to nothing by the global reduced-motion rule in globals.css).
  useEffect(() => {
    if (paused || reducedMotion || count <= 1) return;
    const id = setInterval(() => setRotation((prev) => prev + 1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, reducedMotion, count]);

  if (count === 0) {
    return null;
  }

  // Signed distance from the active slide, the short way round, so the stage
  // only ever needs three positions: centre, neighbour, off-stage.
  const relative = (i: number) => {
    const forward = (((i - activeIndex) % count) + count) % count;
    return forward <= count / 2 ? forward : forward - count;
  };

  // Dot window geometry
  const visibleDots = Math.min(count, VISIBLE_DOTS);
  const dotsWindowWidth = visibleDots * DOT_SIZE + (visibleDots - 1) * DOT_GAP;
  const maxDotStart = Math.max(0, count - VISIBLE_DOTS);
  const dotStart = Math.min(
    Math.max(activeIndex - Math.floor(VISIBLE_DOTS / 2), 0),
    maxDotStart,
  );

  return (
    // Full bleed on purpose: the neighbours run off the left and right screen
    // edges, which is what sells the depth, so the stage cannot live inside the
    // 1400px content column the rest of the page uses.
    <Box
      component="section"
      className="slideshow-glass"
      aria-roledescription="carousel"
      // The heading below names the carousel, so the section points at it
      // rather than carrying a second, invisible label of its own.
      aria-labelledby="featured-heading"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{ width: "100%", overflow: "hidden", py: { xs: 1.5, md: 2 } }}
    >
      {/* Steam-style section head: the carousel's title sits in the content
          column the rest of the page uses, while the stage below stays full
          bleed. On the wallpaper, so it takes the scroll-tracking --on-bg ink
          rather than a surface colour. */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 1400,
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 0.5, md: 1 },
          display: "flex",
          alignItems: "baseline",
        }}
      >
        <Typography
          component="h2"
          id="featured-heading"
          sx={{
            fontSize: { xs: "1.1rem", md: "1.35rem" },
            fontWeight: 800,
            letterSpacing: "0.02em",
            color: "var(--on-bg)",
          }}
        >
          Featured
        </Typography>
      </Box>
      {/* The stage is exactly one panel tall; the panels are centred in it, so
          its height is also what reserves room for the active frame's shadow. */}
      <Box
        sx={{
          position: "relative",
          height: "var(--slide-h)",
          my: { xs: 2, md: 3 },
          perspective: `${PERSPECTIVE}px`,
          perspectiveOrigin: "50% 50%",
        }}
      >
        {slides.map((slide, i) => {
          const rel = relative(i);
          const onStage = Math.abs(rel) <= 1;

          return (
            <Box
              key={slide.id}
              aria-hidden={!onStage}
              sx={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "var(--slide-w)",
                height: "var(--slide-h)",
                // The frame: the header's pale neutral, thin enough to read as
                // a border rather than a mount.
                backgroundColor: FRAME_COLOR,
                p: { xs: "2px", md: "4px" },
                borderRadius: 1,
                opacity: onStage ? 1 : 0,
                zIndex: rel === 0 ? 3 : onStage ? 2 : 1,
                // An invisible panel that still takes clicks is a trap, so only
                // the three on-stage slides are interactive.
                pointerEvents: onStage ? "auto" : "none",
                transform: coverflowTransform(rel),
                transition:
                  "transform 0.85s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease, box-shadow 0.5s ease",
                boxShadow:
                  rel === 0
                    ? "0 20px 48px rgba(8, 28, 21, 0.45), 0 3px 10px rgba(8, 28, 21, 0.3)"
                    : "0 12px 30px rgba(8, 28, 21, 0.35)",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  borderRadius: 0.5,
                  backgroundColor: FRAME_COLOR,
                }}
              >
                <Image
                  src={slide.src}
                  alt={`Slide ${i + 1}`}
                  fill
                  sizes="(max-width: 1454px) 42vw, 620px"
                  priority={i === 0}
                  style={{ objectFit: "cover" }}
                />
                {/* Transparent overlay so the whole panel opens its details
                    page. Inert for the cooldown: the panels are still moving
                    then, so a click — or a tap — that was meant for an arrow
                    must not open whichever record happens to be under the
                    pointer. Keyboard focus is unaffected (pointer-events is a
                    pointer-only concern).
                    Outside the lock the overlay sets no pointer-events of its
                    own, so it *inherits* the panel's: "auto" on stage, "none"
                    for the two parked off-stage panels. Setting "auto" here
                    would re-enable an invisible panel that the parent had
                    deliberately switched off. */}
                <Link
                  href={slide.href}
                  aria-label={`View details for ${slide.id}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 1,
                    pointerEvents: locked ? "none" : undefined,
                  }}
                />
              </Box>
            </Box>
          );
        })}

        {/* Navigation arrows, just outside the active frame's left and right
            edges, with the neighbouring slides running on past them. */}
        <IconButton
          aria-label="Previous slide"
          disabled={locked}
          onClick={() => step(-1)}
          sx={{ ...arrowSx, left: "calc(50% - var(--slide-w) * 0.55)" }}
        >
          ‹
        </IconButton>
        <IconButton
          aria-label="Next slide"
          disabled={locked}
          onClick={() => step(1)}
          sx={{ ...arrowSx, left: "calc(50% + var(--slide-w) * 0.55)" }}
        >
          ›
        </IconButton>
      </Box>

      {/* Dot indicators — a 5-wide window that scrolls to follow the active dot.
          Pale like the frames, so the soft shadow is what gives them an edge
          against the wallpaper rather than their own contrast. The window's
          padding is what keeps the enlarged active dot from being clipped. */}
      <Box
        sx={{
          width: dotsWindowWidth,
          overflow: "hidden",
          mx: "auto",
          mt: "10px",
          py: `${DOT_PAD}px`,
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
          {slides.map((slide, i) => (
            <Box
              key={slide.id}
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
                cursor: locked ? "default" : "pointer",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                backgroundColor: FRAME_COLOR,
                boxShadow: "0 1px 3px rgba(8, 28, 21, 0.45)",
                opacity: i === activeIndex ? 1 : 0.55,
                transform: i === activeIndex ? "scale(1.3)" : "scale(1)",
                "&:hover": { opacity: 1 },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
