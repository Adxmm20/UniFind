"use client";

import { Avatar, Button, Stack, Typography } from "@mui/material";

// Drawer summary shown while nobody is signed in. Guests browse the site
// exactly as before; the buttons just open the login prompt.
export default function GuestPanel({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <Stack sx={{ alignItems: "center", gap: 0.5, px: 2, py: 2.5 }}>
      <Avatar
        aria-hidden
        sx={{
          width: 48,
          height: 48,
          mb: 1,
          fontWeight: 600,
          backgroundColor: "#081C15",
        }}
      >
        ?
      </Avatar>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#081C15" }}>
        Browsing as guest
      </Typography>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 1.5 }}
      >
        Log in to bookmark events and rentals.
      </Typography>

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          onClick={onLogin}
          sx={{
            textTransform: "none",
            backgroundColor: "#081C15",
            "&:hover": { backgroundColor: "#1B4332" },
          }}
        >
          Log in
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={onSignup}
          sx={{ textTransform: "none", borderColor: "#081C15", color: "#081C15" }}
        >
          Sign up
        </Button>
      </Stack>
    </Stack>
  );
}
