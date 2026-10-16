"use client";

import { Avatar, List, ListItem, ListItemButton, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

// Drawer summary for a signed-in user. Shows the account they signed in with,
// not the profile currently being viewed.
export default function MiniProfile({ user }: { user: SessionUser }) {
  const initial = user.username.charAt(0).toUpperCase();

  return (
    <List>
      <ListItem disablePadding>
        <ListItemButton
          component={Link}
          href={`/${user.username}`}
          sx={{ alignItems: "center", gap: 1.5, px: 2, py: 1.5 }}
        >
          <Avatar
            alt={user.username}
            sx={{ width: 48, height: 48, fontWeight: 600, backgroundColor: "#081C15" }}
          >
            {initial}
          </Avatar>

          <Stack sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "#081C15" }}
              noWrap
            >
              @{user.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.email}
            </Typography>
            {user.phone ? (
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.phone}
              </Typography>
            ) : null}
          </Stack>
        </ListItemButton>
      </ListItem>
    </List>
  );
}
