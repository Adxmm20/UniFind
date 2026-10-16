"use client";

import {
  Box,
  CircularProgress,
  Fab,
  IconButton,
  Paper,
  Portal,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { askAboutRecordAction } from "@/app/actions/ai";
import type { AiMode } from "@/lib/aiPrompt";
import { openAuthPrompt } from "../auth/authPrompt";

// The details-page assistant: a floating launcher that opens a small, non-modal
// chat panel. The three presets cover the common asks; the field is for
// anything else. History lives in React state only — nothing is stored, so this
// adds no table and no schema change.
//
// Both the launcher and the panel are rendered through <Portal>, so they live at
// <body>. That is deliberate: the colour filters apply `filter` to .page-shell,
// and a `filter` makes fixed-position descendants relative to the filtered
// element — a launcher left inline would drift to the bottom of the *page*
// rather than the viewport whenever a CVD filter is on. Portalling keeps it in
// the same "never inside the filtered subtree" family as the drawer and dialogs.

type Turn = {
  id: number;
  role: "user" | "assistant";
  text: string;
  /** A failed request rather than an answer — excluded from the replayed history. */
  error?: boolean;
};

const PRESETS: { mode: AiMode; label: string; bubble: string }[] = [
  { mode: "summary", label: "Summarise", bubble: "Summarise this listing." },
  { mode: "keypoints", label: "Key points", bubble: "What are the key points?" },
  {
    mode: "contact",
    label: "Draft a message",
    bubble: "Draft a message to the organiser or provider.",
  },
];

const LABEL = "Ask about this record";

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden="true">
      <path d="M11 2.5l1.55 4.2 4.2 1.55-4.2 1.55L11 14l-1.55-4.2-4.2-1.55 4.2-1.55z" />
      <path d="M18 13.5l.85 2.3 2.3.85-2.3.85-.85 2.3-.85-2.3-2.3-.85 2.3-.85z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
      <path d="M3.4 20.4l17.4-8.4L3.4 3.6l3.3 6.9 8 1.5-8 1.5z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

export default function DetailsChat({
  recordId,
  kind,
  signedIn,
}: {
  recordId: string;
  kind: "Event" | "Rental" | "Service";
  /** A guest gets the same launcher, but it raises the login prompt instead. */
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // Focus the field when the panel opens. Writes to the DOM only — no state is
  // set here, which is what keeps this clear of react-hooks/set-state-in-effect.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the newest turn in view as the transcript grows.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns, busy, open]);

  async function run(mode: AiMode, question: string, userText: string) {
    if (busy) return;

    // The prior turns, captured before the new one is appended, become the
    // replay history. Failed turns carry no answer and are left out.
    const history = turns
      .filter((turn) => !turn.error)
      .map((turn) => ({ role: turn.role, content: turn.text }));

    setTurns((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text: userText },
    ]);
    setBusy(true);

    const result = await askAboutRecordAction(recordId, mode, question, history);

    setBusy(false);
    setTurns((prev) => [
      ...prev,
      result.ok
        ? { id: nextId.current++, role: "assistant", text: result.text }
        : { id: nextId.current++, role: "assistant", text: result.error, error: true },
    ]);
  }

  function close() {
    setOpen(false);
    // Return focus to the launcher, since the panel (and the focused field
    // inside it) is about to unmount.
    fabRef.current?.focus();
  }

  function toggle() {
    if (!signedIn) {
      openAuthPrompt("login");
      return;
    }
    if (open) close();
    else setOpen(true);
  }

  function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void run("chat", text, text);
  }

  function copy(turn: Turn) {
    const clipboard = navigator.clipboard;
    // Absent on insecure origins and in some in-app browsers — the reply is
    // still selectable, so this is a silent no-op rather than an error.
    if (!clipboard) return;
    clipboard
      .writeText(turn.text)
      .then(() => {
        setCopiedId(turn.id);
        window.setTimeout(
          () => setCopiedId((current) => (current === turn.id ? null : current)),
          2000,
        );
      })
      .catch(() => {
        /* Clipboard blocked — the text is still selectable. */
      });
  }

  return (
    <Portal>
      {open && (
        <Paper
          role="dialog"
          aria-label={LABEL}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
          sx={{
            position: "fixed",
            right: 24,
            bottom: 96,
            zIndex: 1300,
            width: "min(380px, calc(100vw - 32px))",
            maxHeight: "min(560px, 70vh)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 3,
            border: "1px solid var(--ink-line)",
            backgroundColor: "var(--surface)",
            color: "var(--ink)",
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              px: 2,
              py: 1.5,
              borderBottom: "1px solid var(--ink-line)",
              backgroundColor: "var(--surface-2)",
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>Assistant</Typography>
            <IconButton
              size="small"
              onClick={close}
              aria-label="Close assistant"
              sx={{ color: "var(--ink)" }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          <Box
            ref={listRef}
            aria-live="polite"
            sx={{ flex: 1, overflowY: "auto", px: 2, py: 2, minHeight: 120 }}
          >
            {turns.length === 0 && !busy ? (
              <Typography variant="body2" sx={{ color: "var(--ink-muted)" }}>
                I can summarise this {kind.toLowerCase()}, pull out the key
                points, or draft a message to the {kind === "Event" ? "organiser" : "provider"}.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {turns.map((turn) => (
                  <Box key={turn.id}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        whiteSpace: "pre-line",
                        wordBreak: "break-word",
                        ...(turn.role === "user"
                          ? {
                              ml: "auto",
                              width: "fit-content",
                              maxWidth: "85%",
                              backgroundColor: "var(--pill-bg)",
                              color: "var(--pill-ink)",
                            }
                          : {
                              width: "100%",
                              backgroundColor: "var(--surface-2)",
                              color: turn.error ? "var(--ink-muted)" : "var(--ink)",
                              fontStyle: turn.error ? "italic" : "normal",
                            }),
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                        {turn.text}
                      </Typography>
                    </Box>
                    {turn.role === "assistant" && !turn.error && (
                      <Box
                        component="button"
                        type="button"
                        onClick={() => copy(turn)}
                        aria-label="Copy reply"
                        sx={{
                          mt: 0.5,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          font: "inherit",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          border: "none",
                          background: "none",
                          p: 0,
                          color: "var(--ink-muted)",
                        }}
                      >
                        <CopyIcon />
                        {copiedId === turn.id ? "Copied" : "Copy"}
                      </Box>
                    )}
                  </Box>
                ))}
                {busy && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <CircularProgress size={16} sx={{ color: "var(--ink-muted)" }} />
                    <Typography variant="body2" sx={{ color: "var(--ink-muted)" }}>
                      Thinking…
                    </Typography>
                  </Stack>
                )}
              </Stack>
            )}
          </Box>

          {/* Outside the transcript on purpose: a template must stay pickable
              after the first reply, so these do not live in the empty state
              that the first turn replaces. */}
          <Stack
            direction="row"
            sx={{
              flexWrap: "wrap",
              gap: 1,
              px: 2,
              pt: 1.5,
              pb: 0.5,
              borderTop: "1px solid var(--ink-line)",
            }}
          >
            {PRESETS.map((preset) => (
              <Box
                key={preset.mode}
                component="button"
                type="button"
                onClick={() => void run(preset.mode, "", preset.bubble)}
                disabled={busy}
                sx={{
                  font: "inherit",
                  cursor: "pointer",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  border: "1px solid var(--ink-line)",
                  backgroundColor: "var(--pill-bg)",
                  color: "var(--pill-ink)",
                  fontWeight: 600,
                  "&:disabled": { opacity: 0.5, cursor: "default" },
                }}
              >
                {preset.label}
              </Box>
            ))}
          </Stack>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              px: 2,
              pt: 0.5,
              pb: 1.5,
            }}
          >
            <TextField
              inputRef={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={`Ask about this ${kind.toLowerCase()}…`}
              size="small"
              fullWidth
              multiline
              maxRows={4}
              slotProps={{ htmlInput: { "aria-label": "Your question" } }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "var(--ink)",
                  backgroundColor: "var(--surface)",
                },
              }}
            />
            <IconButton
              onClick={send}
              disabled={busy || input.trim().length === 0}
              aria-label="Send question"
              sx={{
                flex: "0 0 auto",
                backgroundColor: "var(--btn-bg)",
                color: "var(--btn-ink)",
                "&:hover": { backgroundColor: "var(--btn-bg-hover)" },
                "&.Mui-disabled": { backgroundColor: "var(--surface-2)", color: "var(--ink-muted)" },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      )}

      <Fab
        ref={fabRef}
        onClick={toggle}
        aria-label={signedIn ? LABEL : "Sign in to use the assistant"}
        aria-haspopup="dialog"
        aria-expanded={open}
        sx={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 1300,
          backgroundColor: "var(--btn-bg)",
          color: "var(--btn-ink)",
          "&:hover": { backgroundColor: "var(--btn-bg-hover)" },
        }}
      >
        <SparkIcon />
      </Fab>
    </Portal>
  );
}
