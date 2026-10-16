"use client";

import { Box } from "@mui/material";
import { useEffect, useRef } from "react";
import { describeElement } from "./describeElement";
import { usePrefs } from "./prefsContext";

// How long the pointer has to rest on something before it is described. Three
// seconds is long enough to be deliberate and short enough not to feel broken;
// keyboard focus gets no delay, because focus is already deliberate.
const HOVER_DELAY_MS = 3000;

/**
 * Read aloud on hover: rest the pointer on anything for three seconds and the
 * element is described out loud (and ringed, so it is clear what is being
 * described) in one sentence — "button, Bookmark, pressed".
 *
 * Everything is written straight to the DOM: the chip is presentational
 * (aria-hidden, and the words in it are the same words being spoken, so a screen
 * reader must not announce them twice) and the highlight is an attribute, so a
 * hover never re-renders React.
 */
export default function SpeechOnHover() {
  const { prefs } = usePrefs();
  const enabled = prefs.speech;
  const chipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    let timer = 0;
    let described: Element | null = null;

    const showChip = (text: string) => {
      const chip = chipRef.current;
      if (!chip) return;
      chip.textContent = text;
      chip.style.opacity = "1";
    };

    const stop = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
      described?.removeAttribute("data-a11y-speaking");
      described = null;
      synth.cancel();
      const chip = chipRef.current;
      if (chip) {
        chip.style.opacity = "0";
        chip.textContent = "";
      }
    };

    const announce = (description: { element: Element; text: string }) => {
      timer = 0;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(description.text);
      utterance.lang = document.documentElement.lang || "en";
      utterance.rate = 0.95;
      const voice = synth
        .getVoices()
        .find((candidate) => candidate.lang.startsWith("en"));
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    };

    const consider = (target: EventTarget | null, delay: number) => {
      if (!(target instanceof Element)) return;

      const description = describeElement(target);
      if (!description) {
        if (described) stop();
        return;
      }
      // Moving around inside the thing being described — the icon in a button,
      // the text inside a card — is not a change of subject, so the timer keeps
      // running instead of restarting.
      if (description.element === described) return;

      stop();
      described = description.element;
      described.setAttribute("data-a11y-speaking", "true");
      showChip(description.text);
      timer = window.setTimeout(() => announce(description), delay);
    };

    const onPointerOver = (event: PointerEvent) => consider(event.target, HOVER_DELAY_MS);

    const onPointerOut = (event: PointerEvent) => {
      const next = event.relatedTarget;
      // Still inside the described element: nothing has been left behind.
      if (described && next instanceof Node && described.contains(next)) return;
      if (described) stop();
    };

    const onFocusIn = (event: FocusEvent) => consider(event.target, 0);
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (described && next instanceof Node && described.contains(next)) return;
      if (described) stop();
    };

    // Anything that moves the page or is a deliberate act ends the description:
    // a scroll can take the element out from under the pointer, and a click is
    // the visitor saying they already know what they are pointing at.
    const onScroll = () => {
      if (described) stop();
    };
    const onPointerDown = () => {
      if (described) stop();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && described) stop();
    };

    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll);
      // The DOM is going away with this effect, so only the speech needs
      // stopping — no state to reset.
      if (timer) window.clearTimeout(timer);
      described?.removeAttribute("data-a11y-speaking");
      synth.cancel();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Box
      ref={chipRef}
      data-a11y-chip
      aria-hidden
      sx={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2000,
        maxWidth: "min(560px, calc(100vw - 32px))",
        px: 2,
        py: 1,
        borderRadius: 999,
        backgroundColor: "var(--btn-bg)",
        color: "var(--btn-ink)",
        fontWeight: 600,
        fontSize: "0.85rem",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
        // Never in the way: the chip sits over the very page it is describing.
        pointerEvents: "none",
        opacity: 0,
        transition: "opacity 0.15s ease",
      }}
    />
  );
}
