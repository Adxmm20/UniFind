import { Avatar, Box, Divider, Link, Stack, Typography } from "@mui/material";

export type ProfileUser = {
  username: string;
  email: string;
  phone: string | null;
  joined: string;
};

// Everything here sits directly on the wallpaper, so it uses the scroll-driven
// --on-bg* variables (see ScrollWallpaper.tsx) instead of fixed colours.
export default function ProfileSidebar({
  user,
  counts,
}: {
  user: ProfileUser;
  counts: { events: number; listings: number; reviews: number };
}) {
  return (
    <Box component="aside" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Avatar
        alt={user.username}
        sx={{
          width: { xs: 160, md: 200 },
          height: { xs: 160, md: 200 },
          mx: { xs: "auto", md: 0 },
          fontSize: 72,
          fontWeight: 600,
          backgroundColor: "#081C15",
        }}
      >
        {user.username.charAt(0).toUpperCase()}
      </Avatar>

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--on-bg)" }}>
          {user.username}
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ wordBreak: "break-all", color: "var(--on-bg-muted)" }}
        >
          {user.email}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ color: "var(--on-bg-muted)" }}>
        <Typography variant="body2" component="span">
          <Box component="strong" sx={{ color: "var(--on-bg)" }}>
            {counts.events}
          </Box>{" "}
          events
        </Typography>
        <Typography variant="body2" component="span">
          ·
        </Typography>
        <Typography variant="body2" component="span">
          <Box component="strong" sx={{ color: "var(--on-bg)" }}>
            {counts.listings}
          </Box>{" "}
          listings
        </Typography>
        <Typography variant="body2" component="span">
          ·
        </Typography>
        <Typography variant="body2" component="span">
          <Box component="strong" sx={{ color: "var(--on-bg)" }}>
            {counts.reviews}
          </Box>{" "}
          reviews
        </Typography>
      </Stack>

      <Divider sx={{ borderColor: "var(--on-bg-line)" }} />

      <Stack spacing={1.25} sx={{ color: "var(--on-bg-muted)" }}>
        {user.phone ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box component="span" aria-hidden sx={{ width: 16, textAlign: "center" }}>
              ☎
            </Box>
            <Typography variant="body2">{user.phone}</Typography>
          </Stack>
        ) : null}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box component="span" aria-hidden sx={{ width: 16, textAlign: "center" }}>
            ⌛
          </Box>
          <Typography variant="body2">Joined {user.joined}</Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box component="span" aria-hidden sx={{ width: 16, textAlign: "center" }}>
            ✉
          </Box>
          <Link
            href={`mailto:${user.email}`}
            variant="body2"
            underline="hover"
            sx={{ wordBreak: "break-all", color: "var(--on-bg)" }}
          >
            {user.email}
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
}
