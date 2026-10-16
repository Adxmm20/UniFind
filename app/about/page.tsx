import type { Metadata } from "next";
import Image from "next/image";
import { Box, Card, Divider, Typography } from "@mui/material";
import Header from "@/app/components/Header";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "About · UniFind",
  description: "What UniFind is, and the people who built it.",
};

// The team is hardcoded on purpose: this page is a static surface with no table
// behind it. Each picture is named after the person in public/img/pfp/, so the row
// and its file are matched by eye rather than by an index.
const TEAM = [
  {
    role: "Project Lead",
    name: "Adam Darwish",
    email: "adam.darwish@example.com",
    photo: "/img/pfp/AdamDarwish.jpeg",
  },
  {
    role: "UI/UX Designer",
    name: "Adam Mukhriez",
    email: "adam.mukhriez@example.com",
    photo: "/img/pfp/AdamMukhriez.jpeg",
  },
  {
    role: "Database Manager",
    name: "Ahmad Fawwaz",
    email: "ahmad.fawwaz@example.com",
    photo: "/img/pfp/AhmadFawwaz.jpeg",
  },
];

// The two portrait shots carry the face in the top third, so a centred square
// crop would land on a chest instead of a head — 30% lifts it back onto the face.
// Ahmad Fawwaz's photo is landscape, where the square crop only trims the sides
// and this value does nothing.
const AVATAR_FOCUS = "center 30%";

// One member, top to bottom: picture, role, a divider, then the name and email.
// The avatar is deliberately decorative (`alt=""`) because the name sits directly
// under it — naming the person twice helps nobody.
function TeamCard({ role, name, email, photo }: (typeof TEAM)[number]) {
  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        height: "100%",
        borderRadius: 2,
        backgroundColor: "var(--surface-2)",
        borderColor: "var(--ink-hairline)",
        p: 3,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: 72,
          height: 72,
          borderRadius: "50%",
          overflow: "hidden",
          // Shows through while the picture is still loading, so the tile never
          // flashes white against the dark theme.
          backgroundColor: "var(--surface-inset)",
        }}
      >
        <Image
          src={photo}
          alt=""
          fill
          sizes="72px"
          style={{ objectFit: "cover", objectPosition: AVATAR_FOCUS }}
        />
      </Box>

      <Typography
        variant="overline"
        sx={{ mt: 1.5, color: "var(--ink-muted)" }}
      >
        {role}
      </Typography>

      <Divider
        sx={{ width: "100%", my: 1.5, borderColor: "var(--ink-hairline)" }}
      />

      <Typography
        component="h2"
        variant="subtitle1"
        sx={{ fontWeight: 700, color: "var(--ink)" }}
      >
        {name}
      </Typography>
      <Typography variant="body2" sx={{ color: "var(--ink-muted)" }}>
        {email}
      </Typography>
    </Card>
  );
}

export default async function About() {
  const user = await getSessionUser();

  return (
    <>
      <Header user={user} />
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
        }}
      >
        {/* The ABOUT panel is the page's own content: an h1 and a paragraph to
            edit in place. A Paper, so high contrast frames it with the rest. */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2,
            backgroundColor: "var(--surface-2)",
            borderColor: "var(--ink-hairline)",
            p: { xs: 3, md: 4 },
            mb: { xs: 3, md: 4 },
          }}
        >
          <Typography
            component="h1"
            variant="h4"
            sx={{ fontWeight: 700, color: "var(--ink)", mb: 1.5 }}
          >
            ABOUT
          </Typography>
          <Typography
            variant="body1"
            sx={{ maxWidth: "70ch", color: "var(--ink-muted)" }}
          >
            Welcome to UniFind, the ultimate student-led ecosystem designed exclusively for the IIUM community. We solve two major campus challenges in one place. First, we eliminate information overload by organizing messy group chat links into a clean, centralized campus event directory. Second, we empower IIUM students to achieve financial independence. Whether you want to monetize a skill like ironing, rent out your belongings, or launch a micro-business, UniFind is your platform to generate reliable pocket money right inside your Mahallah
          </Typography>
        </Card>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          {TEAM.map((member) => (
            <TeamCard key={member.email} {...member} />
          ))}
        </Box>
      </Box>
    </>
  );
}
