"use client";

import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import ItemCard, { type CardData } from "../ItemCard";

const TABS = ["Overview", "Events", "Listings", "Reviews"];

function EmptyPanel({ label }: { label: string }) {
  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "var(--on-bg-line)",
        borderRadius: 2,
        py: 6,
        textAlign: "center",
        color: "var(--on-bg-muted)",
      }}
    >
      <Typography variant="body2">No {label} yet.</Typography>
    </Box>
  );
}

function CardGrid({ items, emptyLabel }: { items: CardData[]; emptyLabel: string }) {
  if (items.length === 0) return <EmptyPanel label={emptyLabel} />;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
      }}
    >
      {items.map((card) => (
        <ItemCard
          key={card.id}
          {...card}
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 40vw, 260px"
        />
      ))}
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "var(--on-bg-line)",
        borderRadius: 2,
        p: 2,
        textAlign: "center",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--on-bg)" }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: "var(--on-bg-muted)" }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function ProfileTabs({
  events,
  listings,
  reviews,
}: {
  events: CardData[];
  listings: CardData[];
  reviews: CardData[];
}) {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: "var(--on-bg-line)",
          mb: 3,
          "& .MuiTabs-indicator": { backgroundColor: "var(--on-bg)" },
        }}
      >
        {TABS.map((label) => (
          <Tab
            key={label}
            label={label}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "var(--on-bg-muted)",
              "&.Mui-selected": { color: "var(--on-bg)" },
            }}
          />
        ))}
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
            }}
          >
            <Stat label="Events" value={events.length} />
            <Stat label="Listings" value={listings.length} />
            <Stat label="Reviews" value={reviews.length} />
          </Box>

          {events.length > 0 ? (
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, mb: 2, color: "var(--on-bg)" }}
              >
                Latest events
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                {events.slice(0, 2).map((card) => (
                  <ItemCard
                    key={card.id}
                    {...card}
                    sizes="(max-width: 600px) 100vw, 40vw"
                  />
                ))}
              </Box>
            </Box>
          ) : null}
        </Box>
      )}
      {tab === 1 && <CardGrid items={events} emptyLabel="events" />}
      {tab === 2 && <CardGrid items={listings} emptyLabel="listings" />}
      {tab === 3 && <CardGrid items={reviews} emptyLabel="reviews" />}
    </Box>
  );
}
