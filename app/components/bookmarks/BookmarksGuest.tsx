"use client";

import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import LoginDialog, { type AuthTab } from "../auth/LoginDialog";

// Shown when a guest opens /bookmarks directly. The drawer's Bookmark item
// still just opens the prompt (guests never navigate here by clicking), so
// this is the overt dead end made friendly.
export default function BookmarksGuest() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>("login");

  return (
    <>
      <Box
        component="section"
        sx={{
          width: "100%",
          maxWidth: 560,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 8, md: 12 },
          textAlign: "center",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, color: "var(--on-bg)", mb: 1 }}
        >
          Bookmarks
        </Typography>
        <Typography variant="body1" sx={{ color: "var(--on-bg-muted)", mb: 3 }}>
          Sign in to keep the events and rentals you save. Bookmarks stay with
          your account.
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setTab("login");
            setOpen(true);
          }}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            // Pinned rather than inherited: this component renders outside
            // Header's ThemeProvider, so an unstyled contained button would
            // fall back to MUI's default blue.
            backgroundColor: "#081C15",
            color: "#FFFFFF",
            "&:hover": { backgroundColor: "#1B4332" },
          }}
        >
          Log in
        </Button>
      </Box>

      {/* Its own dialog instance. The one inside Header owns the drawer flow and
          cannot be reached from a page without hoisting it into a provider
          between the layout and the pages — which AGENTS.md warns against
          (passing client state across that boundary breaks prerendering). */}
      <LoginDialog
        open={open}
        tab={tab}
        onTabChange={setTab}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
