// The accessibility preferences, in one server-safe module. `app/layout.tsx`
// reads them from a cookie and writes them onto <html> as data-* attributes, so
// the very first paint is already themed — no flash, no hydration mismatch —
// and the client provider only keeps the DOM and the cookie in step afterwards.
//
// The cookie is user input, so every field is validated against its allowed
// values before it can reach the DOM; an unknown or malformed value falls back
// to that field's default rather than being written through.

export const PREFS_COOKIE = "unifind_prefs";

export const THEME_PREFS = ["system", "light", "dark"] as const;
export const FILTER_PREFS = [
  "off",
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "greyscale",
] as const;
export const TEXT_SIZE_MIN = -5;
export const TEXT_SIZE_MAX = 5;
export const MOTION_PREFS = ["system", "reduced", "full"] as const;
export const CONTRAST_PREFS = ["normal", "high"] as const;
export const SPACING_PREFS = ["normal", "wide"] as const;

export type ThemePref = (typeof THEME_PREFS)[number];
export type FilterPref = (typeof FILTER_PREFS)[number];
/**
 * Text size is a *step*, not a named size: an integer in
 * [TEXT_SIZE_MIN, TEXT_SIZE_MAX] where 0 is normal, so the panel can be a
 * stepper. What each step multiplies the root font size by lives in
 * globals.css (one rule per step, keyed off `data-text`).
 */
export type TextSizePref = number;
export type MotionPref = (typeof MOTION_PREFS)[number];
export type ContrastPref = (typeof CONTRAST_PREFS)[number];
export type SpacingPref = (typeof SPACING_PREFS)[number];

export type Prefs = {
  theme: ThemePref;
  filter: FilterPref;
  textSize: TextSizePref;
  motion: MotionPref;
  contrast: ContrastPref;
  spacing: SpacingPref;
  /** Read aloud on hover — state only, it has no CSS attribute. */
  speech: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  filter: "off",
  textSize: 0,
  motion: "system",
  contrast: "normal",
  spacing: "normal",
  speech: false,
};

// The scale that predates the stepper. An already-set cookie is worth keeping —
// it lands on the nearest step rather than being silently reset — so the three
// old names stay readable here.
const LEGACY_TEXT_SIZE: Partial<Record<string, TextSizePref>> = {
  normal: 0,
  large: 1,
  larger: 2,
};

function clampStep(step: number): TextSizePref {
  if (!Number.isFinite(step)) return DEFAULT_PREFS.textSize;
  return Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, Math.round(step)));
}

// `1e9`, `"huge"`, `true` and `"2; DROP TABLE"` are all just as unwelcome as an
// unknown theme name: a step that is not a step becomes the default.
function textSizeOf(value: unknown): TextSizePref {
  if (typeof value === "number") return clampStep(value);
  if (typeof value === "string") {
    const legacy = LEGACY_TEXT_SIZE[value];
    if (legacy !== undefined) return legacy;
    if (/^-?\d+$/.test(value.trim())) return clampStep(Number(value));
  }
  return DEFAULT_PREFS.textSize;
}

/** One press of the panel's stepper: clamped, so the ends are the ends. */
export function stepTextSize(current: TextSizePref, delta: number): TextSizePref {
  return clampStep(current + delta);
}

function pick<T extends string>(
  allowed: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parsePrefs(raw: string | undefined): Prefs {
  if (!raw) return DEFAULT_PREFS;

  let data: unknown;
  try {
    data = JSON.parse(decodeURIComponent(raw));
  } catch {
    return DEFAULT_PREFS;
  }
  if (typeof data !== "object" || data === null) return DEFAULT_PREFS;

  const value = data as Record<string, unknown>;
  return {
    theme: pick(THEME_PREFS, value.theme, DEFAULT_PREFS.theme),
    filter: pick(FILTER_PREFS, value.filter, DEFAULT_PREFS.filter),
    textSize: textSizeOf(value.textSize),
    motion: pick(MOTION_PREFS, value.motion, DEFAULT_PREFS.motion),
    contrast: pick(CONTRAST_PREFS, value.contrast, DEFAULT_PREFS.contrast),
    spacing: pick(SPACING_PREFS, value.spacing, DEFAULT_PREFS.spacing),
    speech: value.speech === true,
  };
}

/**
 * The attributes every theme/accessibility rule in globals.css keys off. One
 * place, so a preference can never be half-wired.
 */
export function prefsAttributes(prefs: Prefs) {
  return {
    "data-theme": prefs.theme,
    "data-filter": prefs.filter,
    "data-text": String(prefs.textSize),
    "data-motion": prefs.motion,
    "data-contrast": prefs.contrast,
    "data-spacing": prefs.spacing,
  };
}

export function isDefaultPrefs(prefs: Prefs): boolean {
  return (Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]).every(
    (key) => prefs[key] === DEFAULT_PREFS[key],
  );
}

/**
 * Client-only: the cookie the browser sends back on the next request, which is
 * how the server-rendered <html> learns the preferences. A year is long enough
 * that the setting is simply "remembered".
 */
export function writePrefsCookie(prefs: Prefs) {
  const value = encodeURIComponent(JSON.stringify(prefs));
  document.cookie = `${PREFS_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
