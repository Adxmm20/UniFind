"use client";

import { Box, FormControl, IconButton, MenuItem, Select, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import ItemCard, { type CardData } from "../ItemCard";
import ItemRow from "../ItemRow";

export type BookmarkCard = CardData & {
  /** When it was saved, for the "Recently bookmarked" sort. */
  bookmarkedAt: string;
  /** Tiebreaker: timestamps only resolve to the second. */
  bookmarkId: number;
  /** Events only. */
  startTime?: string;
  /** Rentals only. */
  price?: number;
};

type Filter = "all" | "events" | "rentals";
type SortKey = "recent" | "title" | "date" | "priceAsc" | "priceDesc";
type View = "grid" | "list";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "events", label: "Events" },
  { value: "rentals", label: "Rentals" },
];

// Sort keys follow the filter, because the two record types sort on different
// columns — only an event has a start time, only a rental has a price. "All"
// therefore offers just the keys both types share.
const SORTS: Record<Filter, { value: SortKey; label: string }[]> = {
  all: [
    { value: "recent", label: "Recently bookmarked" },
    { value: "title", label: "Title A–Z" },
  ],
  events: [
    { value: "recent", label: "Recently bookmarked" },
    { value: "date", label: "Event date" },
    { value: "title", label: "Title A–Z" },
  ],
  rentals: [
    { value: "recent", label: "Recently bookmarked" },
    { value: "priceAsc", label: "Price: low to high" },
    { value: "priceDesc", label: "Price: high to low" },
    { value: "title", label: "Title A–Z" },
  ],
};

const pillSx = {
  borderRadius: 999,
  minWidth: 180,
  backgroundColor: "rgba(255, 255, 255, 0.92)",
  color: "#081C15",
  "& .MuiSelect-select": { py: 1, fontSize: "0.9rem", fontWeight: 600 },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--on-bg-line)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#2D6A4F" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#2D6A4F" },
} as const;

const toggleSx = {
  width: 40,
  height: 40,
  backgroundColor: "rgba(255, 255, 255, 0.92)",
  border: "1px solid",
  borderColor: "var(--on-bg-line)",
  color: "#081C15",
  "&:hover": { backgroundColor: "#FFFFFF", borderColor: "#2D6A4F" },
} as const;

// Plain < / > rather than localeCompare: these order ISO-ish date strings where
// only the digits differ, so the result is identical in Node and the browser
// and the first client render matches the server markup.
function desc(a: string, b: string): number {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

function compare(a: BookmarkCard, b: BookmarkCard, sort: SortKey): number {
  switch (sort) {
    case "title":
      return a.title.localeCompare(b.title);
    case "date":
      return (a.startTime ?? "") < (b.startTime ?? "")
        ? -1
        : (a.startTime ?? "") > (b.startTime ?? "")
          ? 1
          : 0;
    case "priceAsc":
      return (a.price ?? 0) - (b.price ?? 0);
    case "priceDesc":
      return (b.price ?? 0) - (a.price ?? 0);
    default:
      // Same pair the query orders by, so merging events and rentals keeps one
      // consistent newest-first sequence instead of re-sorting ties by id.
      return desc(a.bookmarkedAt, b.bookmarkedAt) || b.bookmarkId - a.bookmarkId;
  }
}

function GridGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={19}
      height={19}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={19}
      height={19}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "var(--on-bg-line)",
        borderRadius: 2,
        py: 8,
        px: 3,
        textAlign: "center",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--on-bg)", mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "var(--on-bg-muted)" }}>
        {body}
      </Typography>
    </Box>
  );
}

// Filter, sort and view are plain React state rather than URL parameters: all
// three are computed client-side over data that is already loaded, so there is
// no round trip and no need for the <Suspense> boundary HomeTabsUrl requires.
export default function BookmarksView({
  events,
  rentals,
}: {
  events: BookmarkCard[];
  rentals: BookmarkCard[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<View>("grid");

  function changeFilter(next: Filter) {
    setFilter(next);
    // Keep the sort valid for the new filter — "Price" is meaningless on
    // events. Done in the handler rather than an effect, which lint forbids.
    if (!SORTS[next].some((option) => option.value === sort)) setSort("recent");
  }

  const cards = useMemo(() => {
    const source =
      filter === "rentals"
        ? rentals
        : filter === "events"
          ? events
          : [...events, ...rentals];
    return [...source].sort((a, b) => compare(a, b, sort));
  }, [filter, sort, events, rentals]);

  const listView = view === "list";
  const total = events.length + rentals.length;

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
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 700, color: "var(--on-bg)", mb: 0.5 }}
      >
        Bookmarks
      </Typography>
      <Typography variant="body2" sx={{ color: "var(--on-bg-muted)", mb: 3 }}>
        {total === 1 ? "1 saved item" : `${total} saved items`}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1.5,
          mb: 3,
        }}
      >
        <FormControl size="small">
          <Select
            value={filter}
            onChange={(event) => changeFilter(event.target.value as Filter)}
            inputProps={{ "aria-label": "Filter bookmarks" }}
            sx={pillSx}
          >
            {FILTERS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ ml: "auto" }}>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            inputProps={{ "aria-label": "Sort bookmarks" }}
            sx={pillSx}
          >
            {SORTS[filter].map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* A toggle, not a pair of buttons: the name stays "List view" and the
            pressed state carries whether the list layout is on. */}
        <IconButton
          onClick={() => setView(listView ? "grid" : "list")}
          aria-pressed={listView}
          aria-label="List view"
          title={listView ? "Show as grid" : "Show as list"}
          sx={toggleSx}
        >
          {listView ? <ListGlyph /> : <GridGlyph />}
        </IconButton>
      </Box>

      {total === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          body="Use the bookmark icon on any event or rental card to save it here."
        />
      ) : cards.length === 0 ? (
        <EmptyState
          title="Nothing here"
          body="No saved items match the current filter."
        />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: listView
              ? "1fr"
              : { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: listView ? 1.5 : { xs: 2, md: 3 },
          }}
        >
          {cards.map((card) =>
            listView ? (
              <ItemRow key={card.id} {...card} />
            ) : (
              <ItemCard key={card.id} {...card} />
            ),
          )}
        </Box>
      )}
    </Box>
  );
}
