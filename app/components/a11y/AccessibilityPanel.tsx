"use client";

import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import {
  FILTER_PREFS,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  THEME_PREFS,
  isDefaultPrefs,
  stepTextSize,
  type FilterPref,
  type TextSizePref,
  type ThemePref,
} from "@/lib/prefs";
import AppIcon from "../icons/AppIcon";
import { usePrefs } from "./prefsContext";

// The option labels are spelled out rather than abbreviated: this is a panel
// somebody uses once and then forgets about, so clarity beats compactness. The
// values stay the tokens lib/prefs.ts validates.
const FILTER_LABELS: Record<FilterPref, string> = {
  off: "None",
  protanopia: "Protanopia",
  deuteranopia: "Deuteranopia",
  tritanopia: "Tritanopia",
  greyscale: "Greyscale",
};

const THEME_LABELS: Record<ThemePref, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

// The stepper has no options to list, so the only label it needs is its position
// on the scale: a word at rest, otherwise the step itself.
function textSizeLabel(step: TextSizePref): string {
  return step === 0 ? "Normal" : `${step > 0 ? "+" : ""}${step}`;
}

// One line per setting: the label on the left, the control on the right, at a
// size that still gives a comfortable touch target in a 240px drawer.
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 40,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--ink)" }}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

const selectSx = {
  minWidth: 116,
  fontSize: "0.85rem",
  "& .MuiSelect-select": { fontSize: "0.85rem", py: 0.75 },
} as const;

// The stepper buttons stand where a Select used to. Token colours rather than
// MUI's own `action.disabled`, which is a JS-side palette value and would be a
// frame behind a *System* visitor on a dark OS.
const stepperSx = {
  p: 0.75,
  color: "var(--ink)",
  "&.Mui-disabled": { color: "var(--ink-muted)" },
} as const;

export default function AccessibilityPanel() {
  const { prefs, setPref, resetPrefs, reducedMotion } = usePrefs();

  return (
    <Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
        <AppIcon name="accessibility" size={18} sx={{ color: "var(--ink-muted)" }} />
        <Typography
          variant="overline"
          sx={{ color: "var(--ink-muted)", fontWeight: 700, lineHeight: 1.6 }}
        >
          Accessibility
        </Typography>
      </Stack>

      <Stack spacing={0.25}>
        <Row label="Theme">
          <Select
            aria-label="Theme"
            variant="standard"
            value={prefs.theme}
            onChange={(event) => setPref("theme", event.target.value as ThemePref)}
            sx={selectSx}
          >
            {THEME_PREFS.map((value) => (
              <MenuItem key={value} value={value}>
                {THEME_LABELS[value]}
              </MenuItem>
            ))}
          </Select>
        </Row>

        <Row label="Colour filter">
          <Select
            aria-label="Colour filter"
            variant="standard"
            value={prefs.filter}
            onChange={(event) => setPref("filter", event.target.value as FilterPref)}
            sx={selectSx}
          >
            {FILTER_PREFS.map((value) => (
              <MenuItem key={value} value={value}>
                {FILTER_LABELS[value]}
              </MenuItem>
            ))}
          </Select>
        </Row>

        <Row label="Text size">
          {/* Buttons rather than a list: five steps either way is a scale you
              walk, and the ends disable themselves so the range is visible. */}
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <IconButton
              size="small"
              aria-label="Decrease text size"
              onClick={() => setPref("textSize", stepTextSize(prefs.textSize, -1))}
              disabled={prefs.textSize <= TEXT_SIZE_MIN}
              sx={stepperSx}
            >
              <AppIcon name="remove" size={18} />
            </IconButton>

            {/* A live region, so a screen reader announces the new size instead
                of leaving the press silent. */}
            <Typography
              variant="body2"
              aria-live="polite"
              sx={{
                minWidth: 40,
                textAlign: "center",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {textSizeLabel(prefs.textSize)}
            </Typography>

            <IconButton
              size="small"
              aria-label="Increase text size"
              onClick={() => setPref("textSize", stepTextSize(prefs.textSize, 1))}
              disabled={prefs.textSize >= TEXT_SIZE_MAX}
              sx={stepperSx}
            >
              <AppIcon name="add" size={18} />
            </IconButton>
          </Stack>
        </Row>

        <Row label="Reduce motion">
          <Switch
            size="small"
            checked={reducedMotion}
            onChange={(event) => setPref("motion", event.target.checked ? "reduced" : "full")}
            slotProps={{ input: { "aria-label": "Reduce motion" } }}
          />
        </Row>

        <Row label="High contrast">
          <Switch
            size="small"
            checked={prefs.contrast === "high"}
            onChange={(event) => setPref("contrast", event.target.checked ? "high" : "normal")}
            slotProps={{ input: { "aria-label": "High contrast" } }}
          />
        </Row>

        <Row label="Read aloud">
          <Switch
            size="small"
            checked={prefs.speech}
            onChange={(event) => setPref("speech", event.target.checked)}
            slotProps={{ input: { "aria-label": "Read aloud on hover" } }}
          />
        </Row>

        <Row label="Text spacing">
          <Switch
            size="small"
            checked={prefs.spacing === "wide"}
            onChange={(event) =>
              setPref("spacing", event.target.checked ? "wide" : "normal")
            }
            slotProps={{ input: { "aria-label": "Wide text spacing" } }}
          />
        </Row>
      </Stack>

      <Button
        size="small"
        onClick={resetPrefs}
        disabled={isDefaultPrefs(prefs)}
        sx={{
          mt: 1,
          ml: -1,
          textTransform: "none",
          fontWeight: 600,
          color: "var(--accent)",
          "&.Mui-disabled": { color: "var(--ink-muted)" },
        }}
      >
        Reset settings
      </Button>

      <Typography
        variant="caption"
        sx={{ display: "block", color: "var(--ink-muted)" }}
      >
        Alt + A opens this panel.
      </Typography>
    </Box>
  );
}
