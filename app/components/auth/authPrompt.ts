"use client";

import type { AuthTab } from "./LoginDialog";

export const AUTH_PROMPT_EVENT = "unifind:auth-prompt";

/**
 * Lets any client component ask Header to open the login dialog.
 *
 * The dialog's open/tab state lives in Header, and a bookmark button sits in the
 * page tree *outside* Header's subtree — so it cannot reach that state through
 * props. CardData crosses the Server → Client boundary, so it cannot carry a
 * callback either. A window event is the smallest bridge that works without
 * hoisting the dialog into a provider above the pages, which AGENTS.md warns
 * against.
 */
export function openAuthPrompt(tab: AuthTab = "login") {
  window.dispatchEvent(
    new CustomEvent<{ tab: AuthTab }>(AUTH_PROMPT_EVENT, { detail: { tab } }),
  );
}
