// MUI v9's AccordionSummary ships no default expand icon — there is no
// @mui/icons-material in this app and the public/img/icon set has no chevron —
// so both chevrons are drawn inline, the same way BookmarkButton draws its
// glyph. Material Symbols' own `expand_more` / `chevron_right` paths.
//
// `fill="currentColor"` lets the surrounding text colour drive them, and the
// summary rotates its expand-icon wrapper itself when the panel opens.

export function ChevronDown({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />
    </svg>
  );
}

export function ChevronRight({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}
