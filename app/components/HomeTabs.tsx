"use client";

import { Box, Tab, Tabs } from "@mui/material";
import ItemCard, { type CardData } from "./ItemCard";

export type HomeTab = "events" | "rentals";

const TAB_DEFS: { value: HomeTab; label: string }[] = [
  { value: "events", label: "Events" },
  { value: "rentals", label: "Rentals" },
];

// Presentational tab bar + card grid. Kept free of URL hooks so the Server
// Component can render it as the prerendered Suspense fallback.
export default function HomeTabs({
  events,
  rentals,
  activeTab,
  onTabChange,
}: {
  events: CardData[];
  rentals: CardData[];
  activeTab: HomeTab;
  onTabChange?: (tab: HomeTab) => void;
}) {
  const items = activeTab === "rentals" ? rentals : events;

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
          mb: 3,
          // The strip is centred in the content column rather than pinned left.
          // Done through the list element because MUI refuses to combine the
          // `centered` prop with variant="scrollable" (it warns), and scrollable
          // is what keeps three tabs usable on a narrow phone. (The class is
          // MuiTabs-list in v9 — it was MuiTabs-flexContainer before.)
          "& .MuiTabs-list": { justifyContent: "center" },
          "& .MuiTabs-indicator": { backgroundColor: "var(--on-bg)", height: 3 },
        }}
      >
        {TAB_DEFS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            id={`tab-${tab.value}`}
            aria-controls={`panel-${tab.value}`}
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

      <Box
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
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
        {items.map((card) => (
          <ItemCard key={card.id} {...card} />
        ))}
      </Box>
    </Box>
  );
}
