"use client";

import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Toolbar,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { AUTH_PROMPT_EVENT } from "./auth/authPrompt";
import GuestPanel from "./auth/GuestPanel";
import LoginDialog, { type AuthTab } from "./auth/LoginDialog";
import MiniProfile from "./profile/MiniProfile";

const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#D8F3DC",
      paper: "#D8F3DC",
    },
    primary: {
      main: "#081C15",
    },
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
  },
});

type NavItem = { label: string; href?: string; onClick?: () => void };

// `user` is the signed-in account, resolved from the session cookie by the
// page. When it is null the visitor is a guest: the site works as usual, the
// Profile link is hidden, and the drawer offers to log in or sign up.
export default function Header({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [, startLogout] = useTransition();

  function promptAuth(tab: AuthTab) {
    setDrawerOpen(false);
    setAuthTab(tab);
    setAuthOpen(true);
  }

  function handleLogout() {
    startLogout(async () => {
      await logoutAction();
      router.refresh();
    });
  }

  // Bookmark buttons (and anything else outside this subtree) raise the prompt
  // through this event. The state setters are called inside the listener rather
  // than through promptAuth so the effect needs no dependencies.
  useEffect(() => {
    function handlePrompt(event: Event) {
      const tab = (event as CustomEvent<{ tab?: AuthTab }>).detail?.tab;
      setDrawerOpen(false);
      setAuthTab(tab === "signup" ? "signup" : "login");
      setAuthOpen(true);
    }
    window.addEventListener(AUTH_PROMPT_EVENT, handlePrompt);
    return () => window.removeEventListener(AUTH_PROMPT_EVENT, handlePrompt);
  }, []);

  const navItems: NavItem[] = user
    ? [
        { label: "Home", href: "/" },
        { label: "Profile", href: `/${user.username}` },
        { label: "Bookmark", href: "/bookmarks" },
        { label: "Logout", onClick: handleLogout },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Bookmark", onClick: () => promptAuth("login") },
        { label: "Log in", onClick: () => promptAuth("login") },
        { label: "Sign up", onClick: () => promptAuth("signup") },
      ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
            <Box
              component={Link}
              href="/"
              aria-label="UniFind — home"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              <Image
                src="/img/logo-wordmark.png"
                alt="UniFind"
                width={473}
                height={173}
                priority
                style={{ height: 32, width: "auto" }}
              />
            </Box>

            <Box
              component="div"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <TextField
                size="small"
                placeholder="Search"
                slotProps={{
                  htmlInput: { "aria-label": "Search" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">⌕</InputAdornment>
                    ),
                  },
                }}
                sx={{ width: { xs: 160, sm: 280 } }}
              />
              <IconButton
                color="inherit"
                aria-label="Open navigation drawer"
                onClick={() => setDrawerOpen(true)}
              >
                ☰
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Box
            role="presentation"
            sx={{ width: 240 }}
            onClick={() => setDrawerOpen(false)}
            onKeyDown={() => setDrawerOpen(false)}
          >
            {user ? (
              <MiniProfile user={user} />
            ) : (
              <GuestPanel
                onLogin={() => promptAuth("login")}
                onSignup={() => promptAuth("signup")}
              />
            )}
            <Divider />
            <List>
              {navItems.map((item) =>
                item.href ? (
                  <ListItem key={item.label} disablePadding>
                    <ListItemButton component={Link} href={item.href}>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                ) : (
                  <ListItem key={item.label} disablePadding>
                    <ListItemButton onClick={item.onClick}>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                ),
              )}
            </List>
          </Box>
        </Drawer>

        <LoginDialog
          open={authOpen}
          tab={authTab}
          onTabChange={setAuthTab}
          onClose={() => setAuthOpen(false)}
        />
      </>
    </ThemeProvider>
  );
}
