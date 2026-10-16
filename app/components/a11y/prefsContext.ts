"use client";

import { createContext, useContext } from "react";
import type { Prefs } from "@/lib/prefs";

export type SetPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;

export type PrefsContextValue = {
  prefs: Prefs;
  setPref: SetPref;
  resetPrefs: () => void;
  /** "system" resolved against the OS — what MUI should render with. */
  resolvedTheme: "light" | "dark";
  /** Motion preference and the OS setting together. */
  reducedMotion: boolean;
};

// The context lives apart from the provider so that the provider file exports a
// component and nothing else (the React Fast Refresh lint rule).
export const PrefsContext = createContext<PrefsContextValue | null>(null);

export function usePrefs(): PrefsContextValue {
  const value = useContext(PrefsContext);
  if (!value) {
    throw new Error("usePrefs must be called inside <AccessibilityProvider>");
  }
  return value;
}
