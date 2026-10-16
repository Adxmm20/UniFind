"use client";

import { useEffect } from "react";
import { usePrefs } from "./a11y/prefsContext";

// Colours for the text that sits directly on the wallpaper. They start dark (the
// backdrop is pale) and switch to light once the backdrop is dim enough, so they
// stay readable the whole way down the page.
//
// The endpoints themselves live in globals.css as --wallpaper-ink-* and are read
// from there rather than copied here, so the theme (and high contrast, which
// changes how opaque the muted tones are) is a stylesheet change. Reading them
// goes through a hidden probe element: asking a real `color` to resolve
// `var(--…)` gets back a computed rgba, which resolves light-dark() and
// color-mix() on the way — something reading the custom property directly would
// not do.
type Rgba = { r: number; g: number; b: number; a: number };

type Ink = { base: Rgba; muted: Rgba; line: Rgba };

// Only used if the stylesheet cannot be read at all, so they simply match the
// light theme in globals.css.
const FALLBACK: { start: Ink; end: Ink } = {
  start: {
    base: { r: 8, g: 28, b: 21, a: 1 },
    muted: { r: 8, g: 28, b: 21, a: 0.62 },
    line: { r: 8, g: 28, b: 21, a: 0.18 },
  },
  end: {
    base: { r: 234, g: 247, b: 236, a: 1 },
    muted: { r: 234, g: 247, b: 236, a: 0.78 },
    line: { r: 234, g: 247, b: 236, a: 0.28 },
  },
};

// The wallpaper still reads as "light" until the dim layer is nearly opaque, so
// the foreground flips late-ish. The band is centred on the point where light
// text starts beating dark text on contrast (roughly --scroll-progress 0.79),
// and kept narrow so the mid-tone window is short.
const SWITCH_FROM = 0.76;
const SWITCH_TO = 0.82;

function toRgba(value: string): Rgba | null {
  // getComputedStyle always hands back rgb()/rgba() for a resolved colour.
  const match = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (!match) return null;
  const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

function readInk(probe: HTMLElement): { start: Ink; end: Ink } | null {
  const read = (name: string): Rgba | null => {
    probe.style.color = `var(${name})`;
    return toRgba(window.getComputedStyle(probe).color);
  };

  const base = {
    start: read("--wallpaper-ink-start"),
    startMuted: read("--wallpaper-ink-start-muted"),
    startLine: read("--wallpaper-ink-start-line"),
    end: read("--wallpaper-ink-end"),
    endMuted: read("--wallpaper-ink-end-muted"),
    endLine: read("--wallpaper-ink-end-line"),
  };
  if (Object.values(base).some((value) => value === null)) return null;

  return {
    start: { base: base.start!, muted: base.startMuted!, line: base.startLine! },
    end: { base: base.end!, muted: base.endMuted!, line: base.endLine! },
  };
}

function toCss({ r, g, b, a }: Rgba) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

function mix(from: Rgba, to: Rgba, t: number): Rgba {
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
    a: from.a + (to.a - from.a) * t,
  };
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Renders the fixed backdrop and publishes scroll state to CSS custom
 * properties on <html>. Renders identical markup on the server and client, so
 * there is no hydration mismatch: the CSS defaults equal the top-of-page state.
 *
 * Under reduced motion nothing is written at all: the stylesheet's defaults are
 * already the flat top-of-page state, and a backdrop that shifts colour while
 * you scroll is exactly the kind of motion the preference asks us to drop.
 */
export default function ScrollWallpaper() {
  const { reducedMotion } = usePrefs();

  useEffect(() => {
    if (reducedMotion) return;

    const root = document.documentElement;
    let frame = 0;

    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden";
    document.body.appendChild(probe);

    let ink = readInk(probe) ?? FALLBACK;

    const update = () => {
      frame = 0;
      const max = root.scrollHeight - root.clientHeight;
      const progress =
        max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const t = smoothstep(SWITCH_FROM, SWITCH_TO, progress);

      root.style.setProperty("--scroll-progress", progress.toFixed(4));
      root.style.setProperty("--on-bg", toCss(mix(ink.start.base, ink.end.base, t)));
      root.style.setProperty(
        "--on-bg-muted",
        toCss(mix(ink.start.muted, ink.end.muted, t)),
      );
      root.style.setProperty(
        "--on-bg-line",
        toCss(mix(ink.start.line, ink.end.line, t)),
      );
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Tab switches and image loads change the document height, which changes
    // what "the bottom" means.
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(document.body);

    // A theme or contrast change rewrites the endpoints, so they are read again
    // and the current frame repainted.
    const attributeObserver = new MutationObserver(() => {
      ink = readInk(probe) ?? ink;
      schedule();
    });
    attributeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "data-contrast"],
    });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizeObserver.disconnect();
      attributeObserver.disconnect();
      probe.remove();
      if (frame) window.cancelAnimationFrame(frame);
      root.style.removeProperty("--scroll-progress");
      root.style.removeProperty("--on-bg");
      root.style.removeProperty("--on-bg-muted");
      root.style.removeProperty("--on-bg-line");
    };
  }, [reducedMotion]);

  return (
    <div className="scroll-wallpaper" aria-hidden="true">
      <div className="scroll-wallpaper__gradient" />
      <div className="scroll-wallpaper__dim" />
    </div>
  );
}
