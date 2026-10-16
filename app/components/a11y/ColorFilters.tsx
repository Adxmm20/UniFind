// The <filter> definitions the colour-filter preference points at
// (`:root[data-filter="…"] .page-shell { filter: url(#unifind-cvd-…) }` in
// globals.css — the shell, never <html>; see the note there).
//
// One hidden SVG at the root of the app, so the ids exist wherever the
// preference is switched on. The matrices are the standard
// colour-vision-deficiency ones applied in sRGB, which is what makes them
// meaningful: they are defined on gamma-encoded values, not on linear light.
//
// They stay mounted — a filter referenced by `url()` has to exist in the
// document, and re-rendering 60 bytes of geometry on every preference change
// would only add a frame of unfiltered paint.
const MATRICES = {
  protanopia:
    "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  deuteranopia:
    "0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0",
  tritanopia:
    "0.950 0.050 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
  greyscale:
    "0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0",
} as const;

export default function ColorFilters() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", overflow: "hidden" }}
    >
      <defs>
        {Object.entries(MATRICES).map(([name, values]) => (
          <filter
            key={name}
            id={`unifind-cvd-${name}`}
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix type="matrix" values={values} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
