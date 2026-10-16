import { Box, type SxProps, type Theme } from "@mui/material";

// The site's icon set lives in `public/img/icon/` as Material Symbols SVGs, one
// per surface, named after where it belongs (`menu`, `search`, `bookmark`, the
// `…Profile` family for the drawer's account panel, `addProfile` for sign-up,
// `postAdd` for the drawer's Post row, `pictureAdd` for the /post form's
// picture affordance, `add`/`remove` for the accessibility panel's text-size
// stepper, `accessibility` for the panel itself, `filter`/`sort` for the home
// grid's two pills — Material's `filter_alt` funnel and `swap_vert` arrows,
// which stay distinguishable where Material's own `sort` glyph, three stacked
// bars, could be read as a filter list).
//
// They are painted with `mask-image` rather than loaded through `<img>`. An
// `<img>`-embedded SVG is its own document: its `fill` cannot see the page, so
// the artwork would be stuck at one baked-in colour and `currentColor` would
// resolve to the SVG's own default (black) rather than inheriting. A mask takes
// only the artwork's alpha channel and lets `backgroundColor` supply the colour,
// so one file themes itself from the surrounding text — drawer rows, the app
// bar, a contained button's white label, a muted or disabled state — with no
// per-context copies.
//
// That is also why the files' `fill="#D9D9D9"` / `fill="#e3e3e3"` placeholder
// colours are deliberately left alone: a mask reads shape, never colour. They
// must stay fully opaque, so do not "fix" them to `currentColor` either.
export type IconName =
  | "menu"
  | "search"
  | "homeProfile"
  | "personProfile"
  | "bookmark"
  | "login"
  | "logoutProfile"
  | "addProfile"
  | "infoProfile"
  | "postAdd"
  | "pictureAdd"
  | "add"
  | "remove"
  | "accessibility"
  | "filter"
  | "sort";

export default function AppIcon({
  name,
  size = 20,
  sx,
}: {
  name: IconName;
  /** Square, in px. The artwork is on Material's 24px grid, so 20–24 stays sharp. */
  size?: number;
  sx?: SxProps<Theme>;
}) {
  const mask = `url(/img/icon/${name}.svg)`;

  return (
    <Box
      // Every current use sits beside its own label (a drawer row, a button, the
      // search field's aria-label), so the icon itself is decorative.
      aria-hidden
      sx={[
        {
          display: "inline-block",
          flex: "0 0 auto",
          width: size,
          height: size,
          verticalAlign: "middle",
          backgroundColor: "currentColor",
          maskImage: mask,
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "contain",
          WebkitMaskImage: mask,
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          WebkitMaskSize: "contain",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}
