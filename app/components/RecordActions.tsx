"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { deleteRecordAction } from "@/app/actions/posts";

// The owner-only controls for a record: Edit (which is really a link to
// /details/<id>/edit) and Delete, which confirms first because it cannot be
// undone. It is a `variant` component for the same reason BookmarkButton is —
// the two surfaces it serves are shaped differently:
//
//   overlay  the card control, hidden until the card is hovered and pinned to
//            the top-left corner (the bookmark control owns the top-right), and
//            opening a small menu rather than showing two buttons over a picture
//   inline   the details page, which has no card to hover and shows both
//            controls beside the bookmark control
//
// Neither ever decides *whether* the viewer may use it: the server only passes
// `manage` for a record the session owns, and every action re-checks the owner
// in SQL anyway.

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

// Material Symbols' `more_vert`, inlined for the same reason as the others:
// @mui/icons-material is not installed here.
function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

// The card control keeps BookmarkButton's reveal: hidden until the card is
// hovered, revealed by focus so the keyboard can reach it, and always on for
// touch. `pointer-events` moves with `opacity` — an invisible button that still
// takes clicks is a trap sitting on the picture.
const overlaySx = {
  position: "absolute",
  top: 8,
  left: 8,
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

// The details page's header sits on the wallpaper, so its controls are little
// surfaces of their own — the same shape as the inline bookmark button.
const chipSx = {
  textTransform: "none",
  fontWeight: 600,
  height: 34,
  px: 1.5,
  borderRadius: 999,
  border: "1px solid var(--ink-hairline)",
  backgroundColor: "var(--surface)",
  color: "var(--ink)",
  "&:hover": { backgroundColor: "var(--surface-2)" },
} as const;

function ConfirmDeleteDialog({
  open,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      aria-labelledby="delete-post-title"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="delete-post-title" sx={{ fontWeight: 700 }}>
        Delete this post?
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ color: "var(--ink-muted)" }}>
          It disappears from the home page and your profile, and anything
          pointing at it — bookmarks, RSVPs, reviews — goes with it. This cannot
          be undone.
        </DialogContentText>
        {error ? (
          <DialogContentText
            role="alert"
            sx={{ color: "var(--danger)", fontWeight: 600, mt: 2 }}
          >
            {error}
          </DialogContentText>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={pending}
          sx={{ textTransform: "none", color: "var(--ink)" }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={pending}
          variant="contained"
          sx={{
            textTransform: "none",
            fontWeight: 600,
            backgroundColor: "var(--danger)",
            color: "var(--danger-ink)",
            "&:hover": { backgroundColor: "var(--danger-hover)" },
            "&.Mui-disabled": {
              backgroundColor: "var(--surface-inset)",
              color: "var(--ink-muted)",
            },
          }}
        >
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// The delete half, as a hook so the overlay menu and the inline button share
// one dialog and one round trip.
function useDelete(recordId: string, afterDelete?: string) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    setOpen(true);
  }

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await deleteRecordAction(recordId);
      if (result.ok) {
        setOpen(false);
        // The record's own page has nothing left to show, so the owner lands on
        // their profile; a card simply refreshes and its own card disappears.
        if (afterDelete) router.push(afterDelete);
        else router.refresh();
        return;
      }
      setError(result.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setPending(false);
  }

  const dialog = (
    <ConfirmDeleteDialog
      open={open}
      pending={pending}
      error={error}
      onClose={() => setOpen(false)}
      onConfirm={confirm}
    />
  );

  return { start, dialog };
}

/** Just the destructive control, for a surface that has its own actions row. */
export function DeleteRecordButton({
  recordId,
  afterDelete,
  label = "Delete",
}: {
  recordId: string;
  /** Where to go once it is gone; a card leaves this out and refreshes. */
  afterDelete?: string;
  label?: string;
}) {
  const { start, dialog } = useDelete(recordId, afterDelete);

  return (
    <Box sx={{ display: "inline-flex" }}>
      <Button
        type="button"
        onClick={start}
        startIcon={<TrashIcon />}
        sx={{
          ...chipSx,
          color: "var(--danger)",
          "&:hover": {
            backgroundColor: "var(--surface-2)",
            borderColor: "var(--danger)",
          },
        }}
      >
        {label}
      </Button>
      {dialog}
    </Box>
  );
}

export default function RecordActions({
  recordId,
  afterDelete,
  variant = "overlay",
}: {
  recordId: string;
  afterDelete?: string;
  variant?: "overlay" | "inline";
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { start: startDelete, dialog } = useDelete(recordId, afterDelete);
  const editHref = `/details/${recordId}/edit`;

  if (variant === "inline") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button
          component={Link}
          href={editHref}
          startIcon={<PencilIcon />}
          sx={chipSx}
        >
          Edit
        </Button>
        <DeleteRecordButton recordId={recordId} afterDelete={afterDelete} />
        {dialog}
      </Box>
    );
  }

  return (
    <Box sx={overlaySx}>
      <IconButton
        size="small"
        onClick={(event: MouseEvent<HTMLElement>) => {
          // The card underneath is a stretched link; without this the click
          // would also open the record.
          event.preventDefault();
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        aria-label="Manage this post"
        sx={{
          width: 34,
          height: 34,
          backgroundColor: "var(--surface)",
          boxShadow: 1,
          color: "var(--ink)",
          "&:hover": { backgroundColor: "var(--surface-2)" },
        }}
      >
        <MoreIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem
          component={Link}
          href={editHref}
          onClick={() => setAnchor(null)}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <PencilIcon />
            Edit
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            startDelete();
          }}
          sx={{ color: "var(--danger)" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <TrashIcon />
            Delete
          </Box>
        </MenuItem>
      </Menu>
      {dialog}
    </Box>
  );
}
