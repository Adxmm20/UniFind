"use client";

import { Avatar, Button, Stack, Typography } from "@mui/material";
import AppIcon from "../icons/AppIcon";

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
          backgroundColor: "var(--btn-bg)",
        }}
      >
        ?
      </Avatar>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--ink)" }}>
        Browsing as guest
      </Typography>

      <Typography
        variant="caption"
        sx={{ color: "var(--ink-muted)", textAlign: "center", mb: 1.5 }}
      >
        Log in to bookmark events and rentals.
      </Typography>

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          onClick={onLogin}
          startIcon={<AppIcon name="login" size={18} />}
          sx={{
            textTransform: "none",
            backgroundColor: "var(--btn-bg)",
            color: "var(--btn-ink)",
            "&:hover": { backgroundColor: "var(--btn-bg-hover)" },
          }}
        >
          Log in
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={onSignup}
          startIcon={<AppIcon name="addProfile" size={18} />}
          sx={{
            textTransform: "none",
            borderColor: "var(--ink)",
            color: "var(--ink)",
          }}
        >
          Sign up
        </Button>
      </Stack>
    </Stack>
  );
}
