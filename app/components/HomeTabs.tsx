"use client";

import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Select,
  Tab,
  Tabs,
} from "@mui/material";
import { useMemo, useState } from "react";
import { pillSelectSx } from "./formStyles";
import AppIcon, { type IconName } from "./icons/AppIcon";
import ItemCard, { type CardData } from "./ItemCard";

export type HomeTab = "events" | "rentals" | "services";

// Tab order, and the names both the pills and the controls' accessible names
// are built from, so a label is written once.
export const HOME_TABS: HomeTab[] = ["events", "rentals", "services"];

const TAB_LABELS: Record<HomeTab, string> = {
  events: "Events",
  rentals: "Rentals",
  services: "Services",
};

// What the filters' "everything" rows carry. It cannot collide with a real
// category: those are catalogue values, never "all".
const ALL = "all";

const ALL_CAMPUSES = "All campuses";

type SortKey = "default" | "latest" | "title" | "priceAsc" | "priceDesc";

type SortOption = { value: SortKey; label: string };

// Rentals and services are both items and sort on the same columns, exactly as
// they share itemCards(). "default" keeps the query's own order (item_id) —
// which is what the server already rendered, so no card moves until a visitor
// picks something.
const ITEM_SORTS: SortOption[] = [
  { value: "default", label: "Default" },
  // The raw number, as BookmarksView sorts too — price units (per day, per
  // hour) are not convertible here.
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
];

// Sort keys follow the tab, because the two record kinds sort on different
// columns — only an event has a start time, only an item has a price.
// getEvents() is already ordered by start_time, so an event's no-op option is
// honestly labelled "Soonest".
const SORTS: Record<HomeTab, SortOption[]> = {
  events: [
    { value: "default", label: "Soonest" },
    { value: "latest", label: "Latest" },
    { value: "title", label: "Title A–Z" },
  ],
  rentals: ITEM_SORTS,
  services: ITEM_SORTS,
};

type Facet = {
  category: string;
  /** A campus label, not the record's own location string — see cardData.ts. */
  campus: string;
  /**
   * Events only — the tab's checkbox. Never set on the items tabs, which do not
   * render it, so the filter reads it unguarded.
   */
  starPoints: boolean;
  sort: SortKey;
};

const DEFAULT_FACETS: Record<HomeTab, Facet> = {
  events: { category: ALL, campus: ALL, starPoints: false, sort: "default" },
  rentals: { category: ALL, campus: ALL, starPoints: false, sort: "default" },
  services: { category: ALL, campus: ALL, starPoints: false, sort: "default" },
};

// Plain code-unit comparison rather than localeCompare: the facet lists are
// built during the very first render, and Node and the browser do not always
// collate the same way, so a locale-aware order could differ between the server
// markup and the hydrated client.
function byText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// The distinct values of one facet, straight off the tab's own cards — so a
// filter's options cannot drift from the catalogue and every option matches at
// least one card.
function optionsOf(cards: CardData[], value: (card: CardData) => string | undefined): string[] {
  const seen = new Set<string>();
  for (const card of cards) {
    const option = value(card);
    if (option) seen.add(option);
  }
  return [...seen].sort(byText);
}

// The glyph that says what a pill is for. MUI wraps `startAdornment` in an
// InputAdornment, which is what spaces it against the selected label and what
// keeps the label off the outline; the ink is set here because AppIcon paints
// through a mask with `currentColor`, and MUI's own adornment colour
// (`action.active`) is a palette grey rather than one of the site's tokens.
function pillIcon(name: IconName) {
  return (
    <InputAdornment position="start" sx={{ color: "var(--ink-muted)" }}>
      <AppIcon name={name} size={18} />
    </InputAdornment>
  );
}

function compare(a: CardData, b: CardData, sort: SortKey): number {
  switch (sort) {
    case "latest":
      return byText(b.startTime ?? "", a.startTime ?? "");
    case "title":
      // Free text, so this one does use localeCompare — safe precisely because
      // the default sorts never reach it: it cannot run before hydration.
      return a.title.localeCompare(b.title);
    case "priceAsc":
      return (a.price ?? 0) - (b.price ?? 0);
    case "priceDesc":
      return (b.price ?? 0) - (a.price ?? 0);
    default:
      // "Soonest" / "Default": the order the server sent.
      return 0;
  }
}

// Presentational tab bar, the filter/sort bar under it, and the card grid. Kept
// free of URL hooks so the Server Component can render it as the prerendered
// Suspense fallback.
export default function HomeTabs({
  events,
  rentals,
  services,
  activeTab,
  onTabChange,
}: {
  events: CardData[];
  rentals: CardData[];
  services: CardData[];
  activeTab: HomeTab;
  onTabChange?: (tab: HomeTab) => void;
}) {
  // A lookup rather than a ternary chain: every tab has a list, so an
  // unrecognised value can no longer silently fall back to Events.
  const lists: Record<HomeTab, CardData[]> = { events, rentals, services };

  // One facet per tab, remembered as you flick between them. Holding them
  // together is also why nothing ever has to be reset: a tab's sort options and
  // its category list belong to that tab, so a selection can never be invalid.
  const [facets, setFacets] = useState<Record<HomeTab, Facet>>(DEFAULT_FACETS);

  const list = lists[activeTab];
  const facet = facets[activeTab];

  // Both facets come off the cards this tab is showing (see optionsOf). The
  // star-points box only appears where it can actually narrow something: on the
  // Events tab, and only while at least one event carries a star. Deliberately
  // read from the whole tab list rather than the filtered subset, so the control
  // does not flicker away as the other two filters are used.
  const categories = useMemo(() => optionsOf(list, (card) => card.category), [list]);
  const campuses = useMemo(() => optionsOf(list, (card) => card.campus), [list]);
  const showStarPoints = activeTab === "events" && list.some((card) => card.starPoints);

  const cards = useMemo(() => {
    const matching = list.filter((card) => {
      if (facet.category !== ALL && card.category !== facet.category) return false;
      if (facet.campus !== ALL && card.campus !== facet.campus) return false;
      // `starPoints` is only ever set by the Events tab's checkbox, so this
      // needs no tab guard: on the items tabs it is false by construction.
      if (facet.starPoints && !card.starPoints) return false;
      return true;
    });
    // `filter` has already copied the array, so sorting it in place is safe.
    return facet.sort === "default"
      ? matching
      : matching.sort((a, b) => compare(a, b, facet.sort));
  }, [list, facet]);

  function setFacet(patch: Partial<Facet>) {
    setFacets((current) => ({
      ...current,
      [activeTab]: { ...current[activeTab], ...patch },
    }));
  }

  return (
    <Box
      component="section"
      sx={{
        width: "100%",
        maxWidth: 1400,
        mx: "auto",
        px: { xs: 2, sm: 3, md: 4 },
        pb: { xs: 4, md: 6 },
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, value: HomeTab) => onTabChange?.(value)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Browse content"
        sx={{
          borderBottom: 1,
          borderColor: "var(--on-bg-line)",
          mb: 2,
          // The strip is centred in the content column rather than pinned left.
          // Done through the list element because MUI refuses to combine the
          // `centered` prop with variant="scrollable" (it warns), and scrollable
          // is what keeps three tabs usable on a narrow phone. (The class is
          // MuiTabs-list in v9 — it was MuiTabs-flexContainer before.)
          "& .MuiTabs-list": { justifyContent: "center" },
          "& .MuiTabs-indicator": { backgroundColor: "var(--on-bg)", height: 3 },
        }}
      >
        {HOME_TABS.map((tab) => (
          <Tab
            key={tab}
            value={tab}
            label={TAB_LABELS[tab]}
            id={`tab-${tab}`}
            aria-controls={`panel-${tab}`}
            sx={{
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--on-bg-muted)",
              "&.Mui-selected": { color: "var(--on-bg)" },
            }}
          />
        ))}
      </Tabs>

      <Box role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {/* Inside the panel, because this is what the controls act on; both
            pills sit together at the right-hand end of the row, wrapping as a
            pair on a narrow screen. Plain state rather than URL parameters: all
            three lists are already here, so filtering and sorting cost no round
            trip and need no Suspense boundary (unlike the tab, which
            HomeTabsUrl keeps in the URL). */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1.5,
            mb: 3,
          }}
        >
          {/* Grouped categories (see categoryOf() in cardData.ts), so the
              options cannot read as near-duplicates of one another. A
              one-category tab (or an empty one) has nothing to filter, so the
              control stays away rather than offering a choice that is not one. */}
          {categories.length > 1 ? (
            <FormControl size="small">
              <Select
                value={facet.category}
                onChange={(event) => setFacet({ category: event.target.value })}
                inputProps={{ "aria-label": `Filter ${TAB_LABELS[activeTab]} by category` }}
                startAdornment={pillIcon("filter")}
                sx={pillSelectSx}
              >
                <MenuItem value={ALL}>{`All ${TAB_LABELS[activeTab]}`}</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {/* The location filter at campus level (see cardData.ts): the options
              are "IIUM Gombak" / "IIUM Kuantan" / "IIUM Pagoh" / "Others", so
              the labels stay short and this pill is styled exactly like the
              other two. Like the category pill it stays away when there is
              nothing to choose between. */}
          {campuses.length > 1 ? (
            <FormControl size="small">
              <Select
                value={facet.campus}
                onChange={(event) => setFacet({ campus: event.target.value })}
                inputProps={{ "aria-label": `Filter ${TAB_LABELS[activeTab]} by campus` }}
                startAdornment={pillIcon("location")}
                sx={pillSelectSx}
              >
                <MenuItem value={ALL}>{ALL_CAMPUSES}</MenuItem>
                {campuses.map((campus) => (
                  <MenuItem key={campus} value={campus}>
                    {campus}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {/* A plain MUI checkbox, coloured from the on-bg family: this row sits
              on the wallpaper, whose ink runs from near-black to near-white as
              the page scrolls, so a palette colour (the theme's primary, or
              --accent, which does not track the scroll) would vanish at one end
              or the other. */}
          {showStarPoints ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={facet.starPoints}
                  onChange={(event) => setFacet({ starPoints: event.target.checked })}
                  sx={{
                    color: "var(--on-bg-muted)",
                    "&.Mui-checked": { color: "var(--on-bg)" },
                  }}
                />
              }
              label="Eligible for STAR points"
              sx={{
                mr: 0,
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--on-bg)",
                },
              }}
            />
          ) : null}

          <FormControl size="small">
            <Select
              value={facet.sort}
              onChange={(event) => setFacet({ sort: event.target.value as SortKey })}
              inputProps={{ "aria-label": `Sort ${TAB_LABELS[activeTab]}` }}
              startAdornment={pillIcon("sort")}
              sx={pillSelectSx}
            >
              {SORTS[activeTab].map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: { xs: 2, md: 3 },
          }}
        >
          {cards.map((card) => (
            <ItemCard key={card.id} {...card} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
