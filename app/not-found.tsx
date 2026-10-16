import { Box, Button, Typography } from "@mui/material";
import { getSessionUser } from "@/lib/auth";
import Header from "./components/Header";
import AppIcon from "./components/icons/AppIcon";

export default async function NotFound() {
  const user = await getSessionUser();

  return (
    <>
      <Header user={user} />
      <Box
        component="main"
        id="content"
        tabIndex={-1}
        sx={{
          maxWidth: 640,
          mx: "auto",
          px: 3,
          py: 10,
          textAlign: "center",
        }}
      >
        <Box sx={{ color: "var(--on-bg-muted)", mb: 2 }}>
          <AppIcon name="search" size={56} />
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 700, color: "var(--on-bg)", mb: 1 }}>
          404
        </Typography>
        <Typography variant="h6" sx={{ color: "var(--on-bg-muted)", mb: 3 }}>
          We couldn&apos;t find that profile.
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: "var(--on-bg-muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved.
        </Typography>
        <Button
          href="/"
          variant="contained"
          sx={{
            backgroundColor: "var(--btn-bg)",
            color: "var(--btn-ink)",
            textTransform: "none",
            "&:hover": { backgroundColor: "var(--btn-bg-hover)" },
          }}
        >
          Back to home
        </Button>
      </Box>
    </>
  );
}
