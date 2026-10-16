// The site's text-field look in one place: a standard (underline) input with a
// small, wide-tracked uppercase label, in the current theme's colours. Shared by
// the login dialog and the /post form so the two cannot drift.
export const fieldSx = {
  "& .MuiInputLabel-root": {
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "var(--accent)" },
  "& .MuiInput-underline:before": { borderBottomColor: "var(--ink-hairline)" },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottomColor: "var(--accent)",
  },
  "& .MuiInput-underline:after": { borderBottomColor: "var(--accent)" },
  "& .MuiInputBase-input": { fontSize: "0.95rem", py: 1 },
  "& .MuiFormHelperText-root": { fontSize: "0.7rem", mt: 0.75 },
} as const;

// The site's pill select in one place: a rounded control that sits on the
// wallpaper (so it borrows the raised surface's ink rather than the on-bg
// foregrounds), shared by the bookmarks toolbar and the home filter/sort bar so
// the two cannot drift.
export const pillSelectSx = {
  borderRadius: 999,
  minWidth: 180,
  backgroundColor: "var(--surface)",
  color: "var(--ink)",
  "& .MuiSelect-select": { py: 1, fontSize: "0.9rem", fontWeight: 600 },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--on-bg-line)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--accent)" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "var(--accent)" },
} as const;
