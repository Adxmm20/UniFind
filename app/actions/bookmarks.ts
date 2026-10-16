"use server";

import { getSessionUser } from "@/lib/auth";
import { toggleBookmark, type ToggleResult } from "@/lib/bookmarks";

export type BookmarkActionResult = ToggleResult;

// Thin wrapper, mirroring app/actions/auth.ts: the logic lives in lib/bookmarks
// and this only bridges it to the client.
export async function toggleBookmarkAction(
  recordId: string,
): Promise<BookmarkActionResult> {
  const user = await getSessionUser();
  // The button is only rendered for a signed-in visitor, so this is a backstop
  // rather than a path anyone walks.
  if (!user) return { ok: false, error: "Sign in to save bookmarks." };
  return toggleBookmark(user.email, recordId);
}
