"use client";

import { Box } from "@mui/material";
import type { CardData } from "../ItemCard";
import ProfileSidebar, { type ProfileUser } from "./ProfileSidebar";
import ProfileTabs from "./ProfileTabs";

export default function ProfilePage({
  user,
  events,
  listings,
  reviews,
}: {
  user: ProfileUser;
  events: CardData[];
  listings: CardData[];
  reviews: CardData[];
}) {
  return (
    <Box
      component="main"
      id="content"
      tabIndex={-1}
      sx={{
        width: "100%",
        maxWidth: 1280,
        mx: "auto",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "296px minmax(0, 1fr)" },
        gap: { xs: 3, md: 4 },
        alignItems: "start",
      }}
    >
      <ProfileSidebar
        user={user}
        counts={{
          events: events.length,
          listings: listings.length,
          reviews: reviews.length,
        }}
      />
      <ProfileTabs events={events} listings={listings} reviews={reviews} />
    </Box>
  );
}
