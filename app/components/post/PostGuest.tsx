"use client";

import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import LoginDialog, { type AuthTab } from "../auth/LoginDialog";
import AppIcon from "../icons/AppIcon";

// Shown when a guest opens /post directly. The drawer's Post row opens the
// login prompt for them, so this is the overt dead end made friendly — the same
// shape as BookmarksGuest.
export default function PostGuest() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>("login");

  return (
    <>
      <Box
        component="main"
        id="content"
        tabIndex={-1}
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
          Post
        </Typography>
        <Typography variant="body1" sx={{ color: "var(--on-bg-muted)", mb: 3 }}>
          Sign in to post an event, a rental or a service. It appears on your
          profile and in the home tabs straight away.
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setTab("login");
            setOpen(true);
          }}
          startIcon={<AppIcon name="login" size={18} />}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            // The filled button's own colours, from the tokens: MUI derives its
            // label colour from the palette's primary, which is not what this
            // button is filled with.
            backgroundColor: "var(--btn-bg)",
            color: "var(--btn-ink)",
            "&:hover": { backgroundColor: "var(--btn-bg-hover)" },
          }}
        >
          Log in
        </Button>
      </Box>

      {/* Its own dialog instance — the one inside Header owns the drawer flow
          and cannot be reached from a page (see BookmarksGuest). */}
      <LoginDialog
        open={open}
        tab={tab}
        onTabChange={setTab}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
