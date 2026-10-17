"use client";

import {
  AppBar,
  Autocomplete,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import type { Suggestion } from "@/lib/search";
import { MIN_QUERY_LENGTH } from "@/lib/searchText";
import AccessibilityPanel from "./a11y/AccessibilityPanel";
import { AUTH_PROMPT_EVENT } from "./auth/authPrompt";
import GuestPanel from "./auth/GuestPanel";
import LoginDialog, { type AuthTab } from "./auth/LoginDialog";
import AppIcon, { type IconName } from "./icons/AppIcon";
import MiniProfile from "./profile/MiniProfile";

type NavItem = { label: string; icon: IconName; href?: string; onClick?: () => void };

// Long enough that a normal typist sends one request per word, short enough
// that the list still feels like it is keeping up.
const SUGGEST_DELAY_MS = 180;

// `user` is the signed-in account, resolved from the session cookie by the
// page. When it is null the visitor is a guest: the site works as usual, the
// Profile link is hidden, and the drawer offers to log in or sign up.
export default function Header({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestTimer = useRef<number | undefined>(undefined);
  const suggestRequest = useRef<AbortController | null>(null);
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
      // A hard reload, not router.refresh(): "logged out" should visibly
      // refresh the page, not just swap the header in place.
      window.location.reload();
    });
  }

  // The suggestions behind the search box, as you type. Picking one walks
  // straight to the record or the profile it names; free text (Enter on
  // something no suggestion matches, or the magnifier) goes to the results
  // page, which is what owns the query. Typing is debounced and only the newest
  // request is allowed to land, so a fast typist cannot have a slow answer for
  // an abandoned prefix overwrite a newer one.
  async function loadSuggestions(query: string) {
    suggestRequest.current?.abort();
    const request = new AbortController();
    suggestRequest.current = request;
    try {
      const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
        signal: request.signal,
      });
      if (!response.ok) return;
      const data = (await response.json()) as { suggestions?: Suggestion[] };
      if (request.signal.aborted) return;
      setSuggestions(data.suggestions ?? []);
      setSuggestOpen(true);
    } catch {
      // Aborted (the next keystroke won) or offline: the list already on screen
      // stays, which beats flashing empty.
    }
  }

  function queueSuggestions(value: string) {
    window.clearTimeout(suggestTimer.current);
    // Drop whatever is still in flight the moment the box changes, so a slow
    // answer for the previous prefix cannot even flash on screen.
    suggestRequest.current?.abort();
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    suggestTimer.current = window.setTimeout(() => {
      void loadSuggestions(value.trim());
    }, SUGGEST_DELAY_MS);
  }

  function closeSuggestions() {
    setSuggestOpen(false);
    setSuggestions([]);
  }

  // Header deliberately never reads the URL back — a field that keeps what you
  // typed is the ordinary behaviour, and useSearchParams here would drag a
  // Suspense boundary onto every route. (?q= owns the search itself.)
  function submitSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setDrawerOpen(false);
    closeSuggestions();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function openSuggestion(suggestion: Suggestion) {
    setDrawerOpen(false);
    closeSuggestions();
    router.push(suggestion.href);
  }

  // One cleanup for the debounce and whatever request it started: leaving a
  // page must not leave a timer that sets state on a component that is gone.
  useEffect(
    () => () => {
      window.clearTimeout(suggestTimer.current);
      suggestRequest.current?.abort();
    },
    [],
  );

  // Bookmark buttons (and anything else outside this subtree) raise the prompt
  // through this event. The state setters are called inside the listener rather
  // than through promptAuth so the effect needs no dependencies.
  //
  // The same listener owns Alt+A, the keyboard shortcut for the accessibility
  // panel — which lives in this drawer, so the shortcut is just "open it".
  useEffect(() => {
    function handlePrompt(event: Event) {
      const tab = (event as CustomEvent<{ tab?: AuthTab }>).detail?.tab;
      setDrawerOpen(false);
      setAuthTab(tab === "signup" ? "signup" : "login");
      setAuthOpen(true);
    }
    function handleKeyDown(event: KeyboardEvent) {
      const isAltA =
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.code === "KeyA" || event.key.toLowerCase() === "a");
      if (!isAltA) return;
      event.preventDefault();
      setDrawerOpen(true);
    }
    window.addEventListener(AUTH_PROMPT_EVENT, handlePrompt);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener(AUTH_PROMPT_EVENT, handlePrompt);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const navItems: NavItem[] = user
    ? [
        { label: "Home", icon: "homeProfile", href: "/" },
        { label: "Profile", icon: "personProfile", href: `/${user.username}` },
        { label: "Post", icon: "postAdd", href: "/post" },
        { label: "Bookmark", icon: "bookmark", href: "/bookmarks" },
        // About is a real page like Home, not an account action, so it closes the
        // content rows and sits above Logout.
        { label: "About", icon: "infoProfile", href: "/about" },
        { label: "Logout", icon: "logoutProfile", onClick: handleLogout },
      ]
    : [
        { label: "Home", icon: "homeProfile", href: "/" },
        { label: "Bookmark", icon: "bookmark", onClick: () => promptAuth("login") },
        // Posting needs an account, so a guest's row opens the prompt rather
        // than walking them into the gate at /post.
        { label: "Post", icon: "postAdd", onClick: () => promptAuth("login") },
        { label: "Log in", icon: "login", onClick: () => promptAuth("login") },
        { label: "About", icon: "infoProfile", href: "/about" },
        { label: "Sign up", icon: "addProfile", onClick: () => promptAuth("signup") },
      ];

  return (
    <>
      {/* `color-scheme` belongs to globals.css, which is where light-dark() is
          resolved from — MUI writing its own would fight the preference the
          server already rendered. */}
      <CssBaseline enableColorScheme={false} />
      <AppBar position="sticky" color="default" elevation={1}>
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
            <Box role="search" sx={{ display: "flex", alignItems: "center" }}>
              {/* A combobox, not a form: MUI supplies the roles, the keyboard
                  (arrows, Enter, Escape) and the popup, and lib/search.ts
                  supplies the ranking. Enter is the combobox's own key, which
                  is why the magnifier is a plain button rather than a submit
                  one — there is no form to submit any more. */}
              <Autocomplete
                freeSolo
                size="small"
                value={null}
                inputValue={search}
                options={suggestions}
                open={suggestOpen && suggestions.length > 0}
                onOpen={() => setSuggestOpen(true)}
                onClose={closeSuggestions}
                getOptionLabel={(option) =>
                  typeof option === "string" ? option : option.label
                }
                getOptionKey={(option) =>
                  typeof option === "string" ? option : option.href
                }
                // Already matched and ranked server-side; MUI's own filter would
                // only get in the way.
                filterOptions={(options) => options}
                onInputChange={(_event, value, reason) => {
                  if (reason === "input") {
                    setSearch(value);
                    queueSuggestions(value);
                  } else if (reason === "clear") {
                    setSearch("");
                    closeSuggestions();
                  }
                  // "reset" follows a pick, and the box deliberately keeps what
                  // was typed: the URL, not the field, is what records a search.
                }}
                onChange={(_event, value, reason) => {
                  if (reason === "selectOption" && value && typeof value === "object") {
                    openSuggestion(value);
                  } else if (reason === "createOption" && typeof value === "string") {
                    // Enter on free text is the search itself.
                    submitSearch(value);
                  }
                }}
                renderOption={({ key, ...optionProps }, option) => (
                  <li key={key} {...optionProps}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 1,
                        width: "100%",
                      }}
                    >
                      <Typography variant="body2" noWrap>
                        {option.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "var(--ink-muted)", flexShrink: 0 }}
                      >
                        {option.hint}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    placeholder="Search"
                    slotProps={{
                      ...params.slotProps,
                      htmlInput: {
                        ...params.slotProps.htmlInput,
                        "aria-label": "Search",
                      },
                      input: {
                        ...params.slotProps.input,
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconButton
                              size="small"
                              aria-label="Search"
                              onClick={() => submitSearch(search)}
                              sx={{ p: 0.25, ml: -0.5 }}
                            >
                              <AppIcon name="search" size={18} />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
                sx={{ width: { xs: 160, sm: 280 } }}
                slotProps={{
                  // The field is narrow, so the list gets a floor of its own
                  // rather than being squeezed to the input's width.
                  paper: { sx: { mt: 0.5, minWidth: { xs: 240, sm: 320 } } },
                }}
              />
            </Box>
              <IconButton
                color="inherit"
                aria-label="Open navigation drawer"
                onClick={() => setDrawerOpen(true)}
              >
                <AppIcon name="menu" size={24} />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          {/* The closing handlers belong on the nav rows, not on this box: the
              drawer also holds live controls (the accessibility panel), and a
              keypress or a click in there must not dismiss the drawer someone
              is working in. */}
          {/* The panel scales the root font size — itself included — so the
              drawer grows with the preference, or its rows would wrap at the top
              of the scale. The 1.5 cap and the 88vw ceiling keep a phone sane;
              at the default step this is still exactly 240px. */}
          <Box
            sx={{
              width: "min(calc(240px * min(var(--font-scale), 1.5)), 88vw)",
            }}
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
            <List component="nav" aria-label="Main">
              {navItems.map((item) =>
                item.href ? (
                  <ListItem key={item.label} disablePadding>
                    <ListItemButton
                      component={Link}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <ListItemIcon>
                        <AppIcon name={item.icon} />
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                ) : (
                  <ListItem key={item.label} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        setDrawerOpen(false);
                        item.onClick?.();
                      }}
                    >
                      <ListItemIcon>
                        <AppIcon name={item.icon} />
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                ),
              )}
            </List>
            <Divider />
            <AccessibilityPanel />
          </Box>
        </Drawer>

        <LoginDialog
          open={authOpen}
          tab={authTab}
          onTabChange={setAuthTab}
          onClose={() => setAuthOpen(false)}
        />
      </>
  );
}
