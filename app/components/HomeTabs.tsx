"use client";

import { Box, FormControl, InputAdornment, MenuItem, Select, Tab, Tabs } from "@mui/material";
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

// What the filter's "everything" row carries. It cannot collide with a real
// category: those are catalogue values, never "all".
const ALL = "all";

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

type Facet = { category: string; sort: SortKey };

const DEFAULT_FACETS: Record<HomeTab, Facet> = {
  events: { category: ALL, sort: "default" },
  rentals: { category: ALL, sort: "default" },
  services: { category: ALL, sort: "default" },
};

// Plain code-unit comparison rather than localeCompare: the category list is
// built during the very first render, and Node and the browser do not always
// collate the same way, so a locale-aware order could differ between the server
// markup and the hydrated client.
function byText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
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

  // The filter offers exactly the categories this tab's own cards carry, so it
  // cannot drift from the catalogue and every option matches at least one card.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const card of list) if (card.category) seen.add(card.category);
    return [...seen].sort(byText);
  }, [list]);

  const cards = useMemo(() => {
    const matching = list.filter(
      (card) => facet.category === ALL || card.category === facet.category,
    );
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
          {/* A one-category tab (or an empty one) has nothing to filter, so the
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
