// Server-only write path for a user's profile picture — the fourth thing in
// this app that writes at runtime, after signup, bookmark toggles and posting.
// It has no page of its own: the avatar on the owner's profile page opens a
// file picker and calls the action, so there is no new top-level route for
// proxy.ts to learn.
import { getWriteDb } from "./db";
import { imageId } from "./imageId";
import { PROFILE_FOLDER, profileImageIndex, retireImage, saveImage } from "./images";
import { getUserByEmail } from "./queries";
import { pictureError } from "./upload";

export type ProfilePictureResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

export async function saveProfilePicture(
  email: string,
  file: File | null,
): Promise<ProfilePictureResult> {
  if (!file) return { ok: false, error: "Choose a picture first." };

  const invalid = pictureError(file, "profile picture");
  if (invalid) return { ok: false, error: invalid };

  const user = getUserByEmail(email);
  if (!user) return { ok: false, error: "That account could not be found." };

  // A new id every time, never a replacement: an avatar URL keeps showing the
  // same picture for as long as it is set, instead of changing content under a
  // link somebody already has (see lib/imageId.ts).
  const nextSeq = user.profile_image_seq + 1;
  const stem = imageId("profile", user.user_id, nextSeq);

  if (!(await saveImage(PROFILE_FOLDER, stem, file))) {
    return {
      ok: false,
      error: "The picture could not be saved. Please try again.",
    };
  }

  getWriteDb()
    .prepare(
      "UPDATE users SET profile_image = ?, profile_image_seq = ? WHERE email = ?",
    )
    .run(stem, nextSeq, email);

  // Only now that the row points at the new file is the old one retired — moved
  // aside rather than deleted, so nothing a person uploaded is ever lost.
  if (user.profile_image) retireImage(PROFILE_FOLDER, user.profile_image);

  return { ok: true, url: profileImageIndex().get(stem.toLowerCase()) ?? null };
}
