"use client";

import { Box, IconButton } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import { toggleBookmarkAction } from "@/app/actions/bookmarks";
import { openAuthPrompt } from "../auth/authPrompt";

// Outline when unsaved, solid when saved — one path, two fills. Inline SVG
// rather than @mui/icons-material, which is not installed.
const BOOKMARK_PATH =
  "M6 3.25h12a1 1 0 0 1 1 1v16.4l-7-4.9-7 4.9V4.25a1 1 0 0 1 1-1z";

// Hidden until the card is hovered, so the grid stays clean. `focus-within`
// covers the keyboard — tabbing to the card's link reveals its control rather
// than leaving an unreachable button behind. Touch devices have no hover at all,
// so there the control is always visible.
//
// `pointer-events` is toggled alongside `opacity`: an invisible button that still
// accepts clicks would be a trap sitting on top of the card.
const overlayWrapperSx = {
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 2,
  opacity: 0,
  pointerEvents: "none",
  transition: "opacity 0.15s ease",
  ".MuiCard-root:hover &, .MuiCard-root:focus-within &": {
    opacity: 1,
    pointerEvents: "auto",
  },
  "@media (hover: none)": { opacity: 1, pointerEvents: "auto" },
} as const;

// The details page has no card to hover and no overlay corner to sit in, so
// there the button is simply always visible in the flow beside the heading.
const inlineWrapperSx = { flex: "0 0 auto" } as const;

export default function BookmarkButton({
  recordId,
  signedIn,
  saved,
  variant = "overlay",
}: {
  recordId: string;
  /** A guest gets the same control, but it opens the login prompt instead. */
  signedIn: boolean;
  saved: boolean;
  /**
   * `overlay` (default) is the card control: pinned to the top-right corner and
   * revealed on hover/focus. `inline` drops the positioning and the reveal for
   * surfaces that are not a card.
   */
  variant?: "overlay" | "inline";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(saved);

  function handleClick(event: MouseEvent) {
    // The card underneath is a stretched link; without this the click would
    // also navigate to the details page.
    event.preventDefault();
    event.stopPropagation();

    if (!signedIn) {
      openAuthPrompt("login");
      return;
    }
    if (pending) return;

    const next = !isSaved;
    setIsSaved(next); // optimistic — flips the glyph before the round trip
    startTransition(async () => {
      const result = await toggleBookmarkAction(recordId);
      if (!result.ok) {
        setIsSaved(!next); // revert; the icon springing back is the feedback
        return;
      }
      // Re-render from the server so the card reflects the stored state — on
      // the bookmarks page this is what makes an unsaved card disappear.
      router.refresh();
    });
  }

  return (
    <Box sx={variant === "inline" ? inlineWrapperSx : overlayWrapperSx}>
      <IconButton
        size="small"
        onClick={handleClick}
        aria-pressed={signedIn ? isSaved : undefined}
        aria-label={
          signedIn
            ? isSaved
              ? "Remove bookmark"
              : "Save bookmark"
            : "Sign in to save this bookmark"
        }
        sx={{
          width: 34,
          height: 34,
          backgroundColor: "var(--surface)",
          boxShadow: 1,
          color: isSaved ? "var(--accent)" : "var(--ink)",
          "&:hover": { backgroundColor: "var(--surface-2)" },
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={18}
          height={18}
          fill={isSaved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={isSaved ? 0 : 1.8}
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={BOOKMARK_PATH} />
        </svg>
      </IconButton>
    </Box>
  );
}
