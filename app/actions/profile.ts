"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { saveProfilePicture } from "@/lib/profile";

// Result shape for the avatar uploader, mirroring app/actions/bookmarks.ts: the
// session decides whose picture it is, the logic lives in lib/profile.ts, and
// this only bridges the two to the client.
export type ProfilePictureState = { ok: true } | { ok: false; error: string };

export async function updateProfilePictureAction(
  formData: FormData,
): Promise<ProfilePictureState> {
  const user = await getSessionUser();
  // The uploader only renders on a signed-in visitor's own profile, so this is
  // a backstop rather than a path anyone walks.
  if (!user) return { ok: false, error: "Sign in to change your picture." };

  const value = formData.get("picture");
  const file = value instanceof File && value.size > 0 ? value : null;

  const result = await saveProfilePicture(user.email, file);
  if (!result.ok) return { ok: false, error: result.error };

  // The avatar also appears in the header's drawer, on every route — so this is
  // a layout-wide invalidation, not just the profile's.
  revalidatePath("/", "layout");
  return { ok: true };
}
