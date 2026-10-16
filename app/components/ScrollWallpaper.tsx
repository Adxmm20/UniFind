"use client";

import { useEffect } from "react";

// Colours mirrored from the wallpaper gradient in globals.css. Text that sits
// directly on the wallpaper starts dark (light backdrop) and switches to light
// once the backdrop is dim enough, so it stays readable the whole way down.
type Rgba = { r: number; g: number; b: number; a: number };

const DARK: Rgba = { r: 8, g: 28, b: 21, a: 1 };
const LIGHT: Rgba = { r: 234, g: 247, b: 236, a: 1 };
const DARK_MUTED: Rgba = { r: 8, g: 28, b: 21, a: 0.62 };
const LIGHT_MUTED: Rgba = { r: 234, g: 247, b: 236, a: 0.78 };
const DARK_LINE: Rgba = { r: 8, g: 28, b: 21, a: 0.18 };
const LIGHT_LINE: Rgba = { r: 234, g: 247, b: 236, a: 0.28 };

// The wallpaper still reads as "light" until the dim layer is nearly opaque, so
// the foreground flips late-ish. The band is centred on the point where light
// text starts beating dark text on contrast (roughly --scroll-progress 0.79),
// and kept narrow so the mid-tone window is short.
const SWITCH_FROM = 0.76;
const SWITCH_TO = 0.82;

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
 */
export default function ScrollWallpaper() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const update = () => {
      frame = 0;
      const max = root.scrollHeight - root.clientHeight;
      const progress =
        max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const t = smoothstep(SWITCH_FROM, SWITCH_TO, progress);

      root.style.setProperty("--scroll-progress", progress.toFixed(4));
      root.style.setProperty("--on-bg", toCss(mix(DARK, LIGHT, t)));
      root.style.setProperty("--on-bg-muted", toCss(mix(DARK_MUTED, LIGHT_MUTED, t)));
      root.style.setProperty("--on-bg-line", toCss(mix(DARK_LINE, LIGHT_LINE, t)));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Tab switches and image loads change the document height, which changes
    // what "the bottom" means.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="scroll-wallpaper" aria-hidden="true">
      <div className="scroll-wallpaper__gradient" />
      <div className="scroll-wallpaper__dim" />
    </div>
  );
}
