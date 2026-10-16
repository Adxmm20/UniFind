"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DEFAULT_PREFS, prefsAttributes, writePrefsCookie, type Prefs } from "@/lib/prefs";
import ColorFilters from "./ColorFilters";
import SpeechOnHover from "./SpeechOnHover";
import { PrefsContext, type PrefsContextValue } from "./prefsContext";

// Two themes built once at module scope: `createTheme()` is pure, and keeping
// them out of the render means switching mode never rebuilds one. Critically,
// neither crosses the Server → Client boundary as a prop — the layout hands this
// component a plain preference object, which is the difference from the
// server-rendered theme object that used to break prerendering.
//
// The palette's paper is the theme's one shared surface (cards, the drawer, the
// dialog backdrop). The app bar takes its colour from --surface-2 instead, so
// that it follows the CSS theme rather than the JS one.
const typography = {
  fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
} as const;

const lightTheme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#D8F3DC", paper: "#D8F3DC" },
    primary: { main: "#081C15" },
  },
  typography,
  components: {
    MuiAppBar: {
      styleOverrides: {
        colorDefault: { backgroundColor: "var(--surface-2)", color: "var(--ink)" },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#081C15", paper: "#10241C" },
    primary: { main: "#D8F3DC" },
  },
  typography,
  components: {
    MuiAppBar: {
      styleOverrides: {
        colorDefault: { backgroundColor: "var(--surface-2)", color: "var(--ink)" },
      },
    },
  },
});

// matchMedia through useSyncExternalStore: no effect, no state the server would
// have to guess at. The server snapshot is the light, full-motion answer and the
// client corrects it as it hydrates — which is also why "system" is resolved by
// CSS for everything that is not MUI (see globals.css): the colours are already
// right in the very first frame, whatever this returns.
function queryStore(query: string) {
  return {
    subscribe: (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    getSnapshot: () => window.matchMedia(query).matches,
    getServerSnapshot: () => false,
  };
}

const darkSchemeStore = queryStore("(prefers-color-scheme: dark)");
const reducedMotionStore = queryStore("(prefers-reduced-motion: reduce)");

export default function AccessibilityProvider({
  prefs: initialPrefs,
  children,
}: {
  prefs: Prefs;
  children: ReactNode;
}) {
  const [prefs, setPrefs] = useState(initialPrefs);
  // The authoritative "current" for a handler that changes one field: state
  // alone would be a render behind when two toggles land in the same tick.
  const latest = useRef(initialPrefs);

  const systemDark = useSyncExternalStore(
    darkSchemeStore.subscribe,
    darkSchemeStore.getSnapshot,
    darkSchemeStore.getServerSnapshot,
  );
  const systemReducedMotion = useSyncExternalStore(
    reducedMotionStore.subscribe,
    reducedMotionStore.getSnapshot,
    reducedMotionStore.getServerSnapshot,
  );

  // Every change goes through here, so the attributes on <html>, the cookie and
  // React state can never disagree. It is called from event handlers only, which
  // is why it can write to the DOM directly instead of in an effect.
  const commit = useCallback((next: Prefs) => {
    latest.current = next;
    setPrefs(next);
    const root = document.documentElement;
    for (const [name, value] of Object.entries(prefsAttributes(next))) {
      root.setAttribute(name, value);
    }
    writePrefsCookie(next);
  }, []);

  const setPref = useCallback<PrefsContextValue["setPref"]>(
    (key, value) => commit({ ...latest.current, [key]: value }),
    [commit],
  );

  const resetPrefs = useCallback(() => commit(DEFAULT_PREFS), [commit]);

  const resolvedTheme =
    prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;
  const reducedMotion =
    prefs.motion === "system" ? systemReducedMotion : prefs.motion === "reduced";

  return (
    <PrefsContext.Provider
      value={{ prefs, setPref, resetPrefs, resolvedTheme, reducedMotion }}
    >
      <ThemeProvider theme={resolvedTheme === "dark" ? darkTheme : lightTheme}>
        <ColorFilters />
        <SpeechOnHover />
        {children}
      </ThemeProvider>
    </PrefsContext.Provider>
  );
}
